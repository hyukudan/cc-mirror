/**
 * Remove command - removes a variant
 */

import * as core from '../../core/index.js';
import { assertValidVariantName } from '../../core/validation.js';
import type { ParsedArgs } from '../args.js';

export interface RemoveCommandOptions {
  opts: ParsedArgs;
}

/**
 * Execute the remove command
 */
export function runRemoveCommand({ opts }: RemoveCommandOptions): void {
  let target = opts._ && opts._[0];
  if (!target) {
    throw new Error('remove requires a variant name');
  }
  target = assertValidVariantName(target);
  const rootDir = (opts.root as string) || core.DEFAULT_ROOT;
  core.removeVariant(rootDir, target);
  console.log(`Removed ${target}`);
}
