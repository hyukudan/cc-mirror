/**
 * Team Pack - Enhanced prompts for Team Mode
 *
 * These prompts are copied to tweakDir/system-prompts/ when Team Mode is enabled.
 * They provide enhanced guidance for Task* tools without TodoWrite references.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, writeJson } from '../core/fs.js';

type SettingsFile = {
  env?: Record<string, string | number | undefined>;
  permissions?: {
    allow?: string[];
    ask?: string[];
    deny?: string[];
  };
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const TEAM_PACK_FILES = [
  { source: 'tasklist.md', target: 'tool-description-tasklist.md' },
  { source: 'taskupdate.md', target: 'tool-description-taskupdate.md' },
  { source: 'task-extra-notes.md', target: 'agent-prompt-task-tool-extra-notes.md' },
  { source: 'task-management-note.md', target: 'system-prompt-task-management-note.md' },
  { source: 'orchestration-skill.md', target: 'system-prompt-orchestration-skill.md' },
];

/**
 * Target filenames that were previously installed by the team pack but have
 * been removed. These are cleaned up automatically during create/update to
 * prevent stale prompts with unresolved variables from crashing Claude Code.
 */
export const STALE_TEAM_PACK_TARGETS = [
  'tool-description-skill.md', // removed in d350fce — contained FORMAT_SKILLS_AS_XML_FN
];

/**
 * Remove stale team pack files that are no longer part of the pack.
 * Returns the list of filenames that were actually deleted.
 */
export const cleanStaleTeamPackFiles = (systemPromptsDir: string): string[] => {
  const removed: string[] = [];
  for (const target of STALE_TEAM_PACK_TARGETS) {
    const targetPath = path.join(systemPromptsDir, target);
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
      removed.push(target);
    }
  }
  return removed;
};

/**
 * Copy team pack prompt files to the tweakcc system-prompts directory.
 * Also cleans up stale files from previous versions of the pack.
 */
export const copyTeamPackPrompts = (systemPromptsDir: string): string[] => {
  const copied: string[] = [];

  if (!fs.existsSync(systemPromptsDir)) {
    fs.mkdirSync(systemPromptsDir, { recursive: true });
  }

  // Clean up stale files from previous pack versions
  cleanStaleTeamPackFiles(systemPromptsDir);

  for (const file of TEAM_PACK_FILES) {
    const sourcePath = path.join(__dirname, file.source);
    const targetPath = path.join(systemPromptsDir, file.target);

    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, targetPath);
      copied.push(file.target);
    }
  }

  return copied;
};


/**
 * Remove TodoWrite from settings.json permissions.deny when disabling Team Mode.
 */
export const removeTeamToolset = (configDir: string): boolean => {
  const settingsPath = path.join(configDir, 'settings.json');
  if (!fs.existsSync(settingsPath)) {
    return false;
  }

  try {
    const existing = readJson<SettingsFile>(settingsPath) || {};
    const permissions = existing.permissions || {};
    const deny = Array.isArray(permissions.deny) ? [...permissions.deny] : [];

    const index = deny.indexOf('TodoWrite');
    if (index === -1) {
      return false;
    }

    deny.splice(index, 1);

    const next: SettingsFile = {
      ...existing,
      permissions: {
        ...permissions,
        deny,
      },
    };

    writeJson(settingsPath, next);
    return true;
  } catch {
    return false;
  }
};
