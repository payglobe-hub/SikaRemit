/**
 * API Configuration and Constants
 */

import Constants from 'expo-constants';

export const API_CONFIG = {
  BASE_URL: Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'https://api.sikaremit.com',
  TIMEOUT: 10000,
};

// Export API_BASE_URL for convenience
export const API_BASE_URL = API_CONFIG.BASE_URL;

// Import STORAGE_KEYS from shared library
export { STORAGE_KEYS } from '@sikaremit/mobile-shared';

export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/v1/accounts/login/',
    REGISTER: '/api/v1/accounts/register/',
    REFRESH: '/api/v1/accounts/refresh/',
    LOGOUT: '/api/v1/accounts/logout/',
    PROFILE: '/api/v1/accounts/profile/',
    PASSWORD_RESET: '/api/v1/accounts/password/reset/',
    PASSWORD_CHANGE: '/api/v1/accounts/password/change/',
  },
  CUSTOMER: {
    BALANCE: '/api/v1/payments/wallet/balance/',
  },
  USER: {
    CHECK_LIVENESS: '/api/v1/users/{id}/liveness/',
    BIOMETRIC_DATA: '/api/v1/users/{id}/biometric/',
  },
  PAYMENTS: {
    SEND_MONEY: '/api/v1/payments/send/',
    MOBILE_MONEY: '/api/v1/payments/mobile-money/',
    BANK_TRANSFER: '/api/v1/payments/bank-transfer/',
    VERIFY: '/api/v1/payments/verify/',
    HISTORY: '/api/v1/payments/history/',
    WALLET: '/api/v1/payments/wallet/',
    DEPOSIT_MOBILE_MONEY: '/api/v1/payments/wallet/deposit/mobile-money/',
    DEPOSIT_BANK_TRANSFER: '/api/v1/payments/wallet/deposit/bank-transfer/',
    TRANSFER: '/api/v1/payments/wallet/transfer/',
    BILLS: '/api/v1/payments/bills/',
    BILLS_PAY: '/api/v1/payments/bills/pay/',
    SEND: '/api/v1/payments/send/',
    TRANSACTIONS: '/api/v1/payments/transactions/',
    METHODS: '/api/v1/payments/methods/',
    CURRENCIES: '/api/v1/payments/currencies/',
    CONVERT: '/api/v1/payments/convert-currency/',
    REQUEST: '/api/v1/payments/request/',
    REMITTANCE: '/api/v1/payments/remittance/',
    AVAILABLE_METHODS: '/api/v1/payments/available-methods/',
    QR_VALIDATE: '/api/v1/payments/qr/validate/',
    QR_PROCESS: '/api/v1/payments/qr/process/',
  },
  TELECOM: {
    PROVIDERS: '/api/v1/telecom/providers/{country_code}/',
    VALIDATE: '/api/v1/telecom/validate/',
    COUNTRIES: '/api/v1/telecom/countries/',
    AIRTIME: '/api/v1/telecom/airtime/',
    DATA_BUNDLE: '/api/v1/telecom/data-bundle/',
    PACKAGES: '/api/v1/telecom/packages/{country_code}/',
  },
  KYC: {
    UPLOAD: '/api/v1/kyc/upload/',
    STATUS: '/api/v1/kyc/status/',
    DOCUMENTS: '/api/v1/kyc/documents/',
    ELIGIBILITY: '/api/v1/kyc/eligibility/',
    VERIFICATION: '/api/v1/kyc/verification/',
    BIOMETRICS: '/api/v1/kyc/biometrics/',
  },
  NOTIFICATIONS: '/api/v1/notifications/',
  NOTIFICATIONS_DETAIL: {
    REGISTER_DEVICE: '/api/v1/notifications/register-device/',
    UNREGISTER_DEVICE: '/api/v1/notifications/unregister-device/',
    LIST: '/api/v1/notifications/',
    UNREAD_COUNT: '/api/v1/notifications/unread-count/',
    MARK_READ: '/api/v1/notifications/{id}/mark-read/',
    MARK_ALL_READ: '/api/v1/notifications/mark-all-read/',
    PREFERENCES: '/api/v1/notifications/preferences/',
  },
  EXCHANGE_RATES: '/api/v1/exchange-rates/',
};
