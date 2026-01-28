import type { TweakccConfig, Theme } from './types.js';
import { DEFAULT_THEMES } from './defaultThemes.js';
import { formatUserMessage, getUserLabel } from './userLabel.js';

type Rgb = { r: number; g: number; b: number };

const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

const hexToRgb = (hex: string): Rgb => {
  const normalized = hex.replace('#', '').trim();
  if (normalized.length === 3) {
    const [r, g, b] = normalized.split('');
    return {
      r: clamp(parseInt(r + r, 16)),
      g: clamp(parseInt(g + g, 16)),
      b: clamp(parseInt(b + b, 16)),
    };
  }
  if (normalized.length !== 6) {
    throw new Error(`Unsupported hex color: ${hex}`);
  }
  return {
    r: clamp(parseInt(normalized.slice(0, 2), 16)),
    g: clamp(parseInt(normalized.slice(2, 4), 16)),
    b: clamp(parseInt(normalized.slice(4, 6), 16)),
  };
};

const rgb = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${r},${g},${b})`;
};

const mix = (hexA: string, hexB: string, weight: number) => {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const w = Math.max(0, Math.min(1, weight));
  return `rgb(${clamp(a.r + (b.r - a.r) * w)},${clamp(a.g + (b.g - a.g) * w)},${clamp(a.b + (b.b - a.b) * w)})`;
};

const lighten = (hex: string, weight: number) => mix(hex, '#ffffff', weight);

type Palette = {
  base: string;
  surface: string;
  panel: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textDim: string;
  core: string;
  deep: string;
  orange: string;
  yellow: string;
  cyan: string;
  blue: string;
  green: string;
  red: string;
};

// Google Cloud / Vertex AI brand colors
const VERTEX_CORE = '#4285f4'; // Google Blue

const palette: Palette = {
  base: '#0d1117',
  surface: '#161b22',
  panel: '#1c2128',
  border: '#30363d',
  borderStrong: '#484f58',
  text: '#f0f6fc',
  textMuted: '#8b949e',
  textDim: '#6e7681',
  core: VERTEX_CORE,
  deep: '#1a73e8',
  orange: '#f9ab00', // Google Yellow
  yellow: '#fbbc04',
  cyan: '#34a853', // Google Green
  blue: '#4285f4',
  green: '#34a853',
  red: '#ea4335', // Google Red
};

const makeTheme = (): Theme => {
  const tint = (hex: string, weight: number) => mix(palette.base, hex, weight);
  return {
    name: 'Vertex Cloud',
    id: 'vertex-cloud',
    colors: {
      autoAccept: rgb(palette.green),
      bashBorder: rgb(palette.core),
      claude: rgb(palette.core),
      claudeShimmer: lighten(palette.core, 0.28),
      claudeBlue_FOR_SYSTEM_SPINNER: rgb(palette.blue),
      claudeBlueShimmer_FOR_SYSTEM_SPINNER: lighten(palette.blue, 0.3),
      permission: rgb(palette.orange),
      permissionShimmer: lighten(palette.orange, 0.25),
      planMode: rgb(palette.deep),
      ide: rgb(palette.cyan),
      promptBorder: rgb(palette.border),
      promptBorderShimmer: rgb(palette.borderStrong),
      text: rgb(palette.text),
      inverseText: rgb(palette.base),
      inactive: rgb(palette.textDim),
      subtle: tint(palette.core, 0.18),
      suggestion: rgb(palette.deep),
      remember: rgb(palette.core),
      background: rgb(palette.base),
      success: rgb(palette.green),
      error: rgb(palette.red),
      warning: rgb(palette.yellow),
      warningShimmer: lighten(palette.yellow, 0.2),
      diffAdded: mix(palette.base, palette.green, 0.18),
      diffRemoved: mix(palette.base, palette.red, 0.18),
      diffAddedDimmed: mix(palette.base, palette.green, 0.1),
      diffRemovedDimmed: mix(palette.base, palette.red, 0.1),
      diffAddedWord: mix(palette.base, palette.green, 0.45),
      diffRemovedWord: mix(palette.base, palette.red, 0.45),
      diffAddedWordDimmed: mix(palette.base, palette.green, 0.3),
      diffRemovedWordDimmed: mix(palette.base, palette.red, 0.3),
      red_FOR_SUBAGENTS_ONLY: rgb(palette.red),
      blue_FOR_SUBAGENTS_ONLY: rgb(palette.blue),
      green_FOR_SUBAGENTS_ONLY: rgb(palette.green),
      yellow_FOR_SUBAGENTS_ONLY: rgb(palette.yellow),
      purple_FOR_SUBAGENTS_ONLY: rgb('#a855f7'),
      orange_FOR_SUBAGENTS_ONLY: rgb(palette.orange),
      pink_FOR_SUBAGENTS_ONLY: rgb('#ec4899'),
      cyan_FOR_SUBAGENTS_ONLY: rgb('#06b6d4'),
      professionalBlue: rgb(palette.blue),
      rainbow_red: rgb(palette.red),
      rainbow_orange: rgb(palette.orange),
      rainbow_yellow: rgb(palette.yellow),
      rainbow_green: rgb(palette.green),
      rainbow_blue: rgb(palette.blue),
      rainbow_indigo: rgb(palette.deep),
      rainbow_violet: rgb('#a855f7'),
      rainbow_red_shimmer: lighten(palette.red, 0.35),
      rainbow_orange_shimmer: lighten(palette.orange, 0.35),
      rainbow_yellow_shimmer: lighten(palette.yellow, 0.25),
      rainbow_green_shimmer: lighten(palette.green, 0.35),
      rainbow_blue_shimmer: lighten(palette.blue, 0.35),
      rainbow_indigo_shimmer: lighten(palette.deep, 0.35),
      rainbow_violet_shimmer: lighten('#a855f7', 0.35),
      clawd_body: rgb(palette.core),
      clawd_background: rgb(palette.base),
      userMessageBackground: rgb(palette.panel),
      bashMessageBackgroundColor: rgb(palette.surface),
      memoryBackgroundColor: tint(palette.panel, 0.2),
      rate_limit_fill: rgb(palette.core),
      rate_limit_empty: rgb(palette.borderStrong),
    },
  };
};

const vertexTheme = makeTheme();

export const buildVertexTweakccConfig = (): TweakccConfig => ({
  ccVersion: '',
  ccInstallationPath: null,
  lastModified: new Date().toISOString(),
  changesApplied: false,
  hidePiebaldAnnouncement: true,
  settings: {
    themes: [vertexTheme, ...DEFAULT_THEMES],
    thinkingVerbs: {
      format: '{}... ',
      verbs: [
        'Scaling',
        'Distributing',
        'Computing',
        'Orchestrating',
        'Inferring',
        'Processing',
        'Analyzing',
        'Optimizing',
        'Streaming',
        'Resolving',
        'Synthesizing',
        'Predicting',
        'Transforming',
        'Generating',
      ],
    },
    thinkingStyle: {
      updateInterval: 85,
      phases: ['◆', '◇', '◆', '◇'],
      reverseMirror: false,
    },
    userMessageDisplay: {
      format: formatUserMessage(getUserLabel()),
      styling: ['bold'],
      foregroundColor: 'default',
      backgroundColor: 'default',
      borderStyle: 'topBottomDouble',
      borderColor: rgb(palette.core),
      paddingX: 1,
      paddingY: 0,
      fitBoxToContent: true,
    },
    inputBox: {
      removeBorder: true,
    },
    misc: {
      showTweakccVersion: false,
      showPatchesApplied: false,
      expandThinkingBlocks: true,
      enableConversationTitle: true,
      hideStartupBanner: true,
      hideCtrlGToEditPrompt: true,
      hideStartupClawd: true,
      increaseFileReadLimit: true,
    },
    toolsets: [
      {
        name: 'vertex',
        allowedTools: '*',
        blockedTools: [],
      },
    ],
    defaultToolset: 'vertex',
    planModeToolset: 'vertex',
  },
});
