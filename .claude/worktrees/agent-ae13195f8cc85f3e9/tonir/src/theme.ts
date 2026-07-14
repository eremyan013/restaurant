// Design tokens — exact values from the Tonir design handoff

export const COLORS = {
  // Brand palette — "Tonir կանաչ" (default)
  primary: '#1F4D3E',
  primaryDeep: '#14352A',
  accent: '#C9A961',
  pop: '#E8743B',

  // Light theme
  bg: '#F5EFE3',
  bgAlt: '#EDE7D9',
  surface: '#FFFFFF',
  surfaceAlt: '#FAF6EC',
  text: '#1A1A1A',
  textMute: '#6B6B6B',
  textFaint: '#9A9A9A',
  border: 'rgba(31,77,62,0.10)',
  borderStrong: 'rgba(31,77,62,0.18)',

  // Dark theme
  bgDark: '#0E1A16',
  bgAltDark: '#13201B',
  surfaceDark: '#1A2924',
  surfaceAltDark: '#22332D',
  textDark: '#F2EBDA',
  textMuteDark: '#A8B0AB',
  textFaintDark: '#717A75',
  borderDark: 'rgba(245,239,227,0.10)',
  borderStrongDark: 'rgba(245,239,227,0.18)',

  // Shared
  cream: '#FBF5E8',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export type Palette = 'green' | 'red' | 'terracotta' | 'navy';

export const PALETTES: Record<Palette, { primary: string; primaryDeep: string; accent: string; pop: string }> = {
  green:      { primary: '#1F4D3E', primaryDeep: '#14352A', accent: '#C9A961', pop: '#E8743B' },
  red:        { primary: '#B0223A', primaryDeep: '#7A1729', accent: '#E8A93B', pop: '#1F4D3E' },
  terracotta: { primary: '#B85C38', primaryDeep: '#7A3A20', accent: '#3E5C4A', pop: '#C9A961' },
  navy:       { primary: '#1A2B4A', primaryDeep: '#0E1A30', accent: '#C9A961', pop: '#E8743B' },
};

export interface Theme {
  primary: string;
  primaryDeep: string;
  accent: string;
  pop: string;
  bg: string;
  bgAlt: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMute: string;
  textFaint: string;
  border: string;
  borderStrong: string;
  dark: boolean;
}

export function makeTheme(palette: Palette = 'green', dark = false): Theme {
  const pal = PALETTES[palette];
  const light = {
    bg: '#F5EFE3', bgAlt: '#EDE7D9', surface: '#FFFFFF', surfaceAlt: '#FAF6EC',
    text: '#1A1A1A', textMute: '#6B6B6B', textFaint: '#9A9A9A',
    border: 'rgba(31,77,62,0.10)', borderStrong: 'rgba(31,77,62,0.18)',
  };
  const darkTokens = {
    bg: '#0E1A16', bgAlt: '#13201B', surface: '#1A2924', surfaceAlt: '#22332D',
    text: '#F2EBDA', textMute: '#A8B0AB', textFaint: '#717A75',
    border: 'rgba(245,239,227,0.10)', borderStrong: 'rgba(245,239,227,0.18)',
  };
  return { ...pal, ...(dark ? darkTokens : light), dark };
}

export const DEFAULT_THEME = makeTheme('green', false);

export const FONTS = {
  regular: 'NotoSansArmenian_400Regular',
  medium: 'NotoSansArmenian_500Medium',
  semiBold: 'NotoSansArmenian_600SemiBold',
  bold: 'NotoSansArmenian_700Bold',
  extraBold: 'NotoSansArmenian_800ExtraBold',
} as const;

export const FONT_SIZE = {
  heroTitle: 34,
  screenTitle: 30,
  detailName: 28,
  sectionHeader: 18,
  cardTitle: 16,
  body: 14,
  bodySmall: 13,
  meta: 12,
  eyebrow: 11,
  tabLabel: 13,
  buttonLabel: 15,
} as const;

export const RADIUS = {
  pill: 999,
  largeCard: 22,
  card: 18,
  bottomSheet: 24,   // top radius only
  confirmHero: 32,   // bottom radius only
  timePill: 8,
  chip: 12,
  iconTile: 12,
  small: 10,
} as const;

export const SPACING = {
  screenEdge: 20,
  cardPad: 18,
  cardPadSm: 14,
  sectionGap: 28,
  elementGap: 8,
  hRailGap: 12,
} as const;

export const SHADOWS = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 9,
    elevation: 4,
  },
  floating: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  peek: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 30,
    elevation: 12,
  },
  tabBar: {
    shadowColor: '#14352A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 30,
    elevation: 16,
  },
  cta: {
    shadowColor: '#14352A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.30,
    shadowRadius: 24,
    elevation: 10,
  },
} as const;

export type HeatLevel = 'high' | 'med' | 'low';

export function heatColor(level: HeatLevel, t: Theme): string {
  if (level === 'high') return t.pop;
  if (level === 'med') return t.accent;
  return t.textMute;
}
