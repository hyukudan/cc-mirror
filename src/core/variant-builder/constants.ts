/**
 * Variant Builder Constants
 *
 * Centralizes all magic strings and constants used across the variant builder
 * to avoid duplication and improve maintainability.
 */

/**
 * Team mode CLI patch patterns (for Claude Code <= 2.0.x)
 */
export const TEAM_MODE_DISABLED = 'function sU(){return!1}';
export const TEAM_MODE_ENABLED = 'function sU(){return!0}';

/**
 * Claude Code package constants
 */
export const CLAUDE_CODE_PACKAGE = '@anthropic-ai/claude-code';
export const CLAUDE_CODE_CLI_FILENAME = 'cli.js';

/**
 * Environment variable names
 */
export const ENV_VARS = {
  TEAM_MODE: 'CLAUDE_CODE_TEAM_MODE',
  TEAM_NAME: 'CLAUDE_CODE_TEAM_NAME',
  AGENT_TYPE: 'CLAUDE_CODE_AGENT_TYPE',
  AGENT_ID: 'CLAUDE_CODE_AGENT_ID',
} as const;

/**
 * Skill names
 */
export const SKILLS = {
  ORCHESTRATION: 'Skill(orchestration)',
  TASK_MANAGER: 'Skill(task-manager)',
} as const;

/**
 * Blocked tools
 */
export const BLOCKED_TOOLS = {
  TODO_WRITE: 'TodoWrite',
} as const;

/**
 * Default agent type for team mode
 */
export const DEFAULT_AGENT_TYPE = 'team-lead';

/**
 * Settings file permissions
 */
export const SETTINGS_PERMISSIONS = {
  ALLOW: [SKILLS.ORCHESTRATION, SKILLS.TASK_MANAGER],
  DENY: [BLOCKED_TOOLS.TODO_WRITE],
} as const;

/**
 * Directory names within variant
 */
export const VARIANT_DIRS = {
  CONFIG: 'config',
  TWEAKCC: 'tweakcc',
  NPM: 'npm',
  TASKS: 'tasks',
  SYSTEM_PROMPTS: 'system-prompts',
} as const;

/**
 * File names
 */
export const FILES = {
  SETTINGS_JSON: 'settings.json',
  VARIANT_JSON: 'variant.json',
  PACKAGE_JSON: 'package.json',
  CLI_JS: 'cli.js',
  CLI_BACKUP: 'cli.js.backup',
} as const;
