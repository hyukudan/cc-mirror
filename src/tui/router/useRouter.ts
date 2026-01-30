/**
 * Router Hook
 * Centralized navigation management for the TUI
 */

import { useState, useCallback, useMemo } from 'react';
import { useInput } from 'ink';
import type { Screen, RouteContext, UseRouterReturn } from './types.js';
import { getParentScreen, isProgressScreen } from './routes.js';

export interface UseRouterOptions {
  /** Initial screen */
  initialScreen?: Screen;
  /** Route context for dynamic parent resolution */
  context?: RouteContext;
  /** Callback when navigating to exit */
  onExit?: () => void;
}

/**
 * Main router hook for TUI navigation
 */
export function useRouter(options: UseRouterOptions = {}): UseRouterReturn {
  const { initialScreen = 'home', context, onExit } = options;
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [history, setHistory] = useState<Screen[]>([]);

  const navigate = useCallback(
    (nextScreen: Screen) => {
      setHistory((prev) => [...prev, screen]);
      setScreen(nextScreen);
    },
    [screen]
  );

  const replace = useCallback((nextScreen: Screen) => {
    setScreen(nextScreen);
  }, []);

  const goBack = useCallback(() => {
    // Don't allow back from progress screens
    if (isProgressScreen(screen)) return;

    // Use history if available
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory((h) => h.slice(0, -1));
      setScreen(prev);
      return;
    }

    // Fall back to route-based parent
    const parent = getParentScreen(screen, context);
    if (parent === 'home' && screen === 'home') {
      setScreen('exit');
      onExit?.();
    } else {
      setScreen(parent);
    }
  }, [screen, history, context, onExit]);

  const reset = useCallback(() => {
    setScreen('home');
    setHistory([]);
  }, []);

  const getParent = useCallback(() => {
    return getParentScreen(screen, context);
  }, [screen, context]);

  return useMemo(
    () => ({
      screen,
      navigate,
      goBack,
      replace,
      reset,
      getParent,
    }),
    [screen, navigate, goBack, replace, reset, getParent]
  );
}

/**
 * Hook to handle ESC key navigation
 */
export function useEscapeNavigation(
  screen: Screen,
  goBack: () => void,
  options?: {
    /** Additional screens where ESC should be disabled */
    disabledScreens?: Screen[];
  }
): void {
  const { disabledScreens = [] } = options || {};

  useInput((_, key) => {
    if (!key.escape) return;

    // Don't allow ESC during progress screens
    if (isProgressScreen(screen)) return;

    // Check for additionally disabled screens
    if (disabledScreens.includes(screen)) return;

    goBack();
  });
}

/**
 * Create a route context from app state
 */
export function createRouteContext(state: {
  providerKey: string | null;
  requiresModelMapping: boolean;
  credentialOptional: boolean;
  apiKeyDetectedFrom: string | null;
}): RouteContext {
  return {
    providerKey: state.providerKey,
    requiresModelMapping: state.requiresModelMapping,
    credentialOptional: state.credentialOptional,
    apiKeyDetectedFrom: state.apiKeyDetectedFrom,
  };
}
