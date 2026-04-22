/**
 * Team mode utilities - shared between TeamModeStep and TeamModeUpdateStep
 *
 * Team mode enables:
 * - TaskCreate, TaskGet, TaskUpdate, TaskList tools (native in 2.1.16+)
 * - Teammate tool with spawnTeam (native in 2.1.x, gated by CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS)
 * - Team collaboration via shared task storage
 * - Orchestrator and task-manager skills
 *
 * Claude Code 2.1.16+ has native Task tools and Teammate tool, so there is no
 * longer a cli.js patch. All enablement happens through settings.json +
 * environment variables + skills/prompts.
 */

import fs from 'node:fs';
import { ENV_VARS, SKILLS, BLOCKED_TOOLS } from './constants.js';

export interface TeamModeState {
  notes: string[];
}

/**
 * Configure settings.json with team mode environment variables and permissions
 */
export function configureSettings(settingsPath: string, state: TeamModeState): void {
  if (!fs.existsSync(settingsPath)) return;

  try {
    const content = fs.readFileSync(settingsPath, 'utf8');
    const settingsData = JSON.parse(content);

    settingsData.env = settingsData.env || {};

    // Use native env var for Claude Code 2.1.x+
    if (!settingsData.env[ENV_VARS.AGENT_TEAMS]) {
      settingsData.env[ENV_VARS.AGENT_TEAMS] = '1';
    }

    // Clean up legacy env vars that are no longer recognized
    delete settingsData.env[ENV_VARS.TEAM_MODE];
    delete settingsData.env[ENV_VARS.AGENT_TYPE];

    // Never set CLAUDE_CODE_TEAM_NAME here - wrapper sets it dynamically at runtime
    if (settingsData.env[ENV_VARS.TEAM_NAME]) {
      delete settingsData.env[ENV_VARS.TEAM_NAME];
    }

    settingsData.permissions = settingsData.permissions || {};
    settingsData.permissions.allow = settingsData.permissions.allow || [];
    for (const skill of [SKILLS.ORCHESTRATION, SKILLS.TASK_MANAGER]) {
      if (!settingsData.permissions.allow.includes(skill)) {
        settingsData.permissions.allow.push(skill);
      }
    }

    // Block TodoWrite via native permissions (not tweakcc toolsets)
    settingsData.permissions.deny = settingsData.permissions.deny || [];
    if (!settingsData.permissions.deny.includes(BLOCKED_TOOLS.TODO_WRITE)) {
      settingsData.permissions.deny.push(BLOCKED_TOOLS.TODO_WRITE);
      state.notes.push('TodoWrite blocked via permissions.deny');
    }

    fs.writeFileSync(settingsPath, JSON.stringify(settingsData, null, 2));
  } catch {
    state.notes.push('Warning: Could not update settings.json with team env vars');
  }
}

/**
 * Unset team mode env vars from settings.json
 */
export function unsetTeamModeEnv(settingsPath: string): void {
  if (!fs.existsSync(settingsPath)) return;

  try {
    const content = fs.readFileSync(settingsPath, 'utf8');
    const settings = JSON.parse(content);
    let changed = false;

    for (const key of [ENV_VARS.AGENT_TEAMS, ENV_VARS.TEAM_MODE, ENV_VARS.AGENT_TYPE]) {
      if (settings.env?.[key]) {
        delete settings.env[key];
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    }
  } catch {
    // Ignore errors on disable
  }
}
