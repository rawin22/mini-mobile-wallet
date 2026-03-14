// ─── Design Tokens ─────────────────────────────────────────────────────────────
// Single source of truth for colors, spacing and typography across all screens.

export const colors = {
  // Backgrounds
  background: '#0a0a0a',
  surface: '#1a1a1a',
  surfaceAlt: '#222222',
  border: '#2a2a2a',

  // Brand
  primary: '#2563EB',
  primaryLight: '#3B82F6',

  // Semantic
  accent: '#10B981',   // success / positive
  danger: '#EF4444',   // error / negative
  warning: '#F59E0B',  // pending / caution

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textMuted: '#555555',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const typography = {
  title: 28,
  heading: 20,
  body: 16,
  small: 14,
  caption: 12,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  full: 999,
} as const;
