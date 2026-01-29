/**
 * Backup/Restore command - full backup of ~/.cc-mirror/
 *
 * Usage:
 *   cc-mirror backup [file]           Create backup archive
 *   cc-mirror backup restore <file>   Restore from backup
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as core from '../../core/index.js';
import type { ParsedArgs } from '../args.js';

export interface BackupCommandOptions {
  opts: ParsedArgs;
}

function showBackupHelp(): void {
  console.log(`
npx cc-mirror backup - Backup and restore ~/.cc-mirror/

USAGE:
  npx cc-mirror backup [file]            Create backup archive
  npx cc-mirror backup restore <file>    Restore from backup

OPTIONS:
  --out <path>                 Output file path (default: cc-mirror-backup-<timestamp>.tar.gz)
  --root <path>                Root directory to backup (default: ~/.cc-mirror)
  --force                      Overwrite existing backup file
  --dry-run                    Show what would be backed up without creating archive

EXAMPLES:
  npx cc-mirror backup                           # Creates cc-mirror-backup-2025-01-29.tar.gz
  npx cc-mirror backup --out ~/my-backup.tar.gz  # Custom output path
  npx cc-mirror backup restore ~/backup.tar.gz   # Restore from archive
  npx cc-mirror backup --dry-run                 # Preview backup contents
`);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
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

function createBackup(rootDir: string, outputPath: string, dryRun: boolean, force: boolean): void {
  const resolvedRoot = core.expandTilde(rootDir) ?? rootDir;

  if (!fs.existsSync(resolvedRoot)) {
    console.error(`Error: Root directory not found: ${resolvedRoot}`);
    process.exitCode = 1;
    return;
  }

  // Check variants exist
  const variants = core.listVariants(resolvedRoot);
  if (variants.length === 0) {
    console.error('No variants found to backup.');
    process.exitCode = 1;
    return;
  }

  // Check output file
  if (fs.existsSync(outputPath) && !force) {
    console.error(`Error: Output file already exists: ${outputPath}`);
    console.error('Use --force to overwrite.');
    process.exitCode = 1;
    return;
  }

  // Calculate size
  const totalSize = getDirectorySize(resolvedRoot);

  console.log(`Backing up ${variants.length} variant(s) from ${resolvedRoot}`);
  console.log(`Total size: ${formatBytes(totalSize)}`);

  if (dryRun) {
    console.log('\nDry run - would backup:');
    for (const variant of variants) {
      const variantPath = path.join(resolvedRoot, variant.name);
      const variantSize = getDirectorySize(variantPath);
      console.log(`  - ${variant.name} (${formatBytes(variantSize)})`);
    }
    console.log(`\nWould create: ${outputPath}`);
    return;
  }

  // Create backup using tar
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Creating archive: ${outputPath}`);

  const result = spawnSync('tar', ['-czf', outputPath, '-C', path.dirname(resolvedRoot), path.basename(resolvedRoot)], {
    stdio: 'pipe',
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    console.error('Error creating backup:');
    console.error(result.stderr || result.stdout);
    process.exitCode = 1;
    return;
  }

  const archiveSize = fs.statSync(outputPath).size;
  console.log(`✓ Backup created: ${outputPath} (${formatBytes(archiveSize)})`);
  console.log(`  Variants: ${variants.map((v) => v.name).join(', ')}`);
}

function restoreBackup(archivePath: string, rootDir: string, dryRun: boolean, force: boolean): void {
  const resolvedRoot = core.expandTilde(rootDir) ?? rootDir;

  if (!fs.existsSync(archivePath)) {
    console.error(`Error: Archive not found: ${archivePath}`);
    process.exitCode = 1;
    return;
  }

  // Check if root exists and has variants
  if (fs.existsSync(resolvedRoot)) {
    const variants = core.listVariants(resolvedRoot);
    if (variants.length > 0 && !force) {
      console.error(`Error: Root directory has existing variants: ${resolvedRoot}`);
      console.error('Use --force to overwrite existing variants.');
      process.exitCode = 1;
      return;
    }
  }

  // List archive contents
  console.log(`Restoring from: ${archivePath}`);

  const listResult = spawnSync('tar', ['-tzf', archivePath], {
    stdio: 'pipe',
    encoding: 'utf8',
  });

  if (listResult.status !== 0) {
    console.error('Error reading archive:');
    console.error(listResult.stderr || listResult.stdout);
    process.exitCode = 1;
    return;
  }

  const files = listResult.stdout.split('\n').filter(Boolean);
  const topDir = files[0]?.split('/')[0];

  if (!topDir) {
    console.error('Error: Archive appears to be empty or malformed');
    process.exitCode = 1;
    return;
  }

  // Find variant directories
  const variantDirs = new Set<string>();
  for (const file of files) {
    const parts = file.split('/');
    if (parts.length > 1 && parts[1]) {
      variantDirs.add(parts[1]);
    }
  }

  console.log(`Found ${variantDirs.size} variant(s): ${[...variantDirs].join(', ')}`);

  if (dryRun) {
    console.log('\nDry run - would restore to:', resolvedRoot);
    return;
  }

  // Extract archive
  const parentDir = path.dirname(resolvedRoot);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  const extractResult = spawnSync('tar', ['-xzf', archivePath, '-C', parentDir], {
    stdio: 'pipe',
    encoding: 'utf8',
  });

  if (extractResult.status !== 0) {
    console.error('Error extracting archive:');
    console.error(extractResult.stderr || extractResult.stdout);
    process.exitCode = 1;
    return;
  }

  console.log(`✓ Restored ${variantDirs.size} variant(s) to ${resolvedRoot}`);

  // Verify restored variants
  const restored = core.listVariants(resolvedRoot);
  console.log(`  Variants: ${restored.map((v) => v.name).join(', ')}`);
}

/**
 * Execute the backup command
 */
export function runBackupCommand({ opts }: BackupCommandOptions): void {
  const positional = opts._ || [];
  const rootDir = (opts.root as string) || core.DEFAULT_ROOT;
  const dryRun = Boolean(opts['dry-run']);
  const force = Boolean(opts.force);

  if (opts.help || opts.h) {
    showBackupHelp();
    return;
  }

  // Check if first positional is 'restore'
  const operation = positional[0];

  if (operation === 'restore') {
    const archivePath = (opts.file as string) || positional[1];
    if (!archivePath) {
      console.error('Error: Archive path required for restore.');
      showBackupHelp();
      process.exitCode = 1;
      return;
    }
    restoreBackup(archivePath, rootDir, dryRun, force);
    return;
  }

  // Default: create backup
  const timestamp = new Date().toISOString().split('T')[0];
  const defaultOutput = `cc-mirror-backup-${timestamp}.tar.gz`;
  const outputPath = (opts.out as string) || positional[0] || defaultOutput;

  createBackup(rootDir, outputPath, dryRun, force);
}
