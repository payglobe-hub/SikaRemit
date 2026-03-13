/**
 * Unified Payment Gateway Abstraction Layer
 * 
 * This service provides a unified interface for payment methods
 * (Mobile Money, Bank Transfer). Card payments have been removed.
 */

import { api } from './api';
import { ENDPOINTS } from '../constants/api';

// Payment Method Types
export type PaymentMethod = 'mobile_money' | 'bank_transfer' | 'sikaremit_wallet';

// Mobile Money Provider mapping
export type MobileMoneyProvider = 'mtn' | 'G-Money' | 'airteltigo' | 'telecel';

// Unified Response Types
export interface PaymentInitResponse {
  success: boolean;
  method: PaymentMethod;
  reference: string;
  authorizationUrl?: string;
  message: string;
  data?: any;
}

export interface PaymentVerifyResponse {
  success: boolean;
  method: PaymentMethod;
  reference: string;
  status: 'success' | 'failed' | 'pending' | 'abandoned';
  amount: number;
  currency: string;
  channel: string;
  paidAt?: string;
  customer: {
    email: string;
    name?: string;
    phone?: string;
  };
  fees?: number;
  message: string;
  data?: any;
}

export interface MobileMoneyInitResponse {
  success: boolean;
  method: PaymentMethod;
  reference: string;
  status: 'pending' | 'otp_required' | 'success';
  message: string;
  otpRequired?: boolean;
  authUrl?: string;
  data?: any;
}

// Unified Payment Gateway Service
const paymentGateway = {
  /**
   * Generate a unique payment reference
   */
  generateReference: (): string => {
    return `SIKA_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  },

  /**
   * Initialize a mobile money payment
   */
  initializeMobileMoneyPayment: async (
    email: string,
    amount: number,
    phoneNumber: string,
    provider: MobileMoneyProvider,
    metadata?: Record<string, any>
  ): Promise<MobileMoneyInitResponse> => {
    const reference = paymentGateway.generateReference();

    try {
      const response = await api.post(ENDPOINTS.WALLET.DEPOSIT_MOBILE_MONEY, {
        email,
        amount,
        phone_number: phoneNumber,
        provider,
        reference,
        metadata,
      });

      return {
        success: true,
        method: 'mobile_money',
        reference,
        status: response.data.status || 'pending',
        message: response.data.message || 'Mobile money payment initiated',
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        method: 'mobile_money',
        reference,
        status: 'pending',
        message: error.response?.data?.message || error.message || 'Mobile money payment failed',
      };
    }
  },

  /**
   * Initialize a bank transfer deposit
   */
  initializeBankTransfer: async (
    email: string,
    amount: number,
    metadata?: Record<string, any>
  ): Promise<{
    success: boolean;
    method: PaymentMethod;
    reference: string;
    bankDetails?: {
      bankName: string;
      accountNumber: string;
      accountName: string;
      expiresAt?: string;
      reference: string;
    };
    message: string;
  }> => {
    const reference = paymentGateway.generateReference();

    try {
      const response = await api.post(ENDPOINTS.WALLET.DEPOSIT_BANK_TRANSFER, {
        email,
        amount,
        reference,
        metadata,
      });

      return {
        success: true,
        method: 'bank_transfer',
        reference,
        bankDetails: response.data.bank_details,
        message: response.data.message || 'Bank transfer details generated',
      };
    } catch (error: any) {
      return {
        success: false,
        method: 'bank_transfer',
        reference,
        message: error.response?.data?.message || error.message || 'Bank transfer initialization failed',
      };
    }
  },

  /**
   * Verify a payment transaction
   */
  verifyPayment: async (reference: string): Promise<PaymentVerifyResponse> => {
    try {
      const response = await api.get(`${ENDPOINTS.PAYMENTS.TRANSACTIONS}/${reference}/verify/`);

      return {
        success: response.data.status === 'success',
        method: response.data.method || 'mobile_money',
        reference: response.data.reference,
        status: response.data.status,
        amount: response.data.amount,
        currency: response.data.currency || 'GHS',
        channel: response.data.channel || 'mobile',
        paidAt: response.data.paid_at,
        customer: response.data.customer || { email: '' },
        message: response.data.message || `Payment ${response.data.status}`,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        method: 'mobile_money',
        reference,
        status: 'failed',
        amount: 0,
        currency: 'GHS',
        channel: 'unknown',
        customer: { email: '' },
        message: error.response?.data?.message || error.message || 'Payment verification failed',
      };
    }
  },

  /**
   * Initialize a SikaRemit wallet payment
   */
  initializeWalletPayment: async (
    walletId: string,
    amount: number,
    recipientPhone?: string,
    recipientEmail?: string,
    description?: string
  ): Promise<PaymentInitResponse> => {
    const reference = paymentGateway.generateReference();

    try {
      const response = await api.post(ENDPOINTS.WALLET.TRANSFER, {
        wallet_id: walletId,
        amount,
        recipient_phone: recipientPhone,
        recipient_email: recipientEmail,
        description,
        payment_method: 'sikaremit_wallet',
        reference,
      });

      return {
        success: true,
        method: 'sikaremit_wallet',
        reference,
        message: response.data.message || 'Wallet payment initiated successfully',
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        method: 'sikaremit_wallet',
        reference,
        message: error.response?.data?.message || error.message || 'Wallet payment failed',
      };
    }
  },

  /**
   * Initialize a card payment using Stripe
   */
  initializeCardPayment: async (
    email: string,
    amount: number,
    metadata?: Record<string, any>
  ): Promise<PaymentInitResponse> => {
    const reference = paymentGateway.generateReference();

    try {
      const response = await api.post(ENDPOINTS.WALLET.DEPOSIT_CARD, {
        email,
        amount,
        reference,
        metadata,
      });

      return {
        success: true,
        method: 'mobile_money',
        reference,
        authorizationUrl: response.data.authorization_url,
        message: response.data.message || 'Card payment initiated',
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        method: 'mobile_money',
        reference,
        message: error.response?.data?.message || error.message || 'Card payment failed',
      };
    }
  },

  /**
   * Get saved cards from payment methods
   */
  getSavedCards: async (): Promise<any[]> => {
    try {
      const response = await api.get(ENDPOINTS.PAYMENTS.METHODS);
      const methods = response.data.results || response.data;
      return methods.filter((m: any) => m.method_type === 'card');
    } catch (error) {
      return [];
    }
  },

  /**
   * Charge a saved card
   */
  chargeSavedCard: async (
    card: any,
    email: string,
    amount: number,
    metadata?: Record<string, any>
  ): Promise<PaymentInitResponse> => {
    const reference = paymentGateway.generateReference();

    try {
      const response = await api.post('/api/v1/payments/charge-card/', {
        payment_method_id: card.id,
        email,
        amount,
        reference,
        metadata,
      });

      return {
        success: true,
        method: 'mobile_money',
        reference,
        message: response.data.message || 'Card charged successfully',
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        method: 'mobile_money',
        reference,
        message: error.response?.data?.message || error.message || 'Card charge failed',
      };
    }
  },

  /**
   * Delete a saved card
   */
  deleteSavedCard: async (card: any): Promise<boolean> => {
    try {
      await api.delete(`${ENDPOINTS.PAYMENTS.METHODS}${card.id}/`);
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Note: Mobile money OTP validation is handled by direct integrations
   */
  validateMobileMoneyOTP: async (
    reference: string,
    otp: string
  ): Promise<PaymentVerifyResponse> => {
    try {
      const response = await api.post(`${ENDPOINTS.PAYMENTS.TRANSACTIONS}/${reference}/validate/`, {
        otp,
      });

      return {
        success: response.data.status === 'success',
        method: 'mobile_money',
        reference: response.data.reference,
        status: response.data.status,
        amount: response.data.amount,
        currency: response.data.currency || 'GHS',
        channel: 'mobile',
        customer: response.data.customer || { email: '' },
        message: response.data.message || 'OTP validated',
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        method: 'mobile_money',
        reference,
        status: 'failed',
        amount: 0,
        currency: 'GHS',
        channel: 'mobile',
        customer: { email: '' },
        message: error.response?.data?.message || error.message || 'OTP validation failed',
      };
    }
  },
};

export default paymentGateway;
