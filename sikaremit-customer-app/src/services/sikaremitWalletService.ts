/**
 * SikaRemit Wallet Service
 * 
 * Handles wallet-to-wallet payments within the SikaRemit ecosystem
 */

import { api } from './api';
import { ENDPOINTS } from '../constants/api';
import { Wallet, Transaction } from '../types';

// Define proper interfaces for API responses
interface ApiError {
  response?: {
    data?: {
      error?: string;
      message?: string;
    };
  };
  message?: string;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  transaction?: Transaction;
  reference?: string;
  fee?: number;
}

export interface WalletPaymentRequest {
  recipient_wallet_id?: string;
  recipient_phone?: string;
  recipient_email?: string;
  amount: number;
  currency: string;
  description?: string;
}

export interface WalletPaymentResponse {
  success: boolean;
  transaction?: Transaction;
  message: string;
  reference?: string;
  fee?: number;
}

export interface UserLookupRequest {
  identifier: string; // phone number or email
}

export interface UserLookupResponse {
  success: boolean;
  data?: {
    found: boolean;
    recipient?: {
      id: string;
      name: string;
      phone?: string;
      email?: string;
      wallet_id?: string;
    };
    message?: string;
  };
  error?: string;
}

export interface BillPaymentWithWalletRequest {
  bill_id: string;
  amount: number;
  wallet_id: string;
}

export interface AirtimePurchaseWithWalletRequest {
  phone_number: string;
  amount: number;
  provider: string;
  wallet_id: string;
}

export interface DataBundlePurchaseWithWalletRequest {
  phone_number: string;
  package_id: string;
  wallet_id: string;
}

export const sikaremitWalletService = {
  /**
   * Look up a SikaRemit user by phone number or email
   */
  lookupUser: async (identifier: string): Promise<UserLookupResponse> => {
    try {
      const response = await api.get(ENDPOINTS.WALLET.LOOKUP_USER, {
        params: { identifier }
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      return {
        success: false,
        error: apiError.response?.data?.error || 'Failed to look up user',
      };
    }
  },

  /**
   * Process payment using SikaRemit wallet balance
   */
  payWithWallet: async (data: WalletPaymentRequest): Promise<WalletPaymentResponse> => {
    try {
      const response = await api.post(ENDPOINTS.WALLET.TRANSFER, {
        ...data,
        payment_method: 'sikaremit_wallet',
      });

      return {
        success: true,
        transaction: response.data.transaction,
        message: response.data.message || 'Payment processed successfully',
        reference: response.data.reference,
        fee: response.data.fee,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      return {
        success: false,
        message: apiError.response?.data?.message || apiError.message || 'Wallet payment failed',
      };
    }
  },

  /**
   * Pay bill using SikaRemit wallet
   */
  payBillWithWallet: async (data: BillPaymentWithWalletRequest): Promise<WalletPaymentResponse> => {
    try {
      const response = await api.post(
        ENDPOINTS.PAYMENTS.BILLS_PAY.replace('{id}', data.bill_id),
        {
          amount: data.amount,
          payment_method_id: data.wallet_id,
          payment_method: 'sikaremit_wallet',
        }
      );

      return {
        success: true,
        transaction: response.data.transaction,
        message: response.data.message || 'Bill payment successful',
        reference: response.data.reference,
        fee: response.data.fee,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      return {
        success: false,
        message: apiError.response?.data?.message || apiError.message || 'Bill payment failed',
      };
    }
  },

  /**
   * Purchase airtime using SikaRemit wallet
   */
  purchaseAirtimeWithWallet: async (data: AirtimePurchaseWithWalletRequest): Promise<WalletPaymentResponse> => {
    try {
      const response = await api.post(ENDPOINTS.TELECOM.AIRTIME, {
        phone_number: data.phone_number,
        amount: data.amount,
        provider: data.provider,
        payment_method: 'sikaremit_wallet',
        wallet_id: data.wallet_id,
      });

      return {
        success: true,
        transaction: response.data.transaction,
        message: response.data.message || 'Airtime purchase successful',
        reference: response.data.reference,
        fee: response.data.fee,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      return {
        success: false,
        message: apiError.response?.data?.message || apiError.message || 'Airtime purchase failed',
      };
    }
  },

  /**
   * Purchase data bundle using SikaRemit wallet
   */
  purchaseDataBundleWithWallet: async (data: DataBundlePurchaseWithWalletRequest): Promise<WalletPaymentResponse> => {
    try {
      const response = await api.post(ENDPOINTS.TELECOM.DATA_BUNDLE, {
        phone_number: data.phone_number,
        package_id: data.package_id,
        payment_method: 'sikaremit_wallet',
        wallet_id: data.wallet_id,
      });

      return {
        success: true,
        transaction: response.data.transaction,
        message: response.data.message || 'Data bundle purchase successful',
        reference: response.data.reference,
        fee: response.data.fee,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      return {
        success: false,
        message: apiError.response?.data?.message || apiError.message || 'Data bundle purchase failed',
      };
    }
  },

  /**
   * Get available wallets for payments
   */
  getAvailableWallets: async (): Promise<Wallet[]> => {
    try {
      const response = await api.get(ENDPOINTS.WALLET.LIST);
      return response.data.results || response.data;
    } catch (error: unknown) {
      const apiError = error as ApiError;
      throw new Error(apiError.response?.data?.message || apiError.message || 'Failed to fetch wallets');
    }
  },

  /**
   * Check if wallet has sufficient balance
   */
  checkWalletBalance: async (walletId: string, amount: number): Promise<{
    sufficient: boolean;
    balance: number;
    currency: string;
  }> => {
    try {
      const response = await api.get(`${ENDPOINTS.WALLET.BALANCES}${walletId}/`);
      const balance = response.data.balance;
      
      return {
        sufficient: balance >= amount,
        balance,
        currency: response.data.currency || 'GHS',
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to check wallet balance');
    }
  },

  /**
   * Get wallet by ID
   */
  getWalletById: async (walletId: string): Promise<Wallet> => {
    try {
      const response = await api.get(`${ENDPOINTS.WALLET.LIST}${walletId}/`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch wallet');
    }
  },
};

export default sikaremitWalletService;
