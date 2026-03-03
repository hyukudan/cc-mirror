/**
 * InstallNpmStep - Installs Claude Code via npm
 */

import { ensureDir } from '../../fs.js';
import { npmInstaller } from '../shared/npm-installer.js';
import type { BuildContext, BuildStep } from '../types.js';

export class InstallNpmStep implements BuildStep {
  name = 'InstallNpm';

  execute(ctx: BuildContext): void {
    const { prefs, paths, state } = ctx;

    state.notes.push(...npmInstaller.getPreflightNotes());
    ctx.report(`Installing ${prefs.resolvedNpmPackage}@${prefs.resolvedNpmVersion}...`);

    ensureDir(paths.npmDir);

    npmInstaller.installSync(
      {
        npmDir: paths.npmDir,
        resolvedNpmPackage: prefs.resolvedNpmPackage,
        resolvedNpmVersion: prefs.resolvedNpmVersion,
        commandStdio: prefs.commandStdio,
      },
      state
    );
  }

  async executeAsync(ctx: BuildContext): Promise<void> {
    const { prefs, paths, state } = ctx;

    state.notes.push(...npmInstaller.getPreflightNotes());
    await ctx.report(`Installing ${prefs.resolvedNpmPackage}@${prefs.resolvedNpmVersion}...`);

    ensureDir(paths.npmDir);

    await npmInstaller.installAsync(
      {
        npmDir: paths.npmDir,
        resolvedNpmPackage: prefs.resolvedNpmPackage,
        resolvedNpmVersion: prefs.resolvedNpmVersion,
        commandStdio: prefs.commandStdio,
      },
      state
    );
  }
}
