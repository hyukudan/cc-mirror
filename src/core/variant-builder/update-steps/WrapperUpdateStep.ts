/**
 * WrapperUpdateStep - Writes or updates the CLI wrapper script
 */

import { ensureDir } from '../../fs.js';
import { expandTilde } from '../../paths.js';
import { getWrapperPath, writeWrapperForPlatform, type WrapperOptions } from '../../wrapper.js';
import { ensureWindowsUserPath } from '../../windows-path.js';
import { getProvider } from '../../../providers/index.js';
import type { UpdateContext, UpdateStep } from '../types.js';

export class WrapperUpdateStep implements UpdateStep {
  name = 'Wrapper';

  execute(ctx: UpdateContext): void {
    if (ctx.opts.settingsOnly) return;
    ctx.report('Writing CLI wrapper...');
    this.writeWrapper(ctx);
  }

  async executeAsync(ctx: UpdateContext): Promise<void> {
    if (ctx.opts.settingsOnly) return;
    await ctx.report('Writing CLI wrapper...');
    this.writeWrapper(ctx);
  }

  private writeWrapper(ctx: UpdateContext): void {
    const { name, opts, meta } = ctx;

    const resolvedBin = opts.binDir ? (expandTilde(opts.binDir) ?? opts.binDir) : meta.binDir;

    if (resolvedBin) {
      ensureDir(resolvedBin);
      const wrapperPath = getWrapperPath(resolvedBin, name);

      // Check if provider requires translation
      const provider = getProvider(meta.provider);
      const options: WrapperOptions = {
        requiresTranslation: provider?.requiresTranslation,
      };

      writeWrapperForPlatform(wrapperPath, meta.configDir, meta.binaryPath, options);
      if (process.platform === 'win32') {
        const pathResult = ensureWindowsUserPath(resolvedBin);
        if (pathResult.added) {
          ctx.report(`Added ${resolvedBin} to Windows user PATH`);
        }
      }
      meta.binDir = resolvedBin;
    }
  }
}
