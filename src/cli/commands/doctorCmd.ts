/**
 * Doctor command - checks health of all variants
 */

import { spawnSync } from 'node:child_process';
import * as core from '../../core/index.js';
import { printDoctor } from '../doctor.js';
import type { ParsedArgs } from '../args.js';

export interface DoctorCommandOptions {
  opts: ParsedArgs;
}

/**
 * Fetch the latest @anthropic-ai/claude-code version from npm
 */
function getLatestNpmVersion(): string | undefined {
  try {
    const result = spawnSync('npm', ['view', '@anthropic-ai/claude-code', 'version'], {
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 10000,
      shell: process.platform === 'win32',
    });
    if (result.status === 0 && result.stdout) {
      return result.stdout.trim();
    }
  } catch {
    // Ignore errors
  }
  return undefined;
}

/**
 * Execute the doctor command
 */
export function runDoctorCommand({ opts }: DoctorCommandOptions): void {
  const rootDir = (opts.root as string) || core.DEFAULT_ROOT;
  const binDir = (opts['bin-dir'] as string) || core.DEFAULT_BIN_DIR;
  const isStrict = Boolean(opts.strict || opts.fix);
  const isFix = Boolean(opts.fix);
  const checkMcp = Boolean(opts['check-mcp']);
  const verbose = Boolean(opts.verbose || opts.v);

  // Fetch latest version in strict mode for comparison
  let latestVersion: string | undefined;
  if (isStrict) {
    latestVersion = getLatestNpmVersion();
  }

  const report = core.doctor(rootDir, binDir, {
    strict: isStrict,
    checkMcp,
    latestVersion,
    fix: isFix,
  });

  if (opts.json === true) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printDoctor(report, { verbose });
  }

  if (isStrict && report.some((item) => !item.ok)) {
    process.exitCode = 1;
  }
}
