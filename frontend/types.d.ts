// Type declarations for lib modules
declare module '@/lib/api/currency' {
  import { Currency, CurrencyPreference, WalletBalance, ExchangeRate } from '@/lib/types/currency';

  export function getCurrencies(): Promise<{ data: Currency[] }>;
  export function getCurrency(code: string): Promise<{ data: Currency }>;
  export function getExchangeRates(params?: { base?: string; target?: string }): Promise<{ data: { base: string; rates: Record<string, number> } | ExchangeRate }>;
  export function getCurrencyPreferences(): Promise<{ data: CurrencyPreference }>;
  export function updateCurrencyPreferences(preferences: Partial<CurrencyPreference>): Promise<{ data: CurrencyPreference }>;
  export function getWalletBalances(): Promise<{ data: WalletBalance[] }>;
  export function addFundsToWallet(currency: string, amount: number, balanceType?: string): Promise<{ data: any }>;
  export function transferWalletFunds(fromCurrency: string, toCurrency: string, amount: number): Promise<{ data: any }>;
  export function getTotalWalletBalance(currency?: string): Promise<{ data: { total_balance: number; currency: string; formatted: string } }>;

  export class CurrencyWebSocketService {
    constructor(
      onRatesUpdate?: (rates: Record<string, number>) => void,
      onWalletUpdate?: (balances: WalletBalance[]) => void,
      onError?: (error: string) => void
    );
    connect(): void;
    disconnect(): void;
    sendMessage(type: string, data?: any): void;
    subscribeToCurrency(currency: string): void;
    unsubscribeFromCurrency(currency: string): void;
    requestRatesUpdate(): void;
  }
}

declare module '@/lib/types/currency' {
  export interface Currency {
    id: number;
    code: string;
    name: string;
    symbol: string;
    decimal_places: number;
    is_active: boolean;
    is_base_currency: boolean;
    flag_emoji: string;
    exchange_api_supported: boolean;
    minimum_amount: number;
    maximum_amount: number;
    created_at: string;
    updated_at: string;
  }

  export interface CurrencyPreference {
    id: number;
    base_currency: Currency;
    display_currency: Currency;
    show_symbol: boolean;
    show_code: boolean;
    decimal_places: number;
    auto_update_rates: boolean;
    notification_threshold: number | null;
    created_at: string;
    updated_at: string;
  }

  export interface WalletBalance {
    id: number;
    currency: Currency;
    available_balance: number;
    pending_balance: number;
    reserved_balance: number;
    last_updated: string;
    total_balance: number;
    formatted_available: string;
    formatted_pending: string;
    formatted_reserved: string;
    formatted_total: string;
  }

  export interface ExchangeRate {
    id: string;
    from_currency: Currency;
    to_currency: Currency;
    rate: number;
    inverse_rate: number;
    source: string;
    timestamp: string;
    is_latest: boolean;
    valid_from: string;
    valid_to: string | null;
    spread: number | null;
    metadata: Record<string, any>;
  }

  export interface ExchangeRateUpdate {
    rates: Record<string, number>;
    timestamp: string;
    source: string;
  }
}

declare module '@/lib/services/currency-service' {
  export class CurrencyService {
    static formatAmount(amount: number, currency: import('@/lib/types/currency').Currency, preferences?: any): string;
    static getCurrencyDisplayName(currency: import('@/lib/types/currency').Currency): string;
    static validateAmount(amount: number, currency: import('@/lib/types/currency').Currency): { isValid: boolean; error?: string };
  }
}
