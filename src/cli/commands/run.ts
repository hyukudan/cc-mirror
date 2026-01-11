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
    console.error('run requires a variant name');
    process.exit(1);
  }
  try {
    target = assertValidVariantName(target);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }

  const rootDir = (opts.root as string) || core.DEFAULT_ROOT;
  const binDir = (opts['bin-dir'] as string) || core.DEFAULT_BIN_DIR;
  const resolvedRoot = core.expandTilde(rootDir) ?? rootDir;
  const resolvedBin = core.expandTilde(binDir) ?? binDir;

  const variantDir = path.join(resolvedRoot, target);
  if (!fs.existsSync(variantDir)) {
    console.error(`Variant not found: ${target}`);
    process.exit(1);
  }

  const wrapperPath = getWrapperPath(resolvedBin, target);
  if (!fs.existsSync(wrapperPath)) {
    console.error(`Wrapper not found: ${wrapperPath}`);
    console.error('Run `cc-mirror update <name>` or `cc-mirror path --apply` to fix.');
    process.exit(1);
  }

  const args = opts._.slice(1);
  const result = spawnSync(wrapperPath, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (typeof result.status === 'number') {
    process.exit(result.status);
  }
}
