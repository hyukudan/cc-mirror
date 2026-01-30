/**
 * App State Hook
 * Centralizes all TUI state management
 */

import { useState, useCallback, useMemo } from 'react';
import type { Screen, AppState, AppActions, CompletionData, SelectedVariant, ProviderDefaults } from './types.js';
import type { DoctorReportItem, VariantEntry } from '../../core/types.js';
import type { SyncItem } from '../../core/sync.js';

const DEFAULT_SYNC_ITEMS: SyncItem[] = ['skills', 'mcp-servers', 'permissions', 'claude-md'];
import { getParentScreen, isProgressScreen } from '../router/routes.js';

/**
 * Default completion data
 */
const defaultCompletion: CompletionData = {
  summary: [],
  nextSteps: [],
  help: [],
};

/**
 * Get provider defaults based on provider key
 */
export function getProviderDefaults(key?: string | null): ProviderDefaults {
  return {
    promptPack: key === 'zai' || key === 'minimax',
    // promptPackMode is deprecated - always use 'minimal'
    promptPackMode: 'minimal',
    skillInstall: key === 'zai' || key === 'minimax',
    shellEnv: key === 'zai',
  };
}

/**
 * Resolve Zai API key from environment
 */
export function resolveZaiApiKey(): {
  value: string;
  detectedFrom: string | null;
  skipPrompt: boolean;
} {
  const zaiKey = process.env.Z_AI_API_KEY?.trim();
  if (zaiKey) {
    return { value: zaiKey, detectedFrom: 'Z_AI_API_KEY', skipPrompt: true };
  }
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (anthropicKey) {
    return { value: anthropicKey, detectedFrom: 'ANTHROPIC_API_KEY', skipPrompt: false };
  }
  return { value: '', detectedFrom: null, skipPrompt: false };
}

export interface UseAppStateOptions {
  initialRootDir: string;
  initialBinDir: string;
  defaultNpmPackage: string;
}

export function useCreateAppState(options: UseAppStateOptions): { state: AppState; actions: AppActions } {
  const { initialRootDir, initialBinDir, defaultNpmPackage } = options;

  // Navigation
  const [screen, setScreenInternal] = useState<Screen>('home');

  // Provider configuration
  const [providerKey, setProviderKey] = useState<string | null>(null);
  const [brandKey, setBrandKey] = useState('auto');
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiKeyDetectedFrom, setApiKeyDetectedFrom] = useState<string | null>(null);

  // Model configuration
  const [modelSonnet, setModelSonnet] = useState('');
  const [modelOpus, setModelOpus] = useState('');
  const [modelHaiku, setModelHaiku] = useState('');

  // Paths
  const [rootDir, setRootDir] = useState(initialRootDir);
  const [binDir, setBinDir] = useState(initialBinDir);
  const [npmPackage, setNpmPackage] = useState(defaultNpmPackage);

  // Feature flags
  const [usePromptPack, setUsePromptPack] = useState(true);
  // promptPackMode is deprecated - always 'minimal'
  const promptPackMode = 'minimal' as const;
  const setPromptPackMode = (_mode: 'minimal' | 'maximal') => {}; // no-op for backward compat
  const [installSkill, setInstallSkill] = useState(true);
  const [shellEnv, setShellEnv] = useState(true);
  const [skillUpdate, setSkillUpdate] = useState(false);

  // Extra configuration
  const [extraEnv, setExtraEnv] = useState<string[]>([]);

  // Progress and completion
  const [progressLines, setProgressLines] = useState<string[]>([]);
  const [doneLines, setDoneLines] = useState<string[]>([]);
  const [completion, setCompletion] = useState<CompletionData>(defaultCompletion);

  // Variant management
  const [variants, setVariants] = useState<VariantEntry[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<SelectedVariant | null>(null);

  // Doctor
  const [doctorReport, setDoctorReport] = useState<DoctorReportItem[]>([]);

  // UI state
  const [nameError, setNameError] = useState<string | null>(null);

  // Team mode
  const [enableTeamMode, setEnableTeamMode] = useState(true);

  // Sync flow
  const [syncSourceVariant, setSyncSourceVariant] = useState('');
  const [syncTargetVariants, setSyncTargetVariants] = useState<string[]>([]);
  const [syncItems, setSyncItems] = useState<SyncItem[]>(DEFAULT_SYNC_ITEMS);

  // Screen setter with type safety
  const setScreen = useCallback((newScreen: Screen) => {
    setScreenInternal(newScreen);
  }, []);

  // Reset wizard to initial state
  const resetWizard = useCallback(() => {
    setProviderKey(null);
    setBrandKey('auto');
    setName('');
    setBaseUrl('');
    setApiKey('');
    setModelSonnet('');
    setModelOpus('');
    setModelHaiku('');
    setApiKeyDetectedFrom(null);
    setNpmPackage(defaultNpmPackage);
    setExtraEnv([]);
    setUsePromptPack(true);
    // promptPackMode is deprecated - no need to reset
    setInstallSkill(true);
    setShellEnv(true);
    setSkillUpdate(false);
    setCompletion(defaultCompletion);
    // UI state
    setNameError(null);
    // Team mode
    setEnableTeamMode(true);
    // Sync flow
    setSyncSourceVariant('');
    setSyncTargetVariants([]);
    setSyncItems(DEFAULT_SYNC_ITEMS);
  }, [defaultNpmPackage]);

  // Navigate back based on current screen using route definitions
  const navigateBack = useCallback(() => {
    // Don't navigate back from progress screens
    if (isProgressScreen(screen)) return;

    // Handle home -> exit
    if (screen === 'home') {
      setScreenInternal('exit');
      return;
    }

    // Use route-based parent
    const parent = getParentScreen(screen);
    setScreenInternal(parent);
  }, [screen]);

  // Add a progress line
  const addProgressLine = useCallback((line: string) => {
    setProgressLines((prev) => [...prev, line]);
  }, []);

  // Add extra env entry
  const addExtraEnv = useCallback((entry: string) => {
    setExtraEnv((prev) => [...prev, entry]);
  }, []);

  // Assemble state
  const state = useMemo<AppState>(
    () => ({
      screen,
      providerKey,
      brandKey,
      name,
      baseUrl,
      apiKey,
      apiKeyDetectedFrom,
      modelSonnet,
      modelOpus,
      modelHaiku,
      rootDir,
      binDir,
      npmPackage,
      usePromptPack,
      promptPackMode,
      installSkill,
      shellEnv,
      skillUpdate,
      extraEnv,
      progressLines,
      doneLines,
      completion,
      variants,
      selectedVariant,
      doctorReport,
      nameError,
      enableTeamMode,
      syncSourceVariant,
      syncTargetVariants,
      syncItems,
    }),
    [
      screen,
      providerKey,
      brandKey,
      name,
      baseUrl,
      apiKey,
      apiKeyDetectedFrom,
      modelSonnet,
      modelOpus,
      modelHaiku,
      rootDir,
      binDir,
      npmPackage,
      usePromptPack,
      promptPackMode,
      installSkill,
      shellEnv,
      skillUpdate,
      extraEnv,
      progressLines,
      doneLines,
      completion,
      variants,
      selectedVariant,
      doctorReport,
      nameError,
      enableTeamMode,
      syncSourceVariant,
      syncTargetVariants,
      syncItems,
    ]
  );

  // Assemble actions
  const actions = useMemo<AppActions>(
    () => ({
      setScreen,
      navigateBack,
      setProviderKey,
      setBrandKey,
      setName,
      setBaseUrl,
      setApiKey,
      setApiKeyDetectedFrom,
      setModelSonnet,
      setModelOpus,
      setModelHaiku,
      setRootDir,
      setBinDir,
      setNpmPackage,
      setUsePromptPack,
      setPromptPackMode,
      setInstallSkill,
      setShellEnv,
      setSkillUpdate,
      setExtraEnv,
      addExtraEnv,
      setProgressLines,
      addProgressLine,
      setDoneLines,
      setCompletion,
      setVariants,
      setSelectedVariant,
      setDoctorReport,
      setNameError,
      setEnableTeamMode,
      setSyncSourceVariant,
      setSyncTargetVariants,
      setSyncItems,
      resetWizard,
    }),
    [setScreen, navigateBack, addProgressLine, addExtraEnv, resetWizard]
  );

  return { state, actions };
}
