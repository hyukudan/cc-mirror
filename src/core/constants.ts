import os from 'node:os';
import path from 'node:path';

export const DEFAULT_ROOT = path.join(os.homedir(), '.cc-mirror');
export const DEFAULT_BIN_DIR =
  process.platform === 'win32'
    ? path.join(os.homedir(), '.cc-mirror', 'bin')
    : path.join(os.homedir(), '.local', 'bin');
export const TWEAKCC_VERSION = '4.0.11';
export const DEFAULT_NPM_PACKAGE = '@anthropic-ai/claude-code';
export const DEFAULT_NPM_VERSION = '2.1.69';

// ANSI color codes for splash screen ASCII art
export const SPLASH_COLORS = {
  reset: '\x1b[0m',
  // Zai: Gold/Amber gradient
  zaiPrimary: '\x1b[38;5;220m',
  zaiSecondary: '\x1b[38;5;214m',
  zaiAccent: '\x1b[38;5;208m',
  zaiDim: '\x1b[38;5;172m',
  // MiniMax: Coral/Red/Orange gradient
  mmPrimary: '\x1b[38;5;203m',
  mmSecondary: '\x1b[38;5;209m',
  mmAccent: '\x1b[38;5;208m',
  mmDim: '\x1b[38;5;167m',
  // OpenRouter: Cyan/Teal gradient
  orPrimary: '\x1b[38;5;43m',
  orSecondary: '\x1b[38;5;49m',
  orAccent: '\x1b[38;5;37m',
  orDim: '\x1b[38;5;30m',
  // GatewayZ: Purple/Violet gradient
  gzPrimary: '\x1b[38;5;135m',
  gzSecondary: '\x1b[38;5;141m',
  gzAccent: '\x1b[38;5;99m',
  gzDim: '\x1b[38;5;97m',
  gzCyan: '\x1b[38;5;51m',
  // NanoGPT: Violet gradient
  ngPrimary: '\x1b[38;5;135m',
  ngSecondary: '\x1b[38;5;141m',
  ngAccent: '\x1b[38;5;99m',
  ngDim: '\x1b[38;5;97m',
  // CCRouter: Sky blue gradient
  ccrPrimary: '\x1b[38;5;39m',
  ccrSecondary: '\x1b[38;5;45m',
  ccrAccent: '\x1b[38;5;33m',
  ccrDim: '\x1b[38;5;31m',
  // Mirror: Silver/Chrome with electric blue
  mirPrimary: '\x1b[38;5;252m',
  mirSecondary: '\x1b[38;5;250m',
  mirAccent: '\x1b[38;5;45m',
  mirDim: '\x1b[38;5;243m',
  // Kimi: Deep blue gradient (Moonshot brand colors)
  kimiPrimary: '\x1b[38;5;33m',
  kimiSecondary: '\x1b[38;5;39m',
  kimiAccent: '\x1b[38;5;45m',
  kimiDim: '\x1b[38;5;31m',
  // DeepSeek: Blue gradient (DeepSeek brand colors)
  dsPrimary: '\x1b[38;5;33m',
  dsSecondary: '\x1b[38;5;75m',
  dsAccent: '\x1b[38;5;117m',
  dsDim: '\x1b[38;5;24m',
  // Vercel: Black/White minimalist
  vercelPrimary: '\x1b[38;5;255m',
  vercelSecondary: '\x1b[38;5;250m',
  vercelAccent: '\x1b[38;5;247m',
  vercelDim: '\x1b[38;5;240m',
  // Poe: Violet/Purple (Quora colors)
  poePrimary: '\x1b[38;5;135m',
  poeSecondary: '\x1b[38;5;141m',
  poeAccent: '\x1b[38;5;177m',
  poeDim: '\x1b[38;5;97m',
  // Vertex: Google Cloud blue/green
  vertexPrimary: '\x1b[38;5;33m',
  vertexSecondary: '\x1b[38;5;36m',
  vertexAccent: '\x1b[38;5;220m',
  vertexDim: '\x1b[38;5;24m',
  // Bedrock: AWS Orange warm tones
  bedrockPrimary: '\x1b[38;5;208m',
  bedrockSecondary: '\x1b[38;5;214m',
  bedrockAccent: '\x1b[38;5;220m',
  bedrockDim: '\x1b[38;5;166m',
  // Foundry: Azure blue professional
  foundryPrimary: '\x1b[38;5;33m',
  foundrySecondary: '\x1b[38;5;39m',
  foundryAccent: '\x1b[38;5;45m',
  foundryDim: '\x1b[38;5;24m',
  // Ollama: Warm brown/sandstone
  ollamaPrimary: '\x1b[38;5;180m',
  ollamaSecondary: '\x1b[38;5;173m',
  ollamaAccent: '\x1b[38;5;137m',
  ollamaDim: '\x1b[38;5;130m',
  // Alibaba: Orange/Cloud (Alibaba Cloud brand)
  aliPrimary: '\x1b[38;5;208m',
  aliSecondary: '\x1b[38;5;214m',
  aliAccent: '\x1b[38;5;220m',
  aliDim: '\x1b[38;5;166m',
  // Default: White/Gray
  defPrimary: '\x1b[38;5;255m',
  defDim: '\x1b[38;5;245m',
} as const;
