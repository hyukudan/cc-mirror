/**
 * CliPatchStep - Patches cli.js for Ctrl+C interrupt behavior
 *
 * Replaces the default SIGINT exit handler with a state-aware handler:
 * - First press sends ESC to trigger interrupt handling
 * - Double-press exits the app
 */

import fs from 'node:fs';
import path from 'node:path';
import type { BuildContext, BuildStep } from '../types.js';

const SIGINT_EXIT_HANDLER = 'process.on("SIGINT",()=>{process.exit(0)})';
const SIGINT_PATCH_HANDLER =
  'process.on("SIGINT",(()=>{let A=0;return()=>{if(!process.stdin||!process.stdin.isTTY){process.exit(0);return}let Q=Date.now();try{process.stdin.emit("data","\\x1b")}catch{}if(Q-A<600)process.exit(0);else A=Q}})())';

export class CliPatchStep implements BuildStep {
  name = 'CliPatch';

  execute(ctx: BuildContext): void {
    ctx.report('Patching CLI handlers...');
    this.patchCli(ctx);
  }

  async executeAsync(ctx: BuildContext): Promise<void> {
    await ctx.report('Patching CLI handlers...');
    this.patchCli(ctx);
  }

  private patchCli(ctx: BuildContext): void {
    const { state, paths } = ctx;
    const cliPath = path.join(paths.npmDir, 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');

    if (!fs.existsSync(cliPath)) {
      state.notes.push('Warning: cli.js not found, skipping Ctrl+C patch');
      return;
    }

    let content = fs.readFileSync(cliPath, 'utf8');
    if (content.includes(SIGINT_PATCH_HANDLER)) {
      state.notes.push('Ctrl+C interrupt patch already applied');
      return;
    }

    if (!content.includes(SIGINT_EXIT_HANDLER)) {
      state.notes.push('Warning: SIGINT handler not found in cli.js');
      return;
    }

    content = content.replace(SIGINT_EXIT_HANDLER, SIGINT_PATCH_HANDLER);
    fs.writeFileSync(cliPath, content);

    const verifyContent = fs.readFileSync(cliPath, 'utf8');
    if (!verifyContent.includes(SIGINT_PATCH_HANDLER)) {
      state.notes.push('Warning: Ctrl+C patch verification failed');
      return;
    }

    state.notes.push('Ctrl+C now triggers interrupt (double-press to exit)');
  }
}
