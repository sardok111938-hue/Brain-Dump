import { Platform } from 'react-native';

/**
 * App design tokens
 * Central source of truth for colors + fonts
 */

export const Colors = {
  light: {
    // Base
    background: '#F4F7FB',
    card: '#FFFFFF',
    softCard: '#FFF7ED',

    // Text
    text: '#0F172A',
    textMuted: '#64748B',

    // Brand
    primary: '#F97316',
    primarySoft: '#FED7AA',

    // Borders
    border: '#E2E8F0',

    // States
    success: '#0F766E',
    successSoft: '#ECFEFF',

    warning: '#F59E0B',
    warningSoft: '#FFFBEB',

    danger: '#B45309',

    overlay: 'rgba(15, 23, 42, 0.18)',

    mutedCard: '#F8FAFC',
  },

  dark: {
    // Base
    background: '#0F172A',
    card: '#1E293B',
    softCard: '#7C2D12',

    // Text
    text: '#F1F5F9',
    textMuted: '#94A3B8',

    // Brand
    primary: '#F97316',
    primarySoft: '#9A3412',

    // Borders
    border: '#334155',

    // States
    success: '#14B8A6',
    successSoft: '#042F2E',

    warning: '#F59E0B',
    warningSoft: '#451A03',

    danger: '#F97316',

    overlay: 'rgba(0, 0, 0, 0.4)',

    mutedCard: '#1E293B',

  },
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 10,
  },
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace",
  },
}) as const;

/**
 * Layout tokens
 */

export const Radius = {
  sm: 10,
  md: 16,
  lg: 24,
  full: 999,
} as const;

export const Spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
} as const;