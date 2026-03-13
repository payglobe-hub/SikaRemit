// Shared API endpoints for SikaRemit applications
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.sikaremit.com/api/v1';

export const ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/accounts/login/',
    LOGOUT: '/accounts/logout/',
    REGISTER: '/accounts/register/',
    REFRESH: '/accounts/refresh/',
    PROFILE: '/accounts/profile/',
    PASSWORD_RESET: '/accounts/password/reset/',
    PASSWORD_RESET_CONFIRM: '/accounts/password/reset/confirm/',
    PASSWORD_CHANGE: '/accounts/password/change/',
    VERIFY_EMAIL: '/accounts/verify-email/',
    RESEND_VERIFICATION: '/accounts/resend-verification/',
    MFA_SETUP: '/accounts/2fa/setup/',
    MFA_VERIFY: '/accounts/mfa/verify/',
  },

  // Customer endpoints
  CUSTOMER: {
    BALANCE: '/accounts/customers/balance/',
    TRANSACTIONS: '/accounts/customers/transactions/',
    STATEMENTS: '/accounts/customers/statements/',
    SPENDING_BY_CATEGORY: '/accounts/customers/spending-by-category/',
    BALANCE_HISTORY: '/accounts/customers/balance-history/',
    STATS: '/accounts/customers/stats/',
    PAYMENTS: '/accounts/customers/payments/',
    RECEIPTS: '/accounts/customers/receipts/',
    SUPPORT_TICKETS: '/accounts/customers/support-tickets/',
  },

  // Merchant endpoints
  MERCHANT: {
    BALANCE: '/accounts/merchants/balance/',
    TRANSACTIONS: '/accounts/merchants/transactions/',
    REPORTS: '/merchants/reports/',
    STATS: '/accounts/merchants/stats/',
    // B2B endpoints
    BUSINESS_ACCOUNTS: '/merchants/business-accounts/',
    BUSINESS_ROLES: '/merchants/business-roles/',
    BUSINESS_USERS: '/merchants/business-users/',
    APPROVAL_WORKFLOWS: '/merchants/approval-workflows/',
    BULK_PAYMENTS: '/merchants/bulk-payments/',
    BUSINESS_ANALYTICS: '/merchants/business-analytics/',
    ACCOUNTING_INTEGRATIONS: '/merchants/accounting-integrations/',
  },

  // User endpoints
  USER: {
    ME: '/users/me/',
    CUSTOMERS: '/users/customers/',
    CUSTOMER_ME: '/users/customers/me/',
    VERIFY_BIOMETRICS: '/users/customers/{id}/verify-biometrics/',
    CHECK_LIVENESS: '/users/customers/{id}/check-liveness/',
    BIOMETRIC_DATA: '/users/{id}/biometric/',
  },

  // Payments
  PAYMENTS: {
    WALLET: '/payments/wallet/',
    TRANSACTIONS: '/payments/transactions/',
    METHODS: '/payments/methods/',
    CURRENCIES: '/payments/currencies/',
    EXCHANGE_RATES: '/payments/exchange-rates/',
    CONVERT: '/payments/convert/',
    SEND: '/payments/send/',
    REQUEST: '/payments/request/',
    REMITTANCE: '/payments/remittance/',
    BILLS: '/payments/bills/',
    BILLS_PAY: '/payments/bills/{id}/pay/',
    QR_VALIDATE: '/payments/qr/validate/',
    QR_PROCESS: '/payments/qr/process/',
    AVAILABLE_METHODS: '/payments/available-methods/',
    RECENT_TRANSACTIONS: '/payments/transactions/recent/',
    DOMESTIC_TRANSFER: '/payments/domestic-transfers/',
    VERIFY: '/payments/verify/',
    HISTORY: '/payments/history/',
    TRANSFER: '/payments/wallet/transfer/',
    LOOKUP_USER: '/payments/wallet/lookup-user/',
  },

  // Telecom
  TELECOM: {
    PROVIDERS: '/telecom/providers/',
    PACKAGES: '/telecom/packages/',
    AIRTIME: '/telecom/airtime/',
    DATA_BUNDLE: '/telecom/data-bundle/',
    COUNTRIES: '/telecom/countries/',
    VALIDATE: '/telecom/validate/',
  },

  // Wallet
  WALLET: {
    LIST: '/payments/wallet/',
    BALANCES: '/payments/wallet/balances/',
    ADD_FUNDS: '/payments/wallet/add_funds/',
    TOTAL_BALANCE: '/payments/wallet/total_balance/',
    DEPOSIT_MOBILE_MONEY: '/payments/wallet/deposit/mobile-money/',
    DEPOSIT_BANK_TRANSFER: '/payments/wallet/deposit/bank-transfer/',
    DEPOSIT_CARD: '/payments/wallet/deposit/card/',
    AVAILABLE_METHODS: '/wallet/available-methods/',
  },

  // QR
  QR: {
    GENERATE: '/payments/qr/generate/',
    VALIDATE: '/payments/qr/validate/',
    PROCESS: '/payments/qr/process/',
    DETAILS: '/payments/qr/details/{reference}/',
  },

  // KYC
  KYC: {
    DOCUMENTS: '/kyc/documents/',
    STATUS: '/kyc/status/',
    UPLOAD: '/kyc/upload/',
    BIOMETRICS: '/kyc/biometrics/',
    VERIFICATION: '/kyc/verification/',
    ELIGIBILITY: '/kyc/eligibility/',
  },

  // Notifications
  NOTIFICATIONS: {
    LIST: '/notifications/',
    MARK_READ: '/notifications/{id}/read/',
    MARK_ALL_READ: '/notifications/mark-all-read/',
    UNREAD_COUNT: '/notifications/unread_count/',
    PREFERENCES: '/notifications/preferences/',
    REGISTER_DEVICE: '/notifications/devices/register/',
    UNREGISTER_DEVICE: '/notifications/devices/unregister/',
  },

  // Support
  SUPPORT: {
    TICKETS: '/support/tickets/',
    CREATE: '/support/tickets/create/',
  },

  // Exchange Rates
  EXCHANGE_RATES: '/exchange-rates/',

  // Referrals
  REFERRAL: {
    GENERATE: '/referrals/generate/',
    STATS: '/referrals/stats/',
    HISTORY: '/referrals/history/',
    REWARDS: '/referrals/rewards/',
    CLAIM_REWARD: '/referrals/rewards/{id}/claim/',
    APPLY: '/referrals/apply/',
    VALIDATE: '/referrals/validate/',
    LEADERBOARD: '/referrals/leaderboard/',
  },
} as const;
