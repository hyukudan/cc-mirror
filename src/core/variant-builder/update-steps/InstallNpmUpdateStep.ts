/**
 * InstallNpmUpdateStep - Reinstalls Claude Code npm package
 */

import { ensureDir } from '../../fs.js';
import { npmInstaller } from '../shared/npm-installer.js';
import type { UpdateContext, UpdateStep } from '../types.js';

export class InstallNpmUpdateStep implements UpdateStep {
  name = 'InstallNpm';

  execute(ctx: UpdateContext): void {
    if (ctx.opts.settingsOnly) return;

    ctx.state.notes.push(...npmInstaller.getPreflightNotes());
    ctx.report(`Installing ${ctx.prefs.resolvedNpmPackage}@${ctx.prefs.resolvedNpmVersion}...`);

    ensureDir(ctx.paths.npmDir);

    const installState = {
      notes: ctx.state.notes,
      binaryPath: ctx.meta.binaryPath,
      claudeBinary: '',
      npmDir: ctx.meta.npmDir,
      npmPackage: ctx.meta.npmPackage,
      npmVersion: ctx.meta.npmVersion,
      claudeOrig: ctx.meta.claudeOrig,
    };

    npmInstaller.installSync(
      {
        npmDir: ctx.paths.npmDir,
        resolvedNpmPackage: ctx.prefs.resolvedNpmPackage,
        resolvedNpmVersion: ctx.prefs.resolvedNpmVersion,
        commandStdio: ctx.prefs.commandStdio,
      },
      installState
    );

    // Update meta with results
    ctx.meta.binaryPath = installState.binaryPath;
    ctx.meta.npmDir = installState.npmDir;
    ctx.meta.npmPackage = installState.npmPackage;
    ctx.meta.npmVersion = installState.npmVersion;
    ctx.meta.claudeOrig = installState.claudeOrig;
    ctx.meta.installType = 'npm';
  }

  async executeAsync(ctx: UpdateContext): Promise<void> {
    if (ctx.opts.settingsOnly) return;

    ctx.state.notes.push(...npmInstaller.getPreflightNotes());
    await ctx.report(`Installing ${ctx.prefs.resolvedNpmPackage}@${ctx.prefs.resolvedNpmVersion}...`);

    ensureDir(ctx.paths.npmDir);

    const installState = {
      notes: ctx.state.notes,
      binaryPath: ctx.meta.binaryPath,
      claudeBinary: '',
      npmDir: ctx.meta.npmDir,
      npmPackage: ctx.meta.npmPackage,
      npmVersion: ctx.meta.npmVersion,
      claudeOrig: ctx.meta.claudeOrig,
    };

    await npmInstaller.installAsync(
      {
        npmDir: ctx.paths.npmDir,
        resolvedNpmPackage: ctx.prefs.resolvedNpmPackage,
        resolvedNpmVersion: ctx.prefs.resolvedNpmVersion,
        commandStdio: ctx.prefs.commandStdio,
      },
      installState
    );

    // Update meta with results
    ctx.meta.binaryPath = installState.binaryPath;
    ctx.meta.npmDir = installState.npmDir;
    ctx.meta.npmPackage = installState.npmPackage;
    ctx.meta.npmVersion = installState.npmVersion;
    ctx.meta.claudeOrig = installState.claudeOrig;
    ctx.meta.installType = 'npm';
  }
}
