/**
 * Variant builder utilities - shared between VariantBuilder and VariantUpdater
 */

import type { ProviderTemplate } from '../../providers/index.js';
import { DEFAULT_NPM_PACKAGE, DEFAULT_NPM_VERSION, TWEAKCC_MAX_VERIFIED_CC, TWEAKCC_VERSION } from '../constants.js';

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

/**
 * Compare two semver strings. Returns negative if a < b, 0 if equal, positive if a > b.
 */
const compareSemver = (a: string, b: string): number => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

/**
 * Check if the resolved CC version is verified to work with the pinned tweakcc.
 * Returns a skip note if tweakcc should be skipped, or null if it's safe to run.
 */
export const getTweakccSkipReason = (ccVersion: string): string | null => {
  // Non-semver versions (e.g. "latest", custom tags) — can't verify, let tweakcc try
  if (!/^\d+\.\d+\.\d+/.test(ccVersion)) return null;
  if (compareSemver(ccVersion, TWEAKCC_MAX_VERIFIED_CC) <= 0) return null;
  return `Theming skipped: CC ${ccVersion} not yet verified with tweakcc@${TWEAKCC_VERSION} (max verified: ${TWEAKCC_MAX_VERIFIED_CC}).`;
};
