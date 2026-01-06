/**
 * Print variant operation summary to console
 */

import path from 'node:path';
import type { VariantMeta } from '../../core/types.js';

export interface PrintSummaryOptions {
  action: string;
  meta: VariantMeta;
  wrapperPath?: string;
  notes?: string[];
}

export function printSummary(opts: PrintSummaryOptions): void {
  const { action, meta, wrapperPath, notes } = opts;

  // Helper to get prompt pack description with provider-specific routing info
  const getPromptPackDescription = (): string => {
    if (!meta.promptPack) return 'off';
    if (meta.provider === 'zai') return 'on (zai-cli routing)';
    if (meta.provider === 'minimax') return 'on (MCP routing)';
    return 'on';
  };

  // Helper to get team mode description
  const getTeamModeDescription = (): string => {
    if (!meta.teamModeEnabled) return 'off';
    return 'on (orchestrator + task-manager skills, TodoWrite blocked)';
  };

  // Header
  console.log('');
  console.log(`✓ ${action}: ${meta.name}`);
  console.log(`  Provider: ${meta.provider}`);

  // Optional features
  if (meta.promptPack !== undefined) {
    console.log(`  Prompt pack: ${getPromptPackDescription()}`);
  }
  if (meta.skillInstall !== undefined) {
    console.log(`  dev-browser skill: ${meta.skillInstall ? 'on' : 'off'}`);
  }
  if (meta.teamModeEnabled !== undefined) {
    console.log(`  Team mode: ${getTeamModeDescription()}`);
  }
  if (meta.shellEnv !== undefined && meta.provider === 'zai') {
    console.log(`  Shell env: ${meta.shellEnv ? 'write Z_AI_API_KEY' : 'manual'}`);
  }

  // Paths
  if (wrapperPath) console.log(`  Wrapper: ${wrapperPath}`);
  if (meta.configDir) console.log(`  Config: ${meta.configDir}`);

  // Notes
  if (notes && notes.length > 0) {
    console.log('');
    for (const note of notes) console.log(`  • ${note}`);
  }

  // Next steps
  console.log('');
  console.log(`  Run: ${meta.name}`);
  if (wrapperPath && !isWrapperInPath(wrapperPath)) {
    const wrapperDir = path.dirname(wrapperPath);
    const pathCommand = getPathCommand();
    console.log(`  Tip: add ${wrapperDir} to PATH (${pathCommand}) or run ${wrapperPath}`);
  }
  console.log('');
}

function isWrapperInPath(wrapperPath: string): boolean {
  const wrapperDir = path.dirname(wrapperPath);
  const envPath = process.env.PATH || '';
  if (!envPath) return false;
  return envPath.split(path.delimiter).some((entry) => entry === wrapperDir || path.resolve(entry) === wrapperDir);
}

function getPathCommand(): string {
  if (process.platform === 'win32') return 'npx cc-mirror path --apply';
  const shellName = path.basename(process.env.SHELL || '');
  if (shellName === 'fish') return 'npx cc-mirror path';
  return 'npx cc-mirror path --apply';
}
