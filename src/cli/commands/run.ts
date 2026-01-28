/**
 * Run command - launches a variant wrapper directly
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as core from '../../core/index.js';
import { getWrapperPath } from '../../core/wrapper.js';
import { assertValidVariantName } from '../../core/validation.js';
import type { ParsedArgs } from '../args.js';

export interface RunCommandOptions {
  opts: ParsedArgs;
}

/**
 * Execute the run command
 */
export function runRunCommand({ opts }: RunCommandOptions): void {
  let target = opts._ && opts._[0];
  if (!target) {
    throw new Error('run requires a variant name');
  }
  target = assertValidVariantName(target);

  const rootDir = (opts.root as string) || core.DEFAULT_ROOT;
  const binDir = (opts['bin-dir'] as string) || core.DEFAULT_BIN_DIR;
  const resolvedRoot = core.expandTilde(rootDir) ?? rootDir;
  const resolvedBin = core.expandTilde(binDir) ?? binDir;

  const variantDir = path.join(resolvedRoot, target);
  if (!fs.existsSync(variantDir)) {
    throw new Error(`Variant not found: ${target}`);
  }

  const wrapperPath = getWrapperPath(resolvedBin, target);
  if (!fs.existsSync(wrapperPath)) {
    throw new Error(
      `Wrapper not found: ${wrapperPath}\nRun \`cc-mirror update <name>\` or \`cc-mirror path --apply\` to fix.`
    );
  }

  const args = opts._.slice(1);
  const result = spawnSync(wrapperPath, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error) {
    throw result.error;
  }
  if (typeof result.status === 'number' && result.status !== 0) {
    process.exitCode = result.status;
  }
}
