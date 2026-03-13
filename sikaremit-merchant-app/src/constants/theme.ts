/**
 * SikaRemit Merchant Mobile - Premium Design System
 * Aligned with customer app design tokens for cross-platform consistency
 * Merchant uses blue primary for brand differentiation
 */

export const Colors = {
  light: {
    // Primary - Professional Blue
    primary: '#2563EB',
    primaryLight: '#3B82F6',
    primaryDark: '#1D4ED8',
    primaryAccent: '#60A5FA',

    // Secondary - Soft Gray
    secondary: '#F3F4F6',
    secondaryLight: '#F9FAFB',
    secondaryDark: '#E5E7EB',

    // Accent - Amber
    accent: '#F59E0B',
    accentLight: '#FCD34D',
    accentDark: '#D97706',

    // Status colors
    success: '#10B981',
    successLight: '#34D399',
    warning: '#F59E0B',
    error: '#EF4444',
    errorLight: '#F87171',
    info: '#3B82F6',
    infoLight: '#60A5FA',

    // Backgrounds
    background: '#FEFEFE',
    surface: '#FFFFFF',
    surfaceVariant: '#F8FAFC',
    overlay: 'rgba(15, 23, 42, 0.05)',

    // Glass morphism
    glass: {
      background: 'rgba(255, 255, 255, 0.8)',
      border: 'rgba(255, 255, 255, 0.2)',
      shadow: 'rgba(0, 0, 0, 0.1)',
    },

    // Text
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    textTertiary: '#CBD5E1',

    // Border & Dividers
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    divider: '#F8FAFC',

    // Gradients
    gradient: {
      primary: ['#2563EB', '#3B82F6', '#60A5FA'],
      secondary: ['#06B6D4', '#0891B2', '#0E7490'],
      success: ['#10B981', '#059669', '#047857'],
      warning: ['#F59E0B', '#D97706', '#B45309'],
      error: ['#EF4444', '#DC2626', '#B91C1C'],
      merchant: ['#2563EB', '#7C3AED', '#A855F7'],
    },

    // Shadow colors
    shadow: {
      primary: 'rgba(37, 99, 235, 0.15)',
      secondary: 'rgba(148, 163, 184, 0.15)',
      accent: 'rgba(245, 158, 11, 0.15)',
    },
  },
  dark: {
    primary: '#60A5FA',
    primaryLight: '#93C5FD',
    primaryDark: '#3B82F6',
    primaryAccent: '#BFDBFE',

    secondary: '#1E293B',
    secondaryLight: '#334155',
    secondaryDark: '#0F172A',

    accent: '#FCD34D',
    accentLight: '#FDE68A',
    accentDark: '#F59E0B',

    success: '#34D399',
    successLight: '#6EE7B7',
    warning: '#FCD34D',
    error: '#F87171',
    errorLight: '#FCA5A5',
    info: '#60A5FA',
    infoLight: '#93C5FD',

    background: '#0A0A0F',
    surface: '#111827',
    surfaceVariant: '#1E293B',
    overlay: 'rgba(255, 255, 255, 0.05)',

    glass: {
      background: 'rgba(17, 24, 39, 0.8)',
      border: 'rgba(255, 255, 255, 0.1)',
      shadow: 'rgba(0, 0, 0, 0.3)',
    },

    text: '#FAFAFA',
    textSecondary: '#CBD5E1',
    textMuted: '#94A3B8',
    textTertiary: '#64748B',

    border: '#334155',
    borderLight: '#475569',
    divider: '#1E293B',

    gradient: {
      primary: ['#60A5FA', '#93C5FD', '#BFDBFE'],
      secondary: ['#22D3EE', '#38BDF8', '#7DD3FC'],
      success: ['#34D399', '#6EE7B7', '#A7F3D0'],
      warning: ['#FCD34D', '#FDE68A', '#FEF3C7'],
      error: ['#F87171', '#FCA5A5', '#FECACA'],
      merchant: ['#60A5FA', '#A78BFA', '#C4B5FD'],
    },

    shadow: {
      primary: 'rgba(96, 165, 250, 0.25)',
      secondary: 'rgba(148, 163, 184, 0.1)',
      accent: 'rgba(252, 211, 77, 0.2)',
    },
  },
};

// Spacing system - 8pt grid (aligned with customer app)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,

  micro: 2,
  tiny: 6,

  section: 96,
  container: 128,
} as const;

// Border radius system (aligned with customer app)
export const BorderRadius = {
  none: 0,
  xs: 2,
  sm: 6,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  full: 9999,

  button: 12,
  card: 16,
  modal: 20,
  pill: 9999,
} as const;

// Typography system (aligned with customer app)
export const FontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 19,
  xl: 21,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
  xxxxxl: 48,
  display: 64,

  caption: 11,
  footnote: 12,
  label: 13,
  input: 16,
  button: 15,
} as const;

// Font weight constants
export const FontWeight: Record<string, "normal" | "bold" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900"> = {
  thin: '100',
  ultralight: '200',
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
  black: '900',
  normal: 'normal',
};

export const LineHeight = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
} as const;

// Shadow system (aligned with customer app)
export const Shadow = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  // Backward-compatible aliases
  light: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  heavy: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  xxl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 32,
    elevation: 16,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  button: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 20,
  },
  floating: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 28,
    elevation: 10,
  },
} as const;

// Animation config
export const AnimationConfig = {
  spring: { damping: 20, stiffness: 300 },
  springBouncy: { damping: 12, stiffness: 400 },
  springGentle: { damping: 25, stiffness: 200 },
  timing: {
    instant: 50,
    fast: 150,
    normal: 250,
    slow: 400,
    slower: 600,
  },
} as const;

// Component sizing
export const ComponentSize = {
  buttonHeight: { xs: 32, sm: 40, md: 48, lg: 56, xl: 64 },
  inputHeight: { sm: 40, md: 48, lg: 56 },
  iconButton: { xs: 32, sm: 40, md: 48, lg: 56 },
  avatar: { xs: 24, sm: 32, md: 40, lg: 56, xl: 80, xxl: 120 },
  card: { sm: 120, md: 160, lg: 200, xl: 240 },
  quickAction: 72,
  tabBar: 80,
  header: 56,
} as const;

// Z-index system
export const ZIndex = {
  background: -1,
  base: 0,
  raised: 10,
  dropdown: 1000,
  sticky: 1100,
  modal: 1200,
  popover: 1300,
  tooltip: 1400,
  toast: 1500,
  loading: 9999,
} as const;
