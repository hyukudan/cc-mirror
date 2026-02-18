import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

export const expandTilde = (input?: string): string | undefined => {
  if (!input) return input;
  if (input === '~') return os.homedir();
  if (input.startsWith('~/') || input.startsWith('~\\')) return path.join(os.homedir(), input.slice(2));
  return input;
};

export const commandExists = (cmd: string): boolean => {
  const result = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], {
    encoding: 'utf8',
  });
  return result.status === 0 && result.stdout.trim().length > 0;
};

export const isWindows = process.platform === 'win32';

export interface CommandCollisionCheck {
  hasCollision: boolean;
  existingWrapper: boolean;
  pathConflict: boolean;
  resolvedPath: string | null;
  binDirOnPath: boolean;
}

function normalizeFsPath(p: string): string {
  return isWindows ? p.toLowerCase() : p;
}

function resolveCommandPath(cmd: string): string | null {
  if (cmd.startsWith('-')) return null;
  const which = isWindows ? 'where' : 'which';
  const result = spawnSync(which, [cmd], { encoding: 'utf8', timeout: 5000 });
  return result.status === 0 ? result.stdout.trim().split('\n')[0].trim() : null;
}

export function detectCommandCollision(name: string, binDir: string): CommandCollisionCheck {
  const wrapperExt = isWindows ? '.cmd' : '';
  const wrapperPath = path.join(binDir, name + wrapperExt);
  const existingWrapper = fs.existsSync(wrapperPath);

  const normalizedBinDir = normalizeFsPath(path.resolve(binDir));
  const pathDirs = (process.env.PATH || '').split(path.delimiter).map((d) => normalizeFsPath(path.resolve(d)));
  const binDirOnPath = pathDirs.includes(normalizedBinDir);

  let resolvedPath: string | null = null;
  let pathConflict = false;

  // Only check PATH conflict if binDir is on PATH (lazy - avoids unnecessary process spawn)
  if (binDirOnPath) {
    resolvedPath = resolveCommandPath(name);
    if (resolvedPath) {
      const normalizedResolved = normalizeFsPath(path.resolve(resolvedPath));
      // It's a conflict if the resolved command is NOT our own wrapper
      pathConflict = !normalizedResolved.startsWith(normalizedBinDir);
    }
  }

  return {
    hasCollision: existingWrapper || pathConflict,
    existingWrapper,
    pathConflict,
    resolvedPath,
    binDirOnPath,
  };
}
