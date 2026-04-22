/**
 * TeamModeUpdateStep - Configures team mode features on update
 *
 * Team mode enables:
 * - TaskCreate, TaskGet, TaskUpdate, TaskList tools (native in 2.1.16+)
 * - Team collaboration via shared task storage
 * - Orchestrator and task-manager skills
 *
 * No cli.js patching is required: Claude Code 2.1.16+ ships Task tools
 * natively, so enablement is purely configuration (settings.json env vars,
 * permissions, skills, and team-pack prompts).
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
        configDir: ctx.meta.configDir,
        tweakDir: ctx.meta.tweakDir,
      },
      { notes: ctx.state.notes, meta: ctx.meta }
    );
  }
}
