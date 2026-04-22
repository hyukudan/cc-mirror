/**
 * Shared Team Mode Service - Used by both TeamModeStep and TeamModeUpdateStep
 *
 * Centralizes team mode enable/disable logic to avoid duplication between
 * variant creation and update operations.
 */

import path from 'node:path';
import type { VariantMeta } from '../../types.js';
import {
  installOrchestratorSkill,
  removeOrchestratorSkill,
  installTaskManagerSkill,
  removeTaskManagerSkill,
} from '../../skills.js';
import { copyTeamPackPrompts, removeTeamToolset } from '../../../team-pack/index.js';
import { configureSettings, unsetTeamModeEnv } from '../team-mode-utils.js';
import { VARIANT_DIRS } from '../constants.js';

export interface TeamModeContext {
  configDir: string;
  tweakDir: string;
}

export interface TeamModeState {
  notes: string[];
  meta?: VariantMeta;
}

/**
 * Shared team mode service for enabling/disabling team features
 */
export class TeamModeService {
  /**
   * Enable team mode with all its features
   */
  enable(ctx: TeamModeContext, state: TeamModeState): void {
    // --- 1. Configure settings.json (env vars + skill permissions) ---
    configureSettings(path.join(ctx.configDir, 'settings.json'), state);

    // --- 2. Install skills ---
    this.installSkills(ctx.configDir, state);

    // --- 3. Team pack prompts ---
    const systemPromptsDir = path.join(ctx.tweakDir, VARIANT_DIRS.SYSTEM_PROMPTS);
    const copiedFiles = copyTeamPackPrompts(systemPromptsDir);
    if (copiedFiles.length > 0) {
      state.notes.push(`Team pack prompts installed (${copiedFiles.join(', ')})`);
    }

    state.notes.push('Team mode enabled successfully');

    // Update meta if available
    if (state.meta) {
      state.meta.teamModeEnabled = true;
    }
  }

  /**
   * Disable team mode and remove its features
   */
  disable(ctx: TeamModeContext, state: TeamModeState): void {
    // Remove TodoWrite from settings.json permissions.deny
    if (removeTeamToolset(ctx.configDir)) {
      state.notes.push('TodoWrite unblocked (team toolset removed)');
    }

    // Unset CLAUDE_CODE_TEAM_MODE
    unsetTeamModeEnv(path.join(ctx.configDir, 'settings.json'));

    // Update meta if available
    if (state.meta) {
      state.meta.teamModeEnabled = false;
    }

    state.notes.push('Team mode disabled');

    // Remove skills
    this.removeSkills(ctx.configDir, state);
  }

  /**
   * Install orchestrator and task manager skills
   */
  private installSkills(configDir: string, state: TeamModeState): void {
    const skillResult = installOrchestratorSkill(configDir);
    if (skillResult.status === 'installed') {
      state.notes.push('Multi-agent orchestrator skill installed');
    } else if (skillResult.status === 'failed') {
      state.notes.push(`Warning: orchestrator skill install failed: ${skillResult.message}`);
    }

    const taskSkillResult = installTaskManagerSkill(configDir);
    if (taskSkillResult.status === 'installed') {
      state.notes.push('Task manager skill installed');
    } else if (taskSkillResult.status === 'failed') {
      state.notes.push(`Warning: task-manager skill install failed: ${taskSkillResult.message}`);
    }
  }

  /**
   * Remove orchestrator and task manager skills
   */
  private removeSkills(configDir: string, state: TeamModeState): void {
    const skillResult = removeOrchestratorSkill(configDir);
    if (skillResult.status === 'removed') {
      state.notes.push('Multi-agent orchestrator skill removed');
    } else if (skillResult.status === 'failed') {
      state.notes.push(`Warning: orchestrator skill removal failed: ${skillResult.message}`);
    }

    const taskSkillResult = removeTaskManagerSkill(configDir);
    if (taskSkillResult.status === 'removed') {
      state.notes.push('Task manager skill removed');
    } else if (taskSkillResult.status === 'failed') {
      state.notes.push(`Warning: task-manager skill removal failed: ${taskSkillResult.message}`);
    }
  }
}

/**
 * Singleton instance for convenience
 */
export const teamModeService = new TeamModeService();
