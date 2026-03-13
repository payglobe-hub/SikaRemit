// Export all constants
export * from './api';
export * from './theme';

// Shared storage keys used by both apps
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  BIOMETRIC_ENABLED: 'biometric_enabled',
  THEME_MODE: 'theme_mode',
  ONBOARDING_COMPLETE: 'onboarding_complete',
  LAST_LOGIN: 'last_login',
  DEVICE_ID: 'device_id',
} as const;
