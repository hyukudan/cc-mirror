/**
 * Route Definitions
 * Declarative route map for the TUI
 */

import type { Screen, Flow, RouteDefinition, RouteContext } from './types.js';

/**
 * Route definitions for all screens
 * Used for navigation and back button logic
 */
export const ROUTE_MAP: Record<Screen, RouteDefinition> = {
  // Home and exit
  home: { screen: 'home', flow: 'home' },
  exit: { screen: 'exit', flow: 'exit' },

  // Quick setup flow
  'quick-provider': { screen: 'quick-provider', flow: 'quick', parent: 'home' },
  'quick-intro': { screen: 'quick-intro', flow: 'quick', parent: 'quick-provider' },
  'quick-api-key': { screen: 'quick-api-key', flow: 'quick', parent: 'quick-intro' },
  'quick-models': { screen: 'quick-models', flow: 'quick', parent: 'quick-api-key' },
  'quick-ccrouter-url': { screen: 'quick-ccrouter-url', flow: 'quick', parent: 'quick-intro' },
  'quick-name': {
    screen: 'quick-name',
    flow: 'quick',
    parentResolver: (ctx) => {
      if (ctx.providerKey === 'ccrouter') return 'quick-ccrouter-url';
      return ctx.requiresModelMapping ? 'quick-models' : 'quick-api-key';
    },
  },

  // Advanced create flow
  'create-provider': { screen: 'create-provider', flow: 'create', parent: 'home' },
  'create-intro': { screen: 'create-intro', flow: 'create', parent: 'create-provider' },
  'create-brand': { screen: 'create-brand', flow: 'create', parent: 'create-intro' },
  'create-name': { screen: 'create-name', flow: 'create', parent: 'create-brand' },
  'create-base-url': { screen: 'create-base-url', flow: 'create', parent: 'create-name' },
  'create-ccrouter-url': { screen: 'create-ccrouter-url', flow: 'create', parent: 'create-name' },
  'create-api-key': { screen: 'create-api-key', flow: 'create', parent: 'create-base-url' },
  'create-models': { screen: 'create-models', flow: 'create', parent: 'create-api-key' },
  'create-prompt-pack': { screen: 'create-prompt-pack', flow: 'create', parent: 'create-models' },
  'create-skill-install': { screen: 'create-skill-install', flow: 'create', parent: 'create-prompt-pack' },
  'create-team-mode': { screen: 'create-team-mode', flow: 'create', parent: 'create-skill-install' },
  'create-shell-env': { screen: 'create-shell-env', flow: 'create', parent: 'create-team-mode' },
  'create-env-confirm': { screen: 'create-env-confirm', flow: 'create', parent: 'create-shell-env' },
  'create-env-add': { screen: 'create-env-add', flow: 'create', parent: 'create-env-confirm' },
  'create-summary': { screen: 'create-summary', flow: 'create', parent: 'create-env-add' },
  'create-running': { screen: 'create-running', flow: 'create', parent: 'create-summary' },
  'create-done': { screen: 'create-done', flow: 'create', parent: 'home' },

  // Manage flow
  manage: { screen: 'manage', flow: 'manage', parent: 'home' },
  'manage-actions': { screen: 'manage-actions', flow: 'manage', parent: 'manage' },
  'manage-update': { screen: 'manage-update', flow: 'manage', parent: 'manage-actions' },
  'manage-update-done': { screen: 'manage-update-done', flow: 'manage', parent: 'home' },
  'manage-launch': { screen: 'manage-launch', flow: 'manage', parent: 'manage-actions' },
  'manage-launch-done': { screen: 'manage-launch-done', flow: 'manage', parent: 'home' },
  'manage-path': { screen: 'manage-path', flow: 'manage', parent: 'manage-actions' },
  'manage-path-done': { screen: 'manage-path-done', flow: 'manage', parent: 'home' },
  'manage-tweak': { screen: 'manage-tweak', flow: 'manage', parent: 'manage-actions' },
  'manage-tweak-done': { screen: 'manage-tweak-done', flow: 'manage', parent: 'home' },
  'manage-remove': { screen: 'manage-remove', flow: 'manage', parent: 'manage-actions' },
  'manage-remove-done': { screen: 'manage-remove-done', flow: 'manage', parent: 'home' },
  'manage-team-mode': { screen: 'manage-team-mode', flow: 'manage', parent: 'manage-actions' },
  'manage-team-mode-done': { screen: 'manage-team-mode-done', flow: 'manage', parent: 'home' },
  'manage-models': { screen: 'manage-models', flow: 'manage', parent: 'manage-actions' },
  'manage-models-saving': { screen: 'manage-models-saving', flow: 'manage', parent: 'manage-models' },
  'manage-models-done': { screen: 'manage-models-done', flow: 'manage', parent: 'manage-actions' },

  // Update all
  updateAll: { screen: 'updateAll', flow: 'updateAll', parent: 'home' },
  'updateAll-done': { screen: 'updateAll-done', flow: 'updateAll', parent: 'home' },

  // Sync flow
  'sync-source': { screen: 'sync-source', flow: 'sync', parent: 'home' },
  'sync-items': { screen: 'sync-items', flow: 'sync', parent: 'sync-source' },
  'sync-targets': { screen: 'sync-targets', flow: 'sync', parent: 'sync-items' },
  'sync-running': { screen: 'sync-running', flow: 'sync', parent: 'sync-targets' },
  'sync-done': { screen: 'sync-done', flow: 'sync', parent: 'home' },

  // Doctor
  doctor: { screen: 'doctor', flow: 'doctor', parent: 'home' },

  // About / Feedback
  about: { screen: 'about', flow: 'about', parent: 'home' },
  feedback: { screen: 'feedback', flow: 'about', parent: 'home' },
};

/**
 * Get the parent screen for navigation
 */
export function getParentScreen(screen: Screen, context?: RouteContext): Screen {
  const route = ROUTE_MAP[screen];
  if (!route) return 'home';

  // Use dynamic resolver if available and context provided
  if (route.parentResolver && context) {
    return route.parentResolver(context);
  }

  return route.parent ?? 'home';
}

/**
 * Get the flow for a screen
 */
export function getScreenFlow(screen: Screen): Flow {
  return ROUTE_MAP[screen]?.flow ?? 'home';
}

/**
 * Check if a screen is a progress/running screen
 */
export function isProgressScreen(screen: Screen): boolean {
  return (
    screen === 'create-running' ||
    screen === 'manage-update' ||
    screen === 'manage-launch' ||
    screen === 'manage-path' ||
    screen === 'manage-tweak' ||
    screen === 'manage-team-mode' ||
    screen === 'manage-models-saving' ||
    screen === 'updateAll' ||
    screen === 'sync-running'
  );
}

/**
 * Check if a screen is a completion/done screen
 */
export function isCompletionScreen(screen: Screen): boolean {
  return screen.endsWith('-done');
}

// Legacy export for backwards compatibility
export const routes = ROUTE_MAP;
