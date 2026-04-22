import type { ProviderEnv } from '../providers/index.js';

export interface VariantMeta {
  name: string;
  provider: string;
  baseUrl?: string;
  createdAt: string;
  updatedAt?: string;
  claudeOrig: string;
  binaryPath: string;
  configDir: string;
  tweakDir: string;
  brand?: string;
  promptPack?: boolean;
  /** @deprecated No longer used - promptPackMode has been deprecated */
  promptPackMode?: 'minimal' | 'maximal';
  skillInstall?: boolean;
  shellEnv?: boolean;
  binDir?: string;
  installType?: 'native' | 'npm';
  npmDir?: string;
  npmPackage?: string;
  npmVersion?: string;
  /** Whether team mode is enabled (native Task tools + orchestrator/task-manager skills) */
  teamModeEnabled?: boolean;
}

export interface VariantEntry {
  name: string;
  meta: VariantMeta | null;
}

/** Progress callback for reporting installation steps */
export type ProgressCallback = (step: string) => void;

export interface CreateVariantParams {
  name: string;
  providerKey: string;
  baseUrl?: string;
  apiKey?: string;
  extraEnv?: string[];
  modelOverrides?: {
    sonnet?: string;
    opus?: string;
    haiku?: string;
    smallFast?: string;
    defaultModel?: string;
    subagentModel?: string;
  };
  rootDir?: string;
  binDir?: string;
  npmPackage?: string;
  npmVersion?: string;
  brand?: string;
  noTweak?: boolean;
  promptPack?: boolean;
  skillInstall?: boolean;
  shellEnv?: boolean;
  skillUpdate?: boolean;
  tweakccStdio?: 'pipe' | 'inherit';
  /** Enable team mode by patching cli.js */
  enableTeamMode?: boolean;
  /** Skip bundled team skills (orchestrator, task-manager) even when team mode is enabled */
  noTeamSkills?: boolean;
  /** Allow creating a wrapper even if it collides with an existing command */
  allowCollision?: boolean;
  /** Callback for progress updates during installation */
  onProgress?: ProgressCallback;
}

export interface UpdateVariantOptions {
  binDir?: string;
  npmPackage?: string;
  npmVersion?: string;
  brand?: string;
  noTweak?: boolean;
  extraEnv?: string[];
  /** Skip npm package reinstall - for settings-only updates (models, env) */
  settingsOnly?: boolean;
  promptPack?: boolean;
  skillInstall?: boolean;
  shellEnv?: boolean;
  skillUpdate?: boolean;
  tweakccStdio?: 'pipe' | 'inherit';
  modelOverrides?: {
    sonnet?: string;
    opus?: string;
    haiku?: string;
    smallFast?: string;
    defaultModel?: string;
    subagentModel?: string;
  };
  /** Enable team mode (native Task tools + orchestrator/task-manager skills) */
  enableTeamMode?: boolean;
  /** Disable team mode (unset env vars, remove skills + team-pack prompts) */
  disableTeamMode?: boolean;
  /** Skip bundled team skills (orchestrator, task-manager) even when team mode is enabled */
  noTeamSkills?: boolean;
  /** Callback for progress updates during update */
  onProgress?: ProgressCallback;
}

export interface McpServerStatus {
  name: string;
  status: 'ok' | 'error' | 'unchecked';
  command?: string;
  error?: string;
  tools?: string[];
}

export interface DoctorReportItem {
  name: string;
  ok: boolean;
  binaryPath?: string;
  wrapperPath: string;
  issues?: string[];
  warnings?: string[];
  fixes?: string[];
  // Extended info (when strict mode)
  claudeCodeVersion?: string;
  claudeCodeLatest?: string;
  mcpServers?: McpServerStatus[];
}

export interface DoctorOptions {
  strict?: boolean;
  checkMcp?: boolean; // Check MCP server connectivity
  latestVersion?: string; // Pre-fetched latest version (to avoid multiple npm calls)
  fix?: boolean; // Auto-fix repairable issues (implies strict)
}

export interface CreateVariantResult {
  meta: VariantMeta;
  wrapperPath: string;
  tweakResult: TweakResult | null;
  notes?: string[];
}

export interface UpdateVariantResult {
  meta: VariantMeta;
  tweakResult: TweakResult | null;
  notes?: string[];
}

export interface VariantConfig {
  env: ProviderEnv;
  permissions?: {
    allow?: string[];
    deny?: string[];
  };
}

export interface TweakResult {
  status: number | null;
  stderr?: string;
  stdout?: string;
  tweakccSpec?: string;
  fallbackFromTweakccSpec?: string;
}
