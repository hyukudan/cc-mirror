/**
 * Config command - show config summary for a variant
 */

import fs from 'node:fs';
import path from 'node:path';
import * as core from '../../core/index.js';
import { getWrapperPath } from '../../core/wrapper.js';
import { readJson } from '../../core/fs.js';
import { detectVariantFromEnv } from '../../core/tasks/index.js';
import type { ClaudeConfig } from '../../core/claude-config.js';
import type { VariantEntry } from '../../core/types.js';
import type { ParsedArgs } from '../args.js';

export interface ConfigCommandOptions {
  opts: ParsedArgs;
}

type SettingsFile = {
  env?: Record<string, string | number | undefined>;
  permissions?: {
    allow?: string[];
    ask?: string[];
    deny?: string[];
  };
};

const SETTINGS_FILE = 'settings.json';
const CLAUDE_FILE = '.claude.json';
const SENSITIVE_TOKENS = ['KEY', 'TOKEN', 'SECRET', 'PASSWORD'];

function showConfigHelp(): void {
  console.log(`
npx cc-mirror config - Show variant config/env summary

USAGE:
  npx cc-mirror config <variant> [options]

OPTIONS:
  --variant <name>     Variant to inspect (optional if positional)
  --json               Print JSON output
  --show-values        Show full env values (default masks secrets)

EXAMPLES:
  npx cc-mirror config zai
  npx cc-mirror config --json --variant minimax
  npx cc-mirror config mirror --show-values
`);
}

function isSensitiveKey(key: string): boolean {
  const upper = key.toUpperCase();
  return SENSITIVE_TOKENS.some((token) => upper.includes(token));
}

function maskValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '<empty>';
  if (trimmed.length <= 4) return '****';
  return `****${trimmed.slice(-4)}`;
}

function sanitizeEnv(
  env: Record<string, string | number | undefined> | undefined,
  showValues: boolean
): Record<string, string | number> {
  if (!env) return {};
  const output: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) continue;
    if (!showValues && isSensitiveKey(key)) {
      output[key] = maskValue(String(value));
      continue;
    }
    output[key] = value;
  }
  return output;
}

function formatList(values?: string[]): string {
  if (!values || values.length === 0) return 'none';
  return values.join(', ');
}

function resolveVariant(opts: ParsedArgs, variants: VariantEntry[], rootDir: string): string | null {
  const positional = opts._ || [];
  const variantFromFlag = opts.variant as string | undefined;
  const variantFromEnv = detectVariantFromEnv() || undefined;
  let variant = variantFromFlag || positional[0] || variantFromEnv;

  if (!variant) {
    if (variants.length === 1) {
      variant = variants[0].name;
    } else if (variants.length === 0) {
      console.error(`No variants found in ${rootDir}`);
      return null;
    } else {
      console.error('Error: variant name required.');
      console.error(`Available: ${variants.map((item) => item.name).join(', ')}`);
      return null;
    }
  }
  return variant;
}

function printEnv(env: Record<string, string | number>): void {
  const entries = Object.entries(env).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) {
    console.log('Env overrides: none');
    return;
  }
  console.log('Env overrides:');
  for (const [key, value] of entries) {
    console.log(`  ${key}=${value}`);
  }
}

function printPermissions(permissions?: SettingsFile['permissions']): void {
  const allow = permissions?.allow ?? [];
  const ask = permissions?.ask ?? [];
  const deny = permissions?.deny ?? [];
  if (allow.length === 0 && ask.length === 0 && deny.length === 0) {
    console.log('Permissions: none');
    return;
  }
  console.log('Permissions:');
  console.log(`  allow: ${formatList(allow)}`);
  console.log(`  ask: ${formatList(ask)}`);
  console.log(`  deny: ${formatList(deny)}`);
}

function printMcpServers(claudeConfig?: ClaudeConfig): void {
  const names = Object.keys(claudeConfig?.mcpServers ?? {}).sort();
  if (names.length === 0) {
    console.log('MCP servers: none');
    return;
  }
  console.log('MCP servers:');
  for (const name of names) {
    console.log(`  - ${name}`);
  }
}

function printClaudeSummary(claudeConfig?: ClaudeConfig): void {
  if (!claudeConfig) return;
  const hasTheme = Boolean(claudeConfig.theme);
  const hasOnboarding =
    typeof claudeConfig.hasCompletedOnboarding === 'boolean' || typeof claudeConfig.lastOnboardingVersion === 'string';
  if (!hasTheme && !hasOnboarding) return;
  console.log('Claude config:');
  if (claudeConfig.theme) {
    console.log(`  theme: ${claudeConfig.theme}`);
  }
  if (typeof claudeConfig.hasCompletedOnboarding === 'boolean') {
    console.log(`  onboarding: ${claudeConfig.hasCompletedOnboarding ? 'complete' : 'pending'}`);
  }
  if (claudeConfig.lastOnboardingVersion) {
    console.log(`  onboarding version: ${claudeConfig.lastOnboardingVersion}`);
  }
}

/**
 * Execute the config command
 */
export function runConfigCommand({ opts }: ConfigCommandOptions): void {
  if (opts.help || opts.h) {
    showConfigHelp();
    return;
  }

  const rootDir = (opts.root as string) || core.DEFAULT_ROOT;
  const resolvedRoot = core.expandTilde(rootDir) ?? rootDir;
  const variants = core.listVariants(resolvedRoot);
  const variant = resolveVariant(opts, variants, resolvedRoot);
  if (!variant) {
    showConfigHelp();
    process.exitCode = 1;
    return;
  }

  const entry = variants.find((item) => item.name === variant);
  if (!entry) {
    console.error(`Variant not found: ${variant}`);
    process.exitCode = 1;
    return;
  }

  const meta = entry.meta ?? null;
  const variantDir = path.join(resolvedRoot, variant);
  const configDir = meta?.configDir ?? path.join(variantDir, 'config');
  if (!fs.existsSync(configDir)) {
    console.error(`Config directory missing: ${configDir}`);
    process.exitCode = 1;
    return;
  }

  const settingsPath = path.join(configDir, SETTINGS_FILE);
  const claudePath = path.join(configDir, CLAUDE_FILE);
  const settings = (readJson<SettingsFile>(settingsPath) ?? {}) as SettingsFile;
  const claudeConfig = (readJson<ClaudeConfig>(claudePath) ?? {}) as ClaudeConfig;

  const showValues = Boolean(opts['show-values']);
  const env = sanitizeEnv(settings.env, showValues);

  const binDir = (opts['bin-dir'] as string) || meta?.binDir || core.DEFAULT_BIN_DIR;
  const resolvedBin = core.expandTilde(binDir) ?? binDir;
  const wrapperPath = getWrapperPath(resolvedBin, variant);

  const outputJson = opts.json === true;
  if (outputJson) {
    const output = {
      variant,
      meta,
      paths: {
        rootDir: resolvedRoot,
        variantDir,
        configDir,
        wrapperPath,
      },
      settings: {
        ...settings,
        env,
      },
      claude: claudeConfig,
      valuesMasked: !showValues,
    };
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  console.log(`Variant: ${variant}`);
  if (meta?.provider) {
    console.log(`Provider: ${meta.provider}`);
  }
  if (meta?.baseUrl) {
    console.log(`Base URL: ${meta.baseUrl}`);
  }
  if (meta?.brand) {
    console.log(`Brand: ${meta.brand}`);
  }
  if (meta?.teamModeEnabled !== undefined) {
    console.log(`Team mode: ${meta.teamModeEnabled ? 'on' : 'off'}`);
  }

  console.log('Paths:');
  console.log(`  Root: ${resolvedRoot}`);
  console.log(`  Variant: ${variantDir}`);
  console.log(`  Config: ${configDir}`);
  console.log(`  Wrapper: ${wrapperPath}`);
  if (meta?.binaryPath) {
    console.log(`  Binary: ${meta.binaryPath}`);
  }
  if (meta?.tweakDir) {
    console.log(`  Tweak: ${meta.tweakDir}`);
  }

  printEnv(env);
  printPermissions(settings.permissions);
  printMcpServers(claudeConfig);
  printClaudeSummary(claudeConfig);

  if (!showValues && Object.keys(env).length > 0) {
    console.log('Note: env values are masked; use --show-values to reveal.');
  }
}
