/**
 * TeamModeUpdateStep - Configures team mode features on update
 *
 * Team mode enables:
 * - TaskCreate, TaskGet, TaskUpdate, TaskList tools
 * - Team collaboration via shared task storage
 * - Orchestrator and task-manager skills
 *
 * Claude Code 2.1.16+ has native Task tools — the cli.js patch is only
 * needed for older versions (<=2.0.x) where the feature was gated behind
 * a minified flag. On newer versions the patch is skipped automatically.
 */

import { getProvider } from '../../../providers/index.js';
import type { UpdateContext, UpdateStep } from '../types.js';
import { teamModeService } from '../shared/team-mode-service.js';

export class TeamModeUpdateStep implements UpdateStep {
  name = 'TeamMode';

  private shouldEnableTeamMode(ctx: UpdateContext): boolean {
    // Enable if:
    // 1. Explicitly requested via opts, OR
    // 2. Provider defaults to team mode, OR
    // 3. Team mode is already enabled on this variant (to update skill)
    const provider = getProvider(ctx.meta.provider);
    return Boolean(ctx.opts.enableTeamMode) || Boolean(provider?.enablesTeamMode) || Boolean(ctx.meta.teamModeEnabled);
  }

  private shouldDisableTeamMode(ctx: UpdateContext): boolean {
    return Boolean(ctx.opts.disableTeamMode);
  }

  execute(ctx: UpdateContext): void {
    if (this.shouldDisableTeamMode(ctx)) {
      ctx.report('Disabling team mode...');
      teamModeService.disable(
        {
          npmDir: ctx.paths.npmDir,
          configDir: ctx.meta.configDir,
          tweakDir: ctx.meta.tweakDir,
        },
        { notes: ctx.state.notes, meta: ctx.meta }
      );
      return;
    }

    if (!this.shouldEnableTeamMode(ctx)) return;

    ctx.report('Enabling team mode...');
    teamModeService.enable(
      {
        npmDir: ctx.paths.npmDir,
        configDir: ctx.meta.configDir,
        tweakDir: ctx.meta.tweakDir,
      },
      { notes: ctx.state.notes, meta: ctx.meta }
    );
  }

  async executeAsync(ctx: UpdateContext): Promise<void> {
    if (this.shouldDisableTeamMode(ctx)) {
      await ctx.report('Disabling team mode...');
      teamModeService.disable(
        {
          npmDir: ctx.paths.npmDir,
          configDir: ctx.meta.configDir,
          tweakDir: ctx.meta.tweakDir,
        },
        { notes: ctx.state.notes, meta: ctx.meta }
      );
      return;
    }

    if (!this.shouldEnableTeamMode(ctx)) return;

    await ctx.report('Enabling team mode...');
    teamModeService.enable(
      {
        npmDir: ctx.paths.npmDir,
        configDir: ctx.meta.configDir,
        tweakDir: ctx.meta.tweakDir,
      },
      { notes: ctx.state.notes, meta: ctx.meta }
    );
  }
}
