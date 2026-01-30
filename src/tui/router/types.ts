/**
 * Router Types
 * Declarative route definitions for the TUI
 */

/**
 * All possible screens in the TUI
 */
export type Screen =
  // Home and exit
  | 'home'
  | 'exit'
  // Quick setup flow
  | 'quick-provider'
  | 'quick-intro'
  | 'quick-api-key'
  | 'quick-models'
  | 'quick-ccrouter-url'
  | 'quick-name'
  // Advanced create flow
  | 'create-provider'
  | 'create-intro'
  | 'create-brand'
  | 'create-name'
  | 'create-base-url'
  | 'create-ccrouter-url'
  | 'create-api-key'
  | 'create-models'
  | 'create-prompt-pack'
  | 'create-skill-install'
  | 'create-team-mode'
  | 'create-shell-env'
  | 'create-env-confirm'
  | 'create-env-add'
  | 'create-summary'
  | 'create-running'
  | 'create-done'
  // Manage flow
  | 'manage'
  | 'manage-actions'
  | 'manage-update'
  | 'manage-update-done'
  | 'manage-launch'
  | 'manage-launch-done'
  | 'manage-path'
  | 'manage-path-done'
  | 'manage-tweak'
  | 'manage-tweak-done'
  | 'manage-remove'
  | 'manage-remove-done'
  | 'manage-team-mode'
  | 'manage-team-mode-done'
  | 'manage-models'
  | 'manage-models-saving'
  | 'manage-models-done'
  // Update all
  | 'updateAll'
  | 'updateAll-done'
  // Sync flow
  | 'sync-source'
  | 'sync-items'
  | 'sync-targets'
  | 'sync-running'
  | 'sync-done'
  // Doctor
  | 'doctor'
  // About / Feedback
  | 'about'
  | 'feedback';

/**
 * Flow categories for screens
 */
export type Flow = 'home' | 'exit' | 'quick' | 'create' | 'manage' | 'updateAll' | 'sync' | 'doctor' | 'about';

/**
 * Route definition with navigation metadata
 */
export interface RouteDefinition {
  /** The screen this route represents */
  screen: Screen;
  /** The flow this screen belongs to */
  flow: Flow;
  /** Parent screen for back navigation (undefined = home) */
  parent?: Screen;
  /** Dynamic parent resolver (takes priority over parent) */
  parentResolver?: (ctx: RouteContext) => Screen;
}

/**
 * Context for dynamic route resolution
 */
export interface RouteContext {
  providerKey: string | null;
  requiresModelMapping: boolean;
  credentialOptional: boolean;
  apiKeyDetectedFrom: string | null;
}

/**
 * Router state
 */
export interface RouterState {
  screen: Screen;
  history: Screen[];
}

/**
 * Router actions
 */
export interface RouterActions {
  navigate: (screen: Screen) => void;
  goBack: () => void;
  replace: (screen: Screen) => void;
  reset: () => void;
}

/**
 * Combined router hook return
 */
export interface UseRouterReturn {
  screen: Screen;
  navigate: (screen: Screen) => void;
  goBack: () => void;
  replace: (screen: Screen) => void;
  reset: () => void;
  getParent: () => Screen;
}
