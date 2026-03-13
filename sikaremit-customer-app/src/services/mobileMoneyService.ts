/**
 * Mobile Money Service
 * 
 * Handles direct integration with Ghana mobile money providers:
 * - MTN Mobile Money (MoMo)
 * - Telecel Cash (formerly Vodafone Cash)
 * - AirtelTigo Money
 */

import { api } from './api';
import { ENDPOINTS } from '../constants/api';

// Mobile Money Provider Types
export type MobileMoneyNetwork = 'mtn' | 'telecel' | 'airteltigo' | 'g_money';

export interface MobileMoneyProvider {
  id: MobileMoneyNetwork;
  name: string;
  shortName: string;
  color: string;
  prefixes: string[];
  ussdCode: string;
  supportedServices: ('airtime' | 'data' | 'transfer' | 'bills')[];
}

// Ghana Mobile Money Providers Configuration
export const MOBILE_MONEY_PROVIDERS: MobileMoneyProvider[] = [
  {
    id: 'mtn',
    name: 'MTN Mobile Money',
    shortName: 'MTN MoMo',
    color: '#FFCC00',
    prefixes: ['024', '054', '055', '059'],
    ussdCode: '*170#',
    supportedServices: ['airtime', 'data', 'transfer', 'bills'],
  },
  {
    id: 'telecel',
    name: 'Telecel Cash',
    shortName: 'Telecel',
    color: '#E60000',
    prefixes: ['020', '050'],
    ussdCode: '*110#',
    supportedServices: ['airtime', 'data', 'transfer', 'bills'],
  },
  {
    id: 'airteltigo',
    name: 'AirtelTigo Money',
    shortName: 'AT Money',
    color: '#FF0000',
    prefixes: ['026', '027', '056', '057'],
    ussdCode: '*500#',
    supportedServices: ['airtime', 'data', 'transfer', 'bills'],
  },
  {
    id: 'g_money',
    name: 'G-Money',
    shortName: 'G-Money',
    color: '#00B388',
    prefixes: ['023', '025'],
    ussdCode: '*777#',
    supportedServices: ['airtime', 'data', 'transfer', 'bills'],
  },
];

// Request/Response Types
export interface MobileMoneyTransferRequest {
  senderPhone: string;
  recipientPhone: string;
  amount: number;
  network: MobileMoneyNetwork;
  description?: string;
  reference?: string;
}

export interface MobileMoneyDepositRequest {
  phone: string;
  amount: number;
  network: MobileMoneyNetwork;
  walletId?: string;
  reference?: string;
}

export interface MobileMoneyWithdrawRequest {
  phone: string;
  amount: number;
  network: MobileMoneyNetwork;
  walletId?: string;
  reference?: string;
}

export interface AirtimeTopupRequest {
  phone: string;
  amount: number;
  network: MobileMoneyNetwork;
  paymentMethod: 'wallet' | 'mobile_money';
  paymentPhone?: string; // If paying with mobile money
}

export interface DataBundleRequest {
  phone: string;
  bundleId: string;
  network: MobileMoneyNetwork;
  paymentMethod: 'wallet' | 'mobile_money';
  paymentPhone?: string;
}

export interface MobileMoneyResponse {
  success: boolean;
  reference: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  message: string;
  transactionId?: string;
  data?: any;
}

export interface DataBundle {
  id: string;
  name: string;
  dataAmount: string;
  validity: string;
  price: number;
  network: MobileMoneyNetwork;
}

// Utility Functions
export const detectNetwork = (phoneNumber: string): MobileMoneyNetwork | null => {
  // Remove country code and spaces
  const cleaned = phoneNumber.replace(/[\s\-\+]/g, '');
  const localNumber = cleaned.startsWith('233') 
    ? '0' + cleaned.slice(3) 
    : cleaned.startsWith('0') 
      ? cleaned 
      : '0' + cleaned;
  
  const prefix = localNumber.substring(0, 3);
  
  for (const provider of MOBILE_MONEY_PROVIDERS) {
    if (provider.prefixes.includes(prefix)) {
      return provider.id;
    }
  }
  
  return null;
};

export const formatPhoneNumber = (phone: string, includeCountryCode: boolean = false): string => {
  const cleaned = phone.replace(/[\s\-\+]/g, '');
  
  let localNumber: string;
  if (cleaned.startsWith('233')) {
    localNumber = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('0')) {
    localNumber = cleaned;
  } else {
    localNumber = '0' + cleaned;
  }
  
  if (includeCountryCode) {
    return '233' + localNumber.slice(1);
  }
  
  return localNumber;
};

export const validatePhoneNumber = (phone: string): { valid: boolean; message?: string } => {
  const formatted = formatPhoneNumber(phone);
  
  if (formatted.length !== 10) {
    return { valid: false, message: 'Phone number must be 10 digits' };
  }
  
  const network = detectNetwork(formatted);
  if (!network) {
    return { valid: false, message: 'Invalid phone number prefix' };
  }
  
  return { valid: true };
};

export const generateMoMoReference = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SIKA_MOMO_${timestamp}_${random}`;
};

// Mobile Money Service
const mobileMoneyService = {
  /**
   * Get all supported mobile money providers
   */
  getProviders: (): MobileMoneyProvider[] => MOBILE_MONEY_PROVIDERS,

  /**
   * Get provider by ID
   */
  getProvider: (id: MobileMoneyNetwork): MobileMoneyProvider | undefined => {
    return MOBILE_MONEY_PROVIDERS.find(p => p.id === id);
  },

  /**
   * Detect network from phone number
   */
  detectNetwork,

  /**
   * Validate phone number
   */
  validatePhone: validatePhoneNumber,

  /**
   * Format phone number
   */
  formatPhone: formatPhoneNumber,

  /**
   * Initiate a deposit from mobile money to SikaRemit wallet
   * Sends USSD push to user's phone
   */
  initiateDeposit: async (request: MobileMoneyDepositRequest): Promise<MobileMoneyResponse> => {
    const reference = request.reference || generateMoMoReference();
    
    try {
      const response = await api.post(ENDPOINTS.WALLET.DEPOSIT_MOBILE_MONEY, {
        phone: formatPhoneNumber(request.phone, true),
        amount: request.amount,
        network: request.network,
        wallet_id: request.walletId,
        reference,
      });

      return {
        success: true,
        reference,
        status: 'pending',
        message: response.data.message || 'A payment prompt has been sent to your phone. Please approve to complete the deposit.',
        transactionId: response.data.transaction_id,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        reference,
        status: 'failed',
        message: error.response?.data?.message || 'Failed to initiate deposit. Please try again.',
      };
    }
  },

  /**
   * Initiate a withdrawal from SikaRemit wallet to mobile money
   */
  initiateWithdrawal: async (request: MobileMoneyWithdrawRequest): Promise<MobileMoneyResponse> => {
    const reference = request.reference || generateMoMoReference();
    
    try {
      const response = await api.post(ENDPOINTS.WALLET.TRANSFER, {
        phone: formatPhoneNumber(request.phone, true),
        amount: request.amount,
        network: request.network,
        wallet_id: request.walletId,
        reference,
        type: 'withdrawal',
      });

      return {
        success: true,
        reference,
        status: 'processing',
        message: response.data.message || 'Withdrawal initiated. You will receive the funds shortly.',
        transactionId: response.data.transaction_id,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        reference,
        status: 'failed',
        message: error.response?.data?.message || 'Failed to initiate withdrawal. Please try again.',
      };
    }
  },

  /**
   * Send money via mobile money (P2P transfer)
   */
  sendMoney: async (request: MobileMoneyTransferRequest): Promise<MobileMoneyResponse> => {
    const reference = request.reference || generateMoMoReference();
    
    try {
      const response = await api.post(ENDPOINTS.PAYMENTS.SEND, {
        sender_phone: formatPhoneNumber(request.senderPhone, true),
        recipient_phone: formatPhoneNumber(request.recipientPhone, true),
        amount: request.amount,
        network: request.network,
        description: request.description,
        reference,
        payment_method: 'mobile_money',
      });

      return {
        success: true,
        reference,
        status: 'pending',
        message: response.data.message || 'A payment prompt has been sent to your phone.',
        transactionId: response.data.transaction_id,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        reference,
        status: 'failed',
        message: error.response?.data?.message || 'Failed to send money. Please try again.',
      };
    }
  },

  /**
   * Purchase airtime
   */
  buyAirtime: async (request: AirtimeTopupRequest): Promise<MobileMoneyResponse> => {
    const reference = generateMoMoReference();
    
    try {
      const response = await api.post(ENDPOINTS.TELECOM.AIRTIME, {
        phone: formatPhoneNumber(request.phone, true),
        amount: request.amount,
        network: request.network,
        payment_method: request.paymentMethod,
        payment_phone: request.paymentPhone 
          ? formatPhoneNumber(request.paymentPhone, true) 
          : undefined,
        reference,
      });

      return {
        success: true,
        reference,
        status: response.data.status || 'success',
        message: response.data.message || `GHS ${request.amount} airtime sent to ${request.phone}`,
        transactionId: response.data.transaction_id,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        reference,
        status: 'failed',
        message: error.response?.data?.message || 'Failed to purchase airtime. Please try again.',
      };
    }
  },

  /**
   * Get available data bundles for a network
   */
  getDataBundles: async (network: MobileMoneyNetwork, countryCode: string = 'GH'): Promise<DataBundle[]> => {
    try {
      const response = await api.get(
        ENDPOINTS.TELECOM.PACKAGES.replace('{country_code}', countryCode),
        { params: { network } }
      );
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch data bundles:', error);
      return [];
    }
  },

  /**
   * Purchase data bundle
   */
  buyDataBundle: async (request: DataBundleRequest): Promise<MobileMoneyResponse> => {
    const reference = generateMoMoReference();
    
    try {
      const response = await api.post(ENDPOINTS.TELECOM.DATA_BUNDLE, {
        phone: formatPhoneNumber(request.phone, true),
        bundle_id: request.bundleId,
        network: request.network,
        payment_method: request.paymentMethod,
        payment_phone: request.paymentPhone 
          ? formatPhoneNumber(request.paymentPhone, true) 
          : undefined,
        reference,
      });

      return {
        success: true,
        reference,
        status: response.data.status || 'success',
        message: response.data.message || 'Data bundle purchased successfully',
        transactionId: response.data.transaction_id,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        reference,
        status: 'failed',
        message: error.response?.data?.message || 'Failed to purchase data bundle. Please try again.',
      };
    }
  },

  /**
   * Check transaction status
   */
  checkTransactionStatus: async (reference: string): Promise<MobileMoneyResponse> => {
    try {
      const response = await api.get(`${ENDPOINTS.PAYMENTS.TRANSACTIONS}/${reference}/status/`);
      
      return {
        success: response.data.status === 'success',
        reference,
        status: response.data.status,
        message: response.data.message || `Transaction ${response.data.status}`,
        transactionId: response.data.transaction_id,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        reference,
        status: 'failed',
        message: error.response?.data?.message || 'Failed to check transaction status.',
      };
    }
  },

  /**
   * Get mobile money account balance (requires user authentication with provider)
   * Note: This typically requires the user to check via USSD
   */
  getBalanceUssdCode: (network: MobileMoneyNetwork): string => {
    const provider = MOBILE_MONEY_PROVIDERS.find(p => p.id === network);
    if (!provider) return '';
    
    switch (network) {
      case 'mtn':
        return '*170#'; // Then select option 6
      case 'telecel':
        return '*110#'; // Then select option 1
      case 'airteltigo':
        return '*500#'; // Then select option 5
      default:
        return provider.ussdCode;
    }
  },

  /**
   * Get telecom providers for a country
   */
  getTelecomProviders: async (countryCode: string = 'GH'): Promise<MobileMoneyProvider[]> => {
    try {
      const response = await api.get(
        ENDPOINTS.TELECOM.PROVIDERS.replace('{country_code}', countryCode)
      );
      return response.data.data || MOBILE_MONEY_PROVIDERS;
    } catch (error) {
      // Return default Ghana providers if API fails
      return MOBILE_MONEY_PROVIDERS;
    }
  },
};

export default mobileMoneyService;
