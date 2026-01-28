/**
 * Tweak command - launches tweakcc for a variant
 */

import * as core from '../../core/index.js';
import { assertValidVariantName } from '../../core/validation.js';
import type { ParsedArgs } from '../args.js';

export interface TweakCommandOptions {
  opts: ParsedArgs;
}

/**
 * Execute the tweak command
 */
export function runTweakCommand({ opts }: TweakCommandOptions): void {
  let target = opts._ && opts._[0];
  if (!target) {
    throw new Error('tweak requires a variant name');
  }
  target = assertValidVariantName(target);
  const rootDir = (opts.root as string) || core.DEFAULT_ROOT;
  core.tweakVariant(rootDir, target);
}
