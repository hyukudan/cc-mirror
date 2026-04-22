/**
 * TeamModeStep - Configures team mode features during variant creation
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
        configDir: ctx.paths.configDir,
        tweakDir: ctx.paths.tweakDir,
      },
      { notes: ctx.state.notes, meta: ctx.state.meta }
    );
  }
}
