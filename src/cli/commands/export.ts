/**
 * Export command - saves variant configuration to a JSON snapshot
 */

import path from 'node:path';
import * as core from '../../core/index.js';
import type { ExportItem, ExportItemResult, ExportResult } from '../../core/index.js';
import type { ParsedArgs } from '../args.js';

export interface ExportCommandOptions {
  opts: ParsedArgs;
}

const ALL_ITEMS: ExportItem[] = ['skills', 'mcp-servers', 'permissions', 'claude-md', 'tasks', 'provider-env'];
const DEFAULT_ITEMS: ExportItem[] = ['skills', 'mcp-servers', 'permissions', 'claude-md'];

const parseList = (value: string): string[] =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const parseItems = (value?: string): ExportItem[] => {
  if (!value) return DEFAULT_ITEMS;
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
    throw new Error(`Unknown export item(s): ${invalid.join(', ')}`);
  }

  return Array.from(new Set(items));
};

const formatItemSummary = (item: ExportItem, result?: ExportItemResult): string => {
  if (!result) return `  ${item}: skipped`;
  const suffix = result.errors.length > 0 ? `, errors ${result.errors.length}` : '';
  return `  ${item}: exported ${result.exported}, skipped ${result.skipped}${suffix}`;
};

const printUsage = () => {
  console.log('Usage: npx cc-mirror export <variant> [file] [--items <list>]');
};

const printResults = (result: ExportResult, filePath: string) => {
  console.log(`Exported to: ${filePath}`);
  for (const item of result.archive.items) {
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
 * Execute the export command
 */
export function runExportCommand({ opts }: ExportCommandOptions): void {
  const rootDir = (opts.root as string) || core.DEFAULT_ROOT;
  const resolvedRoot = core.expandTilde(rootDir) ?? rootDir;

  const variantName = (opts.variant as string) || opts._[0];
  const outputPath = (opts.out as string) || opts._[1];
  const items = parseItems(opts.items as string | undefined);

  if (!variantName) {
    printUsage();
    return;
  }

  const variants = core.listVariants(resolvedRoot);
  const variantNames = new Set(variants.map((entry) => entry.name));
  if (!variantNames.has(variantName)) {
    throw new Error(`Variant not found: ${variantName}`);
  }

  const variantDir = path.join(resolvedRoot, variantName);
  const filePath = outputPath ? path.resolve(outputPath) : path.resolve(process.cwd(), `cc-mirror-${variantName}.json`);

  const result = core.exportVariant(variantDir, items);
  core.writeExportArchive(filePath, result.archive);
  printResults(result, filePath);
}
