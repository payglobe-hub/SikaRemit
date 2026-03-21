// Merchant Design System - Matching Admin Design Tokens
// Adapted for React Native from admin design system
// Ensures 100% visual consistency between admin and merchant apps

export const merchantDesignTokens = {
  // Spacing System - 4px base unit (matches admin)
  spacing: {
    xs: 4,    // 4px
    sm: 8,    // 8px
    md: 12,   // 12px
    lg: 16,   // 16px
    xl: 20,   // 20px
    '2xl': 24, // 24px
    '3xl': 32, // 32px
    '4xl': 40, // 40px
    '5xl': 48, // 48px
    '6xl': 64, // 64px
  },

  // Color Palette - EXACTLY matching admin colors
  colors: {
    // Primary brand colors (BLUE instead of green)
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',  // Primary blue (matches admin)
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
      950: '#082f49',
    },

    // Semantic colors (matches admin)
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
      950: '#052e16',
    },

    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
      950: '#451a03',
    },

    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
      950: '#450a0a',
    },

    // Neutral grays (matches admin)
    gray: {
      50: '#fafafa',
      100: '#f4f4f5',
      200: '#e4e4e7',
      300: '#d4d4d8',
      400: '#a1a1aa',
      500: '#71717a',
      600: '#52525b',
      700: '#3f3f46',
      800: '#27272a',
      900: '#18181b',
      950: '#09090b',
    },

    // Surface colors - adaptive backgrounds
    surface: {
      primary: '#ffffff',     // Card backgrounds
      secondary: '#f8fafc',    // Secondary surfaces
      tertiary: '#f1f5f9',     // Tertiary surfaces
      overlay: 'rgba(0, 0, 0, 0.5)', // Modal/popover backgrounds
    },

    // Text colors - high contrast and accessible
    text: {
      primary: '#18181b',    // Primary text
      secondary: '#71717a',  // Secondary text
      tertiary: '#a1a1aa',   // Tertiary text
      inverse: '#ffffff',    // Text on colored backgrounds
    },

    // Border colors
    border: {
      subtle: '#e4e4e7',
      default: '#d4d4d8',
      strong: '#a1a1aa',
    },
  },

  // Typography System (adapted for React Native)
  typography: {
    fontFamily: {
      sans: ['Inter', 'System', 'sans-serif'],
      mono: ['JetBrainsMono', 'monospace'],
    },

    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
      '4xl': 36,
      '5xl': 48,
      '6xl': 60,
    },

    fontWeight: {
      thin: '100',
      extralight: '200',
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900',
    },

    letterSpacing: {
      tighter: -0.5,
      tight: -0.25,
      normal: 0,
      wide: 0.25,
      wider: 0.5,
      widest: 1,
    },
  },

  // Shadow System - Layered depth (adapted for React Native)
  shadows: {
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
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 15,
      elevation: 8,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.1,
      shadowRadius: 25,
      elevation: 16,
    },

    // Colored shadows for accent elements
    primary: {
      shadowColor: '#0ea5e9',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 14,
      elevation: 4,
    },
    success: {
      shadowColor: '#22c55e',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 14,
      elevation: 4,
    },
    warning: {
      shadowColor: '#f59e0b',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 14,
      elevation: 4,
    },
    error: {
      shadowColor: '#ef4444',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 14,
      elevation: 4,
    },
  },

  // Border Radius System
  borderRadius: {
    none: 0,
    sm: 2,
    md: 6,
    lg: 8,
    xl: 12,
    '2xl': 16,
    '3xl': 24,
    full: 9999,
  },

  // Animation System
  animation: {
    duration: {
      instant: 0,
      fastest: 50,
      fast: 150,
      normal: 250,
      slow: 350,
      slowest: 500,
    },

    easing: {
      linear: 'linear',
      in: 'ease-in',
      out: 'ease-out',
      inOut: 'ease-in-out',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },

  // Layout breakpoints (adapted for React Native)
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },

  // Component-specific tokens
  components: {
    // Sidebar
    sidebar: {
      width: {
        expanded: 256,
        collapsed: 64,
      },
      transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    },

    // Header
    header: {
      height: 64,
      borderWidth: 1,
    },

    // Cards
    card: {
      padding: 24,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },

    // Buttons
    button: {
      height: {
        sm: 32,
        md: 40,
        lg: 48,
      },
      borderRadius: 8,
    },

    // Form inputs
    input: {
      height: 40,
      borderRadius: 8,
      borderWidth: 1,
    },
  },

  // Z-index scale (adapted for React Native)
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modal: 1040,
    popover: 1050,
    tooltip: 1060,
    toast: 1070,
  },
} as const

// Type exports for TypeScript
export type Spacing = keyof typeof merchantDesignTokens.spacing
export type ColorPalette = typeof merchantDesignTokens.colors
export type Typography = typeof merchantDesignTokens.typography
export type Shadow = keyof typeof merchantDesignTokens.shadows
export type BorderRadius = keyof typeof merchantDesignTokens.borderRadius
export type AnimationDuration = keyof typeof merchantDesignTokens.animation.duration
export type AnimationEasing = keyof typeof merchantDesignTokens.animation.easing

// Unified color scheme for navigation (matches admin)
export const navigationColorScheme = {
  // Core merchant functions
  dashboard: { iconColor: '#0ea5e9', bgColor: '#e0f2fe' }, // Blue
  analytics: { iconColor: '#f59e0b', bgColor: '#fef3c7' }, // Orange
  devices: { iconColor: '#22c55e', bgColor: '#dcfce7' }, // Green
  receipts: { iconColor: '#a855f7', bgColor: '#f3e8ff' }, // Purple
  pos: { iconColor: '#ef4444', bgColor: '#fee2e2' }, // Red
  // Default fallback
  default: { iconColor: '#6b7280', bgColor: '#f3f4f6' }, // Gray
}

// Helper functions for consistent styling
export const getNavigationColor = (section: string) => {
  switch (section.toLowerCase()) {
    case 'dashboard':
    case 'overview':
      return navigationColorScheme.dashboard
    case 'analytics':
    case 'reports':
      return navigationColorScheme.analytics
    case 'devices':
      return navigationColorScheme.devices
    case 'receipts':
    case 'transactions':
      return navigationColorScheme.receipts
    case 'pos':
    case 'pointofsale':
      return navigationColorScheme.pos
    default:
      return navigationColorScheme.default
  }
}
