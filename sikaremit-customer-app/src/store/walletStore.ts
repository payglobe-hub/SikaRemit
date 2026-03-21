import { create } from 'zustand';
import { Wallet, Transaction, PaymentMethod, Currency, ExchangeRate } from '../types';
import { paymentService } from '../services/paymentService';
import { cachedApiService, CACHE_TTL } from '@sikaremit/mobile-shared/services/cache';

// Define proper interfaces for API responses
interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

interface WalletState {
  wallets: Wallet[];
  transactions: Transaction[];
  paymentMethods: PaymentMethod[];
  currencies: Currency[];
  exchangeRates: ExchangeRate[];
  selectedWallet: Wallet | null;
  isLoading: boolean;
  error: string | null;

  fetchWallets: () => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fetchTransactions: (_limit?: number) => Promise<void>;
  fetchPaymentMethods: () => Promise<void>;
  fetchCurrencies: () => Promise<void>;
  fetchExchangeRates: () => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  selectWallet: (_wallet: Wallet) => void;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  addPaymentMethod: (_method: PaymentMethod) => void;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  removePaymentMethod: (_id: string) => void;
  clearError: () => void;
}

export const useWalletStore = create<WalletState>((set, _get) => ({
  wallets: [],
  transactions: [],
  paymentMethods: [],
  currencies: [],
  exchangeRates: [],
  selectedWallet: null,
  isLoading: false,
  error: null,

  fetchWallets: async () => {
    set({ isLoading: true, error: null });
    try {
      const wallets = await cachedApiService.request(
        'wallets',
        () => paymentService.getWallets(),
        { ttl: CACHE_TTL.WALLETS }
      );
      const defaultWallet = wallets.find((w: Wallet) => w.is_default) || wallets[0];
      set({ wallets, selectedWallet: defaultWallet, isLoading: false });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Failed to fetch wallets',
      });
    }
  },

  fetchTransactions: async (_limit = 20) => {
    set({ isLoading: true, error: null });
    try {
      const transactions = await cachedApiService.request(
        'transactions',
        () => paymentService.getTransactions(_limit),
        {
          params: { limit: _limit },
          ttl: CACHE_TTL.TRANSACTIONS
        }
      );
      set({ transactions, isLoading: false });
    } catch (error: unknown) {
      const apiError = error as ApiError;
      set({
        isLoading: false,
        error: apiError.response?.data?.message || 'Failed to fetch transactions',
      });
    }
  },

  fetchPaymentMethods: async () => {
    set({ isLoading: true, error: null });
    try {
      const paymentMethods = await cachedApiService.request(
        'payment-methods',
        () => paymentService.getPaymentMethods(),
        { ttl: CACHE_TTL.PAYMENT_METHODS }
      );
      set({ paymentMethods, isLoading: false });
    } catch (error: unknown) {
      const apiError = error as ApiError;
      set({
        isLoading: false,
        error: apiError.response?.data?.message || 'Failed to fetch payment methods',
      });
    }
  },

  fetchCurrencies: async () => {
    try {
      const currencies = await cachedApiService.request(
        'currencies',
        () => paymentService.getCurrencies(),
        { ttl: CACHE_TTL.CURRENCIES }
      );
      set({ currencies });
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.warn('Failed to fetch currencies:', apiError);
    }
  },

  fetchExchangeRates: async () => {
    try {
      const exchangeRates = await cachedApiService.request(
        'exchange-rates',
        () => paymentService.getExchangeRates(),
        { ttl: CACHE_TTL.EXCHANGE_RATES }
      );
      set({ exchangeRates });
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.warn('Failed to fetch exchange rates:', apiError);
    }
  },

  selectWallet: (_wallet: Wallet) => {
    set({ selectedWallet: _wallet });
  },

  addPaymentMethod: (_method: PaymentMethod) => {
    set((state) => ({
      paymentMethods: [...state.paymentMethods, _method],
    }));
  },

  removePaymentMethod: (_id: string) => {
    set((state) => ({
      paymentMethods: state.paymentMethods.filter((m) => m.id !== _id),
    }));
  },

  clearError: () => set({ error: null }),
}));
