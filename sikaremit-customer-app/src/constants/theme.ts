/**
 * SikaRemit Mobile - Premium Figma-Grade Design System
 * Sophisticated fintech aesthetic with modern glass morphism effects
 */

export const Colors = {
  light: {
    // Primary - Premium Purple Gradient
    primary: '#7C3AED',      // hsl(262 56% 47%)
    primaryLight: '#8B5CF6',
    primaryDark: '#6D28D9',
    primaryAccent: '#A78BFA',
    
    // Secondary - Soft Sage
    secondary: '#F3F4F6',    // hsl(220 13% 95%)
    secondaryLight: '#F9FAFB',
    secondaryDark: '#E5E7EB',
    
    // Accent - Coral Gold
    accent: '#F59E0B',      // hsl(38 92% 50%)
    accentLight: '#FCD34D',
    accentDark: '#D97706',
    
    // Status colors - Premium palette
    success: '#10B981',      // Emerald
    successLight: '#34D399',
    warning: '#F59E0B',      // Amber
    error: '#EF4444',        // Red
    errorLight: '#F87171',
    info: '#3B82F6',         // Blue
    infoLight: '#60A5FA',
    
    // Backgrounds - Premium whites
    background: '#FEFEFE',   // Pure white
    surface: '#FFFFFF',      // Card white
    surfaceVariant: '#F8FAFC', // Subtle gray
    overlay: 'rgba(15, 23, 42, 0.05)',
    
    // Glass morphism
    glass: {
      background: 'rgba(255, 255, 255, 0.8)',
      border: 'rgba(255, 255, 255, 0.2)',
      shadow: 'rgba(0, 0, 0, 0.1)',
    },
    
    // Text - Sophisticated grays
    text: '#0F172A',         // Deep slate
    textSecondary: '#475569', // Medium slate
    textMuted: '#94A3B8',     // Light slate
    textTertiary: '#CBD5E1',  // Very light
    
    // Border & Dividers
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    divider: '#F8FAFC',
    
    // Premium Gradients - Figma style
    gradient: {
      primary: ['#7C3AED', '#A855F7', '#C084FC'],
      secondary: ['#06B6D4', '#0891B2', '#0E7490'],
      success: ['#10B981', '#059669', '#047857'],
      warning: ['#F59E0B', '#D97706', '#B45309'],
      error: ['#EF4444', '#DC2626', '#B91C1C'],
      sunset: ['#F97316', '#FB923C', '#FDBA74'],
      ocean: ['#0EA5E9', '#0284C7', '#0369A1'],
      aurora: ['#7C3AED', '#2563EB', '#0891B2'],
      gold: ['#F59E0B', '#FCD34D', '#FDE68A'],
    },
    
    // Shadow colors
    shadow: {
      primary: 'rgba(124, 58, 237, 0.15)',
      secondary: 'rgba(148, 163, 184, 0.15)',
      accent: 'rgba(245, 158, 11, 0.15)',
    },
  },
  dark: {
    // Primary - Lighter purple for dark mode
    primary: '#A78BFA',      // hsl(262 56% 65%)
    primaryLight: '#C4B5FD',
    primaryDark: '#8B5CF6',
    primaryAccent: '#DDD6FE',
    
    // Secondary - Deep slate
    secondary: '#1E293B',    // hsl(215 25% 15%)
    secondaryLight: '#334155',
    secondaryDark: '#0F172A',
    
    // Accent - Bright amber
    accent: '#FCD34D',      // hsl(48 96% 76%)
    accentLight: '#FDE68A',
    accentDark: '#F59E0B',
    
    // Status colors - Enhanced for dark mode
    success: '#34D399',
    successLight: '#6EE7B7',
    warning: '#FCD34D',
    error: '#F87171',
    errorLight: '#FCA5A5',
    info: '#60A5FA',
    infoLight: '#93C5FD',
    
    // Backgrounds - Premium dark
    background: '#0A0A0F',   // Deep black
    surface: '#111827',      // Dark slate
    surfaceVariant: '#1E293B', // Medium slate
    overlay: 'rgba(255, 255, 255, 0.05)',
    
    // Glass morphism dark
    glass: {
      background: 'rgba(17, 24, 39, 0.8)',
      border: 'rgba(255, 255, 255, 0.1)',
      shadow: 'rgba(0, 0, 0, 0.3)',
    },
    
    // Text - Premium light colors
    text: '#FAFAFA',         // Pure white
    textSecondary: '#CBD5E1', // Light slate
    textMuted: '#94A3B8',     // Medium slate
    textTertiary: '#64748B',  // Darker slate
    
    // Border & Dividers
    border: '#334155',
    borderLight: '#475569',
    divider: '#1E293B',
    
    // Premium Gradients - Dark mode
    gradient: {
      primary: ['#A78BFA', '#C084FC', '#DDD6FE'],
      secondary: ['#22D3EE', '#38BDF8', '#7DD3FC'],
      success: ['#34D399', '#6EE7B7', '#A7F3D0'],
      warning: ['#FCD34D', '#FDE68A', '#FEF3C7'],
      error: ['#F87171', '#FCA5A5', '#FECACA'],
      sunset: ['#FB923C', '#FDBA74', '#FED7AA'],
      ocean: ['#38BDF8', '#7DD3FC', '#BAE6FD'],
      aurora: ['#A78BFA', '#818CF8', '#60A5FA'],
      gold: ['#FCD34D', '#FDE68A', '#FEF3C7'],
    },
    
    // Shadow colors
    shadow: {
      primary: 'rgba(167, 139, 250, 0.25)',
      secondary: 'rgba(148, 163, 184, 0.1)',
      accent: 'rgba(252, 211, 77, 0.2)',
    },
  },
};

// Enhanced spacing system - 8pt grid
export const Spacing = {
  // Base spacing
  xs: 4,      // 0.25rem
  sm: 8,      // 0.5rem
  md: 16,     // 1rem
  lg: 24,     // 1.5rem
  xl: 32,     // 2rem
  xxl: 48,    // 3rem
  xxxl: 64,   // 4rem
  
  // Micro spacing
  micro: 2,   // 0.125rem
  tiny: 6,    // 0.375rem
  
  // Layout spacing
  section: 96,    // 6rem
  container: 128, // 8rem
};

// Sophisticated border radius system
export const BorderRadius = {
  none: 0,
  xs: 2,      // Subtle
  sm: 6,      // Small
  md: 12,     // Medium
  lg: 16,     // Large
  xl: 20,     // Extra large
  xxl: 24,    // 2xl
  xxxl: 32,   // 3xl
  full: 9999, // Full circle
  
  // Specialized
  button: 12,
  card: 16,
  modal: 20,
  pill: 9999,
};

// Premium typography system
export const FontSize = {
  // Text sizes
  xs: 11,      // Caption
  sm: 13,      // Small text
  base: 15,    // Body text
  md: 17,      // Medium body
  lg: 19,      // Large body
  xl: 21,      // Small heading
  xxl: 24,     // Large heading
  xxxl: 32,    // Display small
  xxxxl: 40,   // Display medium
  xxxxxl: 48,  // Display large
  display: 64, // Hero display
  
  // Specialized
  caption: 11,
  footnote: 12,
  label: 13,
  input: 16,
  button: 15,
};

// Font weight constants - React Native compatible
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
};

// Premium shadow system with glass morphism
export const Shadow = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  
  // Subtle shadows
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
  
  // Medium shadows
  md: {
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
  
  // Heavy shadows
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
  
  // Premium component shadows
  glass: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHover: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  button: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonPressed: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
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
};

// Sophisticated animation system
export const AnimationConfig = {
  // Spring animations
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
  springStiff: {
    damping: 15,
    stiffness: 500,
  },
  
  // Timing animations
  timing: {
    instant: 50,
    fast: 150,
    normal: 250,
    slow: 400,
    slower: 600,
    slowest: 1000,
  },
  
  // Easing functions
  easing: {
    easeIn: 'easeIn',
    easeOut: 'easeOut',
    easeInOut: 'easeInOut',
    linear: 'linear',
  },
};

// Premium component sizing
export const ComponentSize = {
  buttonHeight: {
    xs: 32,
    sm: 40,
    md: 48,
    lg: 56,
    xl: 64,
  },
  inputHeight: {
    sm: 40,
    md: 48,
    lg: 56,
  },
  iconButton: {
    xs: 32,
    sm: 40,
    md: 48,
    lg: 56,
  },
  avatar: {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 56,
    xl: 80,
    xxl: 120,
  },
  card: {
    sm: 120,
    md: 160,
    lg: 200,
    xl: 240,
  },
  quickAction: 72,
  tabBar: 80,
  header: 56,
};

// Glass morphism configurations
export const GlassConfig = {
  light: {
    background: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(20px)',
    border: 'rgba(255, 255, 255, 0.3)',
    shadow: 'rgba(0, 0, 0, 0.08)',
  },
  dark: {
    background: 'rgba(17, 24, 39, 0.85)',
    backdropFilter: 'blur(20px)',
    border: 'rgba(255, 255, 255, 0.15)',
    shadow: 'rgba(0, 0, 0, 0.3)',
  },
};

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
};

// Breakpoints for responsive design
export const Breakpoint = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1400,
};
