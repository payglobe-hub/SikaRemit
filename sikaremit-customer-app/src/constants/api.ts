import Constants from 'expo-constants';

export const API_CONFIG = {
  BASE_URL: Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'https://api.sikaremit.com',
  TIMEOUT: 30000,
  VERSION: 'v1',
};

// Production mode settings - KYC is always required
export const DEV_CONFIG = {
  BYPASS_KYC: false, // KYC verification is required for all transactions
};

export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/v1/accounts/login/',
    REGISTER: '/api/v1/accounts/register/',
    LOGOUT: '/api/v1/accounts/logout/',
    REFRESH: '/api/v1/accounts/refresh/',
    PROFILE: '/api/v1/accounts/profile/',
    PASSWORD_RESET: '/api/v1/accounts/password/reset/',
    PASSWORD_CHANGE: '/api/v1/accounts/password/change/',
    VERIFY_EMAIL: '/api/v1/accounts/verify-email/',
    RESEND_VERIFICATION: '/api/v1/accounts/resend-verification/',
    MFA_SETUP: '/api/v1/accounts/2fa/setup/',
    MFA_VERIFY: '/api/v1/accounts/mfa/verify/',
    GOOGLE_CALLBACK: '/api/v1/accounts/google/callback/',
  },
  USER: {
    ME: '/api/v1/users/me/',
    CUSTOMERS: '/api/v1/users/customers/',
    CUSTOMER_ME: '/api/v1/users/customers/me/',
    VERIFY_BIOMETRICS: '/api/v1/users/customers/{id}/verify-biometrics/',
    CHECK_LIVENESS: '/api/v1/users/customers/{id}/check-liveness/',
  },
  KYC: {
    DOCUMENTS: '/api/v1/kyc/documents/',
    STATUS: '/api/v1/kyc/status/',
    BIOMETRICS: '/api/v1/kyc/biometrics/',
    VERIFICATION: '/api/v1/users/kyc/verification/',
    ELIGIBILITY: '/api/v1/users/kyc/eligibility/',
  },
  PAYMENTS: {
    METHODS: '/api/v1/payments/methods/',
    TRANSACTIONS: '/api/v1/payments/transactions/',
    WALLET: '/api/v1/payments/wallet/',
    SEND: '/api/v1/payments/send/',
    REQUEST: '/api/v1/payments/request/',
    PROCESS: '/api/v1/payments/process/',
    BILLS: '/api/v1/payments/bills/pending/',
    BILLS_PAY: '/api/v1/payments/bills/{id}/pay/',
    CURRENCIES: '/api/v1/payments/currencies/',
    EXCHANGE_RATES: '/api/v1/payments/exchange-rates/',
    CONVERT: '/api/v1/payments/convert-currency/',
    REMITTANCE: '/api/v1/payments/remittance/',
    CROSS_BORDER: '/api/v1/payments/cross-border/initiate/',
    QR_VALIDATE: '/api/v1/payments/qr/validate/',
    QR_PROCESS: '/api/v1/payments/qr/process/',
    AVAILABLE_METHODS: '/api/v1/payments/available-methods/',
    RECENT_TRANSACTIONS: '/api/v1/payments/transactions/recent/',
    DOMESTIC_TRANSFER: '/api/v1/payments/domestic-transfers/',
  },
  CUSTOMER: {
    BALANCE: '/api/v1/accounts/customers/balance/',
    PAYMENTS: '/api/v1/accounts/customers/payments/',
    RECEIPTS: '/api/v1/accounts/customers/receipts/',
    SUPPORT_TICKETS: '/api/v1/accounts/customers/support-tickets/',
  },
  NOTIFICATIONS: {
    LIST: '/api/v1/notifications/',
    MARK_READ: '/api/v1/notifications/{id}/mark_read/',
    MARK_ALL_READ: '/api/v1/notifications/mark_all_read/',
    UNREAD_COUNT: '/api/v1/notifications/unread_count/',
    PREFERENCES: '/api/v1/notifications/preferences/',
    REGISTER_DEVICE: '/api/v1/notifications/devices/register/',
    UNREGISTER_DEVICE: '/api/v1/notifications/devices/unregister/',
  },
  DASHBOARD: {
    METRICS: '/api/v1/dashboard/metrics/',
    STATS: '/api/v1/dashboard/stats/',
  },
  TELECOM: {
    PROVIDERS: '/api/v1/payments/telecom/providers/',
    PACKAGES: '/api/v1/payments/telecom/packages/',
    AIRTIME: '/api/v1/payments/telecom/airtime/',
    DATA_BUNDLE: '/api/v1/payments/telecom/data-bundle/',
  },
  WALLET: {
    LIST: '/api/v1/payments/wallet/',
    BALANCES: '/api/v1/payments/wallet/balances/',
    ADD_FUNDS: '/api/v1/payments/wallet/add_funds/',
    TRANSFER: '/api/v1/payments/wallet/transfer/',
    TOTAL_BALANCE: '/api/v1/payments/wallet/total_balance/',
    DEPOSIT_MOBILE_MONEY: '/api/v1/payments/wallet/deposit/mobile-money/',
    DEPOSIT_BANK_TRANSFER: '/api/v1/payments/wallet/deposit/bank-transfer/',
    DEPOSIT_CARD: '/api/v1/payments/wallet/deposit/card/',
    LOOKUP_USER: '/api/v1/payments/wallet/lookup-user/',
    AVAILABLE_METHODS: '/api/v1/payments/available-methods/',
  },
};

// Import STORAGE_KEYS from shared library
export { STORAGE_KEYS } from '@sikaremit/mobile-shared';
