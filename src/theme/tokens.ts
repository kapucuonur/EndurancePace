/**
 * Single source of truth for design tokens.
 *
 * Consumed in two places:
 *  - `tailwind.config.js` (via require) so NativeWind utility classes like
 *    `bg-brand` / `text-muted` resolve to this palette.
 *  - Directly in TS where raw values are needed (chart colors, the
 *    react-native-calendars theme object, step-block colors, etc.).
 *
 * Keep this file import-free so it can be required from the Tailwind config,
 * which runs in a plain Node context.
 */

export const palette = {
  // Brand
  brand: '#2F6FED',
  brandDark: '#1E4FB8',
  brandTint: '#E8F0FE',

  // Neutrals — light theme
  bg: '#FFFFFF',
  surface: '#F5F6F8',
  surfaceAlt: '#EDEFF3',
  border: '#E2E5EA',
  text: '#12141A',
  textMuted: '#5B616E',
  textFaint: '#9AA0AB',

  // Neutrals — dark theme
  bgDark: '#0E1013',
  surfaceDark: '#181B20',
  surfaceAltDark: '#22262D',
  borderDark: '#2C313A',
  textDark: '#F3F4F6',
  textMutedDark: '#A5ABB6',

  // Status
  success: '#1FA971',
  warning: '#E8A13A',
  danger: '#E5484D',
} as const;

/** Sport accent colors — calendar dots, step blocks, chart series. */
export const sportColors = {
  swim: '#1CA7C9',
  bike: '#F2994A',
  run: '#EB5757',
  strength: '#9B51E0',
} as const;

/** Colors for interval step blocks by step type. */
export const stepColors: Record<string, string> = {
  warmup: '#7FB3FF',
  cooldown: '#7FB3FF',
  interval: '#EB5757',
  recovery: '#9AA0AB',
  steady: '#1FA971',
};

/** Spacing scale (points). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 22,
  '2xl': 28,
  '3xl': 34,
} as const;
