/**
 * Translation Proxy Launcher
 *
 * Starts the translation proxy, launches Claude Code, and handles cleanup.
 * Used for providers that need Anthropic ↔ OpenAI translation.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { startTranslatorProxy, type ProxyServerInfo } from './index.js';

interface LauncherConfig {
  /** Path to Claude Code binary */
  binaryPath: string;
  /** Path to variant config directory */
  configDir: string;
  /** Target OpenAI-compatible API URL */
  targetUrl: string;
  /** API key for the target provider */
  apiKey: string;
  /** Optional model name mapping */
  modelMap?: Record<string, string>;
  /** Arguments to pass to Claude Code */
  args: string[];
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Read settings.json to extract translation config
 */
function readSettings(configDir: string): {
  targetUrl?: string;
  apiKey?: string;
  modelMap?: Record<string, string>;
} {
  try {
    const settingsPath = path.join(configDir, 'settings.json');
    if (!fs.existsSync(settingsPath)) {
      return {};
    }
    const data = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    const env = data?.env || {};

    return {
      targetUrl: env.CC_MIRROR_TRANSLATION_TARGET_URL,
      apiKey: env.ANTHROPIC_API_KEY || env.CC_MIRROR_TRANSLATION_API_KEY,
      modelMap: env.CC_MIRROR_TRANSLATION_MODEL_MAP ? JSON.parse(env.CC_MIRROR_TRANSLATION_MODEL_MAP) : undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Launch Claude Code with the translation proxy
 */
async function launchWithProxy(config: LauncherConfig): Promise<number> {
  const log = config.debug ? console.error.bind(console, '[launcher]') : () => {};

  let proxy: ProxyServerInfo | null = null;

  // Cleanup function
  const cleanup = async () => {
    if (proxy) {
      log('Shutting down proxy...');
      await proxy.shutdown();
      proxy = null;
    }
  };

  // Handle signals (use once to prevent multiple cleanup attempts)
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];
  for (const signal of signals) {
    process.once(signal, async () => {
      log(`Received ${signal}`);
      await cleanup();
      process.exit(0);
    });
  }

  try {
    // Start the translation proxy
    log(`Starting translation proxy for ${config.targetUrl}...`);
    proxy = await startTranslatorProxy({
      targetBaseUrl: config.targetUrl,
      apiKey: config.apiKey,
      modelMap: config.modelMap,
      debug: config.debug,
    });

    log(`Proxy listening on port ${proxy.port}`);

    // Spawn Claude Code with modified environment
    const env: Record<string, string | undefined> = {
      ...process.env,
      ANTHROPIC_BASE_URL: proxy.baseUrl,
      CLAUDE_CONFIG_DIR: config.configDir,
    };

    // Remove the translation env vars from Claude Code's environment
    // (they were just for our launcher to read)
    delete env.CC_MIRROR_TRANSLATION_TARGET_URL;
    delete env.CC_MIRROR_TRANSLATION_API_KEY;
    delete env.CC_MIRROR_TRANSLATION_MODEL_MAP;

    log(`Launching Claude Code: ${config.binaryPath}`);
    const child = spawn(config.binaryPath, config.args, {
      stdio: 'inherit',
      env,
    });

    // Wait for Claude Code to exit
    return new Promise<number>((resolve) => {
      child.on('close', async (code) => {
        log(`Claude Code exited with code ${code}`);
        await cleanup();
        resolve(code ?? 0);
      });

      child.on('error', async (err) => {
        log(`Failed to start Claude Code: ${err.message}`);
        await cleanup();
        resolve(1);
      });
    });
  } catch (err) {
    log(`Launcher error: ${err}`);
    await cleanup();
    return 1;
  }
}

/**
 * Main entry point - can be called directly or via wrapper
 */
export async function main(): Promise<void> {
  // Parse command line: node launcher.js <binaryPath> <configDir> [-- args...]
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: launcher <binaryPath> <configDir> [-- claudeArgs...]');
    process.exit(1);
  }

  const [binaryPath, configDir] = args as [string, string, ...string[]];

  // Find where Claude Code args start (after --)
  const dashDashIndex = args.indexOf('--');
  const claudeArgs = dashDashIndex >= 0 ? args.slice(dashDashIndex + 1) : [];

  // Read settings to get translation config
  const settings = readSettings(configDir);

  if (!settings.targetUrl) {
    console.error('Error: CC_MIRROR_TRANSLATION_TARGET_URL not set in settings');
    process.exit(1);
  }

  if (!settings.apiKey) {
    console.error('Error: No API key found for translation (ANTHROPIC_API_KEY or CC_MIRROR_TRANSLATION_API_KEY)');
    process.exit(1);
  }

  const debug = process.env.CC_MIRROR_DEBUG === '1';

  if (debug) {
    console.error(`[launcher] API key found: ${settings.apiKey.slice(0, 10)}...${settings.apiKey.slice(-4)}`);
  }

  const exitCode = await launchWithProxy({
    binaryPath,
    configDir,
    targetUrl: settings.targetUrl,
    apiKey: settings.apiKey,
    modelMap: settings.modelMap,
    args: claudeArgs,
    debug,
  });

  process.exit(exitCode);
}

// Run if invoked directly
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  main().catch((err) => {
    console.error('Launcher failed:', err);
    process.exit(1);
  });
}
