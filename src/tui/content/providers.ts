/**
 * Provider Education
 *
 * Detailed information about each provider for the education layer.
 */

export interface ProviderEducation {
  headline: string;
  tagline: string;
  features: string[];
  bestFor: string;
  models?: {
    opus?: string;
    sonnet?: string;
    haiku?: string;
  };
  requiresMapping: boolean;
  hasPromptPack: boolean;
  setupLinks?: {
    subscribe: string;
    apiKey: string;
    docs?: string;
    github?: string;
  };
  setupNote?: string; // Brief explanation of what this provider needs
}

export const PROVIDER_EDUCATION: Record<string, ProviderEducation> = {
  zai: {
    headline: 'GLM Coding Plan via Z.ai',
    tagline: 'Gold streams, powerful reasoning',
    features: [
      'GLM-4.7 for Sonnet/Opus tasks',
      'GLM-4.5-Air for Haiku (fast) tasks',
      'Prompt pack with zai-cli routing',
      'Gold-themed interface',
      'Optional team mode for multi-agent work',
    ],
    bestFor: "Heavy coding with GLM's reasoning capabilities",
    models: {
      opus: 'glm-4.7',
      sonnet: 'glm-4.7',
      haiku: 'glm-4.5-air',
    },
    requiresMapping: false,
    hasPromptPack: true,
    setupLinks: {
      subscribe: 'https://z.ai/subscribe',
      apiKey: 'https://z.ai/manage-apikey/apikey-list',
      docs: 'https://z.ai/docs',
    },
    setupNote: 'Subscribe to the Z.ai Coding Plan, then copy your API key from the dashboard.',
  },

  minimax: {
    headline: 'MiniMax-M2.1 — AGI for All',
    tagline: 'Coral pulses, unified model',
    features: [
      'Single model for all tiers',
      'Prompt pack with MCP tool routing',
      'MCP tools for web search & vision',
      'Coral-themed interface',
      'Optional team mode for multi-agent work',
    ],
    bestFor: 'Streamlined experience with one powerful model',
    models: {
      opus: 'MiniMax-M2.1',
      sonnet: 'MiniMax-M2.1',
      haiku: 'MiniMax-M2.1',
    },
    requiresMapping: false,
    hasPromptPack: true,
    setupLinks: {
      subscribe: 'https://platform.minimax.io/subscribe/coding-plan',
      apiKey: 'https://platform.minimax.io/user-center/payment/coding-plan',
      docs: 'https://platform.minimax.io/docs',
    },
    setupNote: 'Subscribe to MiniMax Coding Plan, then get your API key from the payment page.',
  },

  gatewayz: {
    headline: 'GatewayZ — Your Gateway to AI',
    tagline: 'Portal routing, Anthropic ready',
    features: [
      'OneRouter-compatible gateway',
      'Anthropic /messages API support',
      'Access to Claude models via GatewayZ',
      'Portal-themed interface',
    ],
    bestFor: 'Anthropic API access through GatewayZ',
    models: {
      opus: 'claude-opus-4-5-20251101',
      sonnet: 'claude-sonnet-4-20250514',
      haiku: 'claude-haiku-3-5-20241022',
    },
    requiresMapping: true,
    hasPromptPack: false,
    setupLinks: {
      subscribe: 'https://gatewayz.ai',
      apiKey: 'https://gatewayz.ai',
      docs: 'https://api.gatewayz.ai/docs',
    },
    setupNote: 'Get your API key from GatewayZ. You must set model aliases (e.g., claude-opus-4-5-20251101).',
  },

  openrouter: {
    headline: 'OpenRouter — One API, Any Model',
    tagline: 'Many paths, one door',
    features: ['Access to 100+ models', 'Pay-per-use pricing', 'Model flexibility', 'Teal-themed interface'],
    bestFor: 'Trying different models without multiple accounts',
    requiresMapping: true,
    hasPromptPack: false,
    setupLinks: {
      subscribe: 'https://openrouter.ai/account',
      apiKey: 'https://openrouter.ai/keys',
      docs: 'https://openrouter.ai/docs',
    },
    setupNote: 'Create an account, add credits, then generate an API key. You must set model aliases.',
  },

  nanogpt: {
    headline: 'NanoGPT — One API, Many Models',
    tagline: 'Nano power, vast potential',
    features: [
      'Access to 100+ AI models',
      'Pay-per-use or subscription pricing',
      'Model flexibility',
      'Violet-themed interface',
    ],
    bestFor: 'Trying different models without multiple accounts',
    models: {
      opus: 'zai-org/glm-4.7:thinking',
      sonnet: 'zai-org/glm-4.7:thinking',
      haiku: 'zai-org/glm-4.7:thinking',
    },
    requiresMapping: true,
    hasPromptPack: false,
    setupLinks: {
      subscribe: 'https://nano-gpt.com',
      apiKey: 'https://nano-gpt.com/api',
      docs: 'https://docs.nano-gpt.com',
    },
    setupNote: 'Create an account, add credits, then copy your API key from the API page.',
  },

  ccrouter: {
    headline: 'Claude Code Router — Local Model Gateway',
    tagline: 'Your models, your rules',
    features: [
      'Route to local LLMs (Ollama, LM Studio) or cloud APIs',
      'Supports DeepSeek, Gemini, OpenRouter, and more',
      'Automatic routing: background tasks, reasoning, long context',
      'Models configured in ~/.claude-code-router/config.json',
    ],
    bestFor: 'Local-first development with custom model routing',
    requiresMapping: false,
    hasPromptPack: false,
    setupLinks: {
      subscribe: 'https://github.com/musistudio/claude-code-router#installation',
      apiKey: 'https://github.com/musistudio/claude-code-router#2-configuration',
      github: 'https://github.com/musistudio/claude-code-router',
      docs: 'https://github.com/musistudio/claude-code-router#2-configuration',
    },
    setupNote:
      'Install: npm i -g @musistudio/claude-code-router, run "ccr start". Configure models in ~/.claude-code-router/config.json',
  },
  mirror: {
    headline: 'Mirror Claude — Pure Claude Code, Enhanced',
    tagline: 'Reflections of perfection',
    features: [
      'Pure Claude Code experience (no proxy)',
      'Team mode enabled by default',
      'Isolated config for experimentation',
      'Premium silver/chrome theme',
      'No API key required at setup',
    ],
    bestFor: 'Power users who want enhanced Claude Code without changing the AI',
    requiresMapping: false,
    hasPromptPack: false,
    setupLinks: {
      subscribe: 'https://console.anthropic.com/settings/plans',
      apiKey: 'https://console.anthropic.com/settings/keys',
      docs: 'https://github.com/numman-ali/cc-mirror/blob/main/docs/features/mirror-claude.md',
    },
    setupNote: 'Uses normal Claude authentication. Sign in via OAuth or set ANTHROPIC_API_KEY.',
  },

  ollama: {
    headline: 'Ollama — Run Models Locally',
    tagline: 'Your hardware, your models',
    features: [
      'Run any model locally via Ollama',
      'No API key needed for local use',
      'Supports cloud Ollama endpoints too',
      'Sandstone-themed interface',
    ],
    bestFor: 'Running models on your own hardware with zero cloud dependency',
    requiresMapping: true,
    hasPromptPack: false,
    setupLinks: {
      subscribe: 'https://ollama.com/download',
      apiKey: 'https://ollama.com/download',
      docs: 'https://ollama.com',
      github: 'https://github.com/ollama/ollama',
    },
    setupNote: 'Install Ollama, pull a model (ollama pull llama3.3), then use "ollama" as the API key.',
  },
};

/**
 * Get education for a provider, with fallback
 */
export const getProviderEducation = (providerKey: string): ProviderEducation | null => {
  return PROVIDER_EDUCATION[providerKey] || null;
};

/**
 * Quick comparison points for provider selection
 */
export const PROVIDER_COMPARISON = {
  fullySupported: ['zai', 'minimax'],
  requiresMapping: ['openrouter', 'gatewayz', 'nanogpt'],
  hasPromptPack: ['zai', 'minimax'],
  localFirst: ['ccrouter', 'ollama'],
  pureClaudeCode: ['mirror'],
  teamModeDefault: ['mirror'],
};
