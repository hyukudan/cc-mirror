/**
 * TweakccStep - Runs tweakcc patches and applies prompt packs
 */

import { applyPromptPack } from '../../prompt-pack.js';
import { getTweakccFallbackNote, runTweakcc, runTweakccAsync } from '../../tweakcc.js';
import { formatTweakccFailure } from '../../errors.js';
import { getTweakccSkipReason } from '../utils.js';
import type { BuildContext, BuildStep } from '../types.js';

export class TweakccStep implements BuildStep {
  name = 'Tweakcc';

  execute(ctx: BuildContext): void {
    const { params, paths, prefs, state } = ctx;

    if (params.noTweak) {
      return;
    }

    const skipReason = getTweakccSkipReason(prefs.resolvedNpmVersion);
    if (skipReason) {
      state.notes.push(skipReason);
      return;
    }

    ctx.report('Running tweakcc patches...');
    state.tweakResult = runTweakcc(paths.tweakDir, state.binaryPath, prefs.commandStdio);
    const fallbackNote = getTweakccFallbackNote(state.tweakResult);
    if (fallbackNote && !state.notes.includes(fallbackNote)) {
      state.notes.push(fallbackNote);
    }

    if (state.tweakResult.status !== 0) {
      const output = `${state.tweakResult.stderr ?? ''}\n${state.tweakResult.stdout ?? ''}`.trim();
      throw new Error(formatTweakccFailure(output));
    }

    if (prefs.promptPackEnabled) {
      ctx.report('Applying prompt pack...');
      const packResult = applyPromptPack(paths.tweakDir, params.providerKey);

      if (packResult.changed) {
        state.notes.push(`Prompt pack applied (${packResult.updated.join(', ')})`);
        ctx.report('Re-applying tweakcc...');
        const reapply = runTweakcc(paths.tweakDir, state.binaryPath, prefs.commandStdio);
        state.tweakResult = reapply;
        const reapplyFallbackNote = getTweakccFallbackNote(reapply);
        if (reapplyFallbackNote && !state.notes.includes(reapplyFallbackNote)) {
          state.notes.push(reapplyFallbackNote);
        }

        if (reapply.status !== 0) {
          const output = `${reapply.stderr ?? ''}\n${reapply.stdout ?? ''}`.trim();
          throw new Error(formatTweakccFailure(output));
        }
      }
    }
  }

  async executeAsync(ctx: BuildContext): Promise<void> {
    const { params, paths, prefs, state } = ctx;

    if (params.noTweak) {
      return;
    }

    const skipReasonAsync = getTweakccSkipReason(prefs.resolvedNpmVersion);
    if (skipReasonAsync) {
      state.notes.push(skipReasonAsync);
      return;
    }

    await ctx.report('Running tweakcc patches...');
    state.tweakResult = await runTweakccAsync(paths.tweakDir, state.binaryPath, prefs.commandStdio);
    const fallbackNoteAsync = getTweakccFallbackNote(state.tweakResult);
    if (fallbackNoteAsync && !state.notes.includes(fallbackNoteAsync)) {
      state.notes.push(fallbackNoteAsync);
    }

    if (state.tweakResult.status !== 0) {
      const output = `${state.tweakResult.stderr ?? ''}\n${state.tweakResult.stdout ?? ''}`.trim();
      throw new Error(formatTweakccFailure(output));
    }

    if (prefs.promptPackEnabled) {
      await ctx.report('Applying prompt pack...');
      const packResult = applyPromptPack(paths.tweakDir, params.providerKey);

      if (packResult.changed) {
        state.notes.push(`Prompt pack applied (${packResult.updated.join(', ')})`);
        await ctx.report('Re-applying tweakcc...');
        const reapply = await runTweakccAsync(paths.tweakDir, state.binaryPath, prefs.commandStdio);
        state.tweakResult = reapply;
        const reapplyFallbackNoteAsync = getTweakccFallbackNote(reapply);
        if (reapplyFallbackNoteAsync && !state.notes.includes(reapplyFallbackNoteAsync)) {
          state.notes.push(reapplyFallbackNoteAsync);
        }

        if (reapply.status !== 0) {
          const output = `${reapply.stderr ?? ''}\n${reapply.stdout ?? ''}`.trim();
          throw new Error(formatTweakccFailure(output));
        }
      }
    }
  }
}
