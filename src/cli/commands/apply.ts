/**
 * Apply command - re-apply tweakcc theming without reinstalling npm
 */

import * as core from '../../core/index.js';
import { assertValidVariantName } from '../../core/validation.js';
import { printSummary } from '../utils/printSummary.js';
import { getWrapperPath } from '../../core/wrapper.js';
import type { ParsedArgs } from '../args.js';

export interface ApplyCommandOptions {
  opts: ParsedArgs;
}

function showApplyHelp(): void {
  console.log(`
npx cc-mirror apply - Re-apply tweakcc theming (no npm reinstall)

USAGE:
  npx cc-mirror apply [name]        Apply to specific variant
  npx cc-mirror apply --all         Apply to all variants

DESCRIPTION:
  Re-applies tweakcc theming and config updates without reinstalling
  the npm package or regenerating wrappers. Use this after updating
  tweakcc or changing brand themes.

OPTIONS:
  --all                  Apply to all variants
  --brand <preset>       Override brand theme
  --verbose              Show detailed progress

EXAMPLES:
  npx cc-mirror apply zai            # Re-apply theming to zai
  npx cc-mirror apply --all          # Re-apply to all variants
  npx cc-mirror apply zai --brand minimax  # Switch theme
`);
}

export function runApplyCommand({ opts }: ApplyCommandOptions): void {
  if (opts.help || opts.h) {
    showApplyHelp();
    return;
  }

  const rootDir = (opts.root as string) || core.DEFAULT_ROOT;
  const resolvedRoot = core.expandTilde(rootDir) ?? rootDir;
  const applyAll = Boolean(opts.all);
  const brand = opts.brand as string | undefined;
  const verbose = Boolean(opts.verbose || opts.v);

  const variants = core.listVariants(resolvedRoot);
  if (variants.length === 0) {
    console.log(`No variants found in ${resolvedRoot}`);
    return;
  }

  let targets: string[];
  if (applyAll) {
    targets = variants.map((v) => v.name);
  } else {
    const target = opts._ && opts._[0];
    if (!target) {
      if (variants.length === 1) {
        targets = [variants[0].name];
      } else {
        console.error('Error: variant name required (or use --all)');
        console.error(`Available: ${variants.map((v) => v.name).join(', ')}`);
        process.exitCode = 1;
        return;
      }
    } else {
      targets = [assertValidVariantName(target)];
    }
  }

  for (const name of targets) {
    const entry = variants.find((v) => v.name === name);
    if (!entry) {
      console.error(`Variant not found: ${name}`);
      continue;
    }

    if (verbose) {
      console.log(`Applying to ${name}...`);
    }

    const result = core.updateVariant(resolvedRoot, name, {
      settingsOnly: true,
      brand,
    });

    const binDir = result.meta.binDir || core.DEFAULT_BIN_DIR;
    const wrapperPath = getWrapperPath(binDir, name);

    printSummary({
      action: 'Applied',
      meta: result.meta,
      wrapperPath,
      notes: result.notes,
    });
  }
}
