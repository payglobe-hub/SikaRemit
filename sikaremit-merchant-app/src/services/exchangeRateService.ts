/**
 * Exchange Rate Service
 * 
 * Handles dynamic exchange rates for:
 * - Currency conversion
 * - Remittance calculations
 * - Real-time rate updates
 */

import axios from 'axios';
import { API_BASE_URL, ENDPOINTS } from '../constants/api';
import { getAuthHeaders } from '../services/authService';

// Currency Types
export interface Currency {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  country: string;
  decimalPlaces: number;
  isActive: boolean;
}

export interface ExchangeRate {
  id: string;
  sourceCurrency: string;
  targetCurrency: string;
  rate: number;
  inverseRate: number;
  spread: number;
  buyRate: number;
  sellRate: number;
  lastUpdated: string;
  source: string;
}

export interface ConversionResult {
  sourceAmount: number;
  sourceCurrency: string;
  targetAmount: number;
  targetCurrency: string;
  rate: number;
  fee: number;
  totalCost: number;
  estimatedDelivery?: string;
}

export interface RemittanceFee {
  flatFee: number;
  percentageFee: number;
  minimumFee: number;
  maximumFee: number;
  currency: string;
}

// Supported Currencies
export const SUPPORTED_CURRENCIES: Currency[] = [
  {
    code: 'GHS',
    name: 'Ghana Cedi',
    symbol: '₵',
    flag: '🇬🇭',
    country: 'Ghana',
    decimalPlaces: 2,
    isActive: true,
  },
  {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    flag: '🇺🇸',
    country: 'United States',
    decimalPlaces: 2,
    isActive: true,
  },
  {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    flag: '🇪🇺',
    country: 'European Union',
    decimalPlaces: 2,
    isActive: true,
  },
  {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    flag: '🇬🇧',
    country: 'United Kingdom',
    decimalPlaces: 2,
    isActive: true,
  },
  {
    code: 'NGN',
    name: 'Nigerian Naira',
    symbol: '₦',
    flag: '🇳🇬',
    country: 'Nigeria',
    decimalPlaces: 2,
    isActive: true,
  },
  {
    code: 'KES',
    name: 'Kenyan Shilling',
    symbol: 'KSh',
    flag: '🇰🇪',
    country: 'Kenya',
    decimalPlaces: 2,
    isActive: true,
  },
  {
    code: 'ZAR',
    name: 'South African Rand',
    symbol: 'R',
    flag: '🇿🇦',
    country: 'South Africa',
    decimalPlaces: 2,
    isActive: true,
  },
  {
    code: 'XOF',
    name: 'CFA Franc',
    symbol: 'CFA',
    flag: '🇸🇳',
    country: 'West Africa',
    decimalPlaces: 0,
    isActive: true,
  },
  {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'C$',
    flag: '🇨🇦',
    country: 'Canada',
    decimalPlaces: 2,
    isActive: true,
  },
  {
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'A$',
    flag: '🇦🇺',
    country: 'Australia',
    decimalPlaces: 2,
    isActive: true,
  },
];

// Remittance corridors with fees
export const REMITTANCE_CORRIDORS: Record<string, RemittanceFee> = {
  'GHS_USD': { flatFee: 5, percentageFee: 1.5, minimumFee: 5, maximumFee: 50, currency: 'GHS' },
  'GHS_EUR': { flatFee: 5, percentageFee: 1.5, minimumFee: 5, maximumFee: 50, currency: 'GHS' },
  'GHS_GBP': { flatFee: 5, percentageFee: 1.5, minimumFee: 5, maximumFee: 50, currency: 'GHS' },
  'GHS_NGN': { flatFee: 3, percentageFee: 1.0, minimumFee: 3, maximumFee: 30, currency: 'GHS' },
  'GHS_KES': { flatFee: 3, percentageFee: 1.0, minimumFee: 3, maximumFee: 30, currency: 'GHS' },
  'USD_GHS': { flatFee: 3, percentageFee: 1.0, minimumFee: 3, maximumFee: 30, currency: 'USD' },
  'EUR_GHS': { flatFee: 3, percentageFee: 1.0, minimumFee: 3, maximumFee: 30, currency: 'EUR' },
  'GBP_GHS': { flatFee: 3, percentageFee: 1.0, minimumFee: 3, maximumFee: 30, currency: 'GBP' },
};

// Cache for exchange rates
const ratesCache: Map<string, { rate: ExchangeRate; timestamp: number }> = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Exchange Rate Service
const exchangeRateService = {
  /**
   * Get all supported currencies
   */
  getCurrencies: (): Currency[] => {
    return SUPPORTED_CURRENCIES.filter(c => c.isActive);
  },

  /**
   * Get currency by code
   */
  getCurrency: (code: string): Currency | undefined => {
    return SUPPORTED_CURRENCIES.find(c => c.code === code);
  },

  /**
   * Get currency flag emoji
   */
  getCurrencyFlag: (code: string): string => {
    const currency = SUPPORTED_CURRENCIES.find(c => c.code === code);
    return currency?.flag || '💰';
  },

  /**
   * Get currency symbol
   */
  getCurrencySymbol: (code: string): string => {
    const currency = SUPPORTED_CURRENCIES.find(c => c.code === code);
    return currency?.symbol || code;
  },

  /**
   * Fetch exchange rate from backend
   */
  getExchangeRate: async (
    sourceCurrency: string,
    targetCurrency: string,
    useCache: boolean = true
  ): Promise<ExchangeRate | null> => {
    const cacheKey = `${sourceCurrency}_${targetCurrency}`;
    
    // Check cache
    if (useCache) {
      const cached = ratesCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.rate;
      }
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/exchange-rates/`, {
        headers: await getAuthHeaders(),
        params: {
          source: sourceCurrency,
          target: targetCurrency,
        },
      });

      const rate: ExchangeRate = {
        id: response.data.id || cacheKey,
        sourceCurrency,
        targetCurrency,
        rate: response.data.rate,
        inverseRate: response.data.inverse_rate || 1 / response.data.rate,
        spread: response.data.spread || 0,
        buyRate: response.data.buy_rate || response.data.rate,
        sellRate: response.data.sell_rate || response.data.rate,
        lastUpdated: response.data.last_updated || new Date().toISOString(),
        source: response.data.source || 'backend',
      };

      // Update cache
      ratesCache.set(cacheKey, { rate, timestamp: Date.now() });

      return rate;
    } catch (error) {
      console.error('Failed to fetch exchange rate:', error);
      
      // Return cached rate if available, even if expired
      const cached = ratesCache.get(cacheKey);
      if (cached) {
        return cached.rate;
      }
      
      return null;
    }
  },

  /**
   * Get all exchange rates for a base currency
   */
  getAllRates: async (baseCurrency: string = 'GHS'): Promise<ExchangeRate[]> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/exchange-rates/`, {
        headers: await getAuthHeaders(),
        params: { base: baseCurrency },
      });

      const rates: ExchangeRate[] = response.data.rates?.map((r: any) => ({
        id: r.id || `${baseCurrency}_${r.currency}`,
        sourceCurrency: baseCurrency,
        targetCurrency: r.currency,
        rate: r.rate,
        inverseRate: r.inverse_rate || 1 / r.rate,
        spread: r.spread || 0,
        buyRate: r.buy_rate || r.rate,
        sellRate: r.sell_rate || r.rate,
        lastUpdated: r.last_updated || new Date().toISOString(),
        source: r.source || 'backend',
      })) || [];

      // Update cache
      rates.forEach(rate => {
        const cacheKey = `${rate.sourceCurrency}_${rate.targetCurrency}`;
        ratesCache.set(cacheKey, { rate, timestamp: Date.now() });
      });

      return rates;
    } catch (error) {
      console.error('Failed to fetch all exchange rates:', error);
      return [];
    }
  },

  /**
   * Calculate conversion with fees
   */
  calculateConversion: async (
    amount: number,
    sourceCurrency: string,
    targetCurrency: string,
    includeRemittanceFee: boolean = false
  ): Promise<ConversionResult | null> => {
    const rate = await exchangeRateService.getExchangeRate(sourceCurrency, targetCurrency);
    
    if (!rate) {
      return null;
    }

    let fee = 0;
    
    if (includeRemittanceFee) {
      const corridorKey = `${sourceCurrency}_${targetCurrency}`;
      const corridor = REMITTANCE_CORRIDORS[corridorKey];
      
      if (corridor) {
        const percentageFee = amount * (corridor.percentageFee / 100);
        fee = Math.max(
          corridor.minimumFee,
          Math.min(corridor.flatFee + percentageFee, corridor.maximumFee)
        );
      }
    }

    const targetAmount = (amount - fee) * rate.sellRate;

    return {
      sourceAmount: amount,
      sourceCurrency,
      targetAmount: Math.round(targetAmount * 100) / 100,
      targetCurrency,
      rate: rate.sellRate,
      fee,
      totalCost: amount,
      estimatedDelivery: 'Within 24 hours',
    };
  },

  /**
   * Get remittance fee for a corridor
   */
  getRemittanceFee: (sourceCurrency: string, targetCurrency: string): RemittanceFee | null => {
    const corridorKey = `${sourceCurrency}_${targetCurrency}`;
    return REMITTANCE_CORRIDORS[corridorKey] || null;
  },

  /**
   * Calculate remittance fee
   */
  calculateRemittanceFee: (
    amount: number,
    sourceCurrency: string,
    targetCurrency: string
  ): number => {
    const corridor = exchangeRateService.getRemittanceFee(sourceCurrency, targetCurrency);
    
    if (!corridor) {
      return 0;
    }

    const percentageFee = amount * (corridor.percentageFee / 100);
    return Math.max(
      corridor.minimumFee,
      Math.min(corridor.flatFee + percentageFee, corridor.maximumFee)
    );
  },

  /**
   * Convert currency (simple conversion without fees)
   */
  convert: async (
    amount: number,
    sourceCurrency: string,
    targetCurrency: string
  ): Promise<number | null> => {
    if (sourceCurrency === targetCurrency) {
      return amount;
    }

    const rate = await exchangeRateService.getExchangeRate(sourceCurrency, targetCurrency);
    
    if (!rate) {
      return null;
    }

    return Math.round(amount * rate.rate * 100) / 100;
  },

  /**
   * Format currency amount
   */
  formatAmount: (amount: number, currencyCode: string): string => {
    const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
    const symbol = currency?.symbol || currencyCode;
    const decimals = currency?.decimalPlaces ?? 2;
    
    return `${symbol} ${amount.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  },

  /**
   * Clear exchange rate cache
   */
  clearCache: (): void => {
    ratesCache.clear();
  },

  /**
   * Get rate age (how old the cached rate is)
   */
  getRateAge: (sourceCurrency: string, targetCurrency: string): number | null => {
    const cacheKey = `${sourceCurrency}_${targetCurrency}`;
    const cached = ratesCache.get(cacheKey);
    
    if (!cached) {
      return null;
    }

    return Date.now() - cached.timestamp;
  },

  /**
   * Subscribe to rate updates (polling)
   */
  subscribeToRateUpdates: (
    sourceCurrency: string,
    targetCurrency: string,
    callback: (rate: ExchangeRate) => void,
    intervalMs: number = 60000
  ): () => void => {
    const fetchRate = async () => {
      const rate = await exchangeRateService.getExchangeRate(
        sourceCurrency,
        targetCurrency,
        false // Don't use cache
      );
      if (rate) {
        callback(rate);
      }
    };

    // Fetch immediately
    fetchRate();

    // Set up interval
    const intervalId = setInterval(fetchRate, intervalMs);

    // Return unsubscribe function
    return () => clearInterval(intervalId);
  },

  /**
   * Get popular corridors from Ghana
   */
  getPopularCorridors: (): { source: string; target: string; label: string }[] => {
    return [
      { source: 'GHS', target: 'USD', label: 'Ghana to USA' },
      { source: 'GHS', target: 'GBP', label: 'Ghana to UK' },
      { source: 'GHS', target: 'EUR', label: 'Ghana to Europe' },
      { source: 'GHS', target: 'NGN', label: 'Ghana to Nigeria' },
      { source: 'GHS', target: 'KES', label: 'Ghana to Kenya' },
      { source: 'USD', target: 'GHS', label: 'USA to Ghana' },
      { source: 'GBP', target: 'GHS', label: 'UK to Ghana' },
      { source: 'EUR', target: 'GHS', label: 'Europe to Ghana' },
    ];
  },
};

export default exchangeRateService;
