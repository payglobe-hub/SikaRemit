/**
 * Bill Payment Service
 * 
 * Handles bill payments for Ghana utilities and services:
 * - ECG (Electricity Company of Ghana) - Prepaid & Postpaid
 * - Ghana Water Company
 * - Internet Service Providers
 * - TV Subscriptions (DSTV, GOtv, StarTimes)
 * - Government Services
 */

import { api } from './api';
import { ENDPOINTS } from '../constants/api';

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

interface BillPaymentHistoryItem {
  id: string;
  provider_id: string;
  provider_name: string;
  account_number: string;
  amount: number;
  status: string;
  created_at: string;
  transaction_id?: string;
}

// Bill Types
export type BillCategory = 
  | 'electricity'
  | 'water'
  | 'internet'
  | 'tv'
  | 'government'
  | 'insurance'
  | 'education';

export type ElectricityType = 'prepaid' | 'postpaid';

export interface BillProvider {
  id: string;
  name: string;
  shortName: string;
  category: BillCategory;
  logo?: string;
  color: string;
  requiresAccountNumber: boolean;
  requiresMeterNumber?: boolean;
  accountNumberLabel: string;
  accountNumberLength?: number;
  accountNumberPattern?: string;
  minimumAmount?: number;
  maximumAmount?: number;
  processingFee?: number;
  isActive: boolean;
}

export interface BillAccount {
  id: string;
  providerId: string;
  accountNumber: string;
  accountName?: string;
  meterNumber?: string;
  customerName?: string;
  address?: string;
  outstandingBalance?: number;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
}

export interface BillPaymentRequest {
  providerId: string;
  accountNumber: string;
  meterNumber?: string;
  amount: number;
  paymentMethod: 'wallet' | 'mobile_money' | 'card' | 'bank_transfer';
  paymentPhone?: string; // For mobile money
  reference?: string;
}

export interface BillPaymentResponse {
  success: boolean;
  reference: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  message: string;
  transactionId?: string;
  token?: string; // For prepaid electricity
  units?: string; // For prepaid electricity
  receiptUrl?: string;
  data?: any;
}

export interface BillValidationResponse {
  valid: boolean;
  accountName?: string;
  customerName?: string;
  address?: string;
  outstandingBalance?: number;
  minimumPayment?: number;
  message?: string;
}

// Ghana Bill Providers
export const BILL_PROVIDERS: BillProvider[] = [
  // Electricity
  {
    id: 'ecg_prepaid',
    name: 'ECG Prepaid',
    shortName: 'ECG',
    category: 'electricity',
    color: '#FF6B00',
    requiresAccountNumber: true,
    requiresMeterNumber: true,
    accountNumberLabel: 'Account Number',
    accountNumberLength: 13,
    minimumAmount: 1,
    maximumAmount: 10000,
    processingFee: 0,
    isActive: true,
  },
  {
    id: 'ecg_postpaid',
    name: 'ECG Postpaid',
    shortName: 'ECG',
    category: 'electricity',
    color: '#FF6B00',
    requiresAccountNumber: true,
    accountNumberLabel: 'Account Number',
    accountNumberLength: 13,
    minimumAmount: 1,
    isActive: true,
  },
  {
    id: 'nedco',
    name: 'Northern Electricity (NEDCo)',
    shortName: 'NEDCo',
    category: 'electricity',
    color: '#1E3A8A',
    requiresAccountNumber: true,
    requiresMeterNumber: true,
    accountNumberLabel: 'Meter Number',
    minimumAmount: 1,
    isActive: true,
  },
  // Water
  {
    id: 'gwcl',
    name: 'Ghana Water Company',
    shortName: 'GWCL',
    category: 'water',
    color: '#0EA5E9',
    requiresAccountNumber: true,
    accountNumberLabel: 'Account Number',
    accountNumberLength: 10,
    minimumAmount: 5,
    isActive: true,
  },
  // Internet
  {
    id: 'telecel_broadband',
    name: 'Telecel Broadband',
    shortName: 'Telecel',
    category: 'internet',
    color: '#E60000',
    requiresAccountNumber: true,
    accountNumberLabel: 'Account Number',
    minimumAmount: 50,
    isActive: true,
  },
  {
    id: 'mtn_broadband',
    name: 'MTN Broadband',
    shortName: 'MTN',
    category: 'internet',
    color: '#FFCC00',
    requiresAccountNumber: true,
    accountNumberLabel: 'Account Number',
    minimumAmount: 50,
    isActive: true,
  },
  {
    id: 'surfline',
    name: 'Surfline',
    shortName: 'Surfline',
    category: 'internet',
    color: '#00A651',
    requiresAccountNumber: true,
    accountNumberLabel: 'Account Number',
    minimumAmount: 30,
    isActive: true,
  },
  {
    id: 'busy_internet',
    name: 'Busy Internet',
    shortName: 'Busy',
    category: 'internet',
    color: '#FF5722',
    requiresAccountNumber: true,
    accountNumberLabel: 'Customer ID',
    minimumAmount: 50,
    isActive: true,
  },
  // TV Subscriptions
  {
    id: 'dstv',
    name: 'DSTV',
    shortName: 'DSTV',
    category: 'tv',
    color: '#003876',
    requiresAccountNumber: true,
    accountNumberLabel: 'Smart Card Number',
    accountNumberLength: 10,
    minimumAmount: 30,
    isActive: true,
  },
  {
    id: 'gotv',
    name: 'GOtv',
    shortName: 'GOtv',
    category: 'tv',
    color: '#00A651',
    requiresAccountNumber: true,
    accountNumberLabel: 'IUC Number',
    accountNumberLength: 10,
    minimumAmount: 20,
    isActive: true,
  },
  {
    id: 'startimes',
    name: 'StarTimes',
    shortName: 'StarTimes',
    category: 'tv',
    color: '#FF6600',
    requiresAccountNumber: true,
    accountNumberLabel: 'Smart Card Number',
    minimumAmount: 15,
    isActive: true,
  },
  // Government Services
  {
    id: 'gra',
    name: 'Ghana Revenue Authority',
    shortName: 'GRA',
    category: 'government',
    color: '#006400',
    requiresAccountNumber: true,
    accountNumberLabel: 'TIN Number',
    minimumAmount: 1,
    isActive: true,
  },
  {
    id: 'dvla',
    name: 'DVLA',
    shortName: 'DVLA',
    category: 'government',
    color: '#1E40AF',
    requiresAccountNumber: true,
    accountNumberLabel: 'Reference Number',
    minimumAmount: 50,
    isActive: true,
  },
  // Insurance
  {
    id: 'nhis',
    name: 'National Health Insurance',
    shortName: 'NHIS',
    category: 'insurance',
    color: '#059669',
    requiresAccountNumber: true,
    accountNumberLabel: 'NHIS Number',
    minimumAmount: 30,
    isActive: true,
  },
];

// Category labels and icons
export const BILL_CATEGORIES: Record<BillCategory, { label: string; icon: string; color: string }> = {
  electricity: { label: 'Electricity', icon: 'flash', color: '#F59E0B' },
  water: { label: 'Water', icon: 'water', color: '#0EA5E9' },
  internet: { label: 'Internet', icon: 'wifi', color: '#8B5CF6' },
  tv: { label: 'TV Subscription', icon: 'tv', color: '#EC4899' },
  government: { label: 'Government', icon: 'business', color: '#10B981' },
  insurance: { label: 'Insurance', icon: 'shield-checkmark', color: '#6366F1' },
  education: { label: 'Education', icon: 'school', color: '#F97316' },
};

// Generate bill payment reference
const generateBillReference = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SIKA_BILL_${timestamp}_${random}`;
};

// Bill Payment Service
const billPaymentService = {
  /**
   * Get all bill categories
   */
  getCategories: (): { id: BillCategory; label: string; icon: string; color: string }[] => {
    return Object.entries(BILL_CATEGORIES).map(([id, data]) => ({
      id: id as BillCategory,
      ...data,
    }));
  },

  /**
   * Get all providers
   */
  getAllProviders: (): BillProvider[] => {
    return BILL_PROVIDERS.filter(p => p.isActive);
  },

  /**
   * Get providers by category
   */
  getProvidersByCategory: (category: BillCategory): BillProvider[] => {
    return BILL_PROVIDERS.filter(p => p.category === category && p.isActive);
  },

  /**
   * Get provider by ID
   */
  getProvider: (providerId: string): BillProvider | undefined => {
    return BILL_PROVIDERS.find(p => p.id === providerId);
  },

  /**
   * Validate bill account
   */
  validateAccount: async (
    providerId: string,
    accountNumber: string,
    meterNumber?: string
  ): Promise<BillValidationResponse> => {
    try {
      const response = await api.post(`${ENDPOINTS.PAYMENTS.BILLS}/validate/`, {
        provider_id: providerId,
        account_number: accountNumber,
        meter_number: meterNumber,
      });

      return {
        valid: true,
        accountName: response.data.account_name,
        customerName: response.data.customer_name,
        address: response.data.address,
        outstandingBalance: response.data.outstanding_balance,
        minimumPayment: response.data.minimum_payment,
      };
    } catch (error: any) {
      return {
        valid: false,
        message: error.response?.data?.message || 'Account validation failed',
      };
    }
  },

  /**
   * Get bill account details
   */
  getAccountDetails: async (
    providerId: string,
    accountNumber: string
  ): Promise<BillAccount | null> => {
    try {
      const response = await api.get(`${ENDPOINTS.PAYMENTS.BILLS}/account/`, {
        params: {
          provider_id: providerId,
          account_number: accountNumber,
        },
      });

      return response.data;
    } catch (error) {
      return null;
    }
  },

  /**
   * Pay a bill
   */
  payBill: async (request: BillPaymentRequest): Promise<BillPaymentResponse> => {
    const reference = request.reference || generateBillReference();

    try {
      const response = await api.post(ENDPOINTS.PAYMENTS.BILLS_PAY.replace('{id}', request.providerId), {
        account_number: request.accountNumber,
        meter_number: request.meterNumber,
        amount: request.amount,
        payment_method: request.paymentMethod,
        payment_phone: request.paymentPhone,
        reference,
      });

      return {
        success: true,
        reference,
        status: response.data.status || 'success',
        message: response.data.message || 'Bill payment successful',
        transactionId: response.data.transaction_id,
        token: response.data.token, // For prepaid electricity
        units: response.data.units,
        receiptUrl: response.data.receipt_url,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        reference,
        status: 'failed',
        message: error.response?.data?.message || 'Bill payment failed. Please try again.',
      };
    }
  },

  /**
   * Get payment history for a provider
   */
  getPaymentHistory: async (providerId?: string): Promise<BillPaymentHistoryItem[]> => {
    try {
      const response = await api.get(ENDPOINTS.PAYMENTS.BILLS, {
        params: {
          provider_id: providerId,
          limit: 20,
        },
      });

      return response.data.data || [];
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.warn('Failed to fetch payment history:', apiError);
      return [];
    }
  },

  /**
   * Get saved bill accounts
   */
  getSavedAccounts: async (): Promise<BillAccount[]> => {
    try {
      const response = await api.get(`${ENDPOINTS.PAYMENTS.BILLS}/saved-accounts/`);
      return response.data.data || [];
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.warn('Failed to fetch saved accounts:', apiError);
      return [];
    }
  },

  /**
   * Save a bill account for quick access
   */
  saveAccount: async (
    providerId: string,
    accountNumber: string,
    nickname?: string
  ): Promise<boolean> => {
    try {
      await api.post(`${ENDPOINTS.PAYMENTS.BILLS}/saved-accounts/`, {
        provider_id: providerId,
        account_number: accountNumber,
        nickname,
      });
      return true;
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.warn('Failed to save account:', apiError);
      return false;
    }
  },

  /**
   * Delete a saved bill account
   */
  deleteSavedAccount: async (accountId: string): Promise<boolean> => {
    try {
      await api.delete(`${ENDPOINTS.PAYMENTS.BILLS}/saved-accounts/${accountId}/`);
      return true;
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.warn('Failed to delete saved account:', apiError);
      return false;
    }
  },

  /**
   * Get ECG prepaid token (for electricity)
   */
  getElectricityToken: async (
    meterNumber: string,
    amount: number,
    paymentMethod: 'wallet' | 'mobile_money',
    paymentPhone?: string
  ): Promise<BillPaymentResponse> => {
    return billPaymentService.payBill({
      providerId: 'ecg_prepaid',
      accountNumber: meterNumber,
      meterNumber,
      amount,
      paymentMethod,
      paymentPhone,
    });
  },

  /**
   * Pay DSTV/GOtv subscription
   */
  payTVSubscription: async (
    providerId: 'dstv' | 'gotv' | 'startimes',
    smartCardNumber: string,
    amount: number,
    paymentMethod: 'wallet' | 'mobile_money',
    paymentPhone?: string
  ): Promise<BillPaymentResponse> => {
    return billPaymentService.payBill({
      providerId,
      accountNumber: smartCardNumber,
      amount,
      paymentMethod,
      paymentPhone,
    });
  },

  /**
   * Pay water bill
   */
  payWaterBill: async (
    accountNumber: string,
    amount: number,
    paymentMethod: 'wallet' | 'mobile_money',
    paymentPhone?: string
  ): Promise<BillPaymentResponse> => {
    return billPaymentService.payBill({
      providerId: 'gwcl',
      accountNumber,
      amount,
      paymentMethod,
      paymentPhone,
    });
  },

  /**
   * Check transaction status
   */
  checkTransactionStatus: async (reference: string): Promise<BillPaymentResponse> => {
    try {
      const response = await api.get(`${ENDPOINTS.PAYMENTS.BILLS}/${reference}/status/`);

      return {
        success: response.data.status === 'success',
        reference,
        status: response.data.status,
        message: response.data.message || `Transaction ${response.data.status}`,
        transactionId: response.data.transaction_id,
        token: response.data.token,
        units: response.data.units,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        reference,
        status: 'failed',
        message: error.response?.data?.message || 'Failed to check transaction status',
      };
    }
  },

  /**
   * Get provider category info
   */
  getCategoryInfo: (category: BillCategory) => {
    return BILL_CATEGORIES[category];
  },
};

export default billPaymentService;
