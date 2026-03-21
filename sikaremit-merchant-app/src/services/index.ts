/**
 * Services Index
 * 
 * Central export point for all services.
 * Import services from here for cleaner imports.
 */

// Core API
export { default as api } from './api';

// Authentication
export * as authService from './authService';

// Payments
export * as paymentService from './paymentService';

// Payment Gateways
export { default as paymentGateway } from './paymentGateway';
export type { PaymentMethod, MobileMoneyProvider, PaymentInitResponse, PaymentVerifyResponse, MobileMoneyInitResponse } from './paymentGateway';

// Mobile Money
export { default as mobileMoneyService } from './mobileMoneyService';
export type { MobileMoneyNetwork, MobileMoneyProvider as MoMoProvider, MobileMoneyResponse } from './mobileMoneyService';

// KYC
export { default as kycService } from './kycService';
export type { KYCStatus, DocumentType, VerificationStep, KYCVerification } from './kycService';

// Bill Payments
export { default as billPaymentService } from './billPaymentService';
export type { BillCategory, BillProvider, BillPaymentRequest, BillPaymentResponse } from './billPaymentService';

// Exchange Rates
export { default as exchangeRateService } from './exchangeRateService';
export type { Currency, ExchangeRate, ConversionResult } from './exchangeRateService';
