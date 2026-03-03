/**
 * Variant builder utilities - shared between VariantBuilder and VariantUpdater
 */

import type { ProviderTemplate } from '../../providers/index.js';
import { DEFAULT_NPM_PACKAGE, DEFAULT_NPM_VERSION } from '../constants.js';

/**
 * Normalize npm package name, falling back to default if empty
 */
export const normalizeNpmPackage = (value?: string): string =>
  value && value.trim().length > 0 ? value.trim() : DEFAULT_NPM_PACKAGE;

/**
 * Normalize npm version, falling back to default if empty
 */
export const normalizeNpmVersion = (value?: string): string =>
  value && value.trim().length > 0 ? value.trim() : DEFAULT_NPM_VERSION;

/**
 * Determine if prompt pack should be enabled for a provider
 */
export const shouldEnablePromptPack = (providerKey: string, provider?: ProviderTemplate): boolean => {
  // Providers with noPromptPack: true skip prompt pack overlays
  if (provider?.noPromptPack) return false;
  return providerKey === 'zai' || providerKey === 'minimax';
};

/**
 * Determine if skills should be installed for a provider
 */
export const shouldInstallSkills = (providerKey: string): boolean => providerKey === 'zai' || providerKey === 'minimax';

/**
 * Determine if shell env should be enabled for a provider
 */
export const shouldEnableShellEnv = (providerKey: string): boolean => providerKey === 'zai';

/**
 * Helper to yield to event loop (for async mode)
 */
export const yieldToEventLoop = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));
