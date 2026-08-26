// Design tokens live in src/theme/tokens.ts — the single source of truth.
// jiti (a Tailwind dependency) lets this plain-Node config import the TS module.
const jiti = require('jiti')(__filename);
const { palette, sportColors, spacing, radius, fontSize } = jiti('./src/theme/tokens.ts');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: palette.brand,
          dark: palette.brandDark,
          tint: palette.brandTint,
        },
        bg: palette.bg,
        surface: palette.surface,
        'surface-alt': palette.surfaceAlt,
        border: palette.border,
        fg: palette.text,
        muted: palette.textMuted,
        faint: palette.textFaint,
        'bg-dark': palette.bgDark,
        'surface-dark': palette.surfaceDark,
        'surface-alt-dark': palette.surfaceAltDark,
        'border-dark': palette.borderDark,
        'fg-dark': palette.textDark,
        'muted-dark': palette.textMutedDark,
        success: palette.success,
        warning: palette.warning,
        danger: palette.danger,
        swim: sportColors.swim,
        bike: sportColors.bike,
        run: sportColors.run,
        strength: sportColors.strength,
      },
      spacing,
      borderRadius: radius,
      fontSize,
    },
  },
  plugins: [],
};
