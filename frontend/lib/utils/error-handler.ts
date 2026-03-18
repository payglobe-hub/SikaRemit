/**
 * Centralized Error Handling for SikaRemit Frontend
 * Provides consistent error handling, logging, and user feedback
 */

import { isProduction, MONITORING_CONFIG } from '../config/production';

// Error types
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  PAYMENT = 'PAYMENT',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

interface AppError {
  type: ErrorType;
  message: string;
  code?: string;
  severity: ErrorSeverity;
  context?: Record<string, any>;
  originalError?: Error;
}

/**
 * Parse API error response into AppError
 */
export function parseApiError(error: any): AppError {
  // Network errors
  if (!error.response) {
    return {
      type: ErrorType.NETWORK,
      message: 'Unable to connect to server. Please check your internet connection.',
      severity: ErrorSeverity.MEDIUM,
      originalError: error,
    };
  }

  const status = error.response?.status;
  const data = error.response?.data;

  // Authentication errors
  if (status === 401) {
    return {
      type: ErrorType.AUTHENTICATION,
      message: data?.message || 'Your session has expired. Please log in again.',
      code: 'AUTH_EXPIRED',
      severity: ErrorSeverity.MEDIUM,
    };
  }

  // Authorization errors
  if (status === 403) {
    return {
      type: ErrorType.AUTHORIZATION,
      message: data?.message || 'You do not have permission to perform this action.',
      code: 'FORBIDDEN',
      severity: ErrorSeverity.MEDIUM,
    };
  }

  // Validation errors
  if (status === 400 || status === 422) {
    return {
      type: ErrorType.VALIDATION,
      message: data?.message || 'Please check your input and try again.',
      code: 'VALIDATION_ERROR',
      severity: ErrorSeverity.LOW,
      context: data?.errors,
    };
  }

  // Rate limiting
  if (status === 429) {
    return {
      type: ErrorType.SERVER,
      message: 'Too many requests. Please wait a moment and try again.',
      code: 'RATE_LIMITED',
      severity: ErrorSeverity.MEDIUM,
    };
  }

  // Server errors
  if (status >= 500) {
    return {
      type: ErrorType.SERVER,
      message: 'Something went wrong on our end. Please try again later.',
      code: 'SERVER_ERROR',
      severity: ErrorSeverity.HIGH,
    };
  }

  // Unknown errors
  return {
    type: ErrorType.UNKNOWN,
    message: data?.message || 'An unexpected error occurred.',
    severity: ErrorSeverity.MEDIUM,
    originalError: error,
  };
}

/**
 * Log error to console and monitoring service
 */
export function logError(error: AppError, additionalContext?: Record<string, any>): void {
  const errorLog = {
    type: error.type,
    message: error.message,
    code: error.code,
    severity: error.severity,
    context: { ...error.context, ...additionalContext },
    timestamp: new Date().toISOString(),
  };

  // Always log to console in development
  if (!isProduction) {
    
    if (error.originalError) {
      
    }
  }

  // Send to Sentry in production
  if (isProduction && MONITORING_CONFIG.SENTRY_DSN) {
    try {
      const Sentry = require('@sentry/nextjs');
      Sentry.captureException(error.originalError || new Error(error.message), {
        tags: { type: error.type, severity: error.severity },
        extra: errorLog,
      });
    } catch (e) {
      // Sentry not available, skip
      
    }
  }
}

/**
 * Get user-friendly error message
 */
export function getUserMessage(error: AppError): string {
  switch (error.type) {
    case ErrorType.NETWORK:
      return 'Connection error. Please check your internet and try again.';
    case ErrorType.AUTHENTICATION:
      return 'Please log in to continue.';
    case ErrorType.AUTHORIZATION:
      return 'You don\'t have permission to do this.';
    case ErrorType.VALIDATION:
      return error.message;
    case ErrorType.PAYMENT:
      return 'Payment could not be processed. Please try again.';
    case ErrorType.SERVER:
      return 'Something went wrong. Please try again later.';
    default:
      return 'An error occurred. Please try again.';
  }
}

/**
 * Handle error with logging and return user message
 */
export function handleError(error: any, context?: Record<string, any>): string {
  const appError = parseApiError(error);
  logError(appError, context);
  return getUserMessage(appError);
}

/**
 * Payment-specific error handler
 */
export function handlePaymentError(error: any): AppError {
  const baseError = parseApiError(error);
  
  // Enhance with payment-specific context
  return {
    ...baseError,
    type: ErrorType.PAYMENT,
    severity: ErrorSeverity.HIGH,
  };
}

/**
 * Async error boundary wrapper
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: Record<string, any>
): Promise<{ data?: T; error?: string }> {
  try {
    const data = await fn();
    return { data };
  } catch (error) {
    const message = handleError(error, context);
    return { error: message };
  }
}
