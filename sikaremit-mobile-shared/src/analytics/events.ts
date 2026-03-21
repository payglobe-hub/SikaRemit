// Analytics event tracking utilities
export const EVENT_NAMES = {
  // Auth events
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  REGISTER_SUCCESS: 'register_success',
  REGISTER_FAILED: 'register_failed',
  LOGOUT: 'logout',

  // Payment events
  PAYMENT_INITIATED: 'payment_initiated',
  PAYMENT_COMPLETED: 'payment_completed',
  PAYMENT_FAILED: 'payment_failed',
  QR_SCANNED: 'qr_scanned',
  QR_PAYMENT_SUCCESS: 'qr_payment_success',

  // Transaction events
  MONEY_SENT: 'money_sent',
  MONEY_RECEIVED: 'money_received',
  TRANSFER_FAILED: 'transfer_failed',

  // Navigation events
  SCREEN_VIEW: 'screen_view',
  BUTTON_CLICK: 'button_click',
  MENU_OPEN: 'menu_open',

  // Error events
  APP_ERROR: 'app_error',
  NETWORK_ERROR: 'network_error',
  API_ERROR: 'api_error',
} as const;

export type EventName = typeof EVENT_NAMES[keyof typeof EVENT_NAMES];

export const trackButtonClick = (buttonName: string, screenName?: string) => {
  trackEvent(EVENT_NAMES.BUTTON_CLICK, {
    button_name: buttonName,
    screen_name: screenName,
  });
};

export const trackScreenView = (screenName: string, properties?: Record<string, any>) => {
  trackEvent(EVENT_NAMES.SCREEN_VIEW, {
    screen_name: screenName,
    ...properties,
  });
};

export const trackPaymentEvent = (
  eventType: 'initiated' | 'completed' | 'failed',
  amount: number,
  currency: string,
  paymentMethod?: string
) => {
  const eventName = eventType === 'initiated'
    ? EVENT_NAMES.PAYMENT_INITIATED
    : eventType === 'completed'
    ? EVENT_NAMES.PAYMENT_COMPLETED
    : EVENT_NAMES.PAYMENT_FAILED;

  trackEvent(eventName, {
    amount,
    currency,
    payment_method: paymentMethod,
  });
};

export const trackError = (
  errorType: 'app' | 'network' | 'api',
  errorMessage: string,
  errorCode?: string
) => {
  const eventName = errorType === 'app'
    ? EVENT_NAMES.APP_ERROR
    : errorType === 'network'
    ? EVENT_NAMES.NETWORK_ERROR
    : EVENT_NAMES.API_ERROR;

  trackEvent(eventName, {
    error_message: errorMessage,
    error_code: errorCode,
  });
};

// Import trackEvent from tracking
import { trackEvent } from './tracking';
