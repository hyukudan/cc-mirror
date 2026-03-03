import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_BIN_DIR, DEFAULT_NPM_PACKAGE, DEFAULT_NPM_VERSION, DEFAULT_ROOT } from './constants.js';
import { ensureDir } from './fs.js';
import { expandTilde } from './paths.js';
import { ensureTweakccConfig, launchTweakccUi } from './tweakcc.js';
import { formatTweakccFailure } from './errors.js';
import { listVariants as listVariantsImpl, loadVariantMeta } from './variants.js';
import { assertValidVariantName } from './validation.js';
import { VariantBuilder, VariantUpdater } from './variant-builder/index.js';
import { runDoctorCheck } from './doctor.js';
import type {
  CreateVariantParams,
  CreateVariantResult,
  DoctorOptions,
  DoctorReportItem,
  UpdateVariantOptions,
  UpdateVariantResult,
  VariantEntry,
} from './types.js';

export { DEFAULT_ROOT, DEFAULT_BIN_DIR, DEFAULT_NPM_PACKAGE, DEFAULT_NPM_VERSION };
export { expandTilde, detectCommandCollision } from './paths.js';
export type { CommandCollisionCheck } from './paths.js';
export { ensureWindowsUserPath } from './windows-path.js';
export type { WindowsPathResult } from './windows-path.js';
export { syncVariants, syncVariantsAsync, createConfigBackup, restoreConfigBackup, computeSyncDiff } from './sync.js';
export type { SyncItem, SyncOptions, SyncResult, SyncItemResult, SyncDiff, DiffEntry } from './sync.js';
export { exportVariant, importVariant, readExportArchive, writeExportArchive } from './export.js';
export type {
  ExportArchive,
  ExportItem,
  ExportItemResult,
  ExportResult,
  ImportItemResult,
  ImportResult,
} from './export.js';

// Re-export from doctor for external use
export { checkMcpServerHealth } from './doctor.js';
export type { McpServerStatus } from './types.js';

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
  return runDoctorCheck(rootDir, binDir, opts);
};

export const listVariants = (rootDir: string): VariantEntry[] => {
  const resolvedRoot = expandTilde(rootDir || DEFAULT_ROOT) ?? rootDir;
  return listVariantsImpl(resolvedRoot);
};

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
