// Application configuration

// Development mode settings
// Set to true to bypass KYC verification during development
export const DEV_CONFIG = {
  // In Next.js, process.env.NODE_ENV is 'development' during dev and 'production' in builds
  BYPASS_KYC: process.env.NODE_ENV === 'development',
};

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'https://sikaremit-api.onrender.com',
  TIMEOUT: 30000,
};
