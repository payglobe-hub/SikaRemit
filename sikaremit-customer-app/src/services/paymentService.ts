import { paymentService as sharedPaymentService } from '@sikaremit/mobile-shared';
import { api } from './api';
import { ENDPOINTS } from '../constants/api';

// Define proper interfaces for API responses
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
  message?: string;
}

interface ShippingCalculationData {
  shipping_cost: number;
  subtotal: number;
  tax: number;
  total: number;
}

interface OrderCreationData {
  order_id: string;
  order_number: string;
  total_amount: number;
  status: string;
}

interface PaymentProcessingData {
  transaction_id: string;
  status: string;
  amount: number;
  currency: string;
}

// Extend the shared payment service with customer-specific functionality
export const paymentService = {
  ...sharedPaymentService,

  // Shopping Payment Methods
  getShoppingPaymentMethods: async (): Promise<{
    success: boolean;
    data?: Array<{
      code: string;
      name: string;
      enabled: boolean;
      icon: string;
      description: string;
      is_wallet?: boolean;
      wallet_balance?: number;
    }>;
    error?: string;
  }> => {
    try {
      // Get wallet balance first
      const walletBalance = await sharedPaymentService.getBalance();

      // Get regular payment methods
      const regularMethods = await sharedPaymentService.getPaymentMethods();

      // Combine with wallet option
      const shoppingMethods = [
        {
          code: 'wallet',
          name: 'SikaRemit Wallet',
          enabled: true,
          icon: 'wallet' as const,
          description: 'Use your wallet balance',
          is_wallet: true,
          wallet_balance: walletBalance.balance
        },
        ...(regularMethods.some(method => method.type === 'mobile_money') ? [{
          code: 'mobile_money',
          name: 'Mobile Money',
          enabled: true,
          icon: 'phone-portrait' as const,
          description: 'MTN MoMo, Telecel Cash, AirtelTigo Money, G-Money'
        }] : []),
        ...(regularMethods.some(method => method.type === 'card') ? [{
          code: 'card',
          name: 'Credit/Debit Card',
          enabled: true,
          icon: 'card' as const,
          description: 'Visa, Mastercard, Amex'
        }] : []),
        ...(regularMethods.some(method => method.type === 'bank_account') ? [{
          code: 'bank_transfer',
          name: 'Bank Transfer',
          enabled: true,
          icon: 'business' as const,
          description: 'Direct bank transfer'
        }] : [])
      ];

      return {
        success: true,
        data: shoppingMethods
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      return {
        success: false,
        error: apiError.response?.data?.error || 'Failed to load payment methods'
      };
    }
  },

  processShoppingPayment: async (orderId: string, paymentMethod: string, paymentDetails: unknown): Promise<ApiResponse<PaymentProcessingData>> => {
    try {
      if (paymentMethod === 'wallet') {
        // Process wallet payment
        const response = await api.post('/api/v1/ecommerce/payments/orders/process/', {
          order_id: orderId,
          payment_method: 'wallet',
          payment_details: {
            wallet_payment: true,
            ...(paymentDetails as Record<string, any>)
          }
        });
        return {
          success: true,
          data: response.data
        };
      } else {
        // Process other payment methods
        const response = await api.post('/api/v1/ecommerce/payments/orders/process/', {
          order_id: orderId,
          payment_method: paymentMethod,
          payment_details: paymentDetails
        });
        return {
          success: true,
          data: response.data
        };
      }
    } catch (error: unknown) {
      const apiError = error as ApiError;
      return {
        success: false,
        error: apiError.response?.data?.error || 'Payment failed'
      };
    }
  },

  validateWalletBalance: async (amount: number): Promise<{
    sufficient: boolean;
    balance: number;
    deficit?: number;
  }> => {
    try {
      const balance = await sharedPaymentService.getBalance();
      const sufficient = balance.balance >= amount;
      return {
        sufficient,
        balance: balance.balance,
        deficit: sufficient ? undefined : amount - balance.balance
      };
    } catch (error: unknown) {
      return {
        sufficient: false,
        balance: 0,
        deficit: amount
      };
    }
  },

  // Create order from cart
  createOrderFromCart: async (shippingData: unknown): Promise<ApiResponse<OrderCreationData>> => {
    try {
      const response = await api.post('/api/v1/ecommerce/orders/create/', shippingData);
      return {
        success: true,
        data: response.data
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      return {
        success: false,
        error: apiError.response?.data?.error || 'Failed to create order'
      };
    }
  },

  // Calculate shipping costs
  calculateShipping: async (addressData: unknown): Promise<ApiResponse<ShippingCalculationData>> => {
    try {
      const response = await api.post('/api/v1/ecommerce/payments/calculate-shipping/', {
        address: addressData
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      return {
        success: false,
        error: apiError.response?.data?.error || 'Failed to calculate shipping'
      };
    }
  },
};
