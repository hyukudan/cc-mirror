/**
 * Theme constants for CC-MIRROR TUI
 *
 * Supports light, dark, and high contrast themes.
 * Theme preference loaded from ~/.cc-mirror/.theme.json
 */

import { getCurrentTheme, type ThemeColors } from '../../themes/index.js';

// Load current theme
const currentTheme = getCurrentTheme();

// Primary color palette - loaded from theme
export const colors: ThemeColors = currentTheme.colors;

// Unicode icons - clean and minimal
export const icons = {
  // Navigation
  pointer: '▸',
  pointerEmpty: ' ',

  // Status
  check: '✓',
  cross: '✗',
  warning: '!',
  bullet: '•',
  star: '★',

  // Progress
  progressFull: '█',
  progressEmpty: '░',

  // Arrows
  arrowRight: '→',
  arrowLeft: '←',
  arrowUp: '↑',
  arrowDown: '↓',
} as const;

// Spinner frames (simple dots)
export const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] as const;

// Keyboard hints
export const keyHints = {
  navigate: '↑↓ Navigate',
  select: '↵ Select',
  back: 'Esc Back',
  continue: '↵ Continue',
} as const;

export type ColorKey = keyof typeof colors;
export type IconKey = keyof typeof icons;

/**
 * Provider-specific colors
 */
export const providerColors = {
  zai: {
    primary: 'yellow',
    border: 'yellow',
    accent: 'yellowBright',
  },
  minimax: {
    primary: 'red',
    border: 'red',
    accent: 'redBright',
  },
  openrouter: {
    primary: 'cyan',
    border: 'cyan',
    accent: 'cyanBright',
  },
  gatewayz: {
    primary: 'magenta',
    border: 'magenta',
    accent: 'cyanBright',
  },
  nanogpt: {
    primary: 'magenta',
    border: 'magenta',
    accent: 'magentaBright',
  },
  ccrouter: {
    primary: 'blue',
    border: 'blue',
    accent: 'blueBright',
  },
  default: {
    primary: 'blue',
    border: 'blue',
    accent: 'blueBright',
  },
} as const;

/**
 * Get colors for a specific provider
 */
export const getProviderColors = (providerKey?: string) => {
  if (!providerKey) return providerColors.default;
  return providerColors[providerKey as keyof typeof providerColors] || providerColors.default;
};
