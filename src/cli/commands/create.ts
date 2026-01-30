/**
 * Create command - creates a new variant
 */

import { listProviders, getProvider, type ProviderTemplate } from '../../providers/index.js';
import { listBrandPresets } from '../../brands/index.js';
import * as core from '../../core/index.js';
import { assertValidVariantName } from '../../core/validation.js';
import type { ParsedArgs } from '../args.js';
import { prompt } from '../prompt.js';
import {
  printSummary,
  getModelOverridesFromArgs,
  ensureModelMapping,
  formatModelNote,
  requirePrompt,
  buildExtraEnv,
} from '../utils/index.js';
import { getTemplate as getPredefinedTemplate, type Template } from '../../core/templates/index.js';

export interface CreateCommandOptions {
  opts: ParsedArgs;
  quickMode: boolean;
}

interface CreateParams {
  provider: ProviderTemplate;
  providerKey: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  brand: string;
  rootDir: string;
  binDir: string;
  npmPackage: string;
  npmVersion: string;
  extraEnv: string[];
  requiresCredential: boolean;
  shouldPromptApiKey: boolean;
  hasZaiEnv: boolean;
}

const promptForValidVariantName = async (
  label: string,
  initialValue: string,
  opts: ParsedArgs,
  promptFirst: boolean
): Promise<string> => {
  let current = initialValue;
  if (promptFirst) {
    current = await prompt(label, current);
  }
  while (true) {
    try {
      return assertValidVariantName(current);
    } catch (error) {
      if (opts.yes) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      console.log(`Invalid variant name: ${message}`);
      current = await prompt(label, current);
    }
  }
};

/**
 * Prepare common parameters for create command
 */
async function prepareCreateParams(opts: ParsedArgs): Promise<CreateParams & { template?: Template }> {
  // Check for template first
  const templateName = opts.template as string | undefined;
  let template: Template | undefined;
  if (templateName) {
    template = getPredefinedTemplate(templateName);
    if (!template) {
      throw new Error(`Unknown template: ${templateName}. Use 'cc-mirror template list' to see available templates.`);
    }
    console.log(`Using template: ${template.name} - ${template.description}`);
  }

  // Provider from template or opts
  let providerKey = opts.provider as string | undefined;
  if (!providerKey && template) {
    providerKey = template.provider;
  }
  if (!providerKey && !opts.yes) {
    const providers = listProviders()
      .map((p) => p.key)
      .join(', ');
    providerKey = await prompt(`Provider (${providers})`, 'zai');
  }
  providerKey = providerKey || 'zai';

  const provider = getProvider(providerKey);
  if (!provider) {
    throw new Error(`Unknown provider: ${providerKey}`);
  }

  const name = (opts.name as string) || providerKey;
  const envZaiBaseUrl = providerKey === 'zai' ? process.env.Z_AI_BASE_URL?.trim() : undefined;
  const baseUrl = (opts['base-url'] as string) || envZaiBaseUrl || provider.baseUrl;
  const envZaiKey = providerKey === 'zai' ? process.env.Z_AI_API_KEY : undefined;
  const envAnthropicKey = providerKey === 'zai' ? process.env.ANTHROPIC_API_KEY : undefined;
  const hasApiKeyFlag = Boolean(opts['api-key']);
  const hasZaiEnv = Boolean(envZaiKey);
  const apiKeyDetected = !hasApiKeyFlag && hasZaiEnv;
  const apiKey = (opts['api-key'] as string) || (providerKey === 'zai' ? envZaiKey || envAnthropicKey || '' : '');

  if (apiKeyDetected && !opts.yes) {
    console.log('Detected Z_AI_API_KEY in environment. Using it by default.');
  }
  if (envZaiBaseUrl && !opts['base-url'] && !opts.yes) {
    console.log('Detected Z_AI_BASE_URL in environment. Using it by default.');
  }

  const brand = (opts.brand as string) || template?.brand || 'auto';
  const rootDir = (opts.root as string) || core.DEFAULT_ROOT;
  const binDir = (opts['bin-dir'] as string) || core.DEFAULT_BIN_DIR;
  const npmPackage = (opts['npm-package'] as string) || core.DEFAULT_NPM_PACKAGE;
  const npmVersion = (opts['npm-version'] as string) || core.DEFAULT_NPM_VERSION;
  const extraEnv = buildExtraEnv(opts);
  const requiresCredential = !provider.credentialOptional;
  // Don't prompt for API key if credential is optional (mirror, ccrouter)
  const shouldPromptApiKey =
    !provider.credentialOptional && !opts.yes && !hasApiKeyFlag && (providerKey === 'zai' ? !hasZaiEnv : !apiKey);

  return {
    provider,
    providerKey,
    name,
    baseUrl,
    apiKey,
    brand,
    rootDir,
    binDir,
    npmPackage,
    npmVersion,
    extraEnv,
    requiresCredential,
    shouldPromptApiKey,
    hasZaiEnv,
    template,
  };
}

/**
 * Handle quick mode creation (simplified prompts)
 */
async function handleQuickMode(opts: ParsedArgs, params: CreateParams & { template?: Template }): Promise<void> {
  const { provider, template } = params;
  // Apply template settings with CLI flags taking precedence
  const promptPack = opts['no-prompt-pack'] ? false : (template?.promptPack ?? undefined);
  const skillInstall = opts['no-skill-install'] ? false : (template?.skillInstall ?? undefined);
  const skillUpdate = Boolean(opts['skill-update']);
  let shellEnv = opts['no-shell-env'] ? false : opts['shell-env'] ? true : undefined;
  const modelOverrides = getModelOverridesFromArgs(opts);

  // Apply template model hints if no overrides specified
  if (template?.modelHints) {
    if (!modelOverrides.sonnet && template.modelHints.sonnet) modelOverrides.sonnet = template.modelHints.sonnet;
    if (!modelOverrides.opus && template.modelHints.opus) modelOverrides.opus = template.modelHints.opus;
    if (!modelOverrides.haiku && template.modelHints.haiku) modelOverrides.haiku = template.modelHints.haiku;
  }

  const name = await promptForValidVariantName('Variant name', params.name, opts, false);

  let apiKey = params.apiKey;
  if (params.shouldPromptApiKey) {
    apiKey = params.requiresCredential
      ? await requirePrompt(provider.apiKeyLabel || 'ANTHROPIC_API_KEY', apiKey)
      : await prompt(provider.apiKeyLabel || 'ANTHROPIC_API_KEY', apiKey);
  }
  if (params.requiresCredential && !apiKey) {
    if (opts.yes) {
      throw new Error('Provider API key required (use --api-key)');
    }
    apiKey = await requirePrompt(provider.apiKeyLabel || 'ANTHROPIC_API_KEY', apiKey);
  }

  const resolvedModelOverrides = await ensureModelMapping(params.providerKey, opts, { ...modelOverrides });

  if (params.providerKey === 'zai' && shellEnv === undefined && !opts.yes) {
    if (params.hasZaiEnv) {
      shellEnv = false;
    } else {
      const answer = await prompt('Write Z_AI_API_KEY to your shell profile? (yes/no)', 'yes');
      shellEnv = answer.trim().toLowerCase().startsWith('y');
    }
  }

  // Team mode: use template setting if available, otherwise default to true
  const enableTeamMode = opts['disable-team-mode']
    ? false
    : opts['enable-team-mode']
      ? true
      : (template?.enableTeamMode ?? true);
  if (enableTeamMode) {
    console.log('Team mode will be enabled (orchestrator + task-manager skills installed)');
  }

  // Merge template extra env with params.extraEnv
  const templateEnvEntries = template?.extraEnv ? Object.entries(template.extraEnv).map(([k, v]) => `${k}=${v}`) : [];
  const mergedExtraEnv = [...templateEnvEntries, ...params.extraEnv];

  const result = core.createVariant({
    name,
    providerKey: params.providerKey,
    baseUrl: params.baseUrl,
    apiKey,
    brand: params.brand,
    extraEnv: mergedExtraEnv,
    rootDir: params.rootDir,
    binDir: params.binDir,
    npmPackage: params.npmPackage,
    npmVersion: params.npmVersion,
    noTweak: Boolean(opts.noTweak),
    promptPack,
    skillInstall,
    shellEnv,
    skillUpdate,
    modelOverrides: resolvedModelOverrides,
    enableTeamMode,
    tweakccStdio: 'pipe',
  });

  const modelNote = formatModelNote(resolvedModelOverrides);
  const notes = [...(result.notes || []), ...(modelNote ? [modelNote] : [])];
  printSummary({
    action: 'Created',
    meta: result.meta,
    wrapperPath: result.wrapperPath,
    notes: notes.length > 0 ? notes : undefined,
  });
}

/**
 * Handle interactive mode creation (full prompts)
 */
async function handleInteractiveMode(opts: ParsedArgs, params: CreateParams & { template?: Template }): Promise<void> {
  const { provider, template } = params;
  const promptPack = opts['no-prompt-pack'] ? false : (template?.promptPack ?? undefined);
  const skillInstall = opts['no-skill-install'] ? false : (template?.skillInstall ?? undefined);
  const skillUpdate = Boolean(opts['skill-update']);
  let shellEnv = opts['no-shell-env'] ? false : opts['shell-env'] ? true : undefined;
  const modelOverrides = getModelOverridesFromArgs(opts);

  // Apply template model hints if no overrides specified
  if (template?.modelHints) {
    if (!modelOverrides.sonnet && template.modelHints.sonnet) modelOverrides.sonnet = template.modelHints.sonnet;
    if (!modelOverrides.opus && template.modelHints.opus) modelOverrides.opus = template.modelHints.opus;
    if (!modelOverrides.haiku && template.modelHints.haiku) modelOverrides.haiku = template.modelHints.haiku;
  }

  const nextName = await promptForValidVariantName('Variant name', params.name, opts, true);
  const nextBase = await prompt('ANTHROPIC_BASE_URL', params.baseUrl);

  let nextKey = params.shouldPromptApiKey
    ? params.requiresCredential
      ? await requirePrompt(provider.apiKeyLabel || 'ANTHROPIC_API_KEY', params.apiKey)
      : await prompt(provider.apiKeyLabel || 'ANTHROPIC_API_KEY', params.apiKey)
    : params.apiKey;
  if (params.requiresCredential && !nextKey) {
    nextKey = await requirePrompt(provider.apiKeyLabel || 'ANTHROPIC_API_KEY', params.apiKey);
  }

  const resolvedModelOverrides = await ensureModelMapping(params.providerKey, opts, { ...modelOverrides });

  const brandOptions = listBrandPresets()
    .map((item) => item.key)
    .join(', ');
  const brandHint = brandOptions.length > 0 ? `auto, none, ${brandOptions}` : 'auto, none';
  const nextBrand = await prompt(`Brand preset (${brandHint})`, params.brand);
  const nextRoot = await prompt('Variants root directory', params.rootDir);
  const nextBin = await prompt('Wrapper install directory', params.binDir);
  const nextNpmPackage = await prompt('NPM package', params.npmPackage);
  const nextNpmVersion = await prompt('NPM version', params.npmVersion);

  const envInput = await prompt('Extra env (KEY=VALUE, comma separated)', params.extraEnv.join(','));
  const parsedEnv = envInput
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (params.providerKey === 'zai' && shellEnv === undefined) {
    if (params.hasZaiEnv) {
      shellEnv = false;
    } else {
      const answer = await prompt('Write Z_AI_API_KEY to your shell profile? (yes/no)', 'yes');
      shellEnv = answer.trim().toLowerCase().startsWith('y');
    }
  }

  // Team mode: use template setting if available, otherwise prompt
  let enableTeamMode = template?.enableTeamMode ?? true;
  if (opts['disable-team-mode']) {
    enableTeamMode = false;
  } else if (!opts['enable-team-mode'] && !template) {
    const answer = await prompt('Enable team mode (multi-agent collaboration)? (yes/no)', 'yes');
    enableTeamMode = answer.trim().toLowerCase().startsWith('y');
  }

  // Merge template extra env with parsedEnv
  const templateEnvEntries = template?.extraEnv ? Object.entries(template.extraEnv).map(([k, v]) => `${k}=${v}`) : [];
  const mergedExtraEnv = [...templateEnvEntries, ...parsedEnv];

  const result = core.createVariant({
    name: nextName,
    providerKey: params.providerKey,
    baseUrl: nextBase,
    apiKey: nextKey,
    brand: nextBrand,
    extraEnv: mergedExtraEnv,
    rootDir: nextRoot,
    binDir: nextBin,
    npmPackage: nextNpmPackage,
    npmVersion: nextNpmVersion,
    noTweak: Boolean(opts.noTweak),
    promptPack,
    skillInstall,
    shellEnv,
    skillUpdate,
    modelOverrides: resolvedModelOverrides,
    enableTeamMode,
    tweakccStdio: 'pipe',
  });

  const modelNote = formatModelNote(resolvedModelOverrides);
  const notes = [...(result.notes || []), ...(modelNote ? [modelNote] : [])];
  printSummary({
    action: 'Created',
    meta: result.meta,
    wrapperPath: result.wrapperPath,
    notes: notes.length > 0 ? notes : undefined,
  });
}

/**
 * Handle non-interactive mode creation (--yes flag)
 */
async function handleNonInteractiveMode(
  opts: ParsedArgs,
  params: CreateParams & { template?: Template }
): Promise<void> {
  const { template } = params;
  const promptPack = opts['no-prompt-pack'] ? false : (template?.promptPack ?? undefined);
  const skillInstall = opts['no-skill-install'] ? false : (template?.skillInstall ?? undefined);
  const skillUpdate = Boolean(opts['skill-update']);
  const shellEnv = opts['no-shell-env'] ? false : opts['shell-env'] ? true : undefined;
  const modelOverrides = getModelOverridesFromArgs(opts);

  // Apply template model hints if no overrides specified
  if (template?.modelHints) {
    if (!modelOverrides.sonnet && template.modelHints.sonnet) modelOverrides.sonnet = template.modelHints.sonnet;
    if (!modelOverrides.opus && template.modelHints.opus) modelOverrides.opus = template.modelHints.opus;
    if (!modelOverrides.haiku && template.modelHints.haiku) modelOverrides.haiku = template.modelHints.haiku;
  }

  const name = assertValidVariantName(params.name);

  if (params.requiresCredential && !params.apiKey) {
    throw new Error('Provider API key required (use --api-key)');
  }

  const resolvedModelOverrides = await ensureModelMapping(params.providerKey, opts, { ...modelOverrides });

  // Team mode: use template setting if available, otherwise default to true
  const enableTeamMode = opts['disable-team-mode']
    ? false
    : opts['enable-team-mode']
      ? true
      : (template?.enableTeamMode ?? true);

  // Merge template extra env with params.extraEnv
  const templateEnvEntries = template?.extraEnv ? Object.entries(template.extraEnv).map(([k, v]) => `${k}=${v}`) : [];
  const mergedExtraEnv = [...templateEnvEntries, ...params.extraEnv];

  const result = core.createVariant({
    name,
    providerKey: params.providerKey,
    baseUrl: params.baseUrl,
    apiKey: params.apiKey,
    brand: params.brand,
    extraEnv: mergedExtraEnv,
    rootDir: params.rootDir,
    binDir: params.binDir,
    npmPackage: params.npmPackage,
    npmVersion: params.npmVersion,
    noTweak: Boolean(opts.noTweak),
    promptPack,
    skillInstall,
    shellEnv,
    skillUpdate,
    modelOverrides: resolvedModelOverrides,
    enableTeamMode,
    tweakccStdio: 'pipe',
  });

  const modelNote = formatModelNote(resolvedModelOverrides);
  const notes = [...(result.notes || []), ...(modelNote ? [modelNote] : [])];
  printSummary({
    action: 'Created',
    meta: result.meta,
    wrapperPath: result.wrapperPath,
    notes: notes.length > 0 ? notes : undefined,
  });
}

/**
 * Execute the create command
 */
export async function runCreateCommand({ opts, quickMode }: CreateCommandOptions): Promise<void> {
  const params = await prepareCreateParams(opts);

  if (quickMode) {
    await handleQuickMode(opts, params);
  } else if (opts.yes) {
    await handleNonInteractiveMode(opts, params);
  } else {
    await handleInteractiveMode(opts, params);
  }
}
