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

import fs from 'node:fs';
import path from 'node:path';
import { installOrchestratorSkill, installTaskManagerSkill } from '../../skills.js';
import { copyTeamPackPrompts, configureTeamToolset } from '../../../team-pack/index.js';
import type { BuildContext, BuildStep } from '../types.js';

// The minified function that controls team mode (only present in <=2.0.x)
const TEAM_MODE_DISABLED = 'function sU(){return!1}';
const TEAM_MODE_ENABLED = 'function sU(){return!0}';

export class TeamModeStep implements BuildStep {
  name = 'TeamMode';

  private shouldEnableTeamMode(ctx: BuildContext): boolean {
    // Enable if explicitly requested via params OR if provider defaults to team mode
    return Boolean(ctx.params.enableTeamMode) || Boolean(ctx.provider.enablesTeamMode);
  }

  execute(ctx: BuildContext): void {
    if (!this.shouldEnableTeamMode(ctx)) return;
    ctx.report('Enabling team mode...');
    this.enableTeamMode(ctx);
  }

  async executeAsync(ctx: BuildContext): Promise<void> {
    if (!this.shouldEnableTeamMode(ctx)) return;
    await ctx.report('Enabling team mode...');
    this.enableTeamMode(ctx);
  }

  private enableTeamMode(ctx: BuildContext): void {
    const { state, paths } = ctx;

    // --- 1. cli.js patch (only for <=2.0.x where Task tools are gated) ---
    this.tryPatchCli(ctx);

    // --- 2. Configure settings.json (env vars + skill permissions) ---
    this.configureSettings(ctx);

    // --- 3. Install skills ---
    const skillResult = installOrchestratorSkill(paths.configDir);
    if (skillResult.status === 'installed') {
      state.notes.push('Multi-agent orchestrator skill installed');
    } else if (skillResult.status === 'failed') {
      state.notes.push(`Warning: orchestrator skill install failed: ${skillResult.message}`);
    }

    const taskSkillResult = installTaskManagerSkill(paths.configDir);
    if (taskSkillResult.status === 'installed') {
      state.notes.push('Task manager skill installed');
    } else if (taskSkillResult.status === 'failed') {
      state.notes.push(`Warning: task-manager skill install failed: ${taskSkillResult.message}`);
    }

    // --- 4. Team pack prompts ---
    const systemPromptsDir = path.join(paths.tweakDir, 'system-prompts');
    const copiedFiles = copyTeamPackPrompts(systemPromptsDir);
    if (copiedFiles.length > 0) {
      state.notes.push(`Team pack prompts installed (${copiedFiles.join(', ')})`);
    }

    // --- 5. Configure toolset (block TodoWrite) ---
    const tweakccConfigPath = path.join(paths.tweakDir, 'config.json');
    if (configureTeamToolset(tweakccConfigPath)) {
      state.notes.push('Team toolset configured (TodoWrite blocked)');
    }

    state.notes.push('Team mode enabled successfully');
  }

  /**
   * Attempt to patch cli.js for older Claude Code versions (<=2.0.x).
   * On 2.1.16+ the Task tools are native, so no patch is needed.
   */
  private tryPatchCli(ctx: BuildContext): void {
    const { state, paths } = ctx;
    const cliPath = path.join(paths.npmDir, 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');

    if (!fs.existsSync(cliPath)) {
      state.notes.push('Warning: cli.js not found, skipping patch');
      return;
    }

    const content = fs.readFileSync(cliPath, 'utf8');

    // Already patched
    if (content.includes(TEAM_MODE_ENABLED)) return;

    // Not patchable — newer version with native Task tools
    if (!content.includes(TEAM_MODE_DISABLED)) {
      state.notes.push('Native Task tools detected (2.1.16+), cli.js patch not needed');
      return;
    }

    // Legacy version — apply patch
    const backupPath = `${cliPath}.backup`;
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(cliPath, backupPath);
    }

    const patched = content.replace(TEAM_MODE_DISABLED, TEAM_MODE_ENABLED);
    fs.writeFileSync(cliPath, patched);

    if (fs.readFileSync(cliPath, 'utf8').includes(TEAM_MODE_ENABLED)) {
      state.notes.push('cli.js patched for legacy Task tools');
    } else {
      state.notes.push('Warning: cli.js patch verification failed');
    }
  }

  private configureSettings(ctx: BuildContext): void {
    const { state, paths } = ctx;
    const settingsPath = path.join(paths.configDir, 'settings.json');
    if (!fs.existsSync(settingsPath)) return;

    try {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      settings.env = settings.env || {};
      if (!settings.env.CLAUDE_CODE_TEAM_MODE) {
        settings.env.CLAUDE_CODE_TEAM_MODE = '1';
      }
      if (settings.env.CLAUDE_CODE_TEAM_NAME) {
        delete settings.env.CLAUDE_CODE_TEAM_NAME;
      }
      if (!settings.env.CLAUDE_CODE_AGENT_TYPE) {
        settings.env.CLAUDE_CODE_AGENT_TYPE = 'team-lead';
      }

      settings.permissions = settings.permissions || {};
      settings.permissions.allow = settings.permissions.allow || [];
      for (const skill of ['Skill(orchestration)', 'Skill(task-manager)']) {
        if (!settings.permissions.allow.includes(skill)) {
          settings.permissions.allow.push(skill);
        }
      }

      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    } catch {
      state.notes.push('Warning: Could not update settings.json with team env vars');
    }
  }
}
