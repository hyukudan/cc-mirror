/**
 * Search command - discover providers by capability
 */

import type { ParsedArgs } from '../args.js';
import { listProviders, type ProviderTemplate } from '../../providers/index.js';
import {
  PROVIDER_CAPABILITIES,
  getProviderCapabilities,
  filterByCapability,
  filterByAuthType,
  mapAuthMode,
  type Capability,
  type AuthType,
} from '../../providers/capabilities.js';

export interface SearchCommandOptions {
  opts: ParsedArgs;
}

const VALID_CAPABILITIES: Capability[] = [
  'vision',
  'tool-use',
  'streaming',
  'extended-context',
  'code-execution',
  'web-search',
  'reasoning',
];

const VALID_AUTH_TYPES: AuthType[] = ['api-key', 'auth-token', 'oauth', 'credentials', 'none'];

interface ProviderInfo {
  key: string;
  label: string;
  description: string;
  capabilities: string[];
  authType: string;
  tier: string;
  verified: boolean;
}

const formatProviderInfo = (provider: ProviderTemplate): ProviderInfo => {
  const caps = getProviderCapabilities(provider.key);
  return {
    key: provider.key,
    label: provider.label,
    description: provider.description,
    capabilities: caps?.capabilities ?? [],
    authType: caps?.authType ?? mapAuthMode(provider.authMode),
    tier: caps?.tier ?? 'paid',
    verified: caps?.verified ?? false,
  };
};

const printProviderTable = (providers: ProviderInfo[]): void => {
  if (providers.length === 0) {
    console.log('No providers found matching the criteria.');
    return;
  }

  const maxKeyLen = Math.max(...providers.map((p) => p.key.length), 10);
  const maxLabelLen = Math.max(...providers.map((p) => p.label.length), 10);

  console.log();
  console.log(
    `${'PROVIDER'.padEnd(maxKeyLen)}  ${'LABEL'.padEnd(maxLabelLen)}  ${'AUTH'.padEnd(12)}  ${'TIER'.padEnd(10)}  CAPABILITIES`
  );
  console.log('─'.repeat(maxKeyLen + maxLabelLen + 50));

  for (const p of providers) {
    const verified = p.verified ? '✓' : ' ';
    const caps = p.capabilities.join(', ');
    console.log(
      `${p.key.padEnd(maxKeyLen)}  ${p.label.padEnd(maxLabelLen)}  ${p.authType.padEnd(12)}  ${p.tier.padEnd(10)}  ${caps} ${verified}`
    );
  }

  console.log();
  console.log(`Found ${providers.length} provider(s). Use --json for machine-readable output.`);
};

/**
 * Execute the search command
 */
export function runSearchCommand({ opts }: SearchCommandOptions): void {
  const capability = opts.capability as string | undefined;
  const authType = opts['auth-type'] as string | undefined;
  const tier = opts.tier as string | undefined;
  const verified = opts.verified as boolean | undefined;
  const json = opts.json as boolean | undefined;

  // Validate capability
  if (capability && !VALID_CAPABILITIES.includes(capability as Capability)) {
    console.error(`Invalid capability: ${capability}`);
    console.error(`Valid options: ${VALID_CAPABILITIES.join(', ')}`);
    process.exit(1);
  }

  // Validate auth type
  if (authType && !VALID_AUTH_TYPES.includes(authType as AuthType)) {
    console.error(`Invalid auth type: ${authType}`);
    console.error(`Valid options: ${VALID_AUTH_TYPES.join(', ')}`);
    process.exit(1);
  }

  // Get all non-experimental providers
  const allProviders = listProviders(false);

  // Build filter set
  let matchingKeys = new Set(allProviders.map((p) => p.key));

  // Filter by capability
  if (capability) {
    const capProviders = new Set(filterByCapability(capability as Capability));
    matchingKeys = new Set([...matchingKeys].filter((k) => capProviders.has(k)));
  }

  // Filter by auth type
  if (authType) {
    const authProviders = new Set(filterByAuthType(authType as AuthType));
    matchingKeys = new Set([...matchingKeys].filter((k) => authProviders.has(k)));
  }

  // Filter by tier
  if (tier) {
    matchingKeys = new Set(
      [...matchingKeys].filter((k) => {
        const caps = PROVIDER_CAPABILITIES[k];
        return caps?.tier === tier;
      })
    );
  }

  // Filter by verified
  if (verified !== undefined) {
    matchingKeys = new Set(
      [...matchingKeys].filter((k) => {
        const caps = PROVIDER_CAPABILITIES[k];
        return caps?.verified === verified;
      })
    );
  }

  // Get matching providers with info
  const results = allProviders.filter((p) => matchingKeys.has(p.key)).map(formatProviderInfo);

  // Output
  if (json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    printProviderTable(results);
  }
}
