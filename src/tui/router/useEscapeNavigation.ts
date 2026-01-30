/**
 * Escape Key Navigation Hook
 * Handles ESC key to navigate back through screen hierarchy
 */

import { useInput } from 'ink';
import type { Screen } from './types.js';
import type { ProviderTemplate } from '../../providers/index.js';
import { getParentScreen, isProgressScreen } from './routes.js';

export interface UseEscapeNavigationOptions {
  screen: Screen;
  provider: ProviderTemplate | null;
  setScreen: (screen: Screen) => void;
}

/**
 * Hook that handles ESC key navigation
 * Provides context-aware back navigation
 */
export function useEscapeNavigation(options: UseEscapeNavigationOptions): void {
  const { screen, provider, setScreen } = options;

  useInput((_, key) => {
    if (key.escape) {
      navigateBack(screen, provider, setScreen);
    }
  });
}

/**
 * Navigate back based on current screen
 */
function navigateBack(screen: Screen, provider: ProviderTemplate | null, setScreen: (screen: Screen) => void): void {
  // Don't allow back from progress screens
  if (isProgressScreen(screen)) return;

  // Handle home -> exit
  if (screen === 'home') {
    setScreen('exit');
    return;
  }

  // Special cases with provider context
  if (screen === 'quick-name') {
    // Context-aware: go back based on provider
    if (provider?.requiresModelMapping) {
      setScreen('quick-models');
    } else {
      setScreen('quick-api-key');
    }
    return;
  }

  // Use route-based parent for all other screens
  const parent = getParentScreen(screen, {
    providerKey: null,
    requiresModelMapping: provider?.requiresModelMapping ?? false,
    credentialOptional: provider?.credentialOptional ?? false,
    apiKeyDetectedFrom: null,
  });
  setScreen(parent);
}
