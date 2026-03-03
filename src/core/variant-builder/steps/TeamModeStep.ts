/**
 * TeamModeStep - Configures team mode features during variant creation
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

import type { BuildContext, BuildStep } from '../types.js';
import { teamModeService } from '../shared/team-mode-service.js';

export class TeamModeStep implements BuildStep {
  name = 'TeamMode';

  private shouldEnableTeamMode(ctx: BuildContext): boolean {
    // Enable if explicitly requested via params OR if provider defaults to team mode
    return Boolean(ctx.params.enableTeamMode) || Boolean(ctx.provider.enablesTeamMode);
  }

  execute(ctx: BuildContext): void {
    if (!this.shouldEnableTeamMode(ctx)) return;
    ctx.report('Enabling team mode...');

    teamModeService.enable(
      {
        npmDir: ctx.paths.npmDir,
        configDir: ctx.paths.configDir,
        tweakDir: ctx.paths.tweakDir,
      },
      { notes: ctx.state.notes, meta: ctx.state.meta }
    );
  }

  async executeAsync(ctx: BuildContext): Promise<void> {
    if (!this.shouldEnableTeamMode(ctx)) return;
    await ctx.report('Enabling team mode...');

    teamModeService.enable(
      {
        npmDir: ctx.paths.npmDir,
        configDir: ctx.paths.configDir,
        tweakDir: ctx.paths.tweakDir,
      },
      { notes: ctx.state.notes, meta: ctx.state.meta }
    );
  }
}
