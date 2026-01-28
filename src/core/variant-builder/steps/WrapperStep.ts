/**
 * WrapperStep - Writes the CLI wrapper script
 */

import { writeWrapperForPlatform, type WrapperOptions } from '../../wrapper.js';
import type { BuildContext, BuildStep } from '../types.js';

export class WrapperStep implements BuildStep {
  name = 'Wrapper';

  execute(ctx: BuildContext): void {
    ctx.report('Writing CLI wrapper...');
    const options: WrapperOptions = {
      requiresTranslation: ctx.provider.requiresTranslation,
    };
    writeWrapperForPlatform(ctx.paths.wrapperPath, ctx.paths.configDir, ctx.state.binaryPath, 'node', options);
  }

  async executeAsync(ctx: BuildContext): Promise<void> {
    await ctx.report('Writing CLI wrapper...');
    const options: WrapperOptions = {
      requiresTranslation: ctx.provider.requiresTranslation,
    };
    writeWrapperForPlatform(ctx.paths.wrapperPath, ctx.paths.configDir, ctx.state.binaryPath, 'node', options);
  }
}
