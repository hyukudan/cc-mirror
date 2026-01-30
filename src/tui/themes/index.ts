/**
 * Theme system for CC-Mirror TUI
 *
 * Supports light, dark, and high contrast themes.
 * Theme preference is persisted in ~/.cc-mirror/.theme.json
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export type ThemeName = 'light' | 'dark' | 'highcontrast';

export interface ThemeColors {
  // Brand colors
  primary: string;
  primaryBright: string;
  secondary: string;
  secondaryBright: string;
  accent: string;
  gold: string;
  goldBright: string;

  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;

  // Text colors
  text: string;
  textBright: string;
  textMuted: string;
  textDim: string;
  textGold: string;

  // Border colors
  border: string;
  borderFocus: string;
  borderAccent: string;
  borderGold: string;

  // Logo colors
  logo1: string;
  logo2: string;
  logo3: string;
  logoAccent: string;
}

export interface Theme {
  name: ThemeName;
  label: string;
  description: string;
  colors: ThemeColors;
}

/**
 * Light theme - default professional look
 */
const lightTheme: Theme = {
  name: 'light',
  label: 'Light',
  description: 'Light mode (default)',
  colors: {
    primary: 'blue',
    primaryBright: 'blueBright',
    secondary: 'yellow',
    secondaryBright: 'yellowBright',
    accent: 'blueBright',
    gold: 'yellow',
    goldBright: 'yellowBright',

    success: 'greenBright',
    warning: 'yellowBright',
    error: 'redBright',
    info: 'blueBright',

    text: 'white',
    textBright: 'whiteBright',
    textMuted: 'gray',
    textDim: 'blackBright',
    textGold: 'yellow',

    border: 'blue',
    borderFocus: 'blueBright',
    borderAccent: 'yellow',
    borderGold: 'yellow',

    logo1: 'blueBright',
    logo2: 'yellow',
    logo3: 'yellowBright',
    logoAccent: 'white',
  },
};

/**
 * Dark theme - OLED-friendly dark mode
 */
const darkTheme: Theme = {
  name: 'dark',
  label: 'Dark',
  description: 'Dark mode (OLED-friendly)',
  colors: {
    primary: 'cyan',
    primaryBright: 'cyanBright',
    secondary: 'magenta',
    secondaryBright: 'magentaBright',
    accent: 'cyanBright',
    gold: 'magenta',
    goldBright: 'magentaBright',

    success: 'green',
    warning: 'yellow',
    error: 'red',
    info: 'cyan',

    text: 'gray',
    textBright: 'white',
    textMuted: 'blackBright',
    textDim: 'blackBright',
    textGold: 'magenta',

    border: 'cyan',
    borderFocus: 'cyanBright',
    borderAccent: 'magenta',
    borderGold: 'magenta',

    logo1: 'cyanBright',
    logo2: 'magenta',
    logo3: 'magentaBright',
    logoAccent: 'gray',
  },
};

/**
 * High contrast theme - accessibility focused
 */
const highContrastTheme: Theme = {
  name: 'highcontrast',
  label: 'High Contrast',
  description: 'High contrast (accessibility)',
  colors: {
    primary: 'whiteBright',
    primaryBright: 'whiteBright',
    secondary: 'yellowBright',
    secondaryBright: 'yellowBright',
    accent: 'whiteBright',
    gold: 'yellowBright',
    goldBright: 'yellowBright',

    success: 'greenBright',
    warning: 'yellowBright',
    error: 'redBright',
    info: 'cyanBright',

    text: 'whiteBright',
    textBright: 'whiteBright',
    textMuted: 'white',
    textDim: 'gray',
    textGold: 'yellowBright',

    border: 'whiteBright',
    borderFocus: 'yellowBright',
    borderAccent: 'yellowBright',
    borderGold: 'yellowBright',

    logo1: 'whiteBright',
    logo2: 'yellowBright',
    logo3: 'yellowBright',
    logoAccent: 'whiteBright',
  },
};

/**
 * Theme registry
 */
export const THEMES: Record<ThemeName, Theme> = {
  light: lightTheme,
  dark: darkTheme,
  highcontrast: highContrastTheme,
};

/**
 * Get theme configuration file path
 */
function getThemeConfigPath(): string {
  const home = process.env.HOME || process.env.USERPROFILE || os.homedir();
  return path.join(home, '.cc-mirror', '.theme.json');
}

/**
 * Get a theme by name
 */
export function getTheme(name: ThemeName = 'light'): Theme {
  return THEMES[name] || THEMES.light;
}

/**
 * Load theme preference from config file
 */
export function loadThemePreference(): ThemeName {
  try {
    const configPath = getThemeConfigPath();
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as { theme?: string };
      const themeName = config.theme as ThemeName;
      if (themeName && themeName in THEMES) {
        return themeName;
      }
    }
  } catch {
    // Ignore errors, use default
  }
  return 'light';
}

/**
 * Save theme preference to config file
 */
export function saveThemePreference(themeName: ThemeName): void {
  try {
    const configPath = getThemeConfigPath();
    const configDir = path.dirname(configPath);

    // Ensure directory exists
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Read existing config or create new
    let config: Record<string, unknown> = {};
    if (fs.existsSync(configPath)) {
      try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as Record<string, unknown>;
      } catch {
        // Ignore parse errors
      }
    }

    config.theme = themeName;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    // Silently fail - theme preference is not critical
    console.error('Failed to save theme preference:', error);
  }
}

/**
 * List all available themes
 */
export function listThemes(): Theme[] {
  return Object.values(THEMES);
}

/**
 * Check if a theme name is valid
 */
export function isValidTheme(name: string): name is ThemeName {
  return name in THEMES;
}

/**
 * Get the currently active theme
 */
export function getCurrentTheme(): Theme {
  const preference = loadThemePreference();
  return getTheme(preference);
}
