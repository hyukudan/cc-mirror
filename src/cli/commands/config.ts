/**
 * Config command - show config summary for a variant
 */

import fs from 'node:fs';
import path from 'node:path';
import * as core from '../../core/index.js';
import { getWrapperPath } from '../../core/wrapper.js';
import { readJson, writeJson } from '../../core/fs.js';
import { isValidEnvKey } from '../../core/validation.js';
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
const CONFIG_OPERATIONS = new Set(['show', 'list', 'set', 'unset']);
const RESERVED_ENV_KEYS = new Set(['CLAUDE_CODE_TEAM_NAME']);

type ConfigOperation = 'show' | 'list' | 'set' | 'unset';

type ConfigListEntry = {
  name: string;
  provider?: string;
  teamModeEnabled?: boolean;
  envCount: number;
  mcpCount: number;
  permissions: {
    allow: number;
    ask: number;
    deny: number;
  };
  paths: {
    variantDir: string;
    configDir: string;
    wrapperPath: string;
  };
  wrapperExists: boolean;
  env?: Record<string, string | number>;
  mcpServers?: string[];
};

function showConfigHelp(): void {
  console.log(`
npx cc-mirror config - Show variant config/env summary

USAGE:
  npx cc-mirror config [operation] [variant] [options]

OPERATIONS:
  show <name>            Show config summary (default)
  list                   List config summary for all variants
  set <name>             Update settings.json env overrides
  unset <name>           Remove settings.json env overrides

OPTIONS:
  --variant <name>     Variant to inspect (optional if positional)
  --json               Print JSON output
  --show-values        Show full env values (default masks secrets)
  --env KEY=VALUE      Env override (repeatable; for set)
  --env KEY            Env key to remove (repeatable; for unset)
  --allow <list>       Comma-separated allow list (set/unset)
  --ask <list>         Comma-separated ask list (set/unset)
  --deny <list>        Comma-separated deny list (set/unset)

EXAMPLES:
  npx cc-mirror config zai
  npx cc-mirror config list
  npx cc-mirror config set zai --env ANTHROPIC_API_KEY=sk-ant-...
  npx cc-mirror config unset zai --env ANTHROPIC_API_KEY
  npx cc-mirror config set zai --allow TaskCreate,TaskUpdate
  npx cc-mirror config unset zai --deny WebSearch
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

function resolveVariantWithOffset(
  opts: ParsedArgs,
  variants: VariantEntry[],
  rootDir: string,
  positionalIndex: number
): string | null {
  const positional = opts._ || [];
  const variantFromFlag = opts.variant as string | undefined;
  const variantFromEnv = detectVariantFromEnv() || undefined;
  let variant = variantFromFlag || positional[positionalIndex] || variantFromEnv;

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

function resolveConfigDir(entry: VariantEntry, rootDir: string): string {
  if (entry.meta?.configDir) return entry.meta.configDir;
  return path.join(rootDir, entry.name, 'config');
}

function loadSettings(configDir: string): SettingsFile {
  const settingsPath = path.join(configDir, SETTINGS_FILE);
  return (readJson<SettingsFile>(settingsPath) ?? {}) as SettingsFile;
}

function saveSettings(configDir: string, settings: SettingsFile): void {
  const settingsPath = path.join(configDir, SETTINGS_FILE);
  writeJson(settingsPath, settings);
}

function parseEnvUpdates(entries: string[]): { updates: Record<string, string>; invalid: string[] } {
  const updates: Record<string, string> = {};
  const invalid: string[] = [];
  for (const entry of entries) {
    if (!entry) continue;
    const idx = entry.indexOf('=');
    if (idx === -1) {
      invalid.push(entry);
      continue;
    }
    const key = entry.slice(0, idx).trim();
    if (!key) {
      invalid.push(entry);
      continue;
    }
    updates[key] = entry.slice(idx + 1);
  }
  return { updates, invalid };
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function parseEnvKeys(entries: string[]): { keys: string[]; invalid: string[] } {
  const keys: string[] = [];
  const invalid: string[] = [];
  for (const entry of entries) {
    if (!entry) continue;
    const idx = entry.indexOf('=');
    const key = (idx === -1 ? entry : entry.slice(0, idx)).trim();
    if (!key) {
      invalid.push(entry);
      continue;
    }
    keys.push(key);
  }
  return { keys, invalid };
}

function parseCommaList(value: string | boolean | undefined): { items: string[]; invalid: boolean } {
  if (value === undefined) {
    return { items: [], invalid: false };
  }
  if (typeof value === 'boolean') {
    return { items: [], invalid: true };
  }
  const items = value
    .split(',')
    .map((item: string) => item.trim())
    .filter(Boolean);
  return { items, invalid: items.length === 0 };
}

function normalizePermissions(permissions?: SettingsFile['permissions']): {
  allow: string[];
  ask: string[];
  deny: string[];
} {
  return {
    allow: Array.isArray(permissions?.allow) ? [...permissions.allow] : [],
    ask: Array.isArray(permissions?.ask) ? [...permissions.ask] : [],
    deny: Array.isArray(permissions?.deny) ? [...permissions.deny] : [],
  };
}

function applyPermissionUpdates(opts: {
  current: SettingsFile['permissions'] | undefined;
  allowItems: string[];
  askItems: string[];
  denyItems: string[];
  operation: 'set' | 'unset';
}): { next: SettingsFile['permissions'] | undefined; updated: boolean; keys: string[] } {
  const { allow, ask, deny } = normalizePermissions(opts.current);
  const updatedKeys: string[] = [];
  let updated = false;

  const updateList = (list: string[], items: string[], label: string) => {
    if (items.length === 0) return;
    const set = new Set(list);
    if (opts.operation === 'set') {
      for (const item of items) {
        if (!set.has(item)) {
          set.add(item);
          updated = true;
        }
      }
    } else {
      for (const item of items) {
        if (set.delete(item)) {
          updated = true;
        }
      }
    }
    const nextList = Array.from(set);
    nextList.sort();
    list.splice(0, list.length, ...nextList);
    updatedKeys.push(...items.map((item) => `${label}:${item}`));
  };

  updateList(allow, opts.allowItems, 'allow');
  updateList(ask, opts.askItems, 'ask');
  updateList(deny, opts.denyItems, 'deny');

  const nextPermissions: SettingsFile['permissions'] = {};
  if (allow.length > 0) nextPermissions.allow = allow;
  if (ask.length > 0) nextPermissions.ask = ask;
  if (deny.length > 0) nextPermissions.deny = deny;

  if (Object.keys(nextPermissions).length === 0) {
    return { next: undefined, updated, keys: updatedKeys };
  }
  return { next: nextPermissions, updated, keys: updatedKeys };
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

function buildConfigListEntry(
  entry: VariantEntry,
  rootDir: string,
  binDirOverride: string | undefined,
  showValues: boolean
): ConfigListEntry | null {
  const variantDir = path.join(rootDir, entry.name);
  const configDir = resolveConfigDir(entry, rootDir);
  if (!fs.existsSync(configDir)) {
    return null;
  }

  const settings = loadSettings(configDir);
  const claudePath = path.join(configDir, CLAUDE_FILE);
  const claudeConfig = (readJson<ClaudeConfig>(claudePath) ?? {}) as ClaudeConfig;
  const env = sanitizeEnv(settings.env, showValues);

  const binDir = entry.meta?.binDir || binDirOverride || core.DEFAULT_BIN_DIR;
  const resolvedBin = core.expandTilde(binDir) ?? binDir;
  const wrapperPath = getWrapperPath(resolvedBin, entry.name);
  const permissions = settings.permissions ?? {};
  const mcpServers = Object.keys(claudeConfig.mcpServers ?? {}).sort();

  return {
    name: entry.name,
    provider: entry.meta?.provider,
    teamModeEnabled: entry.meta?.teamModeEnabled,
    envCount: Object.keys(env).length,
    mcpCount: mcpServers.length,
    permissions: {
      allow: permissions.allow?.length ?? 0,
      ask: permissions.ask?.length ?? 0,
      deny: permissions.deny?.length ?? 0,
    },
    paths: {
      variantDir,
      configDir,
      wrapperPath,
    },
    wrapperExists: fs.existsSync(wrapperPath),
    env: env,
    mcpServers,
  };
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
  const showValues = Boolean(opts['show-values']);
  const positional = opts._ || [];
  const hasOperation = Boolean(positional[0] && CONFIG_OPERATIONS.has(positional[0]));
  const operation = (hasOperation ? positional[0] : 'show') as ConfigOperation;
  const positionalIndex = hasOperation ? 1 : 0;

  if (operation === 'list') {
    if (variants.length === 0) {
      if (opts.json === true) {
        console.log('[]');
        return;
      }
      console.log(`No variants found in ${resolvedRoot}`);
      return;
    }
    const binDirOverride = opts['bin-dir'] as string | undefined;
    const entries = variants
      .map((entry) => buildConfigListEntry(entry, resolvedRoot, binDirOverride, showValues))
      .filter((entry): entry is ConfigListEntry => Boolean(entry));

    if (opts.json === true) {
      console.log(JSON.stringify(entries, null, 2));
      return;
    }

    console.log('Variants:');
    for (const entry of entries) {
      const provider = entry.provider ?? 'unknown';
      const team = entry.teamModeEnabled ? 'on' : 'off';
      const perms = `${entry.permissions.allow}/${entry.permissions.ask}/${entry.permissions.deny}`;
      const wrapper = entry.wrapperExists ? 'ok' : 'missing';
      console.log(
        `- ${entry.name} (provider=${provider}, team=${team}, env=${entry.envCount}, mcp=${entry.mcpCount}, perms=${perms}, wrapper=${wrapper})`
      );
    }
    return;
  }

  const variant = resolveVariantWithOffset(opts, variants, resolvedRoot, positionalIndex);
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
  const configDir = resolveConfigDir(entry, resolvedRoot);
  if (!fs.existsSync(configDir)) {
    console.error(`Config directory missing: ${configDir}`);
    process.exitCode = 1;
    return;
  }

  if (operation === 'set' || operation === 'unset') {
    const envEntries = opts.env ?? [];
    const allowArg = opts.allow as string | boolean | undefined;
    const askArg = opts.ask as string | boolean | undefined;
    const denyArg = opts.deny as string | boolean | undefined;

    const hasPermissionFlags = allowArg !== undefined || askArg !== undefined || denyArg !== undefined;
    const hasEnvFlags = envEntries.length > 0;
    if (!hasEnvFlags && !hasPermissionFlags) {
      console.error('Error: set/unset requires --env or permission flags.');
      process.exitCode = 1;
      return;
    }

    const settings = loadSettings(configDir);
    const env = { ...(settings.env ?? {}) };
    let updated = false;
    const updatedKeys: string[] = [];

    if (envEntries.length > 0) {
      if (operation === 'set') {
        const { updates, invalid } = parseEnvUpdates(envEntries);
        if (invalid.length > 0) {
          console.error(`Error: invalid --env entries: ${invalid.join(', ')}`);
          process.exitCode = 1;
          return;
        }
        const envKeys = Object.keys(updates);
        if (envKeys.length === 0) {
          console.error('Error: no valid --env entries provided.');
          process.exitCode = 1;
          return;
        }
        const invalidKeys = unique(envKeys.filter((key) => !isValidEnvKey(key)));
        if (invalidKeys.length > 0) {
          console.error(`Error: invalid env keys: ${invalidKeys.join(', ')}`);
          process.exitCode = 1;
          return;
        }
        const reservedKeys = unique(envKeys.filter((key) => RESERVED_ENV_KEYS.has(key)));
        if (reservedKeys.length > 0) {
          console.error(`Error: ${reservedKeys.join(', ')} are managed dynamically; remove them from settings.json.`);
          process.exitCode = 1;
          return;
        }
        for (const [key, value] of Object.entries(updates)) {
          if (env[key] !== value) {
            env[key] = value;
            updated = true;
          }
        }
        updatedKeys.push(...envKeys);
      } else {
        const { keys, invalid } = parseEnvKeys(envEntries);
        if (invalid.length > 0) {
          console.error(`Error: invalid --env entries: ${invalid.join(', ')}`);
          process.exitCode = 1;
          return;
        }
        const uniqueKeys = Array.from(new Set(keys));
        if (uniqueKeys.length === 0) {
          console.error('Error: no valid --env entries provided.');
          process.exitCode = 1;
          return;
        }
        for (const key of uniqueKeys) {
          if (Object.hasOwn(env, key)) {
            delete env[key];
            updated = true;
          }
        }
        updatedKeys.push(...uniqueKeys);
      }
    }

    let nextPermissions = settings.permissions;
    if (hasPermissionFlags) {
      const allowList = parseCommaList(allowArg);
      const askList = parseCommaList(askArg);
      const denyList = parseCommaList(denyArg);
      if (allowList.invalid || askList.invalid || denyList.invalid) {
        console.error('Error: --allow/--ask/--deny require comma-separated values.');
        process.exitCode = 1;
        return;
      }
      const permissionUpdates = applyPermissionUpdates({
        current: settings.permissions,
        allowItems: allowList.items,
        askItems: askList.items,
        denyItems: denyList.items,
        operation,
      });
      nextPermissions = permissionUpdates.next;
      if (permissionUpdates.updated) {
        updated = true;
      }
      if (permissionUpdates.keys.length > 0) {
        updatedKeys.push(...permissionUpdates.keys);
      }
    }

    const next: SettingsFile = {
      ...settings,
      env: Object.keys(env).length > 0 ? env : undefined,
      permissions: nextPermissions,
    };

    if (updated) {
      saveSettings(configDir, next);
    }

    if (opts.json === true) {
      console.log(
        JSON.stringify(
          {
            variant,
            operation,
            updated,
            keys: updatedKeys.sort(),
            configDir,
          },
          null,
          2
        )
      );
      return;
    }

    if (updated) {
      console.log(`Updated settings.json for ${variant}.`);
    } else {
      console.log(`No changes for ${variant}.`);
    }
    if (updatedKeys.length > 0) {
      console.log(`Keys: ${updatedKeys.sort().join(', ')}`);
    }
    return;
  }

  const settings = loadSettings(configDir);
  const claudePath = path.join(configDir, CLAUDE_FILE);
  const claudeConfig = (readJson<ClaudeConfig>(claudePath) ?? {}) as ClaudeConfig;
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
