/**
 * Refresh command - re-applies provider defaults while preserving API key
 */

import fs from 'node:fs';
import path from 'node:path';
import * as core from '../../core/index.js';
import { readJson, writeJson } from '../../core/fs.js';
import { assertValidVariantName } from '../../core/validation.js';
import { getProvider, buildEnv } from '../../providers/index.js';
import { loadVariantMeta } from '../../core/variants.js';
import { getWrapperPath, writeWrapperForPlatform, type WrapperOptions } from '../../core/wrapper.js';
import type { ParsedArgs } from '../args.js';
import type { VariantMeta } from '../../core/types.js';

export interface RefreshCommandOptions {
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
const VARIANT_FILE = 'variant.json';

const AUTH_KEYS = ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN'];
const PRESERVE_KEYS = [
  ...AUTH_KEYS,
  'CC_MIRROR_UNSET_AUTH_TOKEN', // Preserve auth mode indicator
];

function showRefreshHelp(): void {
  console.log(`
npx cc-mirror refresh - Re-apply provider defaults (preserves API key)

USAGE:
  npx cc-mirror refresh [name]        Refresh specific variant
  npx cc-mirror refresh --all         Refresh all variants

DESCRIPTION:
  When provider configuration changes (new base URL, model names, etc.),
  use this command to update existing wrappers without losing your API key.

OPTIONS:
  --all                  Refresh all variants
  --dry-run              Show what would change without writing
  --json                 Output changes as JSON

EXAMPLES:
  npx cc-mirror refresh kimi          # Refresh kimi wrapper
  npx cc-mirror refresh --all         # Refresh all wrappers
  npx cc-mirror refresh kimi --dry-run  # Preview changes
`);
}

interface RefreshResult {
  name: string;
  provider: string;
  updated: boolean;
  changes: Array<{ key: string; old: string | number | undefined; new: string | number }>;
  preserved: string[];
  wrapperRegenerated?: boolean;
  error?: string;
}

function refreshVariant(rootDir: string, name: string, dryRun: boolean): RefreshResult {
  const variantDir = path.join(rootDir, name);
  const meta = loadVariantMeta(variantDir);

  if (!meta) {
    return {
      name,
      provider: 'unknown',
      updated: false,
      changes: [],
      preserved: [],
      error: 'variant.json not found or invalid',
    };
  }

  const provider = getProvider(meta.provider);
  if (!provider) {
    return {
      name,
      provider: meta.provider,
      updated: false,
      changes: [],
      preserved: [],
      error: `Unknown provider: ${meta.provider}`,
    };
  }

  const configDir = meta.configDir || path.join(variantDir, 'config');
  const settingsPath = path.join(configDir, SETTINGS_FILE);
  const variantPath = path.join(variantDir, VARIANT_FILE);

  if (!fs.existsSync(settingsPath)) {
    return {
      name,
      provider: meta.provider,
      updated: false,
      changes: [],
      preserved: [],
      error: 'settings.json not found',
    };
  }

  const settings = (readJson<SettingsFile>(settingsPath) ?? {}) as SettingsFile;
  const currentEnv = settings.env ?? {};

  // Get fresh provider defaults
  const freshEnv = buildEnv({
    providerKey: meta.provider,
    baseUrl: undefined, // Use provider default
    apiKey: undefined, // Will be preserved from current
  });

  const changes: Array<{ key: string; old: string | number | undefined; new: string | number }> = [];
  const preserved: string[] = [];
  const newEnv: Record<string, string | number> = {};

  // Apply fresh provider defaults
  for (const [key, value] of Object.entries(freshEnv)) {
    if (value === undefined) continue;

    // Preserve auth keys from current config
    if (PRESERVE_KEYS.includes(key)) {
      if (currentEnv[key] !== undefined) {
        newEnv[key] = currentEnv[key] as string | number;
        preserved.push(key);
      } else {
        newEnv[key] = value;
      }
      continue;
    }

    newEnv[key] = value;
    // Compare as strings to handle number/string type differences
    if (String(currentEnv[key]) !== String(value)) {
      changes.push({ key, old: currentEnv[key], new: value });
    }
  }

  // Preserve any auth keys that exist in current but not in fresh
  for (const key of AUTH_KEYS) {
    if (currentEnv[key] !== undefined && newEnv[key] === undefined) {
      newEnv[key] = currentEnv[key] as string | number;
      preserved.push(key);
    }
  }

  // Check if baseUrl changed in variant.json
  const newBaseUrl = provider.baseUrl;
  if (meta.baseUrl !== newBaseUrl) {
    changes.push({ key: 'baseUrl (variant.json)', old: meta.baseUrl, new: newBaseUrl });
  }

  // Always regenerate wrapper (format may have changed even if env hasn't)
  const wrapperRegenerated = !dryRun && Boolean(meta.binDir && meta.binaryPath);

  if (changes.length === 0 && !wrapperRegenerated) {
    return {
      name,
      provider: meta.provider,
      updated: false,
      changes: [],
      preserved,
    };
  }

  if (!dryRun) {
    // Update settings.json (even if no changes, to normalize format)
    const newSettings: SettingsFile = {
      ...settings,
      env: newEnv,
    };
    writeJson(settingsPath, newSettings);

    // Update variant.json baseUrl
    if (meta.baseUrl !== newBaseUrl) {
      const variantMeta = (readJson<VariantMeta>(variantPath) ?? meta) as VariantMeta;
      variantMeta.baseUrl = newBaseUrl;
      writeJson(variantPath, variantMeta);
    }

    // Always regenerate wrapper script (format may have changed)
    if (meta.binDir && meta.binaryPath) {
      const wrapperOptions: WrapperOptions = {
        requiresTranslation: provider.requiresTranslation,
      };
      const wrapperPath = getWrapperPath(meta.binDir, name);
      writeWrapperForPlatform(wrapperPath, configDir, meta.binaryPath, wrapperOptions);
    }
  }

  return {
    name,
    provider: meta.provider,
    updated: !dryRun,
    changes,
    preserved,
    wrapperRegenerated,
  };
}

export function runRefreshCommand({ opts }: RefreshCommandOptions): void {
  if (opts.help || opts.h) {
    showRefreshHelp();
    return;
  }

  const rootDir = (opts.root as string) || core.DEFAULT_ROOT;
  const resolvedRoot = core.expandTilde(rootDir) ?? rootDir;
  const dryRun = Boolean(opts['dry-run']);
  const jsonOutput = Boolean(opts.json);
  const refreshAll = Boolean(opts.all);

  const variants = core.listVariants(resolvedRoot);
  if (variants.length === 0) {
    console.log(`No variants found in ${resolvedRoot}`);
    return;
  }

  let targets: string[];
  if (refreshAll) {
    targets = variants.map((v) => v.name);
  } else {
    const target = opts._ && opts._[0];
    if (!target) {
      if (variants.length === 1) {
        targets = [variants[0].name];
      } else {
        console.error('Error: variant name required (or use --all)');
        console.error(`Available: ${variants.map((v) => v.name).join(', ')}`);
        process.exitCode = 1;
        return;
      }
    } else {
      targets = [assertValidVariantName(target)];
    }
  }

  const results: RefreshResult[] = [];

  for (const name of targets) {
    const entry = variants.find((v) => v.name === name);
    if (!entry) {
      results.push({
        name,
        provider: 'unknown',
        updated: false,
        changes: [],
        preserved: [],
        error: 'Variant not found',
      });
      continue;
    }

    const result = refreshVariant(resolvedRoot, name, dryRun);
    results.push(result);
  }

  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  // Pretty print results
  for (const result of results) {
    console.log(`\n${result.name} (${result.provider}):`);

    if (result.error) {
      console.log(`  Error: ${result.error}`);
      continue;
    }

    if (result.changes.length === 0 && !result.wrapperRegenerated) {
      console.log('  No changes needed - already up to date');
      continue;
    }

    if (result.changes.length === 0 && result.wrapperRegenerated) {
      console.log('  Settings up to date, wrapper regenerated');
      continue;
    }

    if (dryRun) {
      console.log('  Would update:');
    } else {
      console.log('  Updated:');
    }

    for (const change of result.changes) {
      const oldVal = change.old === undefined ? '<not set>' : String(change.old);
      console.log(`    ${change.key}: ${oldVal} -> ${change.new}`);
    }

    if (result.preserved.length > 0) {
      console.log(`  Preserved: ${result.preserved.join(', ')}`);
    }
  }

  if (dryRun) {
    console.log('\n(dry run - no changes written)');
  }
}
