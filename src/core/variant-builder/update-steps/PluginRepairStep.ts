/**
 * PluginRepairStep - Fixes plugin cache version mismatches
 *
 * Claude Code resolves plugin paths using the marketplace git HEAD SHA
 * (e.g. `e30768372b41`), but some plugins get cached with version `unknown/`.
 * This causes hooks (like hookify's userpromptsubmit.py) to fail with ENOENT.
 *
 * This step creates symlinks from the expected SHA to the actual directory.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import type { UpdateContext, UpdateStep } from '../types.js';

/** First 12 characters of the git HEAD SHA */
const SHA_LENGTH = 12;

/**
 * Get the short HEAD SHA for a marketplace git repo.
 * Returns null if the directory is not a git repo or has no HEAD.
 */
function getMarketplaceSha(marketplaceDir: string): string | null {
  const gitDir = path.join(marketplaceDir, '.git');
  if (!fs.existsSync(gitDir)) return null;

  try {
    const sha = execSync('git rev-parse HEAD', {
      cwd: marketplaceDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return sha.length >= SHA_LENGTH ? sha.slice(0, SHA_LENGTH) : null;
  } catch {
    return null;
  }
}

export class PluginRepairStep implements UpdateStep {
  name = 'PluginRepair';

  execute(ctx: UpdateContext): void {
    ctx.report('Repairing plugin cache...');
    this.repair(ctx);
  }

  async executeAsync(ctx: UpdateContext): Promise<void> {
    await ctx.report('Repairing plugin cache...');
    this.repair(ctx);
  }

  private repair(ctx: UpdateContext): void {
    const { paths, state } = ctx;
    const configDir = path.join(paths.variantDir, 'config');
    const cacheDir = path.join(configDir, 'plugins', 'cache');
    const marketplacesDir = path.join(configDir, 'plugins', 'marketplaces');

    if (!fs.existsSync(cacheDir) || !fs.existsSync(marketplacesDir)) return;

    // Iterate each marketplace (e.g. claude-plugins-official)
    const marketplaces = readdirSafe(cacheDir).filter((entry) => fs.statSync(path.join(cacheDir, entry)).isDirectory());

    let totalFixed = 0;

    for (const marketplace of marketplaces) {
      const marketplaceRepoDir = path.join(marketplacesDir, marketplace);
      const sha = getMarketplaceSha(marketplaceRepoDir);
      if (!sha) continue;

      const marketplaceCacheDir = path.join(cacheDir, marketplace);
      const plugins = readdirSafe(marketplaceCacheDir).filter((entry) =>
        fs.statSync(path.join(marketplaceCacheDir, entry)).isDirectory()
      );

      for (const plugin of plugins) {
        const pluginDir = path.join(marketplaceCacheDir, plugin);
        const shaLink = path.join(pluginDir, sha);

        // Skip if SHA path already exists (symlink or real dir)
        if (fs.existsSync(shaLink)) continue;

        // Find the actual version directory (skip symlinks)
        const versions = readdirSafe(pluginDir).filter((entry) => {
          const full = path.join(pluginDir, entry);
          const stat = fs.lstatSync(full);
          return stat.isDirectory() && !stat.isSymbolicLink();
        });

        if (versions.length === 0) continue;

        // Use the first real directory as the symlink target
        const target = versions[0];
        try {
          fs.symlinkSync(target, shaLink);
          totalFixed++;
        } catch {
          // Silently skip if symlink creation fails (permissions, etc.)
        }
      }
    }

    if (totalFixed > 0) {
      state.notes.push(`Repaired ${totalFixed} plugin cache ${totalFixed === 1 ? 'entry' : 'entries'}`);
    }
  }
}

function readdirSafe(dir: string): string[] {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}
