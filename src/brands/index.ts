import type { TweakccConfig } from './types.js';
import { buildZaiTweakccConfig } from './zai.js';
import { buildMinimaxTweakccConfig } from './minimax.js';
import { buildGatewayZTweakccConfig } from './gatewayz.js';
import { buildNanoGPTTweakccConfig } from './nanogpt.js';
import { buildOpenRouterTweakccConfig } from './openrouter.js';
import { buildCCRouterTweakccConfig } from './ccrouter.js';
import { buildMirrorTweakccConfig } from './mirror.js';
import { buildKimiTweakccConfig } from './kimi.js';
import { buildVercelTweakccConfig } from './vercel.js';
import { buildPoeTweakccConfig } from './poe.js';
import { buildVertexTweakccConfig } from './vertex.js';
import { buildBedrockTweakccConfig } from './bedrock.js';
import { buildFoundryTweakccConfig } from './foundry.js';
import { buildOllamaTweakccConfig } from './ollama.js';
import { buildAlibabaTweakccConfig } from './alibaba.js';

export interface BrandPreset {
  key: string;
  label: string;
  description: string;
  buildTweakccConfig: () => TweakccConfig;
}

const BRAND_PRESETS: Record<string, BrandPreset> = {
  zai: {
    key: 'zai',
    label: 'Z.ai Carbon',
    description: 'Dark carbon palette, gold + blue accents, Z.ai toolset label.',
    buildTweakccConfig: buildZaiTweakccConfig,
  },
  minimax: {
    key: 'minimax',
    label: 'MiniMax Pulse',
    description: 'Vibrant spectrum accents (red/orange/pink/violet) with MiniMax toolset label.',
    buildTweakccConfig: buildMinimaxTweakccConfig,
  },
  gatewayz: {
    key: 'gatewayz',
    label: 'GatewayZ Portal',
    description: 'Dark portal palette with violet/purple accents and cyan highlights.',
    buildTweakccConfig: buildGatewayZTweakccConfig,
  },
  openrouter: {
    key: 'openrouter',
    label: 'OpenRouter Teal',
    description: 'Light UI with teal/cyan accents and OpenRouter toolset label.',
    buildTweakccConfig: buildOpenRouterTweakccConfig,
  },
  nanogpt: {
    key: 'nanogpt',
    label: 'NanoGPT Violet',
    description: 'Dark UI with purple/violet accents and NanoGPT toolset label.',
    buildTweakccConfig: buildNanoGPTTweakccConfig,
  },
  ccrouter: {
    key: 'ccrouter',
    label: 'CCRouter Sky',
    description: 'Airy sky-blue accents for Claude Code Router.',
    buildTweakccConfig: buildCCRouterTweakccConfig,
  },
  mirror: {
    key: 'mirror',
    label: 'Mirror Claude',
    description: 'Reflective silver/chrome theme for pure Claude Code experience.',
    buildTweakccConfig: buildMirrorTweakccConfig,
  },
  kimi: {
    key: 'kimi',
    label: 'Kimi Lunar',
    description: 'Lunar indigo/silver theme for Moonshot AI Kimi models.',
    buildTweakccConfig: buildKimiTweakccConfig,
  },
  vercel: {
    key: 'vercel',
    label: 'Vercel Edge',
    description: 'Clean black/white theme for Vercel AI Gateway.',
    buildTweakccConfig: buildVercelTweakccConfig,
  },
  poe: {
    key: 'poe',
    label: 'Poe Violet',
    description: 'Mystical violet/purple theme for Poe API.',
    buildTweakccConfig: buildPoeTweakccConfig,
  },
  vertex: {
    key: 'vertex',
    label: 'Vertex Cloud',
    description: 'Google Cloud colors for Vertex AI.',
    buildTweakccConfig: buildVertexTweakccConfig,
  },
  bedrock: {
    key: 'bedrock',
    label: 'Bedrock Ember',
    description: 'AWS orange/ember theme for Bedrock.',
    buildTweakccConfig: buildBedrockTweakccConfig,
  },
  foundry: {
    key: 'foundry',
    label: 'Foundry Azure',
    description: 'Azure blue theme for AI Foundry.',
    buildTweakccConfig: buildFoundryTweakccConfig,
  },
  ollama: {
    key: 'ollama',
    label: 'Ollama Sandstone',
    description: 'Warm sandstone theme for local Ollama models.',
    buildTweakccConfig: buildOllamaTweakccConfig,
  },
  alibaba: {
    key: 'alibaba',
    label: 'Alibaba Cloud',
    description: 'Warm orange theme for Alibaba Cloud Coding Plan.',
    buildTweakccConfig: buildAlibabaTweakccConfig,
  },
};

export const listBrandPresets = (): BrandPreset[] => Object.values(BRAND_PRESETS);

export const getBrandPreset = (key?: string | null): BrandPreset | undefined => (key ? BRAND_PRESETS[key] : undefined);

export const resolveBrandKey = (providerKey: string, requested?: string): string | null => {
  const normalized = requested?.trim().toLowerCase();
  if (!normalized || normalized === 'auto') {
    return BRAND_PRESETS[providerKey] ? providerKey : null;
  }
  if (normalized === 'none' || normalized === 'default' || normalized === 'off') {
    return null;
  }
  if (!BRAND_PRESETS[normalized]) {
    throw new Error(`Unknown brand preset: ${requested}`);
  }
  return normalized;
};

export const buildBrandConfig = (brandKey: string): TweakccConfig => {
  const preset = BRAND_PRESETS[brandKey];
  if (!preset) {
    throw new Error(`Unknown brand preset: ${brandKey}`);
  }
  return preset.buildTweakccConfig();
};

export const getBrandThemeId = (brandKey?: string | null): string | null => {
  if (!brandKey) return null;
  const config = buildBrandConfig(brandKey);
  const theme = config.settings?.themes?.[0];
  return theme?.id ?? null;
};
