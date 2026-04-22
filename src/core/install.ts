import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { commandExists } from './paths.js';

export type PackageManager = 'bun' | 'pnpm' | 'yarn' | 'npm';

/**
 * Detect the fastest available package manager
 * Priority: bun → pnpm → yarn → npm (fallback)
 */
export const detectPackageManager = (): PackageManager => {
  if (commandExists('bun')) return 'bun';
  if (commandExists('pnpm')) return 'pnpm';
  if (commandExists('yarn')) return 'yarn';
  if (commandExists('npm')) return 'npm';
  throw new Error('No package manager found. Please install npm, yarn, pnpm, or bun.');
};

/**
 * Get the install command args for a package manager
 */
export const getInstallArgs = (pm: PackageManager, npmDir: string, pkgSpec: string): string[] => {
  switch (pm) {
    case 'bun':
      return ['add', '--cwd', npmDir, pkgSpec];
    case 'pnpm':
      return ['add', '--dir', npmDir, pkgSpec];
    case 'yarn':
      return ['add', '--cwd', npmDir, pkgSpec];
    case 'npm':
    default:
      return ['install', '--prefix', npmDir, '--no-save', pkgSpec];
  }
};

/**
 * Resolves the path to the native Claude binary written by the package's
 * postinstall. Despite the `.exe` suffix the file is platform-independent —
 * Anthropic's install.cjs always writes to `bin/claude.exe` so npm's
 * `bin` mapping (`{"claude": "bin/claude.exe"}`) can stay identical on every
 * platform and produce the right cmd-shim on Windows without branching.
 */
export const resolveClaudeBinaryPath = (npmDir: string, npmPackage: string): string => {
  const parts = npmPackage.split('/');
  return path.join(npmDir, 'node_modules', ...parts, 'bin', 'claude.exe');
};

/**
 * Some package managers (notably pnpm v10) block `postinstall` scripts by
 * default, which means `@anthropic-ai/claude-code`'s platform-bin linker
 * never runs and `bin/claude` is missing after a successful install. This
 * helper runs `node install.cjs` inside the package directory manually so
 * the post-install step still happens regardless of package manager policy.
 *
 * Returns `true` when the script ran with exit code 0. Returns `false` when
 * the script does not exist. Errors from spawning are not swallowed — they
 * surface via a non-zero status or throw from spawnSync.
 */
export const runPostinstallFallback = (npmDir: string, npmPackage: string): boolean => {
  const parts = npmPackage.split('/');
  const pkgDir = path.join(npmDir, 'node_modules', ...parts);
  const installScript = path.join(pkgDir, 'install.cjs');
  if (!fs.existsSync(installScript)) return false;
  const result = spawnSync(process.execPath, [installScript], {
    cwd: pkgDir,
    stdio: 'pipe',
    encoding: 'utf8',
  });
  return result.status === 0;
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

const formatInstallError = (pm: PackageManager, pkgSpec: string, output: string): string => {
  const tail = output.length > 0 ? `\n${output}` : '';
  const hints = buildWindowsInstallHints(output);
  const hintText = hints.length > 0 ? `\n\nWindows tips:\n${hints.map((hint) => `- ${hint}`).join('\n')}` : '';
  return `${pm} install failed for ${pkgSpec}.${tail}${hintText}`;
};

const ensureNpmManifest = (npmDir: string) => {
  const manifestPath = path.join(npmDir, 'package.json');
  if (!fs.existsSync(manifestPath)) {
    fs.writeFileSync(manifestPath, JSON.stringify({ name: 'cc-mirror-variant', private: true }, null, 2), 'utf8');
  }
};

export const installNpmClaude = (params: {
  npmDir: string;
  npmPackage: string;
  npmVersion: string;
  stdio?: 'inherit' | 'pipe';
}): { cliPath: string; packageManager: PackageManager } => {
  const pm = detectPackageManager();
  const stdio = params.stdio ?? 'inherit';
  const pkgSpec = params.npmVersion ? `${params.npmPackage}@${params.npmVersion}` : params.npmPackage;

  if (stdio === 'inherit') {
    console.log(`Using ${pm} for installation...`);
  }

  ensureNpmManifest(params.npmDir);
  const result = spawnSync(pm, getInstallArgs(pm, params.npmDir, pkgSpec), {
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
    throw new Error(formatInstallError(pm, pkgSpec, output));
  }

  const binaryPath = resolveClaudeBinaryPath(params.npmDir, params.npmPackage);
  if (!fs.existsSync(binaryPath)) {
    runPostinstallFallback(params.npmDir, params.npmPackage);
    if (!fs.existsSync(binaryPath)) {
      throw new Error(`${pm} install succeeded but the Claude binary was not found at ${binaryPath}`);
    }
  }

  return { cliPath: binaryPath, packageManager: pm };
};

/**
 * Async version of installNpmClaude - allows React to re-render between steps
 */
export const installNpmClaudeAsync = (params: {
  npmDir: string;
  npmPackage: string;
  npmVersion: string;
  stdio?: 'inherit' | 'pipe';
}): Promise<{ cliPath: string; packageManager: PackageManager }> => {
  return new Promise((resolve, reject) => {
    let pm: PackageManager;
    try {
      pm = detectPackageManager();
    } catch (err) {
      reject(err);
      return;
    }

    const stdio = params.stdio ?? 'inherit';
    const pkgSpec = params.npmVersion ? `${params.npmPackage}@${params.npmVersion}` : params.npmPackage;

    if (stdio === 'inherit') {
      console.log(`Using ${pm} for installation...`);
    }

    ensureNpmManifest(params.npmDir);
    const child = spawn(pm, getInstallArgs(pm, params.npmDir, pkgSpec), {
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
        reject(new Error(formatInstallError(pm, pkgSpec, output)));
        return;
      }

      const binaryPath = resolveClaudeBinaryPath(params.npmDir, params.npmPackage);
      if (!fs.existsSync(binaryPath)) {
        runPostinstallFallback(params.npmDir, params.npmPackage);
        if (!fs.existsSync(binaryPath)) {
          reject(new Error(`${pm} install succeeded but the Claude binary was not found at ${binaryPath}`));
          return;
        }
      }

      resolve({ cliPath: binaryPath, packageManager: pm });
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn ${pm}: ${err.message}`));
    });
  });
};
