/**
 * SikaRemit Mobile - Revolut-Inspired Design System
 * Clean, modern fintech aesthetic matching the web frontend
 */

export const Colors = {
  light: {
    // Primary - Revolut Blue/Purple
    primary: '#6366F1',      // hsl(250 84% 54%)
    primaryLight: '#818CF8',
    primaryDark: '#4F46E5',
    
    // Secondary
    secondary: '#F1F5F9',    // hsl(240 4.8% 95.9%)
    secondaryLight: '#F8FAFC',
    
    // Accent
    accent: '#F1F5F9',
    
    // Status colors
    success: '#22C55E',      // Green
    warning: '#F59E0B',      // Amber
    error: '#EF4444',        // Red
    info: '#3B82F6',         // Blue
    
    // Backgrounds - Clean white
    background: '#FAFAFA',   // hsl(0 0% 98%)
    surface: '#F1F5F9',
    surfaceVariant: '#E2E8F0',
    
    // Card - Pure white with subtle border
    card: '#FFFFFF',
    cardBorder: '#E2E8F0',   // hsl(240 5.9% 90%)
    
    // Text - Dark grays
    text: '#0F172A',         // hsl(240 10% 3.9%)
    textSecondary: '#64748B', // hsl(240 3.8% 46.1%)
    textMuted: '#94A3B8',
    
    // Border
    border: '#E2E8F0',
    divider: '#F1F5F9',
    
    // Overlay
    overlay: 'rgba(0, 0, 0, 0.4)',
    
    // Gradients - Revolut style
    gradient: {
      primary: ['#6366F1', '#8B5CF6'],
      secondary: ['#06B6D4', '#22C55E'],
      dark: ['#1E293B', '#0F172A'],
      balance: ['#6366F1', '#A855F7', '#EC4899'],
    },
  },
  dark: {
    // Primary - Lighter for dark mode
    primary: '#818CF8',      // hsl(250 84% 60%)
    primaryLight: '#A5B4FC',
    primaryDark: '#6366F1',
    
    // Secondary
    secondary: '#1E293B',    // hsl(240 5% 15%)
    secondaryLight: '#334155',
    
    // Accent
    accent: '#1E293B',
    
    // Status colors
    success: '#4ADE80',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA',
    
    // Backgrounds - Deep dark
    background: '#0A0A0F',   // hsl(240 10% 4%)
    surface: '#111827',
    surfaceVariant: '#1E293B',
    
    // Card - Dark with subtle border
    card: '#0F172A',         // hsl(240 10% 6%)
    cardBorder: '#1E293B',   // hsl(240 5% 18%)
    
    // Text - Light
    text: '#FAFAFA',         // hsl(0 0% 98%)
    textSecondary: '#94A3B8', // hsl(240 5% 65%)
    textMuted: '#64748B',
    
    // Border
    border: '#1E293B',
    divider: '#111827',
    
    // Overlay
    overlay: 'rgba(0, 0, 0, 0.6)',
    
    // Gradients
    gradient: {
      primary: ['#818CF8', '#A855F7'],
      secondary: ['#22D3EE', '#4ADE80'],
      dark: ['#1E293B', '#0F172A'],
      balance: ['#818CF8', '#A855F7', '#F472B6'],
    },
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 40,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const Shadow = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
  },
  // Revolut-style shadows
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHover: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  button: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  glow: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  float: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 12,
  },
};

// Animation presets for smooth micro-interactions
export const AnimationConfig = {
  spring: {
    damping: 20,
    stiffness: 300,
  },
  springBouncy: {
    damping: 12,
    stiffness: 400,
  },
  springGentle: {
    damping: 25,
    stiffness: 200,
  },
  timing: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
  },
};

// Revolut-style component sizes
export const ComponentSize = {
  buttonHeight: {
    sm: 36,
    md: 48,
    lg: 56,
  },
  inputHeight: 52,
  iconButton: 44,
  avatar: {
    sm: 32,
    md: 40,
    lg: 56,
    xl: 80,
  },
  quickAction: 64,
};
