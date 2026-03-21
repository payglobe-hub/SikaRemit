import api from './api';
import { ENDPOINTS } from '../constants/api';
import { Wallet, Transaction, PaymentMethod, Currency, ExchangeRate, Bill } from '../types';

export interface SendMoneyRequest {
  recipient_phone?: string;
  recipient_email?: string;
  amount: number;
  currency: string;
  description?: string;
  payment_method_id?: string;
}

export interface RemittanceRequest {
  recipient_name: string;
  recipient_phone: string;
  recipient_country: string;
  amount: number;
  source_currency: string;
  target_currency?: string;
  destination_currency?: string;
  exchange_rate?: number;
  fee?: number;
  payment_method_id: string;
  payment_method?: string;
  purpose?: string;
}

export interface BillPaymentRequest {
  bill_id: string;
  amount: number;
  payment_method_id: string;
}

export const paymentService = {
  getWallets: async (): Promise<Wallet[]> => {
    const response = await api.get(ENDPOINTS.PAYMENTS.WALLET);
    return response.data;
  },

  getBalance: async (): Promise<{ balance: number; currency: string }> => {
    const response = await api.get(ENDPOINTS.CUSTOMER.BALANCE);
    return response.data;
  },

  getTransactions: async (limit = 20): Promise<Transaction[]> => {
    const response = await api.get(ENDPOINTS.PAYMENTS.TRANSACTIONS, {
      params: { limit },
    });
    return response.data.results || response.data;
  },

  getTransactionById: async (id: string): Promise<Transaction> => {
    const response = await api.get(`${ENDPOINTS.PAYMENTS.TRANSACTIONS}${id}/`);
    return response.data;
  },

  getPaymentMethods: async (): Promise<PaymentMethod[]> => {
    const response = await api.get(ENDPOINTS.PAYMENTS.METHODS);
    return response.data.results || response.data;
  },

  addPaymentMethod: async (data: Partial<PaymentMethod>): Promise<PaymentMethod> => {
    const response = await api.post(ENDPOINTS.PAYMENTS.METHODS, data);
    return response.data;
  },

  deletePaymentMethod: async (id: string): Promise<void> => {
    await api.delete(`${ENDPOINTS.PAYMENTS.METHODS}${id}/`);
  },

  getCurrencies: async (): Promise<Currency[]> => {
    const response = await api.get(ENDPOINTS.PAYMENTS.CURRENCIES);
    return response.data;
  },

  getExchangeRates: async (): Promise<ExchangeRate[]> => {
    const response = await api.get(ENDPOINTS.PAYMENTS.EXCHANGE_RATES);
    return response.data;
  },

  convertCurrency: async (
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<{ converted_amount: number; rate: number }> => {
    const response = await api.post(ENDPOINTS.PAYMENTS.CONVERT, {
      amount,
      from_currency: fromCurrency,
      to_currency: toCurrency,
    });
    return response.data;
  },

  sendMoney: async (data: SendMoneyRequest): Promise<Transaction> => {
    const response = await api.post(ENDPOINTS.PAYMENTS.SEND, data);
    return response.data;
  },

  requestMoney: async (data: {
    from_phone?: string;
    from_email?: string;
    amount: number;
    currency: string;
    description?: string;
  }): Promise<{ message: string; request_id: string }> => {
    const response = await api.post(ENDPOINTS.PAYMENTS.REQUEST, data);
    return response.data;
  },

  sendRemittance: async (data: RemittanceRequest): Promise<Transaction> => {
    const response = await api.post(ENDPOINTS.PAYMENTS.REMITTANCE, data);
    return response.data;
  },

  getBills: async (): Promise<Bill[]> => {
    const response = await api.get(ENDPOINTS.PAYMENTS.BILLS);
    return response.data.results || response.data;
  },

  payBill: async (billId: string, data: BillPaymentRequest): Promise<Transaction> => {
    const response = await api.post(
      ENDPOINTS.PAYMENTS.BILLS_PAY.replace('{id}', billId),
      data
    );
    return response.data;
  },

  getAvailablePaymentMethods: async (): Promise<{
    success: boolean;
    data?: Record<string, Array<{
      type: string;
      display_name: string;
      icon: string;
      description: string;
      available_gateways: string[];
      primary_gateway: string;
      processing_time: string;
      fees?: string;
      limits?: { min: number; max: number }
    }>>;
    error?: string;
  }> => {
    try {
      const response = await api.get(ENDPOINTS.WALLET.AVAILABLE_METHODS);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to load payment methods'
      };
    }
  },

  validateQRCode: async (qrData: string): Promise<{
    valid: boolean;
    merchant?: { name: string; id: string };
    amount?: number;
  }> => {
    const response = await api.post(ENDPOINTS.PAYMENTS.QR_VALIDATE, { qr_data: qrData });
    return response.data;
  },

  processQRPayment: async (qrData: string, amount: number): Promise<Transaction> => {
    const response = await api.post(ENDPOINTS.PAYMENTS.QR_PROCESS, {
      qr_data: qrData,
      amount,
    });
    return response.data;
  },

  getTelecomProviders: async (countryCode?: string): Promise<any[]> => {
    const response = await api.get(ENDPOINTS.TELECOM.PROVIDERS, {
      params: countryCode ? { country_code: countryCode } : undefined,
    });
    return response.data;
  },

  getTelecomPackages: async (countryCode?: string): Promise<any[]> => {
    const response = await api.get(ENDPOINTS.TELECOM.PACKAGES, {
      params: countryCode ? { country_code: countryCode } : undefined,
    });
    return response.data;
  },
};
