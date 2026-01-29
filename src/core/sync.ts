import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, readJson, writeJson } from './fs.js';

export type SyncItem = 'skills' | 'mcp-servers' | 'permissions' | 'claude-md' | 'tasks' | 'provider-env';

export interface SyncOptions {
  items: SyncItem[];
  createBackup: boolean;
  dryRun?: boolean;
}

export interface DiffEntry {
  action: 'add' | 'modify' | 'replace';
  key: string;
  sourceValue?: string;
  targetValue?: string;
}

export interface SyncDiff {
  item: SyncItem;
  changes: DiffEntry[];
  hasChanges: boolean;
}

export interface SyncItemResult {
  copied: number;
  skipped: number;
  errors: string[];
}

export interface SyncResult {
  target: string;
  success: boolean;
  backupPath?: string;
  itemResults: Partial<Record<SyncItem, SyncItemResult>>;
}

type ClaudeConfig = {
  mcpServers?: Record<string, McpServerConfig>;
  [key: string]: unknown;
};

type McpServerConfig = {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: string[];
  transport?: string;
};

type SettingsFile = {
  env?: Record<string, string | number | undefined>;
  permissions?: {
    allow?: string[];
    ask?: string[];
    deny?: string[];
  };
  [key: string]: unknown;
};

const PROVIDER_ENV_PREFIXES = [
  'ANTHROPIC_',
  'CC_MIRROR_',
  'TWEAKCC_',
  'CLAUDE_CODE_TEAM_',
  'CLAUDE_CODE_AGENT_',
  'Z_AI_',
  'MINIMAX_',
  'OPENROUTER_',
];

const BACKUP_DIR_NAME = 'config.backup';
const CLAUDE_CONFIG_FILE = '.claude.json';
const SETTINGS_FILE = 'settings.json';
const SKILLS_DIR = 'skills';
const TASKS_DIR = 'tasks';
const CLAUDE_MD_FILE = 'CLAUDE.md';

export const createConfigBackup = (variantDir: string): string => {
  const configDir = path.join(variantDir, 'config');
  const backupDir = path.join(variantDir, BACKUP_DIR_NAME);

  if (!fs.existsSync(configDir)) {
    throw new Error(`Config directory not found: ${configDir}`);
  }

  if (fs.existsSync(backupDir)) {
    fs.rmSync(backupDir, { recursive: true, force: true });
  }

  fs.cpSync(configDir, backupDir, { recursive: true });

  const metaPath = path.join(backupDir, '.backup-meta.json');
  writeJson(metaPath, {
    createdAt: new Date().toISOString(),
    source: 'sync',
  });

  return backupDir;
};

export const restoreConfigBackup = (variantDir: string): boolean => {
  const configDir = path.join(variantDir, 'config');
  const backupDir = path.join(variantDir, BACKUP_DIR_NAME);

  if (!fs.existsSync(backupDir)) {
    return false;
  }

  if (fs.existsSync(configDir)) {
    fs.rmSync(configDir, { recursive: true, force: true });
  }

  fs.cpSync(backupDir, configDir, { recursive: true });

  const metaPath = path.join(configDir, '.backup-meta.json');
  if (fs.existsSync(metaPath)) {
    fs.unlinkSync(metaPath);
  }

  return true;
};

const isProviderEnvKey = (key: string): boolean => {
  return PROVIDER_ENV_PREFIXES.some((prefix) => key.startsWith(prefix));
};

const syncSkills = (sourceConfigDir: string, targetConfigDir: string, dryRun: boolean): SyncItemResult => {
  const result: SyncItemResult = { copied: 0, skipped: 0, errors: [] };
  const sourceSkillsDir = path.join(sourceConfigDir, SKILLS_DIR);
  const targetSkillsDir = path.join(targetConfigDir, SKILLS_DIR);

  if (!fs.existsSync(sourceSkillsDir)) {
    result.skipped = 1;
    return result;
  }

  try {
    ensureDir(targetSkillsDir);

    const skills = fs.readdirSync(sourceSkillsDir, { withFileTypes: true }).filter((e) => e.isDirectory());
    if (skills.length === 0) {
      result.skipped = 1;
      return result;
    }

    if (dryRun) {
      result.copied = skills.length;
      return result;
    }

    for (const skill of skills) {
      const sourceSkillPath = path.join(sourceSkillsDir, skill.name);
      const targetSkillPath = path.join(targetSkillsDir, skill.name);

      try {
        if (fs.existsSync(targetSkillPath)) {
          fs.rmSync(targetSkillPath, { recursive: true, force: true });
        }
        fs.cpSync(sourceSkillPath, targetSkillPath, { recursive: true });
        result.copied++;
      } catch (err) {
        result.errors.push(`Failed to copy skill ${skill.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    result.errors.push(`Failed to sync skills: ${err instanceof Error ? err.message : String(err)}`);
  }

  return result;
};

const syncTasks = (sourceConfigDir: string, targetConfigDir: string, dryRun: boolean): SyncItemResult => {
  const result: SyncItemResult = { copied: 0, skipped: 0, errors: [] };
  const sourceTasksDir = path.join(sourceConfigDir, TASKS_DIR);
  const targetTasksDir = path.join(targetConfigDir, TASKS_DIR);

  if (!fs.existsSync(sourceTasksDir)) {
    result.skipped = 1;
    return result;
  }

  try {
    ensureDir(targetTasksDir);
    const teams = fs.readdirSync(sourceTasksDir, { withFileTypes: true }).filter((entry) => entry.isDirectory());

    if (teams.length === 0) {
      result.skipped = 1;
      return result;
    }

    for (const team of teams) {
      const sourceTeamDir = path.join(sourceTasksDir, team.name);
      const targetTeamDir = path.join(targetTasksDir, team.name);
      ensureDir(targetTeamDir);

      const entries = fs
        .readdirSync(sourceTeamDir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.json'));

      if (entries.length === 0) {
        result.skipped++;
        continue;
      }

      if (dryRun) {
        result.copied += entries.length;
        continue;
      }

      for (const entry of entries) {
        const sourcePath = path.join(sourceTeamDir, entry.name);
        const targetPath = path.join(targetTeamDir, entry.name);
        try {
          fs.copyFileSync(sourcePath, targetPath);
          result.copied++;
        } catch (err) {
          result.errors.push(
            `Failed to copy task ${team.name}/${entry.name}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    }
  } catch (err) {
    result.errors.push(`Failed to sync tasks: ${err instanceof Error ? err.message : String(err)}`);
  }

  return result;
};

const syncMcpServers = (sourceConfigDir: string, targetConfigDir: string, dryRun: boolean): SyncItemResult => {
  const result: SyncItemResult = { copied: 0, skipped: 0, errors: [] };
  const sourceConfigPath = path.join(sourceConfigDir, CLAUDE_CONFIG_FILE);
  const targetConfigPath = path.join(targetConfigDir, CLAUDE_CONFIG_FILE);

  const sourceConfig = readJson<ClaudeConfig>(sourceConfigPath);
  if (!sourceConfig?.mcpServers || Object.keys(sourceConfig.mcpServers).length === 0) {
    result.skipped = 1;
    return result;
  }

  try {
    if (dryRun) {
      result.copied = Object.keys(sourceConfig.mcpServers).length;
      return result;
    }

    const targetConfig = readJson<ClaudeConfig>(targetConfigPath) || {};
    const existingServers = targetConfig.mcpServers || {};

    const mergedServers = { ...existingServers };
    for (const [name, config] of Object.entries(sourceConfig.mcpServers)) {
      mergedServers[name] = config;
      result.copied++;
    }

    const updatedConfig: ClaudeConfig = {
      ...targetConfig,
      mcpServers: mergedServers,
    };

    writeJson(targetConfigPath, updatedConfig);
  } catch (err) {
    result.errors.push(`Failed to sync MCP servers: ${err instanceof Error ? err.message : String(err)}`);
  }

  return result;
};

const syncPermissions = (sourceConfigDir: string, targetConfigDir: string, dryRun: boolean): SyncItemResult => {
  const result: SyncItemResult = { copied: 0, skipped: 0, errors: [] };
  const sourceSettingsPath = path.join(sourceConfigDir, SETTINGS_FILE);
  const targetSettingsPath = path.join(targetConfigDir, SETTINGS_FILE);

  const sourceSettings = readJson<SettingsFile>(sourceSettingsPath);
  if (!sourceSettings?.permissions) {
    result.skipped = 1;
    return result;
  }

  try {
    const targetSettings = readJson<SettingsFile>(targetSettingsPath) || {};

    const mergedPermissions = {
      allow: sourceSettings.permissions.allow || [],
      ask: sourceSettings.permissions.ask || [],
      deny: sourceSettings.permissions.deny || [],
    };

    const targetEnv = targetSettings.env || {};
    const sourceEnv = sourceSettings.env || {};

    const mergedEnv: Record<string, string | number | undefined> = { ...targetEnv };
    for (const [key, value] of Object.entries(sourceEnv)) {
      if (!isProviderEnvKey(key)) {
        mergedEnv[key] = value;
        result.copied++;
      }
    }

    if (!dryRun) {
      const updatedSettings: SettingsFile = {
        ...targetSettings,
        env: mergedEnv,
        permissions: mergedPermissions,
      };

      writeJson(targetSettingsPath, updatedSettings);
    }
  } catch (err) {
    result.errors.push(`Failed to sync permissions: ${err instanceof Error ? err.message : String(err)}`);
  }

  return result;
};

const syncProviderEnv = (sourceConfigDir: string, targetConfigDir: string, dryRun: boolean): SyncItemResult => {
  const result: SyncItemResult = { copied: 0, skipped: 0, errors: [] };
  const sourceSettingsPath = path.join(sourceConfigDir, SETTINGS_FILE);
  const targetSettingsPath = path.join(targetConfigDir, SETTINGS_FILE);

  const sourceSettings = readJson<SettingsFile>(sourceSettingsPath);
  const sourceEnv = sourceSettings?.env || {};
  const providerEntries = Object.entries(sourceEnv).filter(([key]) => isProviderEnvKey(key));

  if (providerEntries.length === 0) {
    result.skipped = 1;
    return result;
  }

  try {
    const targetSettings = readJson<SettingsFile>(targetSettingsPath) || {};
    const targetEnv = targetSettings.env || {};

    const mergedEnv: Record<string, string | number | undefined> = { ...targetEnv };
    for (const [key, value] of providerEntries) {
      mergedEnv[key] = value;
      result.copied++;
    }

    if (!dryRun) {
      const updatedSettings: SettingsFile = {
        ...targetSettings,
        env: mergedEnv,
      };

      writeJson(targetSettingsPath, updatedSettings);
    }
  } catch (err) {
    result.errors.push(`Failed to sync provider env: ${err instanceof Error ? err.message : String(err)}`);
  }

  return result;
};

const syncClaudeMd = (sourceConfigDir: string, targetConfigDir: string, dryRun: boolean): SyncItemResult => {
  const result: SyncItemResult = { copied: 0, skipped: 0, errors: [] };
  const sourcePath = path.join(sourceConfigDir, CLAUDE_MD_FILE);
  const targetPath = path.join(targetConfigDir, CLAUDE_MD_FILE);

  if (!fs.existsSync(sourcePath)) {
    result.skipped = 1;
    return result;
  }

  try {
    if (!dryRun) {
      fs.copyFileSync(sourcePath, targetPath);
    }
    result.copied = 1;
  } catch (err) {
    result.errors.push(`Failed to sync CLAUDE.md: ${err instanceof Error ? err.message : String(err)}`);
  }

  return result;
};

const computeMcpServersDiff = (sourceConfigDir: string, targetConfigDir: string): SyncDiff => {
  const changes: DiffEntry[] = [];
  const sourceConfigPath = path.join(sourceConfigDir, CLAUDE_CONFIG_FILE);
  const targetConfigPath = path.join(targetConfigDir, CLAUDE_CONFIG_FILE);

  const sourceConfig = readJson<ClaudeConfig>(sourceConfigPath);
  const targetConfig = readJson<ClaudeConfig>(targetConfigPath);
  const sourceServers = sourceConfig?.mcpServers || {};
  const targetServers = targetConfig?.mcpServers || {};

  for (const [name, config] of Object.entries(sourceServers)) {
    const existing = targetServers[name];
    const cmd = config.command || config.url || 'unknown';
    if (!existing) {
      changes.push({ action: 'add', key: name, sourceValue: cmd });
    } else if (JSON.stringify(existing) !== JSON.stringify(config)) {
      changes.push({ action: 'modify', key: name, sourceValue: cmd, targetValue: existing.command || existing.url });
    }
  }

  return { item: 'mcp-servers', changes, hasChanges: changes.length > 0 };
};

const computeSkillsDiff = (sourceConfigDir: string, targetConfigDir: string): SyncDiff => {
  const changes: DiffEntry[] = [];
  const sourceSkillsDir = path.join(sourceConfigDir, SKILLS_DIR);
  const targetSkillsDir = path.join(targetConfigDir, SKILLS_DIR);

  if (!fs.existsSync(sourceSkillsDir)) {
    return { item: 'skills', changes, hasChanges: false };
  }

  const sourceSkills = fs
    .readdirSync(sourceSkillsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  const targetSkills = new Set(
    fs.existsSync(targetSkillsDir)
      ? fs
          .readdirSync(targetSkillsDir, { withFileTypes: true })
          .filter((e) => e.isDirectory())
          .map((e) => e.name)
      : []
  );

  for (const skill of sourceSkills) {
    if (!targetSkills.has(skill)) {
      changes.push({ action: 'add', key: skill });
    } else {
      changes.push({ action: 'replace', key: skill });
    }
  }

  return { item: 'skills', changes, hasChanges: changes.length > 0 };
};

const computePermissionsDiff = (sourceConfigDir: string, targetConfigDir: string): SyncDiff => {
  const changes: DiffEntry[] = [];
  const sourceSettingsPath = path.join(sourceConfigDir, SETTINGS_FILE);
  const targetSettingsPath = path.join(targetConfigDir, SETTINGS_FILE);

  const sourceSettings = readJson<SettingsFile>(sourceSettingsPath);
  const targetSettings = readJson<SettingsFile>(targetSettingsPath);

  const sourcePerms = sourceSettings?.permissions || {};
  const targetPerms = targetSettings?.permissions || {};

  for (const key of ['allow', 'ask', 'deny'] as const) {
    const sourceList = sourcePerms[key] || [];
    const targetList = targetPerms[key] || [];
    if (JSON.stringify(sourceList.sort()) !== JSON.stringify(targetList.sort())) {
      const added = sourceList.filter((item: string) => !targetList.includes(item));
      if (added.length > 0) {
        changes.push({ action: 'modify', key, sourceValue: `+${added.length} items` });
      }
    }
  }

  return { item: 'permissions', changes, hasChanges: changes.length > 0 };
};

const computeClaudeMdDiff = (sourceConfigDir: string, targetConfigDir: string): SyncDiff => {
  const changes: DiffEntry[] = [];
  const sourcePath = path.join(sourceConfigDir, CLAUDE_MD_FILE);
  const targetPath = path.join(targetConfigDir, CLAUDE_MD_FILE);

  if (!fs.existsSync(sourcePath)) {
    return { item: 'claude-md', changes, hasChanges: false };
  }

  const sourceContent = fs.readFileSync(sourcePath, 'utf8');
  const targetContent = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf8') : '';

  if (sourceContent !== targetContent) {
    const action = targetContent ? 'replace' : 'add';
    const sourceSize = `${Math.round(sourceContent.length / 1024)}KB`;
    changes.push({ action, key: 'CLAUDE.md', sourceValue: sourceSize });
  }

  return { item: 'claude-md', changes, hasChanges: changes.length > 0 };
};

const computeTasksDiff = (sourceConfigDir: string, targetConfigDir: string): SyncDiff => {
  const changes: DiffEntry[] = [];
  const sourceTasksDir = path.join(sourceConfigDir, TASKS_DIR);
  const targetTasksDir = path.join(targetConfigDir, TASKS_DIR);

  if (!fs.existsSync(sourceTasksDir)) {
    return { item: 'tasks', changes, hasChanges: false };
  }

  // Build map of target tasks for comparison
  const targetTasks = new Map<string, Set<string>>();
  if (fs.existsSync(targetTasksDir)) {
    const targetTeams = fs.readdirSync(targetTasksDir, { withFileTypes: true }).filter((e) => e.isDirectory());
    for (const team of targetTeams) {
      const teamDir = path.join(targetTasksDir, team.name);
      const tasks = fs.readdirSync(teamDir).filter((f) => f.endsWith('.json'));
      targetTasks.set(team.name, new Set(tasks));
    }
  }

  // Compare source tasks against target
  const sourceTeams = fs.readdirSync(sourceTasksDir, { withFileTypes: true }).filter((e) => e.isDirectory());
  let addedTasks = 0;
  let replacedTasks = 0;

  for (const team of sourceTeams) {
    const teamDir = path.join(sourceTasksDir, team.name);
    const sourceTasks = fs.readdirSync(teamDir).filter((f) => f.endsWith('.json'));
    const existingTasks = targetTasks.get(team.name) || new Set<string>();

    for (const task of sourceTasks) {
      if (existingTasks.has(task)) {
        replacedTasks++;
      } else {
        addedTasks++;
      }
    }
  }

  if (addedTasks > 0) {
    changes.push({ action: 'add', key: 'tasks', sourceValue: `${addedTasks} new task(s)` });
  }
  if (replacedTasks > 0) {
    changes.push({ action: 'replace', key: 'tasks', sourceValue: `${replacedTasks} existing task(s)` });
  }

  return { item: 'tasks', changes, hasChanges: changes.length > 0 };
};

const computeProviderEnvDiff = (sourceConfigDir: string, targetConfigDir: string): SyncDiff => {
  const changes: DiffEntry[] = [];
  const sourceSettingsPath = path.join(sourceConfigDir, SETTINGS_FILE);
  const targetSettingsPath = path.join(targetConfigDir, SETTINGS_FILE);

  const sourceSettings = readJson<SettingsFile>(sourceSettingsPath);
  const targetSettings = readJson<SettingsFile>(targetSettingsPath);

  const sourceEnv = sourceSettings?.env || {};
  const targetEnv = targetSettings?.env || {};

  for (const [key, value] of Object.entries(sourceEnv)) {
    if (isProviderEnvKey(key)) {
      const targetValue = targetEnv[key];
      if (targetValue === undefined) {
        changes.push({ action: 'add', key, sourceValue: String(value).substring(0, 20) + '...' });
      } else if (String(targetValue) !== String(value)) {
        changes.push({ action: 'modify', key });
      }
    }
  }

  return { item: 'provider-env', changes, hasChanges: changes.length > 0 };
};

/**
 * Compute diff preview for sync operation
 */
export const computeSyncDiff = (sourceDir: string, targetDir: string, items: SyncItem[]): SyncDiff[] => {
  const sourceConfigDir = path.join(sourceDir, 'config');
  const targetConfigDir = path.join(targetDir, 'config');
  const diffs: SyncDiff[] = [];

  for (const item of items) {
    switch (item) {
      case 'mcp-servers':
        diffs.push(computeMcpServersDiff(sourceConfigDir, targetConfigDir));
        break;
      case 'skills':
        diffs.push(computeSkillsDiff(sourceConfigDir, targetConfigDir));
        break;
      case 'permissions':
        diffs.push(computePermissionsDiff(sourceConfigDir, targetConfigDir));
        break;
      case 'claude-md':
        diffs.push(computeClaudeMdDiff(sourceConfigDir, targetConfigDir));
        break;
      case 'tasks':
        diffs.push(computeTasksDiff(sourceConfigDir, targetConfigDir));
        break;
      case 'provider-env':
        diffs.push(computeProviderEnvDiff(sourceConfigDir, targetConfigDir));
        break;
    }
  }

  return diffs;
};

export const syncVariants = (sourceDir: string, targetDirs: string[], options: SyncOptions): SyncResult[] => {
  const results: SyncResult[] = [];
  const sourceConfigDir = path.join(sourceDir, 'config');
  const dryRun = Boolean(options.dryRun);

  if (!fs.existsSync(sourceConfigDir)) {
    throw new Error(`Source config directory not found: ${sourceConfigDir}`);
  }

  for (const targetDir of targetDirs) {
    const result: SyncResult = {
      target: path.basename(targetDir),
      success: true,
      itemResults: {},
    };

    const targetConfigDir = path.join(targetDir, 'config');

    if (options.createBackup && !dryRun) {
      try {
        result.backupPath = createConfigBackup(targetDir);
      } catch (err) {
        result.success = false;
        const backupErrorMessage = `Backup failed: ${err instanceof Error ? err.message : String(err)}`;
        for (const item of options.items) {
          result.itemResults[item] = {
            copied: 0,
            skipped: 0,
            errors: [backupErrorMessage],
          };
        }
        results.push(result);
        continue;
      }
    }

    for (const item of options.items) {
      switch (item) {
        case 'skills':
          result.itemResults[item] = syncSkills(sourceConfigDir, targetConfigDir, dryRun);
          break;
        case 'tasks':
          result.itemResults[item] = syncTasks(sourceConfigDir, targetConfigDir, dryRun);
          break;
        case 'mcp-servers':
          result.itemResults[item] = syncMcpServers(sourceConfigDir, targetConfigDir, dryRun);
          break;
        case 'permissions':
          result.itemResults[item] = syncPermissions(sourceConfigDir, targetConfigDir, dryRun);
          break;
        case 'provider-env':
          result.itemResults[item] = syncProviderEnv(sourceConfigDir, targetConfigDir, dryRun);
          break;
        case 'claude-md':
          result.itemResults[item] = syncClaudeMd(sourceConfigDir, targetConfigDir, dryRun);
          break;
      }

      const itemResult = result.itemResults[item];
      if (itemResult && itemResult.errors.length > 0) {
        result.success = false;
      }
    }

    results.push(result);
  }

  return results;
};

export const syncVariantsAsync = async (
  sourceDir: string,
  targetDirs: string[],
  options: SyncOptions,
  onProgress?: (target: string, item: SyncItem) => void
): Promise<SyncResult[]> => {
  const results: SyncResult[] = [];
  const sourceConfigDir = path.join(sourceDir, 'config');
  const dryRun = Boolean(options.dryRun);

  if (!fs.existsSync(sourceConfigDir)) {
    throw new Error(`Source config directory not found: ${sourceConfigDir}`);
  }

  for (const targetDir of targetDirs) {
    const result: SyncResult = {
      target: path.basename(targetDir),
      success: true,
      itemResults: {},
    };

    const targetConfigDir = path.join(targetDir, 'config');

    if (options.createBackup && !dryRun) {
      try {
        result.backupPath = createConfigBackup(targetDir);
      } catch (err) {
        result.success = false;
        const backupErrorMessage = `Backup failed: ${err instanceof Error ? err.message : String(err)}`;
        for (const item of options.items) {
          result.itemResults[item] = {
            copied: 0,
            skipped: 0,
            errors: [backupErrorMessage],
          };
        }
        results.push(result);
        continue;
      }
    }

    for (const item of options.items) {
      onProgress?.(result.target, item);
      await new Promise((resolve) => setImmediate(resolve));

      switch (item) {
        case 'skills':
          result.itemResults[item] = syncSkills(sourceConfigDir, targetConfigDir, dryRun);
          break;
        case 'tasks':
          result.itemResults[item] = syncTasks(sourceConfigDir, targetConfigDir, dryRun);
          break;
        case 'mcp-servers':
          result.itemResults[item] = syncMcpServers(sourceConfigDir, targetConfigDir, dryRun);
          break;
        case 'permissions':
          result.itemResults[item] = syncPermissions(sourceConfigDir, targetConfigDir, dryRun);
          break;
        case 'provider-env':
          result.itemResults[item] = syncProviderEnv(sourceConfigDir, targetConfigDir, dryRun);
          break;
        case 'claude-md':
          result.itemResults[item] = syncClaudeMd(sourceConfigDir, targetConfigDir, dryRun);
          break;
      }

      const itemResult = result.itemResults[item];
      if (itemResult && itemResult.errors.length > 0) {
        result.success = false;
      }
    }

    results.push(result);
  }

  return results;
};
