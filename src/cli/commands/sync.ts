/**
 * Sync command - copies config between variants
 */

import path from 'node:path';
import * as core from '../../core/index.js';
import { computeSyncDiff } from '../../core/sync.js';
import type { SyncItem, SyncItemResult, SyncOptions, SyncResult, SyncDiff } from '../../core/index.js';
import type { ParsedArgs } from '../args.js';

export interface SyncCommandOptions {
  opts: ParsedArgs;
}

const ALL_SYNC_ITEMS: SyncItem[] = ['skills', 'mcp-servers', 'permissions', 'claude-md', 'tasks', 'provider-env'];
const DEFAULT_SYNC_ITEMS: SyncItem[] = ['skills', 'mcp-servers', 'permissions', 'claude-md'];

const parseList = (value: string): string[] =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const parseItems = (value?: string): SyncItem[] => {
  if (!value) return DEFAULT_SYNC_ITEMS;
  const entries = parseList(value);
  if (entries.length === 0 || entries.includes('all')) return ALL_SYNC_ITEMS;

  const items: SyncItem[] = [];
  const invalid: string[] = [];
  for (const entry of entries) {
    if (ALL_SYNC_ITEMS.includes(entry as SyncItem)) {
      items.push(entry as SyncItem);
    } else {
      invalid.push(entry);
    }
  }

  if (invalid.length > 0) {
    throw new Error(`Unknown sync item(s): ${invalid.join(', ')}`);
  }

  return Array.from(new Set(items));
};

const printUsage = () => {
  console.log('Usage: npx cc-mirror sync <source> <target...> [--items <list>] [--no-backup] [--dry-run]');
  console.log('       npx cc-mirror sync --source <name> --targets a,b [--items skills,mcp-servers]');
  console.log('       npx cc-mirror sync <source> <target> --diff   # Preview changes without syncing');
};

const printDiffPreview = (targetName: string, diffs: SyncDiff[]) => {
  console.log(`\n${targetName}:`);

  let hasAnyChanges = false;
  for (const diff of diffs) {
    if (!diff.hasChanges) {
      console.log(`  ${diff.item}: (no changes)`);
      continue;
    }

    hasAnyChanges = true;
    console.log(`  ${diff.item}:`);
    for (const change of diff.changes) {
      const actionSymbol = change.action === 'add' ? '+' : change.action === 'modify' ? '~' : '↺';
      const value = change.sourceValue ? ` (${change.sourceValue})` : '';
      console.log(`    ${actionSymbol} ${change.key}${value}`);
    }
  }

  if (!hasAnyChanges) {
    console.log('  (no changes detected)');
  }
};

const formatItemSummary = (item: SyncItem, result?: SyncItemResult): string => {
  if (!result) return `  ${item}: skipped`;
  const suffix = result.errors.length > 0 ? `, errors ${result.errors.length}` : '';
  return `  ${item}: copied ${result.copied}, skipped ${result.skipped}${suffix}`;
};

const printResults = (results: SyncResult[], items: SyncItem[], dryRun: boolean, createBackup: boolean) => {
  for (const result of results) {
    console.log(`\n${result.target}: ${result.success ? 'ok' : 'failed'}`);
    if (result.backupPath) {
      console.log(`  backup: ${result.backupPath}`);
    } else if (dryRun && createBackup) {
      console.log('  backup: skipped (dry-run)');
    }
    for (const item of items) {
      const itemResult = result.itemResults[item];
      console.log(formatItemSummary(item, itemResult));
      if (itemResult?.errors.length) {
        for (const error of itemResult.errors) {
          console.log(`    - ${error}`);
        }
      }
    }
  }
  console.log('');
};

/**
 * Execute the sync command
 */
export function runSyncCommand({ opts }: SyncCommandOptions): void {
  const rootDir = (opts.root as string) || core.DEFAULT_ROOT;
  const resolvedRoot = core.expandTilde(rootDir) ?? rootDir;

  const sourceName = (opts.source as string) || opts._[0];
  const targetFlag = typeof opts.targets === 'string' ? parseList(opts.targets) : [];
  const targetNames = targetFlag.length > 0 ? targetFlag : opts._.slice(1);
  const items = parseItems(opts.items as string | undefined);
  const createBackup = !opts['no-backup'];
  const dryRun = Boolean(opts['dry-run']);
  const showDiff = Boolean(opts.diff);

  if (!sourceName) {
    printUsage();
    return;
  }
  if (targetNames.length === 0) {
    printUsage();
    return;
  }

  const variants = core.listVariants(resolvedRoot);
  const variantNames = new Set(variants.map((entry) => entry.name));

  if (!variantNames.has(sourceName)) {
    throw new Error(`Source variant not found: ${sourceName}`);
  }

  const uniqueTargets = Array.from(new Set(targetNames)).filter((name) => name !== sourceName);
  if (uniqueTargets.length === 0) {
    console.log('No target variants specified (source filtered).');
    return;
  }

  const unknownTargets = uniqueTargets.filter((name) => !variantNames.has(name));
  if (unknownTargets.length > 0) {
    throw new Error(`Target variant(s) not found: ${unknownTargets.join(', ')}`);
  }

  const sourceDir = path.join(resolvedRoot, sourceName);
  const targetDirs = uniqueTargets.map((name) => path.join(resolvedRoot, name));

  console.log(`Sync source: ${sourceName}`);
  console.log(`Targets: ${uniqueTargets.join(', ')}`);
  console.log(`Items: ${items.join(', ')}`);

  // Diff preview mode
  if (showDiff) {
    console.log('\nDiff preview:');
    for (const targetDir of targetDirs) {
      const targetName = path.basename(targetDir);
      const diffs = computeSyncDiff(sourceDir, targetDir, items);
      printDiffPreview(targetName, diffs);
    }
    console.log('\nUse without --diff to apply changes.');
    return;
  }

  console.log(`Backup: ${createBackup ? 'on' : 'off'}`);
  console.log(`Dry-run: ${dryRun ? 'on' : 'off'}`);

  const options: SyncOptions = { items, createBackup, dryRun };
  const results = core.syncVariants(sourceDir, targetDirs, options);

  printResults(results, items, dryRun, createBackup);
}
