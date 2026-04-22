/**
 * Doctor module - Health check and repair for variants
 *
 * This module provides comprehensive health checks for cc-mirror variants,
 * with support for automatic repairs via the --fix flag.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { DEFAULT_BIN_DIR, DEFAULT_NPM_PACKAGE, DEFAULT_ROOT } from './constants.js';
import { readJson } from './fs.js';
import { expandTilde } from './paths.js';
import { getWrapperPath } from './wrapper.js';
import { listVariants as listVariantsImpl } from './variants.js';
import { assertValidTeamName, assertValidVariantName, isValidEnvKey } from './validation.js';
import { getProvider } from '../providers/index.js';
import { listMcpServers, type McpServerConfig } from './claude-config.js';
import { TEAM_MODE_ENABLED, TEAM_MODE_DISABLED, CLAUDE_CODE_PACKAGE } from './variant-builder/constants.js';
import type { DoctorOptions, DoctorReportItem, McpServerStatus, VariantMeta } from './types.js';

interface DoctorContext {
  name: string;
  meta: VariantMeta | null;
  wrapperPath: string;
  configDir: string;
  npmDir: string;
  isFix: boolean;
}

interface DoctorResults {
  issues: string[];
  warnings: string[];
  fixes: string[];
}

/**
 * Read Claude Code version from the installed npm package
 */
const getInstalledClaudeVersion = (npmDir: string, npmPackage: string): string | undefined => {
  const packageParts = npmPackage.split('/');
  const pkgJsonPath = path.join(npmDir, 'node_modules', ...packageParts, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) return undefined;
  const pkgJson = readJson<{ version?: string }>(pkgJsonPath);
  return pkgJson?.version;
};

const getNativeClaudeVersion = (binaryPath: string): string | undefined => {
  if (!binaryPath || !fs.existsSync(binaryPath)) return undefined;
  const result = spawnSync(binaryPath, ['--version'], {
    stdio: 'pipe',
    encoding: 'utf8',
    timeout: 5000,
  });
  if (result.error || result.status !== 0) return undefined;
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim();
  const match = output.match(/(\d+\.\d+\.\d+)/);
  return match?.[1];
};

/**
 * Check if wrapper has executable permissions
 */
const checkWrapperPermissions = (wrapperPath: string): { executable: boolean; error?: string } => {
  try {
    if (!fs.existsSync(wrapperPath)) {
      return { executable: false, error: 'Wrapper not found' };
    }
    fs.accessSync(wrapperPath, fs.constants.X_OK);
    return { executable: true };
  } catch {
    return { executable: false, error: 'Wrapper not executable' };
  }
};

/**
 * Check MCP server connectivity
 */
export const checkMcpServerHealth = (name: string, config: McpServerConfig): McpServerStatus => {
  if (config.url) {
    return { name, status: 'unchecked', command: config.url };
  }

  if (!config.command) {
    return { name, status: 'error', error: 'No command configured' };
  }

  const command = config.command;
  const args = config.args ?? [];

  try {
    const result = spawnSync(command, ['--version'], {
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 5000,
      env: { ...process.env, ...config.env },
      shell: process.platform === 'win32',
    });

    if (result.error) {
      const err = result.error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        return { name, status: 'error', command, error: `Command not found: ${command}` };
      }
      return { name, status: 'error', command, error: err.message };
    }

    return {
      name,
      status: 'ok',
      command: `${command} ${args.join(' ')}`.trim(),
    };
  } catch (error) {
    return {
      name,
      status: 'error',
      command,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

/**
 * Check variant name validity
 */
const checkVariantName = (name: string, results: DoctorResults): void => {
  try {
    assertValidVariantName(name);
  } catch (error) {
    results.issues.push(error instanceof Error ? error.message : String(error));
  }
};

/**
 * Check wrapper permissions and optionally fix them
 */
const checkWrapper = (ctx: DoctorContext, results: DoctorResults): void => {
  const wrapperCheck = checkWrapperPermissions(ctx.wrapperPath);
  if (!wrapperCheck.executable && wrapperCheck.error) {
    if (ctx.isFix && wrapperCheck.error === 'Wrapper not executable') {
      try {
        fs.chmodSync(ctx.wrapperPath, 0o755);
        results.fixes.push('Fixed wrapper permissions (chmod +x)');
      } catch {
        results.issues.push(wrapperCheck.error);
      }
    } else {
      results.issues.push(wrapperCheck.error);
    }
  }
};

/**
 * Check variant metadata consistency
 */
const checkMetadata = (ctx: DoctorContext, results: DoctorResults): void => {
  if (!ctx.meta) {
    results.issues.push('variant.json missing or invalid');
    return;
  }

  if (ctx.meta.name && ctx.meta.name !== ctx.name) {
    results.warnings.push(`variant.json name "${ctx.meta.name}" does not match folder "${ctx.name}"`);
  }

  if (!ctx.meta.provider) {
    results.warnings.push('variant.json missing provider');
  } else if (!getProvider(ctx.meta.provider)) {
    results.warnings.push(`variant.json provider "${ctx.meta.provider}" not recognized`);
  }

  if (!ctx.meta.binaryPath) {
    results.issues.push('variant.json missing binaryPath');
  }

  if (!fs.existsSync(ctx.configDir)) {
    results.issues.push('config directory missing');
  }
};

/**
 * Check Claude Code version and compare with latest
 */
const checkVersion = (
  ctx: DoctorContext,
  results: DoctorResults,
  report: DoctorReportItem,
  installedVersion: string | undefined,
  latestVersion: string | undefined
): void => {
  if (installedVersion) {
    report.claudeCodeVersion = installedVersion;
    if (latestVersion && installedVersion !== latestVersion) {
      results.warnings.push(`Claude Code ${installedVersion} installed, latest is ${latestVersion}`);
    }
  } else {
    results.warnings.push('Could not determine installed Claude Code version');
  }
  report.claudeCodeLatest = latestVersion;
};

/**
 * Check settings.json for issues and optionally fix them
 */
const checkSettings = (ctx: DoctorContext, results: DoctorResults): void => {
  const settingsPath = path.join(ctx.configDir, 'settings.json');
  if (!fs.existsSync(settingsPath)) {
    results.issues.push('settings.json missing');
    return;
  }

  const settings = readJson<Record<string, unknown>>(settingsPath);
  if (!settings) {
    results.issues.push('settings.json invalid JSON');
    return;
  }

  const env = (settings.env as Record<string, string>) || {};

  // Check for invalid env keys
  const invalidKeys = Object.keys(env).filter((key) => !isValidEnvKey(key));
  if (invalidKeys.length > 0) {
    if (ctx.isFix) {
      for (const key of invalidKeys) delete env[key];
      settings.env = env;
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      results.fixes.push(`Removed invalid env keys: ${invalidKeys.join(', ')}`);
    } else {
      results.issues.push(`settings.json has invalid env keys: ${invalidKeys.join(', ')}`);
    }
  }

  // Check for CLAUDE_CODE_TEAM_NAME (should not be set)
  if (Object.hasOwn(env, 'CLAUDE_CODE_TEAM_NAME')) {
    if (ctx.isFix) {
      delete env.CLAUDE_CODE_TEAM_NAME;
      settings.env = env;
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      results.fixes.push('Removed CLAUDE_CODE_TEAM_NAME from settings.json');
    } else {
      results.issues.push('settings.json sets CLAUDE_CODE_TEAM_NAME; remove it to allow dynamic team naming');
    }
  }
};

/**
 * Check MCP servers health
 */
const checkMcpServers = (ctx: DoctorContext, results: DoctorResults, report: DoctorReportItem): void => {
  if (!fs.existsSync(ctx.configDir)) return;

  const mcpServers = listMcpServers(ctx.configDir);
  const serverNames = Object.keys(mcpServers);
  if (serverNames.length === 0) return;

  const mcpStatuses: McpServerStatus[] = [];
  for (const serverName of serverNames) {
    const status = checkMcpServerHealth(serverName, mcpServers[serverName]);
    mcpStatuses.push(status);
    if (status.status === 'error') {
      results.warnings.push(`MCP server "${serverName}": ${status.error}`);
    }
  }
  report.mcpServers = mcpStatuses;
};

/**
 * Check team names in tasks directory
 */
const checkTeamNames = (ctx: DoctorContext, results: DoctorResults): void => {
  const tasksRoot = path.join(ctx.configDir, 'tasks');
  if (!fs.existsSync(tasksRoot)) return;

  const entries = fs.readdirSync(tasksRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  for (const entry of entries) {
    try {
      assertValidTeamName(entry.name);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.issues.push(`invalid team name "${entry.name}": ${message}`);
    }
  }
};

/**
 * Check team mode patch status and optionally fix it
 */
const checkTeamModePatch = (ctx: DoctorContext, results: DoctorResults, installedVersion: string | undefined): void => {
  if (!ctx.meta?.teamModeEnabled) return;
  if (ctx.meta.installType === 'native') return;

  const cliPath = path.join(ctx.npmDir, 'node_modules', CLAUDE_CODE_PACKAGE, 'cli.js');
  if (!fs.existsSync(cliPath)) {
    results.issues.push('team mode enabled but cli.js not found');
    return;
  }

  // Claude Code 2.1.x has tasks enabled by default (no patch needed)
  let needsPatch = true;
  if (installedVersion) {
    const [major, minor] = installedVersion.split('.').map(Number);
    needsPatch = major < 2 || (major === 2 && minor < 1);
  }

  if (!needsPatch) return;

  const cliContent = fs.readFileSync(cliPath, 'utf8');
  if (cliContent.includes(TEAM_MODE_ENABLED)) return;

  if (ctx.isFix && cliContent.includes(TEAM_MODE_DISABLED)) {
    const patched = cliContent.replace(TEAM_MODE_DISABLED, TEAM_MODE_ENABLED);
    fs.writeFileSync(cliPath, patched);
    results.fixes.push('Re-applied team mode cli.js patch');
  } else {
    results.issues.push('team mode enabled but cli.js patch missing');
  }
};

/**
 * Perform health check on a single variant
 */
const checkVariant = (
  name: string,
  meta: VariantMeta | null,
  wrapperPath: string,
  resolvedRoot: string,
  opts: DoctorOptions,
  isFix: boolean
): DoctorReportItem => {
  const ok = Boolean(meta && fs.existsSync(meta.binaryPath) && fs.existsSync(wrapperPath));
  const report: DoctorReportItem = {
    name,
    ok,
    binaryPath: meta?.binaryPath,
    wrapperPath,
  };

  const isStrict = opts.strict || opts.fix;
  if (!isStrict) return report;

  const results: DoctorResults = { issues: [], warnings: [], fixes: [] };

  const configDir = meta?.configDir || path.join(resolvedRoot, name, 'config');
  const npmDir = meta?.npmDir || path.join(path.dirname(configDir), 'npm');
  const npmPackage = meta?.npmPackage || DEFAULT_NPM_PACKAGE;
  const installedVersion =
    meta?.installType === 'native'
      ? getNativeClaudeVersion(meta.binaryPath)
      : getInstalledClaudeVersion(npmDir, npmPackage);

  const ctx: DoctorContext = {
    name,
    meta,
    wrapperPath,
    configDir,
    npmDir,
    isFix,
  };

  // Run all checks
  checkVariantName(name, results);
  checkWrapper(ctx, results);
  checkMetadata(ctx, results);
  checkVersion(ctx, results, report, installedVersion, opts.latestVersion);
  checkSettings(ctx, results);
  checkMcpServers(ctx, results, report);
  checkTeamNames(ctx, results);
  checkTeamModePatch(ctx, results, installedVersion);

  report.issues = results.issues.length > 0 ? results.issues : undefined;
  report.warnings = results.warnings.length > 0 ? results.warnings : undefined;
  report.fixes = results.fixes.length > 0 ? results.fixes : undefined;
  report.ok = report.ok && results.issues.length === 0;

  return report;
};

/**
 * Run doctor checks on all variants (alias for doctor function)
 */
export const runDoctorCheck = (rootDir: string, binDir: string, opts: DoctorOptions = {}): DoctorReportItem[] => {
  return doctor(rootDir, binDir, opts);
};

/**
 * Run doctor checks on all variants
 */
function doctor(rootDir: string, binDir: string, opts: DoctorOptions = {}): DoctorReportItem[] {
  const resolvedRoot = expandTilde(rootDir || DEFAULT_ROOT) ?? rootDir;
  const resolvedBin = expandTilde(binDir || DEFAULT_BIN_DIR) ?? binDir;
  const variants = listVariantsImpl(resolvedRoot);
  const isFix = opts.fix ?? false;

  return variants.map(({ name, meta }) => {
    const wrapperPath = getWrapperPath(resolvedBin, name);
    return checkVariant(name, meta, wrapperPath, resolvedRoot, opts, isFix);
  });
}
