// ─── Design Tokens ─────────────────────────────────────────────────────────────
// Single source of truth for colors, spacing and typography across all screens.

import { Platform } from 'react-native';

export const colors = {
  // Backgrounds
  background: '#0a0a0a',
  surface: '#1a1a1a',
  surfaceAlt: '#222222',
  surfaceHighlight: '#2a2a3a',
  border: '#2a2a2a',
  borderLight: '#3a3a3a',

  // Brand
  primary: '#2563EB',
  primaryLight: '#3B82F6',
  primaryDark: '#1d4ed8',

  // Semantic
  accent: '#10B981',   // success / positive
  accentDark: '#059669',
  danger: '#EF4444',   // error / negative
  warning: '#F59E0B',  // pending / caution

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textMuted: '#555555',
  textAccent: '#34D399',
} as const;

// ─── Gradient presets (use with LinearGradient `colors` prop) ─────────────────

export const gradients = {
  card: ['#1e293b', '#0f172a'] as readonly [string, string],
  cardAlt: ['#1a1a2e', '#16213e'] as readonly [string, string],
  primary: ['#2563EB', '#1d4ed8'] as readonly [string, string],
  accent: ['#10B981', '#059669'] as readonly [string, string],
  danger: ['#EF4444', '#DC2626'] as readonly [string, string],
  hero: ['#1e3a5f', '#0a0a0a'] as readonly [string, string],
  onboarding: ['#0f172a', '#1e293b', '#0a0a0a'] as readonly [string, string, string],
} as const;

// ─── Shadow presets ───────────────────────────────────────────────────────────

export const shadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    android: {
      elevation: 6,
    },
  }) ?? {},
  cardLight: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
    },
    android: {
      elevation: 3,
    },
  }) ?? {},
  button: Platform.select({
    ios: {
      shadowColor: '#2563EB',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
    },
    android: {
      elevation: 4,
    },
  }) ?? {},
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
  xl: 16,
  full: 999,
} as const;
