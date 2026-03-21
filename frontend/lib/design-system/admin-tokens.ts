// Admin Design System - Modern Enterprise Dashboard
// Consistent design tokens for spacing, colors, typography, and components

export const adminDesignTokens = {
  // Spacing System - 4px base unit
  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '0.75rem',    // 12px
    lg: '1rem',       // 16px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '2rem',    // 32px
    '4xl': '2.5rem',  // 40px
    '5xl': '3rem',    // 48px
    '6xl': '4rem',    // 64px
  },

  // Color Palette - Modern, accessible, and cohesive
  colors: {
    // Primary brand colors
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',  // Primary blue
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
      950: '#082f49',
    },

    // Semantic colors
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

    // Neutral grays - optimized for both light and dark modes
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
      primary: 'hsl(var(--surface-primary))',     // Card backgrounds
      secondary: 'hsl(var(--surface-secondary))', // Secondary surfaces
      tertiary: 'hsl(var(--surface-tertiary))',   // Tertiary surfaces
      overlay: 'hsl(var(--surface-overlay))',     // Modal/popover backgrounds
    },

    // Text colors - high contrast and accessible
    text: {
      primary: 'hsl(var(--text-primary))',    // Primary text
      secondary: 'hsl(var(--text-secondary))', // Secondary text
      tertiary: 'hsl(var(--text-tertiary))',   // Tertiary text
      inverse: 'hsl(var(--text-inverse))',     // Text on colored backgrounds
    },

    // Border colors
    border: {
      subtle: 'hsl(var(--border-subtle))',
      default: 'hsl(var(--border-default))',
      strong: 'hsl(var(--border-strong))',
    },
  },

  // Typography System
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },

    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
      sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
      base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
      lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
      xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
      '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px
      '5xl': ['3rem', { lineHeight: '1' }],         // 48px
      '6xl': ['3.75rem', { lineHeight: '1' }],      // 60px
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
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0em',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em',
    },
  },

  // Shadow System - Layered depth
  shadows: {
    none: 'none',
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',

    // Colored shadows for accent elements
    primary: '0 4px 14px 0 rgb(14 165 233 / 0.15)',
    success: '0 4px 14px 0 rgb(34 197 94 / 0.15)',
    warning: '0 4px 14px 0 rgb(245 158 11 / 0.15)',
    error: '0 4px 14px 0 rgb(239 68 68 / 0.15)',

    // Inner shadows for inset elements
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  },

  // Border Radius System
  borderRadius: {
    none: '0',
    sm: '0.125rem',  // 2px
    md: '0.375rem',  // 6px
    lg: '0.5rem',    // 8px
    xl: '0.75rem',   // 12px
    '2xl': '1rem',   // 16px
    '3xl': '1.5rem', // 24px
    full: '9999px',
  },

  // Animation System
  animation: {
    duration: {
      instant: '0ms',
      fastest: '50ms',
      fast: '150ms',
      normal: '250ms',
      slow: '350ms',
      slowest: '500ms',
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

  // Layout breakpoints (Tailwind defaults with custom additions)
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // Component-specific tokens
  components: {
    // Sidebar
    sidebar: {
      width: {
        expanded: '16rem',  // 256px
        collapsed: '4rem',  // 64px
      },
      transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    },

    // Header
    header: {
      height: '4rem',  // 64px
      borderWidth: '1px',
    },

    // Cards
    card: {
      padding: '1.5rem',  // 24px
      borderRadius: '0.75rem',  // 12px
      shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    },

    // Buttons
    button: {
      height: {
        sm: '2rem',    // 32px
        md: '2.5rem',  // 40px
        lg: '3rem',    // 48px
      },
      borderRadius: '0.5rem',  // 8px
    },

    // Form inputs
    input: {
      height: '2.5rem',  // 40px
      borderRadius: '0.5rem',  // 8px
      borderWidth: '1px',
    },
  },

  // Z-index scale
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
export type Spacing = keyof typeof adminDesignTokens.spacing
export type ColorPalette = typeof adminDesignTokens.colors
export type Typography = typeof adminDesignTokens.typography
export type Shadow = keyof typeof adminDesignTokens.shadows
export type BorderRadius = keyof typeof adminDesignTokens.borderRadius
export type AnimationDuration = keyof typeof adminDesignTokens.animation.duration
export type AnimationEasing = keyof typeof adminDesignTokens.animation.easing
