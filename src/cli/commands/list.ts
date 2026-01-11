/**
 * List command - lists all variants
 */

import * as core from '../../core/index.js';
import type { ParsedArgs } from '../args.js';

export interface ListCommandOptions {
  opts: ParsedArgs;
}

/**
 * Execute the list command
 */
export function runListCommand({ opts }: ListCommandOptions): void {
  const rootDir = (opts.root as string) || core.DEFAULT_ROOT;
  const resolvedRoot = core.expandTilde(rootDir) ?? rootDir;
  const variants = core.listVariants(resolvedRoot);
  if (opts.json === true) {
    console.log(JSON.stringify(variants, null, 2));
    return;
  }
  if (variants.length === 0) {
    console.log(`No variants found in ${resolvedRoot}`);
    return;
  }
  for (const entry of variants) {
    console.log(entry.name);
  }
}
