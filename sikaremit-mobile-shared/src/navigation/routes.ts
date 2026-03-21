// Route definitions for navigation
export const ROUTES = {
  // Auth routes
  LOGIN: 'Login',
  REGISTER: 'Register',
  FORGOT_PASSWORD: 'ForgotPassword',
  RESET_PASSWORD: 'ResetPassword',

  // Main app routes
  HOME: 'Home',
  DASHBOARD: 'Dashboard',
  PROFILE: 'Profile',
  SETTINGS: 'Settings',

  // Payment routes
  PAYMENTS: 'Payments',
  SCAN_QR: 'ScanQR',
  PAYMENT_HISTORY: 'PaymentHistory',
  SEND_MONEY: 'SendMoney',

  // Merchant routes
  MERCHANT_DASHBOARD: 'MerchantDashboard',
  POS_TERMINAL: 'POSTerminal',
  SALES_REPORTS: 'SalesReports',

  // Support routes
  SUPPORT: 'Support',
  HELP: 'Help',
  CONTACT_US: 'ContactUs',
} as const;

export type RouteName = typeof ROUTES[keyof typeof ROUTES];

// Route parameters
export interface RouteParams {
  [ROUTES.LOGIN]: undefined;
  [ROUTES.REGISTER]: undefined;
  [ROUTES.FORGOT_PASSWORD]: undefined;
  [ROUTES.RESET_PASSWORD]: { token: string };
  [ROUTES.HOME]: undefined;
  [ROUTES.DASHBOARD]: undefined;
  [ROUTES.PROFILE]: undefined;
  [ROUTES.SETTINGS]: undefined;
  [ROUTES.PAYMENTS]: { amount?: number; recipient?: string } | undefined;
  [ROUTES.SCAN_QR]: undefined;
  [ROUTES.PAYMENT_HISTORY]: undefined;
  [ROUTES.SEND_MONEY]: { recipientId?: string };
  [ROUTES.MERCHANT_DASHBOARD]: undefined;
  [ROUTES.POS_TERMINAL]: undefined;
  [ROUTES.SALES_REPORTS]: undefined;
  [ROUTES.SUPPORT]: undefined;
  [ROUTES.HELP]: undefined;
  [ROUTES.CONTACT_US]: undefined;
}
