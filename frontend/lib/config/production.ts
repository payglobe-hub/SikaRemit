/**
 * Production Configuration for SikaRemit Frontend
 * Centralizes all production-ready settings and validations
 */

// Environment detection
export const isProduction = process.env.NODE_ENV === 'production';
export const isDevelopment = process.env.NODE_ENV === 'development';

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

// Feature Flags
export const FEATURES = {
  ANALYTICS_ENABLED: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  SENTRY_ENABLED: process.env.NEXT_PUBLIC_ENABLE_SENTRY === 'true',
  MAINTENANCE_MODE: process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true',
};

// Payment Provider Configuration
export const PAYMENT_CONFIG = {
  STRIPE: {
    PUBLIC_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || '',
    ENABLED: !!process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY,
  },
};

// App Configuration
export const APP_CONFIG = {
  NAME: process.env.NEXT_PUBLIC_APP_NAME || 'SikaRemit',
  URL: process.env.NEXT_PUBLIC_APP_URL || 'https://sikaremit.com',
  SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@sikaremit.com',
  VERSION: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
};

// Security Configuration
export const SECURITY_CONFIG = {
  // Session timeout in milliseconds (30 minutes)
  SESSION_TIMEOUT: 30 * 60 * 1000,
  // Token refresh threshold (5 minutes before expiry)
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000,
  // Maximum login attempts before lockout
  MAX_LOGIN_ATTEMPTS: 5,
  // Lockout duration in milliseconds (15 minutes)
  LOCKOUT_DURATION: 15 * 60 * 1000,
};

// Validation Configuration
export const VALIDATION_CONFIG = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  PHONE_PATTERNS: {
    GH: /^(\+233|0)(20|24|26|27|50|54|55|56|57|59)\d{7}$/,
  },
  AMOUNT_LIMITS: {
    GHS: { min: 1, max: 100000 },
    USD: { min: 1, max: 50000 },
  },
};

// Monitoring Configuration
export const MONITORING_CONFIG = {
  SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
  ENVIRONMENT: process.env.NODE_ENV || 'development',
};

/**
 * Validate production configuration
 * Call this on app startup to ensure all required env vars are set
 */
export function validateProductionConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (isProduction) {
    // Check required environment variables
    if (!process.env.NEXT_PUBLIC_API_URL) {
      errors.push('NEXT_PUBLIC_API_URL is required in production');
    }

    if (!process.env.NEXTAUTH_SECRET) {
      errors.push('NEXTAUTH_SECRET is required in production');
    }

    if (!process.env.NEXTAUTH_URL) {
      errors.push('NEXTAUTH_URL is required in production');
    }

    // Check at least one payment provider is configured
    const hasPaymentProvider = PAYMENT_CONFIG.STRIPE.ENABLED;

    if (!hasPaymentProvider) {
      errors.push('At least one payment provider must be configured');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Log configuration status (for debugging)
 */
export function logConfigStatus(): void {
  if (isDevelopment) {
    
    
    
    
    
    
    
  }
}

