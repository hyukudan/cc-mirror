/**
 * Dashboard command - displays real-time status of all variants
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as core from '../../core/index.js';
import type { ParsedArgs } from '../args.js';

export interface DashboardCommandOptions {
  opts: ParsedArgs;
}

export interface DashboardOptions {
  rootDir?: string;
  binDir?: string;
  watch?: boolean;
  interval?: number;
  json?: boolean;
}

interface VariantStats {
  name: string;
  status: 'ready' | 'error' | 'unknown';
  size: string;
  sizeBytes: number;
  provider?: string;
  teamModeEnabled?: boolean;
  claudeCodeVersion?: string;
  lastModified?: Date;
}

interface TeamInfo {
  name: string;
  taskCount: number;
}

interface DashboardData {
  variants: VariantStats[];
  teams: TeamInfo[];
  totalDiskBytes: number;
  totalDisk: string;
  freeDisk: string;
  recommendations: string[];
}

/**
 * Execute the dashboard command
 */
export async function runDashboardCommand({ opts }: DashboardCommandOptions): Promise<void> {
  const rootDir = (opts.root as string) || core.DEFAULT_ROOT;
  const binDir = (opts.binDir as string) || core.DEFAULT_BIN_DIR;
  const watch = Boolean(opts.watch);
  const interval = typeof opts.interval === 'number' ? opts.interval : 5000;
  const json = Boolean(opts.json);

  await runDashboard({
    rootDir,
    binDir,
    watch,
    interval,
    json,
  });
}

/**
 * Main dashboard function - can be used programmatically
 */
export async function runDashboard(options: DashboardOptions = {}): Promise<void> {
  const rootDir = core.expandTilde(options.rootDir || core.DEFAULT_ROOT) ?? options.rootDir ?? core.DEFAULT_ROOT;
  const binDir = core.expandTilde(options.binDir || core.DEFAULT_BIN_DIR) ?? options.binDir ?? core.DEFAULT_BIN_DIR;

  if (options.watch) {
    // Watch mode - continuous refresh
    const interval = options.interval || 5000;

    // Initial render
    renderDashboard(rootDir, binDir, options.json);

    // Set up interval
    const timer = setInterval(() => {
      if (process.stdout.isTTY) {
        // Clear screen for TTY
        process.stdout.write('\x1B[2J\x1B[0f');
      }
      renderDashboard(rootDir, binDir, options.json);
    }, interval);

    // Handle graceful shutdown
    const cleanup = () => {
      clearInterval(timer);
      process.exit(0);
    };
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    // Keep process alive
    await new Promise(() => {}); // Never resolves
  } else {
    renderDashboard(rootDir, binDir, options.json);
  }
}

/**
 * Collect dashboard data
 */
function collectDashboardData(rootDir: string, binDir: string): DashboardData {
  const resolvedRoot = core.expandTilde(rootDir) ?? rootDir;
  const resolvedBin = core.expandTilde(binDir) ?? binDir;

  const variants = core.listVariants(resolvedRoot);
  const doctorReport = core.doctor(resolvedRoot, resolvedBin, { strict: true });

  const variantStats: VariantStats[] = [];
  const teams: TeamInfo[] = [];
  let totalDiskBytes = 0;
  const recommendations: string[] = [];

  for (const variant of variants) {
    const variantDir = path.join(resolvedRoot, variant.name);
    const sizeBytes = getDirSize(variantDir);
    totalDiskBytes += sizeBytes;

    const doctorItem = doctorReport.find((r) => r.name === variant.name);
    const status: 'ready' | 'error' | 'unknown' = doctorItem?.ok ? 'ready' : doctorItem ? 'error' : 'unknown';

    const stats: VariantStats = {
      name: variant.name,
      status,
      size: formatBytes(sizeBytes),
      sizeBytes,
      provider: variant.meta?.provider,
      teamModeEnabled: variant.meta?.teamModeEnabled,
      claudeCodeVersion: doctorItem?.claudeCodeVersion,
    };

    // Get last modified time
    try {
      const variantJsonPath = path.join(variantDir, 'variant.json');
      if (fs.existsSync(variantJsonPath)) {
        const stat = fs.statSync(variantJsonPath);
        stats.lastModified = stat.mtime;
      }
    } catch {
      // Ignore
    }

    variantStats.push(stats);

    // Collect team info
    if (variant.meta?.teamModeEnabled) {
      const tasksDir = path.join(variantDir, 'config', 'tasks');
      if (fs.existsSync(tasksDir)) {
        try {
          const teamDirs = fs.readdirSync(tasksDir, { withFileTypes: true }).filter((d) => d.isDirectory());

          for (const teamDir of teamDirs) {
            const teamPath = path.join(tasksDir, teamDir.name);
            const taskFiles = fs.readdirSync(teamPath).filter((f) => f.endsWith('.json'));

            teams.push({
              name: teamDir.name,
              taskCount: taskFiles.length,
            });
          }
        } catch {
          // Ignore
        }
      }
    }

    // Add recommendations based on doctor issues
    if (doctorItem?.issues) {
      for (const issue of doctorItem.issues) {
        recommendations.push(`${variant.name}: ${issue}`);
      }
    }
    if (doctorItem?.warnings) {
      for (const warning of doctorItem.warnings) {
        recommendations.push(`${variant.name}: ${warning}`);
      }
    }
  }

  // Get free disk space
  let freeDisk = 'unknown';
  try {
    const homeDir = os.homedir();
    // Use df on Unix systems
    if (process.platform !== 'win32') {
      const result = spawnSync('df', ['-B1', homeDir], { encoding: 'utf8' });
      if (result.status === 0) {
        const lines = result.stdout.split('\n');
        if (lines.length >= 2) {
          const parts = lines[1].split(/\s+/);
          if (parts.length >= 4) {
            const freeBytes = parseInt(parts[3], 10);
            if (!isNaN(freeBytes)) {
              freeDisk = formatBytes(freeBytes);
            }
          }
        }
      }
    }
  } catch {
    // Ignore
  }

  return {
    variants: variantStats,
    teams,
    totalDiskBytes,
    totalDisk: formatBytes(totalDiskBytes),
    freeDisk,
    recommendations: recommendations.slice(0, 5), // Limit to 5
  };
}

/**
 * Render the dashboard to stdout
 */
function renderDashboard(rootDir: string, binDir: string, json?: boolean): void {
  const data = collectDashboardData(rootDir, binDir);

  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const width = 50;
  const border = (left: string, fill: string, right: string) => `${left}${fill.repeat(width - 2)}${right}`;

  const line = (content: string) => {
    const padded = ` ${content}`.padEnd(width - 2);
    return `│${padded}│`;
  };

  console.log(border('┌', '─', '┐'));
  console.log(line('CC-Mirror Dashboard'));
  console.log(border('├', '─', '┤'));

  // Variants section
  if (data.variants.length === 0) {
    console.log(line('No variants found'));
  } else {
    console.log(line(`Variants (${data.variants.length})`));
    console.log(line(''));
    console.log(line('  Name             Status    Size'));
    console.log(line('  ─────────────────────────────────'));

    for (let i = 0; i < data.variants.length; i++) {
      const v = data.variants[i];
      const isLast = i === data.variants.length - 1;
      const prefix = isLast ? '└─' : '├─';
      const statusIcon = v.status === 'ready' ? '✓' : v.status === 'error' ? '✗' : '?';
      const statusStr = v.status === 'ready' ? 'Ready' : v.status === 'error' ? 'Error' : 'Unknown';

      const nameStr = v.name.substring(0, 12).padEnd(12);
      const statusDisplay = `${statusIcon} ${statusStr}`.padEnd(10);
      const sizeStr = v.size.padStart(6);

      console.log(line(`  ${prefix} ${nameStr} ${statusDisplay} ${sizeStr}`));
    }
  }

  console.log(line(''));
  console.log(border('├', '─', '┤'));

  // Team Mode section
  const teamModeVariants = data.variants.filter((v) => v.teamModeEnabled).length;
  console.log(line(`Team Mode: ${teamModeVariants} active variant${teamModeVariants !== 1 ? 's' : ''}`));

  if (data.teams.length > 0) {
    for (const team of data.teams.slice(0, 3)) {
      console.log(line(`  • ${team.name}: ${team.taskCount} task${team.taskCount !== 1 ? 's' : ''}`));
    }
    if (data.teams.length > 3) {
      console.log(line(`  ... and ${data.teams.length - 3} more`));
    }
  }

  console.log(line(''));
  console.log(border('├', '─', '┤'));

  // Disk usage section
  console.log(line(`Disk: ${data.totalDisk} used / ${data.freeDisk} free`));

  // Recommendations section
  if (data.recommendations.length > 0) {
    console.log(line(''));
    console.log(border('├', '─', '┤'));
    console.log(line('Recommendations:'));
    for (const rec of data.recommendations) {
      const truncated = rec.length > width - 6 ? rec.substring(0, width - 9) + '...' : rec;
      console.log(line(`  • ${truncated}`));
    }
  }

  console.log(border('└', '─', '┘'));

  // Timestamp
  const now = new Date();
  console.log(`\nUpdated: ${now.toLocaleTimeString()}`);
}

/**
 * Calculate directory size recursively
 */
function getDirSize(dirPath: string): number {
  if (!fs.existsSync(dirPath)) return 0;

  let totalSize = 0;

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules for faster calculation (estimate instead)
        if (entry.name === 'node_modules') {
          // Estimate node_modules size based on typical Claude Code install
          totalSize += 150 * 1024 * 1024; // ~150MB estimate
        } else {
          totalSize += getDirSize(fullPath);
        }
      } else if (entry.isFile()) {
        try {
          const stat = fs.statSync(fullPath);
          totalSize += stat.size;
        } catch {
          // Ignore inaccessible files
        }
      }
    }
  } catch {
    // Ignore inaccessible directories
  }

  return totalSize;
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);

  return `${value.toFixed(1)} ${units[i]}`;
}
