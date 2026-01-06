/**
 * Extra environment variable utilities
 */

import type { ParsedArgs } from '../args.js';

/**
 * Build extra environment variables from parsed arguments
 */
export function buildExtraEnv(opts: ParsedArgs): string[] {
  const env = Array.isArray(opts.env) ? [...opts.env] : [];
  const timeout = opts['timeout-ms'];
  if (typeof timeout === 'string' && timeout.trim().length > 0) {
    env.push(`API_TIMEOUT_MS=${timeout}`);
  }
  const preferIpv4 = Boolean(opts['prefer-ipv4']);
  const hasNodeOptions = env.some((entry) => entry.trim().startsWith('NODE_OPTIONS='));
  const hasPreferIpv4 = env.some((entry) => entry.trim().startsWith('CC_MIRROR_PREFER_IPV4='));
  if (preferIpv4 && !hasNodeOptions && !hasPreferIpv4) {
    env.push('CC_MIRROR_PREFER_IPV4=1');
  }
  return env;
}
