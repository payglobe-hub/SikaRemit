import { getExchangeRates } from '@/lib/api/currency'

type ExchangeRatesResponse = {
  base: string
  rates: Record<string, number>
}

type ApiResponse<T> = {
  data: T
}

// Allow for both direct response and wrapped response
type ExchangeRatesResult = ExchangeRatesResponse | ApiResponse<ExchangeRatesResponse>

type Currency = {
  code: string
  name: string
  symbol: string
  flag_emoji: string
}

export class CurrencyService {
  private static instance: CurrencyService
  private exchangeRates: Record<string, number> = {}
  private lastUpdate: Date | null = null
  private updateInterval: number = 60000 // 1 minute

  private constructor() {
    this.loadExchangeRates()
  }

  static getInstance(): CurrencyService {
    if (!CurrencyService.instance) {
      CurrencyService.instance = new CurrencyService()
    }
    return CurrencyService.instance
  }

  private async loadExchangeRates() {
    try {
      const response = await getExchangeRates() as ExchangeRatesResult
      // Handle both API response format {data: {base, rates}} and fallback format {base, rates}
      const ratesData = 'data' in response ? response.data : response
      this.exchangeRates = ratesData.rates
      this.lastUpdate = new Date()
    } catch (error) {
      
    }
  }

  async convert(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    // Refresh rates if they're stale
    if (!this.lastUpdate || Date.now() - this.lastUpdate.getTime() > this.updateInterval) {
      await this.loadExchangeRates()
    }

    if (fromCurrency === toCurrency) {
      return amount
    }

    const fromRate = this.exchangeRates[fromCurrency] || 1
    const toRate = this.exchangeRates[toCurrency] || 1

    // Convert to base currency (USD) then to target currency
    const baseAmount = amount / fromRate
    return baseAmount * toRate
  }

  getRate(currency: string): number {
    return this.exchangeRates[currency] || 1
  }

  async refreshRates() {
    await this.loadExchangeRates()
  }

  formatAmount(amount: number, currency: Currency): string {
    // Format the amount with proper decimal places
    const formattedAmount = amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })

    // Return with currency symbol
    return `${currency.symbol}${formattedAmount}`
  }

  getLastUpdate(): Date | null {
    return this.lastUpdate
  }
}

export default CurrencyService.getInstance()
