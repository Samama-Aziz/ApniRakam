import { Platform, TextStyle } from 'react-native';
import { ThemeColors, TypographyVariant } from '@/types/theme';

export const DarkColors: ThemeColors = {
  // Brand - Emerald Green on Deep Obsidian Navy/Charcoal
  primary: '#10B981', // Vibrant Emerald Green (FAB, CTA, Highlights)
  primaryLight: '#064E3B', // Deep Emerald surface
  primaryDark: '#059669',
  primaryForeground: '#FFFFFF',

  // Secondary & Accent
  secondary: '#34D399',
  secondaryLight: '#064E3B',
  secondaryForeground: '#022C22',
  accent: '#F59E0B',
  accentLight: '#451A03',

  // Finance Specific
  income: '#10B981', // Green for Income
  incomeLight: '#064E3B',
  incomeForeground: '#FFFFFF',
  expense: '#EF4444', // Red for Expense
  expenseLight: '#450A0A',
  expenseForeground: '#FFFFFF',

  // Feedback
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Surfaces & Backgrounds - Figma Obsidian Palette
  background: '#0B0F17', // Main background from Figma
  backgroundSecondary: '#111827',
  surface: '#151D2A', // Main card background
  surfaceElevated: '#1C2638', // Elevated card / modal background
  surfaceMuted: '#1E293B',

  // Borders & Dividers
  border: '#222F45',
  borderSubtle: '#182232',
  borderFocus: '#10B981',

  // Text
  text: '#FFFFFF', // High-contrast White
  textSecondary: '#94A3B8', // Slate 400
  textMuted: '#64748B', // Slate 500
  textTertiary: '#64748B',
  textInverse: '#0B0F17',
  textPrimaryBrand: '#10B981',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.75)',
  cardShadow: 'rgba(0, 0, 0, 0.45)',
};

export const LightColors: ThemeColors = {
  // Brand - Executive Jewel Emerald (striking contrast on porcelain)
  primary: '#059669', // Emerald 600 - rich, vivid, crisp
  primaryLight: '#ECFDF5', // Luminous mint tint
  primaryDark: '#047857',
  primaryForeground: '#FFFFFF',

  // Secondary & Accent
  secondary: '#0D9488', // Deep Jewel Teal
  secondaryLight: '#F0FDFA',
  secondaryForeground: '#FFFFFF',
  accent: '#D97706', // Rich Amber Gold
  accentLight: '#FEF3C7',

  // Finance Specific
  income: '#059669', // Deep Emerald
  incomeLight: '#ECFDF5',
  incomeForeground: '#FFFFFF',
  expense: '#E11D48', // Vibrant Rose/Crimson (modern luxury fintech)
  expenseLight: '#FFE4E6',
  expenseForeground: '#FFFFFF',

  // Feedback
  success: '#059669',
  warning: '#D97706',
  error: '#E11D48',
  info: '#2563EB',

  // Surfaces & Backgrounds - Premium Porcelain Canvas
  background: '#F6F8FB', // Crisp, modern luxury canvas
  backgroundSecondary: '#EDF2F7', // Soft secondary layer
  surface: '#FFFFFF', // Pure, radiant white
  surfaceElevated: '#FFFFFF',
  surfaceMuted: '#F1F5F9',

  // Borders - Hairline, ultra-refined
  border: '#E2E8F0', // Soft modern hairline
  borderSubtle: '#EDF2F7', // Whispering divider
  borderFocus: '#059669',

  // Text - Midnight Obsidian (Apple / Stripe grade crispness)
  text: '#0B0F19', // Deepest midnight - razor sharp
  textSecondary: '#475569', // Slate 600 - warm & legible
  textMuted: '#8A99AD', // Cool slate for meta
  textTertiary: '#94A3B8',
  textInverse: '#FFFFFF',
  textPrimaryBrand: '#059669',

  // Overlays & Elevation
  overlay: 'rgba(11, 15, 25, 0.45)',
  cardShadow: '#091E42', // Solid base for realistic diffusion
};

export const Colors = {
  light: LightColors,
  dark: DarkColors,
};

export const Spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export const Radius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
} as const;

export const Typography: Record<TypographyVariant, TextStyle> = {
  display: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  title1: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  title2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  title3: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  bodyBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },
  captionBold: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  amountLarge: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  amountMedium: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  amountSmall: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
};

export const Shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#091E42',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
    },
    android: { elevation: 2 },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#091E42',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: { elevation: 3 },
    default: {},
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#091E42',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
    },
    android: { elevation: 6 },
    default: {},
  }),
  fab: Platform.select({
    ios: {
      shadowColor: '#059669',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
    },
    android: { elevation: 8 },
    default: {},
  }),
};
