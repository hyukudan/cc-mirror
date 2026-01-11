import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_BIN_DIR, DEFAULT_NPM_PACKAGE, DEFAULT_NPM_VERSION, DEFAULT_ROOT } from './constants.js';
import { ensureDir, readJson } from './fs.js';
import { expandTilde } from './paths.js';
import { ensureTweakccConfig, launchTweakccUi } from './tweakcc.js';
import { getWrapperPath } from './wrapper.js';
import { formatTweakccFailure } from './errors.js';
import { listVariants as listVariantsImpl, loadVariantMeta } from './variants.js';
import { assertValidTeamName, assertValidVariantName, isValidEnvKey } from './validation.js';
import { getProvider } from '../providers/index.js';
import { VariantBuilder, VariantUpdater } from './variant-builder/index.js';
import type {
  CreateVariantParams,
  CreateVariantResult,
  DoctorOptions,
  DoctorReportItem,
  UpdateVariantOptions,
  UpdateVariantResult,
  VariantEntry,
  VariantConfig,
} from './types.js';

export { DEFAULT_ROOT, DEFAULT_BIN_DIR, DEFAULT_NPM_PACKAGE, DEFAULT_NPM_VERSION };
export { expandTilde } from './paths.js';
export { syncVariants, syncVariantsAsync, createConfigBackup, restoreConfigBackup } from './sync.js';
export type { SyncItem, SyncOptions, SyncResult, SyncItemResult } from './sync.js';
export { exportVariant, importVariant, readExportArchive, writeExportArchive } from './export.js';
export type {
  ExportArchive,
  ExportItem,
  ExportItemResult,
  ExportResult,
  ImportItemResult,
  ImportResult,
} from './export.js';

export const createVariant = (params: CreateVariantParams): CreateVariantResult => {
  return new VariantBuilder(false).build(params);
};

/**
 * Async version of createVariant - allows UI progress updates during long operations
 */
export const createVariantAsync = async (params: CreateVariantParams): Promise<CreateVariantResult> => {
  return new VariantBuilder(true).buildAsync(params);
};

/**
 * Async version of updateVariant - allows UI progress updates during long operations
 */
export const updateVariantAsync = async (
  rootDir: string,
  name: string,
  opts: UpdateVariantOptions = {}
): Promise<UpdateVariantResult> => {
  return new VariantUpdater(true).updateAsync(rootDir, name, opts);
};

export const updateVariant = (rootDir: string, name: string, opts: UpdateVariantOptions = {}): UpdateVariantResult => {
  return new VariantUpdater(false).update(rootDir, name, opts);
};

export const removeVariant = (rootDir: string, name: string) => {
  const safeName = assertValidVariantName(name);
  const resolvedRoot = expandTilde(rootDir || DEFAULT_ROOT) ?? rootDir;
  const variantDir = path.join(resolvedRoot, safeName);
  if (!fs.existsSync(variantDir)) throw new Error(`Variant not found: ${safeName}`);
  fs.rmSync(variantDir, { recursive: true, force: true });
};

export const doctor = (rootDir: string, binDir: string, opts: DoctorOptions = {}): DoctorReportItem[] => {
  const resolvedRoot = expandTilde(rootDir || DEFAULT_ROOT) ?? rootDir;
  const resolvedBin = expandTilde(binDir || DEFAULT_BIN_DIR) ?? binDir;
  const variants = listVariantsImpl(resolvedRoot);
  return variants.map(({ name, meta }) => {
    const wrapperPath = getWrapperPath(resolvedBin, name);
    const ok = Boolean(meta && fs.existsSync(meta.binaryPath) && fs.existsSync(wrapperPath));
    const report: DoctorReportItem = {
      name,
      ok,
      binaryPath: meta?.binaryPath,
      wrapperPath,
    };
    if (!opts.strict) return report;

    const issues: string[] = [];
    const warnings: string[] = [];
    try {
      assertValidVariantName(name);
    } catch (error) {
      issues.push(error instanceof Error ? error.message : String(error));
    }

    if (!meta) {
      issues.push('variant.json missing or invalid');
    } else {
      if (meta.name && meta.name !== name) {
        warnings.push(`variant.json name "${meta.name}" does not match folder "${name}"`);
      }
      if (!meta.provider) {
        warnings.push('variant.json missing provider');
      } else if (!getProvider(meta.provider)) {
        warnings.push(`variant.json provider "${meta.provider}" not recognized`);
      }
      if (!meta.binaryPath) {
        issues.push('variant.json missing binaryPath');
      }
      const configDir = meta.configDir || path.join(resolvedRoot, name, 'config');
      if (!fs.existsSync(configDir)) {
        issues.push('config directory missing');
      }
      const settingsPath = path.join(configDir, 'settings.json');
      if (!fs.existsSync(settingsPath)) {
        issues.push('settings.json missing');
      } else {
        const settings = readJson<VariantConfig>(settingsPath);
        if (!settings) {
          issues.push('settings.json invalid JSON');
        } else {
          const env = settings.env || {};
          const invalidKeys = Object.keys(env).filter((key) => !isValidEnvKey(key));
          if (invalidKeys.length > 0) {
            issues.push(`settings.json has invalid env keys: ${invalidKeys.join(', ')}`);
          }
          if (Object.hasOwn(env, 'CLAUDE_CODE_TEAM_NAME')) {
            issues.push('settings.json sets CLAUDE_CODE_TEAM_NAME; remove it to allow dynamic team naming');
          }
        }
      }

      const tasksRoot = path.join(configDir, 'tasks');
      if (fs.existsSync(tasksRoot)) {
        const entries = fs.readdirSync(tasksRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory());
        for (const entry of entries) {
          try {
            assertValidTeamName(entry.name);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            issues.push(`invalid team name "${entry.name}": ${message}`);
          }
        }
      }

      if (meta.teamModeEnabled) {
        const npmDir = meta.npmDir || path.join(path.dirname(configDir), 'npm');
        const cliPath = path.join(npmDir, 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');
        if (!fs.existsSync(cliPath)) {
          issues.push('team mode enabled but cli.js not found');
        } else {
          const cliContent = fs.readFileSync(cliPath, 'utf8');
          if (!cliContent.includes('function sU(){return!0}')) {
            issues.push('team mode enabled but cli.js patch missing');
          }
        }
      }
    }

    report.issues = issues.length > 0 ? issues : undefined;
    report.warnings = warnings.length > 0 ? warnings : undefined;
    report.ok = report.ok && issues.length === 0;
    return report;
  });
};

export const listVariants = (rootDir: string): VariantEntry[] => listVariantsImpl(rootDir);

export const tweakVariant = (rootDir: string, name: string): void => {
  const safeName = assertValidVariantName(name);
  const resolvedRoot = expandTilde(rootDir || DEFAULT_ROOT) ?? rootDir;
  const variantDir = path.join(resolvedRoot, safeName);
  const meta = loadVariantMeta(variantDir);
  if (!meta) throw new Error(`Variant not found: ${safeName}`);
  ensureDir(meta.tweakDir);
  const brandKey = meta.brand ?? null;
  ensureTweakccConfig(meta.tweakDir, brandKey);
  const result = launchTweakccUi(meta.tweakDir, meta.binaryPath);
  if (result.status && result.status !== 0) {
    const output = `${result.stderr ?? ''}\n${result.stdout ?? ''}`.trim();
    throw new Error(formatTweakccFailure(output));
  }
};
