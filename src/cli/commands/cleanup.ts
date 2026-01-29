/**
 * Cleanup command - Detect and archive unused variants
 *
 * Usage:
 *   cc-mirror cleanup                   Show unused variants
 *   cc-mirror cleanup --archive         Archive unused variants
 *   cc-mirror cleanup --older-than 30   Only variants unused for 30+ days
 */

import fs from 'node:fs';
import path from 'node:path';
import * as core from '../../core/index.js';
import type { ParsedArgs } from '../args.js';

export interface CleanupCommandOptions {
  opts: ParsedArgs;
}

interface VariantUsageInfo {
  name: string;
  lastAccessed: Date;
  daysSinceAccess: number;
  sizeBytes: number;
}

function showCleanupHelp(): void {
  console.log(`
npx cc-mirror cleanup - Detect and archive unused variants

USAGE:
  npx cc-mirror cleanup [options]

OPTIONS:
  --older-than <days>    Only show variants unused for N+ days (default: 30)
  --archive              Move unused variants to archive directory
  --delete               Permanently delete unused variants (dangerous!)
  --dry-run              Show what would be done without changes
  --json                 Output as JSON

EXAMPLES:
  npx cc-mirror cleanup                          # Show variants unused for 30+ days
  npx cc-mirror cleanup --older-than 7           # Show unused for 7+ days
  npx cc-mirror cleanup --archive --dry-run      # Preview archiving
  npx cc-mirror cleanup --archive                # Archive unused variants
`);
}

function getDirectorySize(dirPath: string): number {
  let totalSize = 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        totalSize += getDirectorySize(fullPath);
      } else if (entry.isFile()) {
        totalSize += fs.statSync(fullPath).size;
      }
    }
  } catch {
    // Ignore errors
  }
  return totalSize;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function getLastAccessTime(variantDir: string): Date {
  let latestTime = new Date(0);

  function checkDir(dir: string): void {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        try {
          const stats = fs.statSync(fullPath);
          const accessTime = stats.mtime; // Use mtime as proxy for usage
          if (accessTime > latestTime) {
            latestTime = accessTime;
          }
          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            checkDir(fullPath);
          }
        } catch {
          // Ignore inaccessible files
        }
      }
    } catch {
      // Ignore inaccessible directories
    }
  }

  // Check config directory for last usage
  const configDir = path.join(variantDir, 'config');
  if (fs.existsSync(configDir)) {
    checkDir(configDir);
  }

  // Also check the variant.json
  const metaPath = path.join(variantDir, 'variant.json');
  if (fs.existsSync(metaPath)) {
    const stats = fs.statSync(metaPath);
    if (stats.mtime > latestTime) {
      latestTime = stats.mtime;
    }
  }

  return latestTime;
}

function analyzeVariants(rootDir: string, olderThanDays: number): VariantUsageInfo[] {
  const resolvedRoot = core.expandTilde(rootDir) ?? rootDir;
  const variants = core.listVariants(resolvedRoot);
  const now = new Date();
  const results: VariantUsageInfo[] = [];

  for (const variant of variants) {
    const variantDir = path.join(resolvedRoot, variant.name);
    const lastAccessed = getLastAccessTime(variantDir);
    const daysSinceAccess = Math.floor((now.getTime() - lastAccessed.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceAccess >= olderThanDays) {
      results.push({
        name: variant.name,
        lastAccessed,
        daysSinceAccess,
        sizeBytes: getDirectorySize(variantDir),
      });
    }
  }

  return results.sort((a, b) => b.daysSinceAccess - a.daysSinceAccess);
}

function archiveVariant(rootDir: string, name: string): string {
  const resolvedRoot = core.expandTilde(rootDir) ?? rootDir;
  const variantDir = path.join(resolvedRoot, name);
  const archiveDir = path.join(resolvedRoot, '.archive');
  const timestamp = new Date().toISOString().split('T')[0];
  const archiveDest = path.join(archiveDir, `${name}-${timestamp}`);

  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }

  fs.renameSync(variantDir, archiveDest);
  return archiveDest;
}

/**
 * Execute the cleanup command
 */
export function runCleanupCommand({ opts }: CleanupCommandOptions): void {
  const rootDir = (opts.root as string) || core.DEFAULT_ROOT;
  const olderThanDays = opts['older-than'] !== undefined ? Number(opts['older-than']) : 30;
  const shouldArchive = Boolean(opts.archive);
  const shouldDelete = Boolean(opts.delete);
  const dryRun = Boolean(opts['dry-run']);
  const json = Boolean(opts.json);

  if (opts.help || opts.h) {
    showCleanupHelp();
    return;
  }

  const unusedVariants = analyzeVariants(rootDir, olderThanDays);

  if (json) {
    console.log(JSON.stringify(unusedVariants, null, 2));
    return;
  }

  if (unusedVariants.length === 0) {
    console.log(`No variants unused for ${olderThanDays}+ days.`);
    return;
  }

  console.log(`Found ${unusedVariants.length} variant(s) unused for ${olderThanDays}+ days:\n`);

  let totalSize = 0;
  for (const v of unusedVariants) {
    const dateStr = v.lastAccessed.toISOString().split('T')[0];
    console.log(`  ${v.name}`);
    console.log(`    Last used: ${dateStr} (${v.daysSinceAccess} days ago)`);
    console.log(`    Size: ${formatBytes(v.sizeBytes)}`);
    totalSize += v.sizeBytes;
  }

  console.log(`\nTotal size: ${formatBytes(totalSize)}`);

  if (!shouldArchive && !shouldDelete) {
    console.log('\nUse --archive to move to archive, or --delete to remove permanently.');
    return;
  }

  if (shouldDelete) {
    console.log('\n⚠️  Deleting variants permanently!');
    if (dryRun) {
      console.log('(dry-run - no changes made)');
      return;
    }

    const resolvedRoot = core.expandTilde(rootDir) ?? rootDir;
    for (const v of unusedVariants) {
      const variantDir = path.join(resolvedRoot, v.name);
      fs.rmSync(variantDir, { recursive: true, force: true });
      console.log(`  Deleted: ${v.name}`);
    }
    console.log(`\nDeleted ${unusedVariants.length} variant(s), freed ${formatBytes(totalSize)}`);
    return;
  }

  if (shouldArchive) {
    console.log('\nArchiving variants...');
    if (dryRun) {
      console.log('(dry-run - no changes made)');
      return;
    }

    for (const v of unusedVariants) {
      const archivePath = archiveVariant(rootDir, v.name);
      console.log(`  Archived: ${v.name} → ${path.basename(archivePath)}`);
    }
    console.log(`\nArchived ${unusedVariants.length} variant(s) to .archive/`);
  }
}
