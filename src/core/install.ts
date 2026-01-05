import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { commandExists } from './paths.js';

export const resolveNpmCliPath = (npmDir: string, npmPackage: string): string => {
  const packageParts = npmPackage.split('/');
  return path.join(npmDir, 'node_modules', ...packageParts, 'cli.js');
};

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const ensureNpmManifest = (npmDir: string) => {
  const manifestPath = path.join(npmDir, 'package.json');
  if (!fs.existsSync(manifestPath)) {
    fs.writeFileSync(manifestPath, JSON.stringify({ name: 'cc-mirror-variant', private: true }, null, 2), 'utf8');
  }
};

const buildInstallArgs = (npmDir: string, pkgSpec: string) => {
  const args = ['install', '--no-save', pkgSpec];
  if (process.platform !== 'win32') {
    args.splice(1, 0, '--prefix', npmDir);
  }
  return args;
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
  const result = spawnSync(npmCommand, buildInstallArgs(params.npmDir, pkgSpec), {
    stdio: 'pipe',
    encoding: 'utf8',
    cwd: params.npmDir,
  });

  if (stdio === 'inherit') {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }

  if (result.status !== 0) {
    const output = `${result.stderr ?? ''}\n${result.stdout ?? ''}`.trim();
    const tail = output.length > 0 ? `\n${output}` : '';
    throw new Error(`npm install failed for ${pkgSpec}.${tail}`);
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
    const child = spawn(npmCommand, buildInstallArgs(params.npmDir, pkgSpec), {
      stdio: 'pipe',
      cwd: params.npmDir,
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
        const tail = output.length > 0 ? `\n${output}` : '';
        reject(new Error(`npm install failed for ${pkgSpec}.${tail}`));
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
