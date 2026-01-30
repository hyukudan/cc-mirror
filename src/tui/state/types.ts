/**
 * TUI State Types
 */

import type { DoctorReportItem, VariantEntry, VariantMeta } from '../../core/types.js';
import type { SyncItem } from '../../core/sync.js';
import type { Screen } from '../router/types.js';

// Re-export Screen type from router
export type { Screen };

/**
 * Selected variant with wrapper path
 */
export interface SelectedVariant extends VariantMeta {
  wrapperPath: string;
}

/**
 * Model overrides configuration
 */
export interface ModelOverrides {
  sonnet?: string;
  opus?: string;
  haiku?: string;
  smallFast?: string;
  defaultModel?: string;
  subagentModel?: string;
}

/**
 * Completion screen data
 */
export interface CompletionData {
  summary: string[];
  nextSteps: string[];
  help: string[];
}

/**
 * Main app state
 */
export interface AppState {
  // Navigation
  screen: Screen;

  // Provider configuration
  providerKey: string | null;
  brandKey: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  apiKeyDetectedFrom: string | null;

  // Model configuration
  modelSonnet: string;
  modelOpus: string;
  modelHaiku: string;

  // Paths
  rootDir: string;
  binDir: string;
  npmPackage: string;

  // Feature flags
  usePromptPack: boolean;
  promptPackMode: 'minimal' | 'maximal';
  installSkill: boolean;
  shellEnv: boolean;
  skillUpdate: boolean;

  // Extra configuration
  extraEnv: string[];

  // Progress and completion
  progressLines: string[];
  doneLines: string[];
  completion: CompletionData;

  // Variant management
  variants: VariantEntry[];
  selectedVariant: SelectedVariant | null;

  // Doctor
  doctorReport: DoctorReportItem[];

  // UI state
  nameError: string | null;

  // Team mode
  enableTeamMode: boolean;

  // Sync flow
  syncSourceVariant: string;
  syncTargetVariants: string[];
  syncItems: SyncItem[];
}

/**
 * App state setters and actions
 */
export interface AppActions {
  // Navigation
  setScreen: (screen: Screen) => void;
  navigateBack: () => void;

  // Provider configuration
  setProviderKey: (key: string | null) => void;
  setBrandKey: (key: string) => void;
  setName: (name: string) => void;
  setBaseUrl: (url: string) => void;
  setApiKey: (key: string) => void;
  setApiKeyDetectedFrom: (source: string | null) => void;

  // Model configuration
  setModelSonnet: (model: string) => void;
  setModelOpus: (model: string) => void;
  setModelHaiku: (model: string) => void;

  // Paths
  setRootDir: (dir: string) => void;
  setBinDir: (dir: string) => void;
  setNpmPackage: (pkg: string) => void;

  // Feature flags
  setUsePromptPack: (value: boolean) => void;
  setPromptPackMode: (mode: 'minimal' | 'maximal') => void;
  setInstallSkill: (value: boolean) => void;
  setShellEnv: (value: boolean) => void;
  setSkillUpdate: (value: boolean) => void;

  // Extra configuration
  setExtraEnv: (env: string[]) => void;
  addExtraEnv: (entry: string) => void;

  // Progress and completion
  setProgressLines: (updater: (prev: string[]) => string[]) => void;
  addProgressLine: (line: string) => void;
  setDoneLines: (lines: string[]) => void;
  setCompletion: (data: CompletionData) => void;

  // Variant management
  setVariants: (variants: VariantEntry[]) => void;
  setSelectedVariant: (variant: SelectedVariant | null) => void;

  // Doctor
  setDoctorReport: (report: DoctorReportItem[]) => void;

  // UI state
  setNameError: (error: string | null) => void;

  // Team mode
  setEnableTeamMode: (value: boolean) => void;

  // Sync flow
  setSyncSourceVariant: (variant: string) => void;
  setSyncTargetVariants: (variants: string[]) => void;
  setSyncItems: (items: SyncItem[]) => void;

  // Utility
  resetWizard: () => void;
}

/**
 * Combined state and actions for context
 */
export interface AppContextValue {
  state: AppState;
  actions: AppActions;
}

/**
 * Provider defaults based on provider key
 */
export interface ProviderDefaults {
  promptPack: boolean;
  promptPackMode: 'minimal' | 'maximal';
  skillInstall: boolean;
  shellEnv: boolean;
}
