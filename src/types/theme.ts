export type ColorSchemeType = 'light' | 'dark';

export interface ThemeColors {
  // Primary / Brand
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryForeground: string;

  // Secondary & Accents
  secondary: string;
  secondaryLight: string;
  secondaryForeground: string;
  accent: string;
  accentLight: string;

  // Financial specific
  income: string;
  incomeLight: string;
  incomeForeground: string;
  expense: string;
  expenseLight: string;
  expenseForeground: string;

  // Status & Feedback
  success: string;
  warning: string;
  error: string;
  info: string;

  // Base background & surfaces
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceElevated: string;
  surfaceMuted: string;

  // Borders & Dividers
  border: string;
  borderSubtle: string;
  borderFocus: string;

  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  textPrimaryBrand: string;

  // Shadows & Overlays
  overlay: string;
  cardShadow: string;
}

export type TypographyVariant =
  | 'display'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'subtitle'
  | 'body'
  | 'bodyBold'
  | 'caption'
  | 'captionBold'
  | 'label'
  | 'amountLarge'
  | 'amountMedium'
  | 'amountSmall';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'income' | 'expense' | 'cta';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type CardVariant = 'elevated' | 'flat' | 'outline' | 'stat' | 'balanceHero';
