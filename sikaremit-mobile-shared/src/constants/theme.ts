// Shared theme constants for SikaRemit applications

export const Colors = {
  // Primary colors
  primary: '#00B388',
  primaryDark: '#008F6A',
  primaryLight: '#4DC19C',

  // Secondary colors
  secondary: '#F8F9FA',
  secondaryDark: '#E9ECEF',
  secondaryLight: '#FFFFFF',

  // Status colors
  success: '#28A745',
  error: '#DC3545',
  warning: '#FFC107',
  info: '#17A2B8',

  // Text colors
  text: '#212529',
  textSecondary: '#6C757D',
  textLight: '#ADB5BD',
  textInverse: '#FFFFFF',

  // Background colors
  background: '#FFFFFF',
  backgroundSecondary: '#F8F9FA',
  backgroundDark: '#343A40',

  // Border colors
  borderLight: '#E9ECEF',
  border: '#DEE2E6',
  borderDark: '#CED4DA',

  // Glass effect
  glass: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'rgba(255, 255, 255, 0.2)',
  },

  // Gradient
  gradient: {
    primary: ['#00B388', '#4DC19C', '#80D4B7'] as const,
    secondary: ['#F8F9FA', '#E9ECEF', '#DEE2E6'] as const,
  },
} as const;

export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const FontWeight = {
  thin: '100' as const,
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '900' as const,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const BorderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  button: 8,
  card: 12,
  modal: 16,
} as const;

export const Shadow = {
  none: {},
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  button: {
    shadowColor: '#00B388',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  glass: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

export const ComponentSize = {
  buttonHeight: {
    xs: 32,
    sm: 36,
    md: 44,
    lg: 48,
    xl: 56,
  },
  inputHeight: {
    sm: 40,
    md: 48,
    lg: 52,
  },
  cardPadding: {
    sm: 12,
    md: 16,
    lg: 20,
  },
  borderRadius: BorderRadius,
} as const;

export const AnimationConfig = {
  timing: {
    fast: 200,
    normal: 300,
    slow: 500,
  },
  easing: {
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
} as const;

// Mobile money provider colors
export const MobileMoneyColors = {
  MTN: '#FFC700',
  AirtelTigo: '#E40000',
  Telecel: '#0066CC',
  G_Money: '#00B388',
  Vodafone: '#E60012',
} as const;
