import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { commandExists } from './paths.js';

export const resolveNpmCliPath = (npmDir: string, npmPackage: string): string => {
  const packageParts = npmPackage.split('/');
  return path.join(npmDir, 'node_modules', ...packageParts, 'cli.js');
};

const isWindows = process.platform === 'win32';

export const getInstallPreflightNotes = (): string[] => {
  if (!isWindows) return [];
  const notes: string[] = [];
  if (!commandExists('git')) {
    notes.push('Windows: Git not found on PATH (install Git for Windows if npm needs it).');
  }
  return notes;
};

const buildWindowsInstallHints = (output: string): string[] => {
  if (!isWindows) return [];
  const lower = output.toLowerCase();
  const hints = new Set<string>();
  hints.add('Verify Node.js LTS and npm are on PATH, then reopen the terminal.');

  if (
    lower.includes('node-gyp') ||
    lower.includes('gyp err') ||
    lower.includes('msbuild') ||
    lower.includes('visual studio')
  ) {
    hints.add('Install Visual Studio Build Tools (C++ workload) for node-gyp builds.');
  }

  if (lower.includes('spawn git') || lower.includes('fatal:') || lower.includes('git ') || lower.includes('git@')) {
    hints.add('Install Git for Windows and reopen the terminal if git is missing.');
  }

  if (lower.includes('eacces') || lower.includes('eperm')) {
    hints.add('Permissions error: try a new terminal or choose a user-writable directory.');
  }

  if (
    lower.includes('etimedout') ||
    lower.includes('econnreset') ||
    lower.includes('eai_again') ||
    lower.includes('enotfound')
  ) {
    hints.add('Network error: retry, or configure npm proxy/registry settings.');
  }

  return Array.from(hints);
};

const formatNpmInstallError = (pkgSpec: string, output: string): string => {
  const tail = output.length > 0 ? `\n${output}` : '';
  const hints = buildWindowsInstallHints(output);
  const hintText = hints.length > 0 ? `\n\nWindows tips:\n${hints.map((hint) => `- ${hint}`).join('\n')}` : '';
  return `npm install failed for ${pkgSpec}.${tail}${hintText}`;
};

const ensureNpmManifest = (npmDir: string) => {
  const manifestPath = path.join(npmDir, 'package.json');
  if (!fs.existsSync(manifestPath)) {
    fs.writeFileSync(manifestPath, JSON.stringify({ name: 'cc-mirror-variant', private: true }, null, 2), 'utf8');
  }
};

const buildInstallArgs = (npmDir: string, pkgSpec: string) => {
  return ['install', '--prefix', npmDir, '--no-save', pkgSpec];
};

export const installNpmClaude = (params: {
  npmDir: string;
  npmPackage: string;
  npmVersion: string;
  stdio?: 'inherit' | 'pipe';
}): { cliPath: string } => {
  if (!commandExists('npm')) {
    throw new Error('npm is required for npm-based installs.');
  }

  const stdio = params.stdio ?? 'inherit';
  const pkgSpec = params.npmVersion ? `${params.npmPackage}@${params.npmVersion}` : params.npmPackage;
  ensureNpmManifest(params.npmDir);
  const result = spawnSync('npm', buildInstallArgs(params.npmDir, pkgSpec), {
    stdio: 'pipe',
    encoding: 'utf8',
    cwd: params.npmDir,
    shell: process.platform === 'win32',
  });

  if (stdio === 'inherit') {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }

  if (result.status !== 0) {
    const output = `${result.stderr ?? ''}\n${result.stdout ?? ''}`.trim();
    throw new Error(formatNpmInstallError(pkgSpec, output));
  }

  const cliPath = resolveNpmCliPath(params.npmDir, params.npmPackage);
  if (!fs.existsSync(cliPath)) {
    throw new Error(`npm install succeeded but cli.js was not found at ${cliPath}`);
  }

  return { cliPath };
};

/**
 * Async version of installNpmClaude - allows React to re-render between steps
 */
export const installNpmClaudeAsync = (params: {
  npmDir: string;
  npmPackage: string;
  npmVersion: string;
  stdio?: 'inherit' | 'pipe';
}): Promise<{ cliPath: string }> => {
  return new Promise((resolve, reject) => {
    if (!commandExists('npm')) {
      reject(new Error('npm is required for npm-based installs.'));
      return;
    }

    const stdio = params.stdio ?? 'inherit';
    const pkgSpec = params.npmVersion ? `${params.npmPackage}@${params.npmVersion}` : params.npmPackage;
    ensureNpmManifest(params.npmDir);
    const child = spawn('npm', buildInstallArgs(params.npmDir, pkgSpec), {
      stdio: 'pipe',
      cwd: params.npmDir,
      shell: process.platform === 'win32',
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
      if (stdio === 'inherit') process.stdout.write(data);
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
      if (stdio === 'inherit') process.stderr.write(data);
    });

    child.on('close', (code) => {
      if (code !== 0) {
        const output = `${stderr}\n${stdout}`.trim();
        reject(new Error(formatNpmInstallError(pkgSpec, output)));
        return;
      }

      const cliPath = resolveNpmCliPath(params.npmDir, params.npmPackage);
      if (!fs.existsSync(cliPath)) {
        reject(new Error(`npm install succeeded but cli.js was not found at ${cliPath}`));
        return;
      }

      resolve({ cliPath });
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn npm: ${err.message}`));
    });
  });
};
