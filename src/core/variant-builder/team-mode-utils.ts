/**
 * Team mode utilities - shared between TeamModeStep and TeamModeUpdateStep
 *
 * Team mode enables:
 * - TaskCreate, TaskGet, TaskUpdate, TaskList tools (native in 2.1.16+)
 * - Teammate tool with spawnTeam (native in 2.1.x, gated by CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS)
 * - Team collaboration via shared task storage
 * - Orchestrator and task-manager skills
 *
 * Claude Code 2.1.16+ has native Task tools and Teammate tool.
 * The cli.js patch is only needed for ancient versions (<=2.0.x).
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  TEAM_MODE_DISABLED,
  TEAM_MODE_ENABLED,
  CLAUDE_CODE_PACKAGE,
  CLAUDE_CODE_CLI_FILENAME,
  ENV_VARS,
  SKILLS,
  BLOCKED_TOOLS,
} from './constants.js';

export interface TeamModePaths {
  npmDir: string;
  configDir?: string;
  tweakDir?: string;
}

export interface TeamModeState {
  notes: string[];
}

/**
 * Attempt to patch cli.js for older Claude Code versions (<=2.0.x).
 * On 2.1.16+ the Task tools are native, so no patch is needed.
 */
export function tryPatchCli(paths: TeamModePaths, state: TeamModeState): void {
  const cliPath = path.join(paths.npmDir, 'node_modules', CLAUDE_CODE_PACKAGE, CLAUDE_CODE_CLI_FILENAME);

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

/**
 * Reverse the cli.js patch (for disabling team mode)
 */
export function reverseCliPatch(paths: TeamModePaths, state: TeamModeState): void {
  const cliPath = path.join(paths.npmDir, 'node_modules', CLAUDE_CODE_PACKAGE, CLAUDE_CODE_CLI_FILENAME);

  if (!fs.existsSync(cliPath)) {
    return;
  }

  const content = fs.readFileSync(cliPath, 'utf8');
  if (content.includes(TEAM_MODE_ENABLED)) {
    fs.writeFileSync(cliPath, content.replace(TEAM_MODE_ENABLED, TEAM_MODE_DISABLED));
    state.notes.push('Reversed cli.js team mode patch');
  }
}

export interface TeamModeSettings {
  agentType?: string;
}

/**
 * Configure settings.json with team mode environment variables and permissions
 */
export function configureSettings(settingsPath: string, state: TeamModeState, _settings: TeamModeSettings = {}): void {
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
