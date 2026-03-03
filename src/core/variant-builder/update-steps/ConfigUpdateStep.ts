/**
 * ConfigUpdateStep - Updates configuration (API key, MCP, onboarding, env defaults)
 */

import { getBrandThemeId } from '../../../brands/index.js';
import {
  ensureApiKeyApproval,
  ensureEnabledPlugins,
  ensureMinimaxMcpServer,
  ensureOnboardingState,
  ensureSettingsEnvDefaults,
  ensureSettingsEnvOverrides,
  ensureSettingsPermissionsDeny,
  MINIMAX_DENY_TOOLS,
  ZAI_DENY_TOOLS,
} from '../../claude-config.js';
import type { UpdateContext, UpdateStep } from '../types.js';

export class ConfigUpdateStep implements UpdateStep {
  name = 'Config';

  execute(ctx: UpdateContext): void {
    ctx.report('Updating configuration...');
    this.updateConfig(ctx, false);
  }

  async executeAsync(ctx: UpdateContext): Promise<void> {
    await ctx.report('Updating configuration...');
    await this.updateConfig(ctx, true);
  }

  private async updateConfig(ctx: UpdateContext, isAsync: boolean): Promise<void> {
    const { opts, meta, state } = ctx;

    ensureApiKeyApproval(meta.configDir);
    ensureEnabledPlugins(meta.configDir);

    // MiniMax MCP server
    if (meta.provider === 'minimax') {
      if (isAsync) {
        await ctx.report('Configuring MiniMax MCP server...');
      } else {
        ctx.report('Configuring MiniMax MCP server...');
      }
      ensureMinimaxMcpServer(meta.configDir);
    }

    // Z.ai MCP deny
    if (meta.provider === 'zai') {
      const denied = ensureSettingsPermissionsDeny(meta.configDir, ZAI_DENY_TOOLS);
      if (denied) {
        state.notes.push('Blocked Z.ai-injected MCP tools in settings.json.');
      }
    }

    // MiniMax MCP deny
    if (meta.provider === 'minimax') {
      const denied = ensureSettingsPermissionsDeny(meta.configDir, MINIMAX_DENY_TOOLS);
      if (denied) {
        state.notes.push('Blocked MiniMax-injected MCP tools in settings.json.');
      }
    }

    // Onboarding and theme
    const brandThemeId = !opts.noTweak && state.brandKey ? getBrandThemeId(state.brandKey) : null;
    const onboarding = ensureOnboardingState(meta.configDir, {
      themeId: brandThemeId ?? 'dark',
      forceTheme: Boolean(brandThemeId),
    });

    // Env defaults
    const envDefaultsUpdated = ensureSettingsEnvDefaults(meta.configDir, {
      TWEAKCC_CONFIG_DIR: meta.tweakDir,
      DISABLE_AUTOUPDATER: '1',
      CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION: '1',
      CLAUDE_CODE_CONTEXT_LIMIT: '200000',
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    });

    if (Array.isArray(opts.extraEnv) && opts.extraEnv.length > 0) {
      const overrides: Record<string, string | number> = {};
      for (const entry of opts.extraEnv) {
        const idx = entry.indexOf('=');
        if (idx === -1) continue;
        const key = entry.slice(0, idx).trim();
        const value = entry.slice(idx + 1).trim();
        if (!key) continue;
        overrides[key] = value;
      }
      if (Object.keys(overrides).length > 0) {
        const envOverridesUpdated = ensureSettingsEnvOverrides(meta.configDir, overrides);
        if (envOverridesUpdated) {
          state.notes.push('Updated environment overrides in settings.json.');
        }
      }
    }

    if (envDefaultsUpdated) {
      state.notes.push('Disabled Claude Code auto-updater (DISABLE_AUTOUPDATER=1).');
    }
    if (onboarding.themeChanged) {
      state.notes.push(`Default theme set to ${brandThemeId ?? 'dark'}.`);
    }
    if (onboarding.onboardingChanged) {
      state.notes.push('Onboarding marked complete.');
    }
  }
}
