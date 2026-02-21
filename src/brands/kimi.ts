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

// Kimi/Moonshot AI brand colors - lunar blue/silver theme
const KIMI_CORE = '#6366f1'; // Indigo - Moonshot's primary

const palette: Palette = {
  base: '#0a0a12',
  surface: '#12121c',
  panel: '#1a1a28',
  border: '#2a2a3c',
  borderStrong: '#3a3a50',
  text: '#f4f4f8',
  textMuted: '#c8c8d4',
  textDim: '#8888a0',
  core: KIMI_CORE,
  deep: '#4f46e5',
  orange: '#f59e0b',
  yellow: '#eab308',
  cyan: '#22d3ee',
  blue: '#3b82f6',
  green: '#10b981',
  red: '#ef4444',
};

const makeTheme = (): Theme => {
  const tint = (hex: string, weight: number) => mix(palette.base, hex, weight);
  return {
    name: 'Kimi Lunar',
    id: 'dark',
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
      purple_FOR_SUBAGENTS_ONLY: rgb(palette.deep),
      orange_FOR_SUBAGENTS_ONLY: rgb(palette.orange),
      pink_FOR_SUBAGENTS_ONLY: lighten(palette.core, 0.2),
      cyan_FOR_SUBAGENTS_ONLY: rgb(palette.cyan),
      professionalBlue: rgb(palette.blue),
      rainbow_red: rgb(palette.red),
      rainbow_orange: rgb(palette.orange),
      rainbow_yellow: rgb(palette.yellow),
      rainbow_green: rgb(palette.green),
      rainbow_blue: rgb(palette.cyan),
      rainbow_indigo: rgb(palette.core),
      rainbow_violet: rgb(palette.deep),
      rainbow_red_shimmer: lighten(palette.red, 0.35),
      rainbow_orange_shimmer: lighten(palette.orange, 0.35),
      rainbow_yellow_shimmer: lighten(palette.yellow, 0.25),
      rainbow_green_shimmer: lighten(palette.green, 0.35),
      rainbow_blue_shimmer: lighten(palette.cyan, 0.35),
      rainbow_indigo_shimmer: lighten(palette.core, 0.35),
      rainbow_violet_shimmer: lighten(palette.deep, 0.35),
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

const kimiTheme = makeTheme();

export const buildKimiTweakccConfig = (): TweakccConfig => ({
  ccVersion: '',
  ccInstallationPath: null,
  lastModified: new Date().toISOString(),
  changesApplied: false,
  hidePiebaldAnnouncement: true,
  settings: {
    themes: [kimiTheme, ...DEFAULT_THEMES],
    thinkingVerbs: {
      format: '{}... ',
      verbs: [
        'Orbiting',
        'Reflecting',
        'Illuminating',
        'Phasing',
        'Aligning',
        'Charting',
        'Projecting',
        'Calibrating',
        'Crystallizing',
        'Resonating',
        'Synthesizing',
        'Converging',
        'Ascending',
        'Transmitting',
      ],
    },
    thinkingStyle: {
      updateInterval: 85,
      phases: ['◐', '◓', '◑', '◒'],
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
  },
});
