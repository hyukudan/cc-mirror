/**
 * Provider Capabilities - Defines what features each provider supports
 */

export type Capability =
  | 'vision'
  | 'tool-use'
  | 'streaming'
  | 'extended-context'
  | 'code-execution'
  | 'web-search'
  | 'reasoning';

export type AuthType = 'api-key' | 'auth-token' | 'oauth' | 'credentials' | 'none';

export interface ProviderCapabilities {
  key: string;
  capabilities: Capability[];
  authType: AuthType;
  /** Tier: free, paid, enterprise */
  tier?: 'free' | 'paid' | 'enterprise';
  /** Whether the provider is verified/official */
  verified?: boolean;
}

/**
 * Capabilities for each provider
 */
export const PROVIDER_CAPABILITIES: Record<string, ProviderCapabilities> = {
  zai: {
    key: 'zai',
    capabilities: ['vision', 'tool-use', 'streaming', 'extended-context', 'web-search'],
    authType: 'api-key',
    tier: 'paid',
    verified: true,
  },
  minimax: {
    key: 'minimax',
    capabilities: ['tool-use', 'streaming', 'web-search'],
    authType: 'api-key',
    tier: 'paid',
    verified: true,
  },
  gatewayz: {
    key: 'gatewayz',
    capabilities: ['tool-use', 'streaming'],
    authType: 'auth-token',
    tier: 'paid',
    verified: false,
  },
  openrouter: {
    key: 'openrouter',
    capabilities: ['vision', 'tool-use', 'streaming', 'extended-context'],
    authType: 'auth-token',
    tier: 'paid',
    verified: true,
  },
  nanogpt: {
    key: 'nanogpt',
    capabilities: ['tool-use', 'streaming'],
    authType: 'auth-token',
    tier: 'paid',
    verified: false,
  },
  ccrouter: {
    key: 'ccrouter',
    capabilities: ['vision', 'tool-use', 'streaming', 'extended-context'],
    authType: 'none',
    tier: 'free',
    verified: false,
  },
  mirror: {
    key: 'mirror',
    capabilities: ['vision', 'tool-use', 'streaming', 'extended-context', 'code-execution'],
    authType: 'none',
    tier: 'paid',
    verified: true,
  },
  kimi: {
    key: 'kimi',
    capabilities: ['vision', 'tool-use', 'streaming', 'extended-context', 'reasoning'],
    authType: 'api-key',
    tier: 'paid',
    verified: true,
  },
  deepseek: {
    key: 'deepseek',
    capabilities: ['tool-use', 'streaming', 'reasoning'],
    authType: 'api-key',
    tier: 'paid',
    verified: true,
  },
  vercel: {
    key: 'vercel',
    capabilities: ['vision', 'tool-use', 'streaming'],
    authType: 'auth-token',
    tier: 'paid',
    verified: true,
  },
  poe: {
    key: 'poe',
    capabilities: ['vision', 'tool-use', 'streaming'],
    authType: 'auth-token',
    tier: 'paid',
    verified: false,
  },
  vertex: {
    key: 'vertex',
    capabilities: ['vision', 'tool-use', 'streaming', 'extended-context', 'code-execution'],
    authType: 'credentials',
    tier: 'enterprise',
    verified: true,
  },
  bedrock: {
    key: 'bedrock',
    capabilities: ['vision', 'tool-use', 'streaming', 'extended-context', 'code-execution'],
    authType: 'credentials',
    tier: 'enterprise',
    verified: true,
  },
  foundry: {
    key: 'foundry',
    capabilities: ['vision', 'tool-use', 'streaming', 'extended-context'],
    authType: 'credentials',
    tier: 'enterprise',
    verified: true,
  },
  custom: {
    key: 'custom',
    capabilities: ['tool-use', 'streaming'],
    authType: 'api-key',
    tier: 'paid',
    verified: false,
  },
};

/**
 * Get capabilities for a provider
 */
export const getProviderCapabilities = (key: string): ProviderCapabilities | undefined => {
  return PROVIDER_CAPABILITIES[key];
};

/**
 * Filter providers by capability
 */
export const filterByCapability = (capability: Capability): string[] => {
  return Object.values(PROVIDER_CAPABILITIES)
    .filter((p) => p.capabilities.includes(capability))
    .map((p) => p.key);
};

/**
 * Filter providers by auth type
 */
export const filterByAuthType = (authType: AuthType): string[] => {
  return Object.values(PROVIDER_CAPABILITIES)
    .filter((p) => p.authType === authType)
    .map((p) => p.key);
};

/**
 * Convert provider authMode to capabilities authType
 */
export const mapAuthMode = (authMode: string | undefined): AuthType => {
  switch (authMode) {
    case 'apiKey':
      return 'api-key';
    case 'authToken':
      return 'auth-token';
    case 'none':
      return 'none';
    default:
      return 'api-key';
  }
};
