/**
 * Path command - prints PATH setup instructions
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as core from '../../core/index.js';
import type { ParsedArgs } from '../args.js';

export interface PathCommandOptions {
  opts: ParsedArgs;
}

export interface PathApplyResult {
  ok: boolean;
  message: string;
  command?: string;
  nextSteps?: string[];
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

const escapePowerShellString = (value: string): string => value.replace(/'/g, "''");

const getPowerShellProfilePath = (): string | null => {
  const home = process.env.USERPROFILE || os.homedir();
  if (!home) return null;
  const docsDir = path.join(home, 'Documents');
  const candidates = [
    path.join(docsDir, 'PowerShell', 'Microsoft.PowerShell_profile.ps1'),
    path.join(docsDir, 'WindowsPowerShell', 'Microsoft.PowerShell_profile.ps1'),
  ];
  const existing = candidates.find((candidate) => fs.existsSync(candidate));
  return existing || candidates[0] || null;
};

const applyPowerShellProfile = (binDir: string): { ok: boolean; message: string; profile?: string } => {
  const profile = getPowerShellProfilePath();
  if (!profile) return { ok: false, message: 'Unable to resolve PowerShell profile path.' };

  try {
    fs.mkdirSync(path.dirname(profile), { recursive: true });
    const current = fs.existsSync(profile) ? fs.readFileSync(profile, 'utf8') : '';
    if (current.includes(binDir)) {
      return { ok: true, message: `Status: ${profile} already includes ${binDir}`, profile };
    }
    const escaped = escapePowerShellString(binDir);
    const block = `# cc-mirror\nif (-not $env:Path.Contains('${escaped}')) { $env:Path += ';${escaped}' }\n`;
    const prefix = current && !current.endsWith('\n') ? '\n' : '';
    fs.appendFileSync(profile, `${prefix}${block}`, 'utf8');
    return { ok: true, message: `Updated ${profile}.`, profile };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message: `Failed to update ${profile}: ${message}`, profile };
  }
};

const applyPosixProfile = (binDir: string, shellName: string): PathApplyResult => {
  if (shellName === 'fish') {
    return {
      ok: false,
      message: 'Automatic PATH updates are not supported for fish.',
      command: `set -Ux fish_user_paths ${binDir} $fish_user_paths`,
    };
  }

  const profileLabel = shellName === 'zsh' ? '~/.zshrc' : shellName === 'bash' ? '~/.bashrc' : '~/.profile';
  const exportLine = `export PATH="${binDir}:$PATH"`;
  const profilePath = expandHome(profileLabel);

  try {
    fs.mkdirSync(path.dirname(profilePath), { recursive: true });
    const current = fs.existsSync(profilePath) ? fs.readFileSync(profilePath, 'utf8') : '';
    if (current.includes(binDir)) {
      return {
        ok: true,
        message: `Status: ${profileLabel} already includes ${binDir}`,
        nextSteps: [`Run: source ${profileLabel}`, 'Or open a new terminal.'],
      };
    }
    const prefix = current && !current.endsWith('\n') ? '\n' : '';
    fs.appendFileSync(profilePath, `${prefix}# cc-mirror\n${exportLine}\n`, 'utf8');
    return {
      ok: true,
      message: `Updated ${profileLabel}.`,
      nextSteps: [`Run: source ${profileLabel}`, 'Or open a new terminal.'],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message: `Failed to update ${profileLabel}: ${message}` };
  }
};

export const applyPathUpdate = (binDir: string): PathApplyResult => {
  if (isInPath(binDir)) {
    return { ok: true, message: 'Status: already in PATH' };
  }

  if (process.platform === 'win32') {
    const result = applyPowerShellProfile(binDir);
    if (!result.ok) {
      return { ok: false, message: result.message };
    }
    return {
      ok: true,
      message: result.message,
      nextSteps: ['Open a new PowerShell window to pick up PATH changes.'],
    };
  }

  const shellName = path.basename(process.env.SHELL || '');
  return applyPosixProfile(binDir, shellName);
};

export function runPathCommand({ opts }: PathCommandOptions): void {
  const binDir = resolveBinDir(opts['bin-dir'] as string | undefined);
  const inPath = isInPath(binDir);
  const apply = Boolean(opts.apply);

  console.log(`Bin directory: ${binDir}`);
  if (inPath) {
    console.log('Status: already in PATH');
    return;
  }

  if (apply) {
    const result = applyPathUpdate(binDir);
    console.log(result.message);
    if (result.command) {
      console.log(`Run: ${result.command}`);
      return;
    }
    if (result.nextSteps && result.nextSteps.length > 0) {
      for (const step of result.nextSteps) {
        console.log(step);
      }
    }
    if (result.ok) {
      return;
    }
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
