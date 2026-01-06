/**
 * Import command - applies a JSON snapshot to a variant
 */

import path from 'node:path';
import * as core from '../../core/index.js';
import type { ExportItem, ImportItemResult, ImportResult } from '../../core/index.js';
import type { ParsedArgs } from '../args.js';

export interface ImportCommandOptions {
  opts: ParsedArgs;
}

const ALL_ITEMS: ExportItem[] = ['skills', 'mcp-servers', 'permissions', 'claude-md', 'tasks', 'provider-env'];

const parseList = (value: string): string[] =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const parseItems = (value?: string): ExportItem[] | undefined => {
  if (!value) return undefined;
  const entries = parseList(value);
  if (entries.length === 0 || entries.includes('all')) return ALL_ITEMS;

  const items: ExportItem[] = [];
  const invalid: string[] = [];
  for (const entry of entries) {
    if (ALL_ITEMS.includes(entry as ExportItem)) {
      items.push(entry as ExportItem);
    } else {
      invalid.push(entry);
    }
  }

  if (invalid.length > 0) {
    throw new Error(`Unknown import item(s): ${invalid.join(', ')}`);
  }

  return Array.from(new Set(items));
};

const formatItemSummary = (item: ExportItem, result?: ImportItemResult): string => {
  if (!result) return `  ${item}: skipped`;
  const suffix = result.errors.length > 0 ? `, errors ${result.errors.length}` : '';
  return `  ${item}: applied ${result.applied}, skipped ${result.skipped}${suffix}`;
};

const printUsage = () => {
  console.log('Usage: npx cc-mirror import <variant> <file> [--items <list>] [--no-backup] [--dry-run]');
};

const printResults = (result: ImportResult, items: ExportItem[], dryRun: boolean, backup: boolean) => {
  console.log(`Import: ${result.success ? 'ok' : 'failed'}`);
  if (result.backupPath) {
    console.log(`Backup: ${result.backupPath}`);
  } else if (dryRun && backup) {
    console.log('Backup: skipped (dry-run)');
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
  console.log('');
};

/**
 * Execute the import command
 */
export function runImportCommand({ opts }: ImportCommandOptions): void {
  const rootDir = (opts.root as string) || core.DEFAULT_ROOT;
  const resolvedRoot = core.expandTilde(rootDir) ?? rootDir;

  const variantName = (opts.variant as string) || opts._[0];
  const inputPath = (opts.file as string) || opts._[1];
  const itemsOverride = parseItems(opts.items as string | undefined);
  const createBackup = !opts['no-backup'];
  const dryRun = Boolean(opts['dry-run']);

  if (!variantName || !inputPath) {
    printUsage();
    return;
  }

  const variants = core.listVariants(resolvedRoot);
  const variantNames = new Set(variants.map((entry) => entry.name));
  if (!variantNames.has(variantName)) {
    throw new Error(`Variant not found: ${variantName}`);
  }

  const filePath = path.resolve(inputPath);
  const archive = core.readExportArchive(filePath);
  const items = itemsOverride ?? archive.items;
  if (items.length === 0) {
    console.log('No items selected for import.');
    return;
  }

  const variantDir = path.join(resolvedRoot, variantName);
  const result = core.importVariant(variantDir, archive, { items, createBackup, dryRun });
  printResults(result, items, dryRun, createBackup);
}
