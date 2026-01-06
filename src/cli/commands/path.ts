/**
 * Path command - prints PATH setup instructions
 */

import os from 'node:os';
import path from 'node:path';
import * as core from '../../core/index.js';
import type { ParsedArgs } from '../args.js';

export interface PathCommandOptions {
  opts: ParsedArgs;
}

const expandHome = (value: string): string => {
  if (!value.startsWith('~')) return value;
  const trimmed = value.slice(1);
  if (!trimmed || trimmed.startsWith(path.sep)) {
    return path.join(os.homedir(), trimmed.replace(/^[/\\]/, ''));
  }
  return value;
};

const resolveBinDir = (value?: string): string => {
  const raw = value ? expandHome(value) : core.DEFAULT_BIN_DIR;
  return path.resolve(raw);
};

const isInPath = (binDir: string): boolean => {
  const envPath = process.env.PATH || '';
  if (!envPath) return false;
  const entries = envPath.split(path.delimiter).filter(Boolean);
  const normalized = process.platform === 'win32' ? binDir.toLowerCase() : binDir;
  return entries.some((entry) => {
    const resolved = path.resolve(entry);
    const candidate = process.platform === 'win32' ? resolved.toLowerCase() : resolved;
    return candidate === normalized;
  });
};

export function runPathCommand({ opts }: PathCommandOptions): void {
  const binDir = resolveBinDir(opts['bin-dir'] as string | undefined);
  const inPath = isInPath(binDir);

  console.log(`Bin directory: ${binDir}`);
  if (inPath) {
    console.log('Status: already in PATH');
    return;
  }

  console.log('');
  console.log('Add it to PATH:');
  if (process.platform === 'win32') {
    console.log('');
    console.log('PowerShell (per-user):');
    console.log(`[Environment]::SetEnvironmentVariable("Path", $env:Path + ";${binDir}", "User")`);
    console.log('');
    console.log('CMD (current session):');
    console.log(`set PATH=%PATH%;${binDir}`);
    console.log('');
    console.log('Open a new terminal after updating PATH.');
    return;
  }

  const shellName = path.basename(process.env.SHELL || '');
  const profile = shellName === 'zsh' ? '~/.zshrc' : shellName === 'bash' ? '~/.bashrc' : '~/.profile';
  const exportLine = `export PATH="${binDir}:$PATH"`;

  console.log('');
  console.log(`Add to ${profile}:`);
  console.log(`echo '${exportLine}' >> ${profile}`);
  console.log(`source ${profile}`);
  console.log('');
  console.log('Current session only:');
  console.log(exportLine);
}
