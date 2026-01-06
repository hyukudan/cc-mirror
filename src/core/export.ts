import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, readJson, writeJson } from './fs.js';
import { createConfigBackup } from './sync.js';
import type { McpServerConfig } from './claude-config.js';

export type ExportItem = 'skills' | 'mcp-servers' | 'permissions' | 'claude-md' | 'tasks' | 'provider-env';

export type FileEntry = {
  path: string;
  content: string;
  mode?: number;
};

type SettingsFile = {
  env?: Record<string, string | number | undefined>;
  permissions?: {
    allow?: string[];
    ask?: string[];
    deny?: string[];
  };
};

type ClaudeConfig = {
  mcpServers?: Record<string, McpServerConfig>;
};

export type ExportArchive = {
  version: 1;
  createdAt: string;
  source: {
    variant: string;
  };
  items: ExportItem[];
  data: {
    permissions?: SettingsFile['permissions'];
    env?: Record<string, string | number | undefined>;
    providerEnv?: Record<string, string | number | undefined>;
    mcpServers?: Record<string, McpServerConfig>;
    claudeMd?: string;
    skills?: FileEntry[];
    tasks?: FileEntry[];
  };
};

export type ExportItemResult = {
  exported: number;
  skipped: number;
  errors: string[];
};

export type ExportResult = {
  archive: ExportArchive;
  itemResults: Partial<Record<ExportItem, ExportItemResult>>;
};

export type ImportItemResult = {
  applied: number;
  skipped: number;
  errors: string[];
};

export type ImportResult = {
  success: boolean;
  backupPath?: string;
  itemResults: Partial<Record<ExportItem, ImportItemResult>>;
};

export interface ImportOptions {
  items: ExportItem[];
  createBackup: boolean;
  dryRun?: boolean;
}

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

const CLAUDE_CONFIG_FILE = '.claude.json';
const SETTINGS_FILE = 'settings.json';
const SKILLS_DIR = 'skills';
const TASKS_DIR = 'tasks';
const CLAUDE_MD_FILE = 'CLAUDE.md';

const isProviderEnvKey = (key: string): boolean => PROVIDER_ENV_PREFIXES.some((prefix) => key.startsWith(prefix));

const toPosixPath = (value: string): string => value.split(path.sep).join(path.posix.sep);

const collectFiles = (rootDir: string): FileEntry[] => {
  if (!fs.existsSync(rootDir)) return [];

  const entries: FileEntry[] = [];
  const walk = (current: string) => {
    const items = fs.readdirSync(current, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(current, item.name);
      if (item.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!item.isFile()) continue;
      const stat = fs.statSync(fullPath);
      const relative = toPosixPath(path.relative(rootDir, fullPath));
      entries.push({
        path: relative,
        content: fs.readFileSync(fullPath).toString('base64'),
        mode: stat.mode & 0o777,
      });
    }
  };
  walk(rootDir);
  return entries;
};

const writeFiles = (rootDir: string, entries: FileEntry[], dryRun: boolean) => {
  if (dryRun) return;
  ensureDir(rootDir);
  for (const entry of entries) {
    const normalized = entry.path.split('/').join(path.sep);
    const filePath = path.join(rootDir, normalized);
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, Buffer.from(entry.content, 'base64'));
    if (entry.mode !== undefined) {
      try {
        fs.chmodSync(filePath, entry.mode);
      } catch {
        // Ignore chmod failures (e.g., Windows).
      }
    }
  }
};

const countPermissions = (permissions?: SettingsFile['permissions']): number => {
  if (!permissions) return 0;
  return (permissions.allow?.length ?? 0) + (permissions.ask?.length ?? 0) + (permissions.deny?.length ?? 0);
};

export const exportVariant = (variantDir: string, items: ExportItem[]): ExportResult => {
  const configDir = path.join(variantDir, 'config');
  if (!fs.existsSync(configDir)) {
    throw new Error(`Config directory not found: ${configDir}`);
  }

  const archive: ExportArchive = {
    version: 1,
    createdAt: new Date().toISOString(),
    source: { variant: path.basename(variantDir) },
    items: Array.from(new Set(items)),
    data: {},
  };

  const itemResults: Partial<Record<ExportItem, ExportItemResult>> = {};

  for (const item of archive.items) {
    const result: ExportItemResult = { exported: 0, skipped: 0, errors: [] };
    try {
      switch (item) {
        case 'skills': {
          const entries = collectFiles(path.join(configDir, SKILLS_DIR));
          if (entries.length === 0) {
            result.skipped = 1;
          } else {
            archive.data.skills = entries;
            result.exported = entries.length;
          }
          break;
        }
        case 'tasks': {
          const entries = collectFiles(path.join(configDir, TASKS_DIR));
          if (entries.length === 0) {
            result.skipped = 1;
          } else {
            archive.data.tasks = entries;
            result.exported = entries.length;
          }
          break;
        }
        case 'mcp-servers': {
          const configPath = path.join(configDir, CLAUDE_CONFIG_FILE);
          const config = readJson<ClaudeConfig>(configPath);
          const servers = config?.mcpServers ?? {};
          const names = Object.keys(servers);
          if (names.length === 0) {
            result.skipped = 1;
          } else {
            archive.data.mcpServers = servers;
            result.exported = names.length;
          }
          break;
        }
        case 'permissions': {
          const settingsPath = path.join(configDir, SETTINGS_FILE);
          const settings = readJson<SettingsFile>(settingsPath);
          const permissions = settings?.permissions;
          const envEntries = Object.entries(settings?.env ?? {}).filter(([key]) => !isProviderEnvKey(key));
          if (!permissions && envEntries.length === 0) {
            result.skipped = 1;
          } else {
            if (permissions) archive.data.permissions = permissions;
            if (envEntries.length > 0) {
              archive.data.env = Object.fromEntries(envEntries);
            }
            result.exported = countPermissions(permissions) + envEntries.length;
          }
          break;
        }
        case 'provider-env': {
          const settingsPath = path.join(configDir, SETTINGS_FILE);
          const settings = readJson<SettingsFile>(settingsPath);
          const envEntries = Object.entries(settings?.env ?? {}).filter(([key]) => isProviderEnvKey(key));
          if (envEntries.length === 0) {
            result.skipped = 1;
          } else {
            archive.data.providerEnv = Object.fromEntries(envEntries);
            result.exported = envEntries.length;
          }
          break;
        }
        case 'claude-md': {
          const claudeMdPath = path.join(configDir, CLAUDE_MD_FILE);
          if (!fs.existsSync(claudeMdPath)) {
            result.skipped = 1;
          } else {
            archive.data.claudeMd = fs.readFileSync(claudeMdPath, 'utf8');
            result.exported = 1;
          }
          break;
        }
      }
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
    }
    itemResults[item] = result;
  }

  return { archive, itemResults };
};

export const writeExportArchive = (filePath: string, archive: ExportArchive): void => {
  writeJson(filePath, archive);
};

export const readExportArchive = (filePath: string): ExportArchive => {
  let data: unknown;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as ExportArchive;
  } catch (error) {
    throw new Error(`Failed to read export file: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid export file: expected JSON object');
  }
  const archive = data as ExportArchive;
  if (archive.version !== 1 || !Array.isArray(archive.items)) {
    throw new Error('Invalid export file: unsupported version');
  }
  if (!archive.data || typeof archive.data !== 'object') {
    throw new Error('Invalid export file: missing data');
  }
  return archive;
};

export const importVariant = (variantDir: string, archive: ExportArchive, options: ImportOptions): ImportResult => {
  const configDir = path.join(variantDir, 'config');
  ensureDir(configDir);

  const result: ImportResult = {
    success: true,
    itemResults: {},
  };

  if (options.createBackup && !options.dryRun) {
    result.backupPath = createConfigBackup(variantDir);
  }

  const items = Array.from(new Set(options.items));

  for (const item of items) {
    const itemResult: ImportItemResult = { applied: 0, skipped: 0, errors: [] };
    try {
      switch (item) {
        case 'skills': {
          const entries = archive.data.skills ?? [];
          if (entries.length === 0) {
            itemResult.skipped = 1;
            break;
          }
          const skillsDir = path.join(configDir, SKILLS_DIR);
          const skillNames = new Set(entries.map((entry) => entry.path.split('/')[0]).filter(Boolean));
          if (!options.dryRun) {
            ensureDir(skillsDir);
            for (const name of skillNames) {
              const targetDir = path.join(skillsDir, name);
              if (fs.existsSync(targetDir)) {
                fs.rmSync(targetDir, { recursive: true, force: true });
              }
            }
          }
          writeFiles(skillsDir, entries, Boolean(options.dryRun));
          itemResult.applied = entries.length;
          break;
        }
        case 'tasks': {
          const entries = archive.data.tasks ?? [];
          if (entries.length === 0) {
            itemResult.skipped = 1;
            break;
          }
          const tasksDir = path.join(configDir, TASKS_DIR);
          writeFiles(tasksDir, entries, Boolean(options.dryRun));
          itemResult.applied = entries.length;
          break;
        }
        case 'mcp-servers': {
          const servers = archive.data.mcpServers;
          if (!servers || Object.keys(servers).length === 0) {
            itemResult.skipped = 1;
            break;
          }
          if (!options.dryRun) {
            const configPath = path.join(configDir, CLAUDE_CONFIG_FILE);
            const config = readJson<ClaudeConfig>(configPath) || {};
            const existing = config.mcpServers ?? {};
            const merged = { ...existing, ...servers };
            writeJson(configPath, { ...config, mcpServers: merged });
          }
          itemResult.applied = Object.keys(servers).length;
          break;
        }
        case 'permissions': {
          const permissions = archive.data.permissions;
          const env = archive.data.env ?? {};
          if (!permissions && Object.keys(env).length === 0) {
            itemResult.skipped = 1;
            break;
          }
          if (!options.dryRun) {
            const settingsPath = path.join(configDir, SETTINGS_FILE);
            const settings = readJson<SettingsFile>(settingsPath) || {};
            const currentEnv = settings.env || {};
            const mergedEnv: Record<string, string | number | undefined> = { ...currentEnv, ...env };
            const next: SettingsFile = {
              ...settings,
              env: mergedEnv,
              permissions: permissions ?? settings.permissions,
            };
            writeJson(settingsPath, next);
          }
          itemResult.applied = countPermissions(permissions) + Object.keys(env).length;
          break;
        }
        case 'provider-env': {
          const providerEnv = archive.data.providerEnv ?? {};
          if (Object.keys(providerEnv).length === 0) {
            itemResult.skipped = 1;
            break;
          }
          if (!options.dryRun) {
            const settingsPath = path.join(configDir, SETTINGS_FILE);
            const settings = readJson<SettingsFile>(settingsPath) || {};
            const currentEnv = settings.env || {};
            const mergedEnv: Record<string, string | number | undefined> = { ...currentEnv, ...providerEnv };
            writeJson(settingsPath, { ...settings, env: mergedEnv });
          }
          itemResult.applied = Object.keys(providerEnv).length;
          break;
        }
        case 'claude-md': {
          const content = archive.data.claudeMd;
          if (!content) {
            itemResult.skipped = 1;
            break;
          }
          if (!options.dryRun) {
            const claudeMdPath = path.join(configDir, CLAUDE_MD_FILE);
            fs.writeFileSync(claudeMdPath, content);
          }
          itemResult.applied = 1;
          break;
        }
      }
    } catch (error) {
      itemResult.errors.push(error instanceof Error ? error.message : String(error));
    }

    if (itemResult.errors.length > 0) {
      result.success = false;
    }
    result.itemResults[item] = itemResult;
  }

  return result;
};
