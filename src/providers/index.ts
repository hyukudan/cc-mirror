export const DEFAULT_TIMEOUT_MS = '300000';

export type ProviderEnv = Record<string, string | number>;

export type ProviderAuthMode = 'apiKey' | 'authToken' | 'none';

export interface ProviderTemplate {
  key: string;
  label: string;
  description: string;
  baseUrl: string;
  env: ProviderEnv;
  apiKeyLabel: string;
  authMode?: ProviderAuthMode;
  requiresModelMapping?: boolean;
  credentialOptional?: boolean;
  /** Mark as experimental/coming soon - hidden from main provider list */
  experimental?: boolean;
  /** Auto-enable team mode patch for this provider */
  enablesTeamMode?: boolean;
  /** Skip prompt pack overlays (pure Claude experience) */
  noPromptPack?: boolean;
  /** Provider targets local models (Ollama, LM Studio, etc.) — disables KV-cache-breaking headers */
  localModel?: boolean;
  /** Provider uses OpenAI-compatible API, requires translation proxy */
  requiresTranslation?: boolean;
  /** Target URL for translation proxy (OpenAI-compatible endpoint) */
  translationTargetUrl?: string;
  /** When true, keep ANTHROPIC_API_KEY even for authToken providers */
  authTokenAlsoSetsApiKey?: boolean;
}

export interface ModelOverrides {
  sonnet?: string;
  opus?: string;
  haiku?: string;
  smallFast?: string;
  defaultModel?: string;
  subagentModel?: string;
}

const CCROUTER_AUTH_FALLBACK = 'ccrouter-proxy';

const PROVIDERS: Record<string, ProviderTemplate> = {
  zai: {
    key: 'zai',
    label: 'Zai Cloud',
    description: 'GLM Coding Plan via Anthropic-compatible endpoint',
    baseUrl: 'https://api.z.ai/api/anthropic',
    env: {
      API_TIMEOUT_MS: DEFAULT_TIMEOUT_MS,
      ANTHROPIC_DEFAULT_HAIKU_MODEL: 'glm-4.5-air',
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'glm-4.7',
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'glm-4.7',
      CC_MIRROR_SPLASH: 1,
      CC_MIRROR_PROVIDER_LABEL: 'Zai Cloud',
      CC_MIRROR_SPLASH_STYLE: 'zai',
    },
    apiKeyLabel: 'Zai API key',
  },
  minimax: {
    key: 'minimax',
    label: 'MiniMax Cloud',
    description: 'MiniMax-M2.1 via Anthropic-compatible endpoint',
    baseUrl: 'https://api.minimax.io/anthropic',
    env: {
      API_TIMEOUT_MS: DEFAULT_TIMEOUT_MS,
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: 1,
      ANTHROPIC_MODEL: 'MiniMax-M2.1',
      ANTHROPIC_SMALL_FAST_MODEL: 'MiniMax-M2.1',
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'MiniMax-M2.1',
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'MiniMax-M2.1',
      ANTHROPIC_DEFAULT_HAIKU_MODEL: 'MiniMax-M2.1',
      CC_MIRROR_SPLASH: 1,
      CC_MIRROR_PROVIDER_LABEL: 'MiniMax Cloud',
      CC_MIRROR_SPLASH_STYLE: 'minimax',
    },
    apiKeyLabel: 'MiniMax API key',
  },
  gatewayz: {
    key: 'gatewayz',
    label: 'GatewayZ',
    description: 'OneRouter-compatible gateway for Anthropic API requests',
    baseUrl: 'https://api.gatewayz.ai/v1',
    env: {
      API_TIMEOUT_MS: DEFAULT_TIMEOUT_MS,
      CC_MIRROR_SPLASH: 1,
      CC_MIRROR_PROVIDER_LABEL: 'GatewayZ',
      CC_MIRROR_SPLASH_STYLE: 'gatewayz',
    },
    apiKeyLabel: 'GatewayZ API key',
    authMode: 'authToken',
    requiresModelMapping: true,
  },
  openrouter: {
    key: 'openrouter',
    label: 'OpenRouter',
    description: 'OpenRouter gateway for Anthropic-compatible requests',
    baseUrl: 'https://openrouter.ai/api',
    env: {
      API_TIMEOUT_MS: DEFAULT_TIMEOUT_MS,
      CC_MIRROR_SPLASH: 1,
      CC_MIRROR_PROVIDER_LABEL: 'OpenRouter',
      CC_MIRROR_SPLASH_STYLE: 'openrouter',
    },
    apiKeyLabel: 'OpenRouter API key',
    authMode: 'authToken',
    requiresModelMapping: true,
  },
  nanogpt: {
    key: 'nanogpt',
    label: 'NanoGPT',
    description: 'NanoGPT gateway for OpenAI-compatible requests',
    baseUrl: 'https://nano-gpt.com/api',
    env: {
      API_TIMEOUT_MS: DEFAULT_TIMEOUT_MS,
      CC_MIRROR_SPLASH: 1,
      CC_MIRROR_PROVIDER_LABEL: 'NanoGPT',
      CC_MIRROR_SPLASH_STYLE: 'nanogpt',
    },
    apiKeyLabel: 'NanoGPT API key',
    authMode: 'authToken',
    requiresModelMapping: true,
  },
  ccrouter: {
    key: 'ccrouter',
    label: 'Claude Code Router',
    description: 'Route requests to any model via Claude Code Router',
    baseUrl: 'http://127.0.0.1:3456',
    env: {
      API_TIMEOUT_MS: DEFAULT_TIMEOUT_MS,
      CC_MIRROR_SPLASH: 1,
      CC_MIRROR_PROVIDER_LABEL: 'Claude Code Router',
      CC_MIRROR_SPLASH_STYLE: 'ccrouter',
    },
    apiKeyLabel: 'Router URL',
    authMode: 'authToken',
    requiresModelMapping: false, // Models configured in ~/.claude-code-router/config.json
    credentialOptional: true, // No API key needed - CCRouter handles auth
    localModel: true,
  },
  mirror: {
    key: 'mirror',
    label: 'Mirror Claude',
    description: 'Pure Claude Code with advanced features (team mode, custom theme)',
    baseUrl: '', // Empty = use Claude Code defaults (no ANTHROPIC_BASE_URL override)
    env: {
      // Only cosmetic settings - no auth or model overrides
      // Use Haiku 4.5 for compaction to avoid "Conversation too long" errors (#29)
      ANTHROPIC_SMALL_FAST_MODEL: 'claude-haiku-4-5-20251001',
      CC_MIRROR_SPLASH: 1,
      CC_MIRROR_PROVIDER_LABEL: 'Mirror Claude',
      CC_MIRROR_SPLASH_STYLE: 'mirror',
    },
    apiKeyLabel: '', // Empty = skip API key prompt
    authMode: 'none', // No auth handling - user authenticates via normal Claude flow
    credentialOptional: true, // No credentials required at create time
    enablesTeamMode: true, // Auto-enable team mode patch
    noPromptPack: true, // Skip prompt pack (pure Claude experience)
  },
  kimi: {
    key: 'kimi',
    label: 'Kimi Code',
    description: 'Kimi Code via Anthropic-compatible API (kimi.com)',
    baseUrl: 'https://api.kimi.com/coding/',
    env: {
      API_TIMEOUT_MS: DEFAULT_TIMEOUT_MS,
      // Kimi Code uses its own model internally
      CC_MIRROR_SPLASH: 1,
      CC_MIRROR_PROVIDER_LABEL: 'Kimi Code',
      CC_MIRROR_SPLASH_STYLE: 'kimi',
    },
    apiKeyLabel: 'Kimi Code API key (from kimi.com membership)',
    authMode: 'apiKey',
    // No translation needed - Kimi Code is already Anthropic-compatible
  },
  deepseek: {
    key: 'deepseek',
    label: 'DeepSeek',
    description: 'DeepSeek models via integrated OpenAI→Anthropic translator',
    baseUrl: '', // Set dynamically by translator proxy
    env: {
      API_TIMEOUT_MS: DEFAULT_TIMEOUT_MS,
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'deepseek-chat',
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'deepseek-reasoner',
      ANTHROPIC_DEFAULT_HAIKU_MODEL: 'deepseek-chat',
      ANTHROPIC_SMALL_FAST_MODEL: 'deepseek-chat',
      CC_MIRROR_SPLASH: 1,
      CC_MIRROR_PROVIDER_LABEL: 'DeepSeek',
      CC_MIRROR_SPLASH_STYLE: 'deepseek',
    },
    apiKeyLabel: 'DeepSeek API key',
    authMode: 'apiKey',
    requiresTranslation: true,
    translationTargetUrl: 'https://api.deepseek.com',
  },
  vercel: {
    key: 'vercel',
    label: 'Vercel AI Gateway',
    description: 'Vercel AI Gateway for multi-provider model access',
    baseUrl: 'https://ai-gateway.vercel.sh',
    env: {
      API_TIMEOUT_MS: DEFAULT_TIMEOUT_MS,
      CC_MIRROR_SPLASH: 1,
      CC_MIRROR_PROVIDER_LABEL: 'Vercel AI Gateway',
      CC_MIRROR_SPLASH_STYLE: 'vercel',
    },
    apiKeyLabel: 'Vercel AI Gateway API key',
    authMode: 'authToken',
    requiresModelMapping: true,
  },
  poe: {
    key: 'poe',
    label: 'Poe',
    description: 'Poe API for Claude access via Quora',
    baseUrl: 'https://api.poe.com/api',
    env: {
      API_TIMEOUT_MS: DEFAULT_TIMEOUT_MS,
      CC_MIRROR_SPLASH: 1,
      CC_MIRROR_PROVIDER_LABEL: 'Poe',
      CC_MIRROR_SPLASH_STYLE: 'poe',
    },
    apiKeyLabel: 'Poe API key',
    authMode: 'authToken',
    requiresModelMapping: true,
  },
  vertex: {
    key: 'vertex',
    label: 'Google Vertex AI',
    description: 'Claude via Google Cloud Vertex AI',
    baseUrl: '', // No base URL - uses CLAUDE_CODE_USE_VERTEX
    env: {
      API_TIMEOUT_MS: DEFAULT_TIMEOUT_MS,
      CLAUDE_CODE_USE_VERTEX: '1',
      CLOUD_ML_REGION: 'global',
      CC_MIRROR_SPLASH: 1,
      CC_MIRROR_PROVIDER_LABEL: 'Vertex AI',
      CC_MIRROR_SPLASH_STYLE: 'vertex',
    },
    apiKeyLabel: 'Vertex Project ID',
    authMode: 'none',
    noPromptPack: true, // Pure Claude experience
  },
  bedrock: {
    key: 'bedrock',
    label: 'AWS Bedrock',
    description: 'Claude via AWS Bedrock',
    baseUrl: '', // No base URL - uses CLAUDE_CODE_USE_BEDROCK
    env: {
      API_TIMEOUT_MS: DEFAULT_TIMEOUT_MS,
      CLAUDE_CODE_USE_BEDROCK: '1',
      CC_MIRROR_SPLASH: 1,
      CC_MIRROR_PROVIDER_LABEL: 'AWS Bedrock',
      CC_MIRROR_SPLASH_STYLE: 'bedrock',
    },
    apiKeyLabel: 'AWS Region (e.g., us-east-1)',
    authMode: 'none',
    noPromptPack: true, // Pure Claude experience
  },
  foundry: {
    key: 'foundry',
    label: 'Azure AI Foundry',
    description: 'Claude via Azure AI Foundry',
    baseUrl: '', // No base URL - uses CLAUDE_CODE_USE_FOUNDRY
    env: {
      API_TIMEOUT_MS: DEFAULT_TIMEOUT_MS,
      CLAUDE_CODE_USE_FOUNDRY: '1',
      CC_MIRROR_SPLASH: 1,
      CC_MIRROR_PROVIDER_LABEL: 'Azure Foundry',
      CC_MIRROR_SPLASH_STYLE: 'foundry',
    },
    apiKeyLabel: 'Foundry Resource Name',
    authMode: 'none',
    noPromptPack: true, // Pure Claude experience
  },
  alibaba: {
    key: 'alibaba',
    label: 'Alibaba Cloud',
    description: 'Qwen/Kimi Coding Plan via Anthropic-compatible DashScope',
    baseUrl: 'https://coding-intl.dashscope.aliyuncs.com/apps/anthropic',
    env: {
      API_TIMEOUT_MS: DEFAULT_TIMEOUT_MS,
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: 1,
      ANTHROPIC_MODEL: 'qwen3.5-plus',
      ANTHROPIC_SMALL_FAST_MODEL: 'qwen3.5-plus',
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'qwen3.5-plus',
      ANTHROPIC_DEFAULT_OPUS_MODEL: 'kimi-k2.5',
      ANTHROPIC_DEFAULT_HAIKU_MODEL: 'qwen3.5-plus',
      CC_MIRROR_SPLASH: 1,
      CC_MIRROR_PROVIDER_LABEL: 'Alibaba Cloud',
      CC_MIRROR_SPLASH_STYLE: 'alibaba',
    },
    apiKeyLabel: 'DashScope Coding Plan API key (sk-sp-...)',
    authMode: 'authToken',
  },
  ollama: {
    key: 'ollama',
    label: 'Ollama',
    description: 'Local models via Ollama / LM Studio',
    baseUrl: 'http://localhost:11434',
    env: {
      API_TIMEOUT_MS: DEFAULT_TIMEOUT_MS,
      ANTHROPIC_AUTH_TOKEN: 'ollama',
      CC_MIRROR_TRANSLATION_API_KEY: 'ollama',
      CC_MIRROR_SPLASH: 1,
      CC_MIRROR_PROVIDER_LABEL: 'Ollama',
      CC_MIRROR_SPLASH_STYLE: 'ollama',
    },
    apiKeyLabel: 'API key (use "ollama" for local)',
    authMode: 'authToken',
    credentialOptional: true,
    requiresTranslation: true,
    localModel: true,
  },
  custom: {
    key: 'custom',
    label: 'Custom',
    description: 'Coming Soon — Bring your own endpoint',
    baseUrl: '',
    env: {
      API_TIMEOUT_MS: DEFAULT_TIMEOUT_MS,
    },
    apiKeyLabel: 'API key',
    experimental: true,
  },
};

export const getProvider = (key: string): ProviderTemplate | undefined => PROVIDERS[key];

/**
 * List available providers
 * @param includeExperimental - Set to true to include experimental/coming soon providers
 */
export const listProviders = (includeExperimental = false): ProviderTemplate[] => {
  const providers = Object.values(PROVIDERS);
  if (includeExperimental) {
    return providers;
  }
  return providers.filter((p) => !p.experimental);
};

export interface BuildEnvParams {
  providerKey: string;
  baseUrl?: string;
  apiKey?: string;
  extraEnv?: string[];
  modelOverrides?: ModelOverrides;
}

const normalizeModelValue = (value?: string) => (value ?? '').trim();

const applyModelOverrides = (env: ProviderEnv, overrides?: ModelOverrides) => {
  if (!overrides) return;
  // If only sonnet is set, use it for all model slots
  const sonnet = normalizeModelValue(overrides.sonnet);
  if (sonnet && !normalizeModelValue(overrides.opus) && !normalizeModelValue(overrides.haiku)) {
    overrides.opus = sonnet;
    overrides.haiku = sonnet;
    if (!normalizeModelValue(overrides.smallFast)) overrides.smallFast = sonnet;
  }
  const entries: Array<[string, string | undefined]> = [
    ['ANTHROPIC_DEFAULT_SONNET_MODEL', overrides.sonnet],
    ['ANTHROPIC_DEFAULT_OPUS_MODEL', overrides.opus],
    ['ANTHROPIC_DEFAULT_HAIKU_MODEL', overrides.haiku],
    ['ANTHROPIC_SMALL_FAST_MODEL', overrides.smallFast],
    ['ANTHROPIC_MODEL', overrides.defaultModel],
    ['CLAUDE_CODE_SUBAGENT_MODEL', overrides.subagentModel],
  ];
  for (const [key, value] of entries) {
    const trimmed = normalizeModelValue(value);
    if (trimmed) {
      env[key] = trimmed;
    }
  }
};

export const buildEnv = ({ providerKey, baseUrl, apiKey, extraEnv, modelOverrides }: BuildEnvParams): ProviderEnv => {
  const provider = getProvider(providerKey);
  if (!provider) {
    throw new Error(`Unknown provider: ${providerKey}`);
  }

  const env: ProviderEnv = { ...provider.env };
  const authMode = provider.authMode ?? 'apiKey';

  // Universal defaults applied to ALL providers (including authMode=none)
  // CLAUDE_CODE_CONTEXT_LIMIT: CLI 2.1.x has a bug where undefined results in NaN,
  // breaking autocompact and causing sessions to grow unbounded until they crash.
  if (!Object.hasOwn(env, 'CLAUDE_CODE_CONTEXT_LIMIT')) {
    env.CLAUDE_CODE_CONTEXT_LIMIT = '200000';
  }
  if (!Object.hasOwn(env, 'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC')) {
    env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = '1';
  }

  // Local model optimizations: disable attribution header that invalidates KV cache
  // (causes up to 90% slower inference). See: https://unsloth.ai/docs/basics/claude-code
  if (provider.localModel) {
    if (!Object.hasOwn(env, 'CLAUDE_CODE_ATTRIBUTION_HEADER')) {
      env.CLAUDE_CODE_ATTRIBUTION_HEADER = '0';
    }
    if (!Object.hasOwn(env, 'CLAUDE_CODE_ENABLE_TELEMETRY')) {
      env.CLAUDE_CODE_ENABLE_TELEMETRY = '0';
    }
  }

  // For 'none' authMode, only apply cosmetic env vars - no auth or base URL
  if (authMode === 'none') {
    // Still allow extraEnv for user customization
    if (Array.isArray(extraEnv)) {
      for (const entry of extraEnv) {
        const idx = entry.indexOf('=');
        if (idx === -1) continue;
        const key = entry.slice(0, idx).trim();
        const value = entry.slice(idx + 1).trim();
        if (!key) continue;
        env[key] = value;
      }
    }
    return env;
  }

  if (!Object.hasOwn(env, 'DISABLE_AUTOUPDATER')) {
    env.DISABLE_AUTOUPDATER = '1';
  }
  if (!Object.hasOwn(env, 'CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION')) {
    env.CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION = '1';
  }
  const normalizedBaseUrl = typeof baseUrl === 'string' ? baseUrl.trim() : '';
  if (normalizedBaseUrl) {
    env.ANTHROPIC_BASE_URL = normalizedBaseUrl;
  } else if (baseUrl === undefined) {
    const envZaiBaseUrl = providerKey === 'zai' ? process.env.Z_AI_BASE_URL?.trim() : undefined;
    const fallbackBaseUrl = envZaiBaseUrl || provider.baseUrl;
    if (fallbackBaseUrl) env.ANTHROPIC_BASE_URL = fallbackBaseUrl;
  } else if (provider.baseUrl) {
    env.ANTHROPIC_BASE_URL = provider.baseUrl;
  }
  if (authMode === 'authToken') {
    const trimmed = normalizeModelValue(apiKey);
    if (trimmed) {
      env.ANTHROPIC_AUTH_TOKEN = trimmed;
    } else if (providerKey === 'ccrouter') {
      env.ANTHROPIC_AUTH_TOKEN = CCROUTER_AUTH_FALLBACK;
    }
    if (!provider.authTokenAlsoSetsApiKey && Object.hasOwn(env, 'ANTHROPIC_API_KEY')) {
      delete env.ANTHROPIC_API_KEY;
    }
  } else if (apiKey) {
    env.ANTHROPIC_API_KEY = apiKey;
    env.CC_MIRROR_UNSET_AUTH_TOKEN = '1';
    if (providerKey === 'zai') {
      env.Z_AI_API_KEY = apiKey;
    }
  } else if (authMode === 'apiKey') {
    env.CC_MIRROR_UNSET_AUTH_TOKEN = '1';
  }

  applyModelOverrides(env, modelOverrides);

  if (Array.isArray(extraEnv)) {
    for (const entry of extraEnv) {
      const idx = entry.indexOf('=');
      if (idx === -1) continue;
      const key = entry.slice(0, idx).trim();
      const value = entry.slice(idx + 1).trim();
      if (!key) continue;
      env[key] = value;
    }
  }

  if (authMode === 'authToken' && !provider.authTokenAlsoSetsApiKey && Object.hasOwn(env, 'ANTHROPIC_API_KEY')) {
    delete env.ANTHROPIC_API_KEY;
  }
  if (authMode !== 'authToken' && Object.hasOwn(env, 'ANTHROPIC_AUTH_TOKEN')) {
    delete env.ANTHROPIC_AUTH_TOKEN;
  }

  // For translation providers, add the target URL
  // The launcher will read this to configure the proxy
  if (provider.requiresTranslation) {
    const targetUrl = provider.translationTargetUrl || env.ANTHROPIC_BASE_URL || provider.baseUrl;
    if (targetUrl) {
      env.CC_MIRROR_TRANSLATION_TARGET_URL = targetUrl;
      // Remove ANTHROPIC_BASE_URL as the proxy will set this dynamically
      delete env.ANTHROPIC_BASE_URL;
    }
  }

  return env;
};

export const PROVIDER_TEMPLATES = PROVIDERS;
