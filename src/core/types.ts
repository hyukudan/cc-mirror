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
  /** Whether team mode is enabled (cli.js patched) */
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
  /** Enable team mode by patching cli.js */
  enableTeamMode?: boolean;
  /** Disable team mode by reversing cli.js patch */
  disableTeamMode?: boolean;
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
  // Extended info (when strict mode)
  claudeCodeVersion?: string;
  claudeCodeLatest?: string;
  mcpServers?: McpServerStatus[];
}

export interface DoctorOptions {
  strict?: boolean;
  checkMcp?: boolean; // Check MCP server connectivity
  latestVersion?: string; // Pre-fetched latest version (to avoid multiple npm calls)
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
}

export interface TweakResult {
  status: number | null;
  stderr?: string;
  stdout?: string;
}
