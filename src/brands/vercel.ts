import type { TweakccConfig, Theme } from './types.js';
import { DEFAULT_THEMES } from './defaultThemes.js';
import { formatUserMessage, getUserLabel } from './userLabel.js';
import { rgb, mix, lighten } from './colorUtils.js';

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

// Vercel brand colors - clean black/white with subtle accents
const VERCEL_CORE = '#ffffff';

const palette: Palette = {
  base: '#000000',
  surface: '#0a0a0a',
  panel: '#111111',
  border: '#222222',
  borderStrong: '#333333',
  text: '#fafafa',
  textMuted: '#a1a1aa',
  textDim: '#71717a',
  core: VERCEL_CORE,
  deep: '#e4e4e7',
  orange: '#f97316',
  yellow: '#eab308',
  cyan: '#06b6d4',
  blue: '#3b82f6',
  green: '#22c55e',
  red: '#ef4444',
};

const makeTheme = (): Theme => {
  const tint = (hex: string, weight: number) => mix(palette.base, hex, weight);
  return {
    name: 'Vercel Edge',
    id: 'dark',
    colors: {
      autoAccept: rgb(palette.green),
      bashBorder: rgb(palette.border),
      claude: rgb(palette.core),
      claudeShimmer: rgb(palette.textMuted),
      claudeBlue_FOR_SYSTEM_SPINNER: rgb(palette.blue),
      claudeBlueShimmer_FOR_SYSTEM_SPINNER: lighten(palette.blue, 0.3),
      permission: rgb(palette.orange),
      permissionShimmer: lighten(palette.orange, 0.25),
      planMode: rgb(palette.cyan),
      ide: rgb(palette.cyan),
      promptBorder: rgb(palette.border),
      promptBorderShimmer: rgb(palette.borderStrong),
      text: rgb(palette.text),
      inverseText: rgb(palette.base),
      inactive: rgb(palette.textDim),
      subtle: tint(palette.core, 0.12),
      suggestion: rgb(palette.textMuted),
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
      purple_FOR_SUBAGENTS_ONLY: rgb('#8b5cf6'),
      orange_FOR_SUBAGENTS_ONLY: rgb(palette.orange),
      pink_FOR_SUBAGENTS_ONLY: rgb('#ec4899'),
      cyan_FOR_SUBAGENTS_ONLY: rgb(palette.cyan),
      professionalBlue: rgb(palette.blue),
      rainbow_red: rgb(palette.red),
      rainbow_orange: rgb(palette.orange),
      rainbow_yellow: rgb(palette.yellow),
      rainbow_green: rgb(palette.green),
      rainbow_blue: rgb(palette.cyan),
      rainbow_indigo: rgb(palette.blue),
      rainbow_violet: rgb('#8b5cf6'),
      rainbow_red_shimmer: lighten(palette.red, 0.35),
      rainbow_orange_shimmer: lighten(palette.orange, 0.35),
      rainbow_yellow_shimmer: lighten(palette.yellow, 0.25),
      rainbow_green_shimmer: lighten(palette.green, 0.35),
      rainbow_blue_shimmer: lighten(palette.cyan, 0.35),
      rainbow_indigo_shimmer: lighten(palette.blue, 0.35),
      rainbow_violet_shimmer: lighten('#8b5cf6', 0.35),
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

const vercelTheme = makeTheme();

export const buildVercelTweakccConfig = (): TweakccConfig => ({
  ccVersion: '',
  ccInstallationPath: null,
  lastModified: new Date().toISOString(),
  changesApplied: false,
  hidePiebaldAnnouncement: true,
  settings: {
    themes: [vercelTheme, ...DEFAULT_THEMES],
    thinkingVerbs: {
      format: '{}... ',
      verbs: [
        'Deploying',
        'Building',
        'Routing',
        'Caching',
        'Optimizing',
        'Streaming',
        'Processing',
        'Computing',
        'Resolving',
        'Synthesizing',
        'Compiling',
        'Rendering',
        'Executing',
        'Transmitting',
      ],
    },
    thinkingStyle: {
      updateInterval: 80,
      phases: ['▸', '▹', '▸', '▹'],
      reverseMirror: false,
    },
    userMessageDisplay: {
      format: formatUserMessage(getUserLabel()),
      styling: ['bold'],
      foregroundColor: 'default',
      backgroundColor: 'default',
      borderStyle: 'topBottomDouble',
      borderColor: rgb(palette.border),
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
  },
});
