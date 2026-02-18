import { spawnSync } from 'node:child_process';
import path from 'node:path';

export interface WindowsPathResult {
  added: boolean;
  alreadyPresent: boolean;
  skipped: boolean;
  reason?: string;
}

export function ensureWindowsUserPath(binDir: string): WindowsPathResult {
  if (process.platform !== 'win32') {
    return { added: false, alreadyPresent: false, skipped: true, reason: 'not-windows' };
  }

  if (process.env.CC_MIRROR_DISABLE_PATH_UPDATE === '1' || process.env.CI === 'true') {
    return { added: false, alreadyPresent: false, skipped: true, reason: 'disabled' };
  }

  const normalizedBinDir = path.resolve(binDir).toLowerCase();

  // Check current user PATH
  const checkResult = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', `[Environment]::GetEnvironmentVariable('Path', 'User')`],
    { encoding: 'utf8', timeout: 10000 }
  );

  if (checkResult.status !== 0) {
    return { added: false, alreadyPresent: false, skipped: true, reason: 'powershell-error' };
  }

  const currentPath = (checkResult.stdout || '').trim();
  const pathEntries = currentPath.split(';').map((e) => e.trim().toLowerCase());

  if (pathEntries.includes(normalizedBinDir)) {
    return { added: false, alreadyPresent: true, skipped: false };
  }

  // Add to user PATH
  const newPath = currentPath ? `${currentPath};${binDir}` : binDir;
  const setResult = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      `[Environment]::SetEnvironmentVariable('Path', '${newPath.replace(/'/g, "''")}', 'User')`,
    ],
    { encoding: 'utf8', timeout: 10000 }
  );

  if (setResult.status !== 0) {
    return { added: false, alreadyPresent: false, skipped: true, reason: 'set-failed' };
  }

  return { added: true, alreadyPresent: false, skipped: false };
}
