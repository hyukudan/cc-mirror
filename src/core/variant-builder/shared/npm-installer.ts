/**
 * Shared NPM Installer - Used by both InstallNpmStep and InstallNpmUpdateStep
 *
 * Centralizes the npm installation logic to avoid duplication between
 * variant creation and update operations.
 */

import { getInstallPreflightNotes, installNpmClaude, installNpmClaudeAsync } from '../../install.js';
import type { TweakResult } from '../../types.js';

export interface NpmInstallContext {
  npmDir: string;
  resolvedNpmPackage: string;
  resolvedNpmVersion: string;
  commandStdio: 'pipe' | 'inherit';
}

export interface NpmInstallState {
  notes: string[];
  binaryPath?: string;
  claudeBinary?: string;
  npmDir?: string;
  npmPackage?: string;
  npmVersion?: string;
  claudeOrig?: string;
  tweakResult?: TweakResult | null;
}

/**
 * Shared npm installer that handles both sync and async installations
 */
export class NpmInstaller {
  /**
   * Get preflight notes for the installation
   */
  getPreflightNotes(): string[] {
    return getInstallPreflightNotes();
  }

  /**
   * Execute npm installation synchronously
   */
  installSync(ctx: NpmInstallContext, state: NpmInstallState): void {
    const install = installNpmClaude({
      npmDir: ctx.npmDir,
      npmPackage: ctx.resolvedNpmPackage,
      npmVersion: ctx.resolvedNpmVersion,
      stdio: ctx.commandStdio,
    });

    this.updateState(state, ctx, install.cliPath);
  }

  /**
   * Execute npm installation asynchronously
   */
  async installAsync(ctx: NpmInstallContext, state: NpmInstallState): Promise<void> {
    const install = await installNpmClaudeAsync({
      npmDir: ctx.npmDir,
      npmPackage: ctx.resolvedNpmPackage,
      npmVersion: ctx.resolvedNpmVersion,
      stdio: ctx.commandStdio,
    });

    this.updateState(state, ctx, install.cliPath);
  }

  /**
   * Update state with installation results
   */
  private updateState(state: NpmInstallState, ctx: NpmInstallContext, cliPath: string): void {
    state.binaryPath = cliPath;
    state.claudeBinary = `npm:${ctx.resolvedNpmPackage}@${ctx.resolvedNpmVersion}`;
    state.npmDir = ctx.npmDir;
    state.npmPackage = ctx.resolvedNpmPackage;
    state.npmVersion = ctx.resolvedNpmVersion;
    state.claudeOrig = `npm:${ctx.resolvedNpmPackage}@${ctx.resolvedNpmVersion}`;
  }
}

/**
 * Singleton instance for convenience
 */
export const npmInstaller = new NpmInstaller();
