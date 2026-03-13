// Exchange rate service for currency conversion
// Uses backend database rates set by admin
import api from '@/lib/api/axios';

interface ExchangeRateResponse {
  success: boolean;
  rates: Record<string, number>;
  base: string;
  date: string;
}

interface ConversionResult {
  amount: number;
  convertedAmount: number;
  rate: number;
  fromCurrency: string;
  toCurrency: string;
  timestamp: Date;
}

class ExchangeRateService {
  private cache: Map<string, { rate: number; timestamp: Date }> = new Map();
  private ratesCache: Record<string, number> = {};
  private ratesCacheTimestamp: Date | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Fetch all rates from backend (GHS base)
  private async fetchRatesFromBackend(): Promise<Record<string, number>> {
    // Check if we have fresh cached rates
    if (this.ratesCacheTimestamp && 
        (Date.now() - this.ratesCacheTimestamp.getTime()) < this.CACHE_DURATION &&
        Object.keys(this.ratesCache).length > 0) {
      return this.ratesCache;
    }

    try {
      const response = await api.get('/api/v1/payments/exchange-rates/', {
        params: { base: 'GHS' }
      });
      
      const data = response.data.data || response.data;
      if (data && data.rates) {
        this.ratesCache = data.rates;
        this.ratesCacheTimestamp = new Date();
        return this.ratesCache;
      }
      
      return this.ratesCache; // Return cached if API response is invalid
    } catch (error) {
      console.error('Failed to fetch rates from backend:', error);
      // Return cached rates if available
      if (Object.keys(this.ratesCache).length > 0) {
        return this.ratesCache;
      }
      throw new Error('Unable to fetch exchange rates from server.');
    }
  }

  // Get exchange rate from GHS to target currency (uses admin-set rates)
  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) {
      return 1;
    }

    const cacheKey = `${fromCurrency}_${toCurrency}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp.getTime()) < this.CACHE_DURATION) {
      return cached.rate;
    }

    try {
      const rates = await this.fetchRatesFromBackend();
      
      let rate: number;
      
      if (fromCurrency === 'GHS') {
        // Direct rate from GHS to target
        rate = rates[toCurrency];
      } else if (toCurrency === 'GHS') {
        // Inverse rate (target to GHS)
        rate = 1 / rates[fromCurrency];
      } else {
        // Cross rate through GHS
        const fromToGHS = 1 / rates[fromCurrency];
        const ghsToTarget = rates[toCurrency];
        rate = fromToGHS * ghsToTarget;
      }

      if (!rate || isNaN(rate)) {
        throw new Error(`Exchange rate not available for ${fromCurrency} to ${toCurrency}`);
      }

      this.cache.set(cacheKey, { rate, timestamp: new Date() });
      return rate;
    } catch (error) {
      console.error('Exchange rate fetch failed:', error);
      throw new Error('Unable to fetch exchange rates. Please try again later.');
    }
  }

  // Convert amount from one currency to another
  async convertAmount(amount: number, fromCurrency: string, toCurrency: string): Promise<ConversionResult> {
    if (fromCurrency === toCurrency) {
      return {
        amount,
        convertedAmount: amount,
        rate: 1,
        fromCurrency,
        toCurrency,
        timestamp: new Date()
      };
    }

    const rate = await this.getExchangeRate(fromCurrency, toCurrency);
    const convertedAmount = amount * rate;

    return {
      amount,
      convertedAmount,
      rate,
      fromCurrency,
      toCurrency,
      timestamp: new Date()
    };
  }

  // Convert GHS amount to recipient's currency
  async convertFromGHS(amount: number, toCurrency: string): Promise<ConversionResult> {
    return this.convertAmount(amount, 'GHS', toCurrency);
  }

  // Format currency amount with proper locale
  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  // Clear cache (useful for testing or manual refresh)
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const exchangeRateService = new ExchangeRateService();

// Utility functions
export async function convertFromGHS(amount: number, toCurrency: string): Promise<ConversionResult> {
  return exchangeRateService.convertFromGHS(amount, toCurrency);
}

export async function getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
  return exchangeRateService.getExchangeRate(fromCurrency, toCurrency);
}

export function formatCurrency(amount: number, currency: string): string {
  return exchangeRateService.formatCurrency(amount, currency);
}
