import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getExchangeRates, getCurrencies } from '@/lib/api/currency'
import { useAuth } from '@/lib/auth/context'
import { cookieUtils } from '@/lib/utils/cookie-auth'

export type Currency = string // Currency code like 'GHS', 'USD', etc.

interface ExchangeRatesResponse {
  base: string;
  rates: Record<string, number>;
}

interface CurrencyContextType {
  currency: Currency
  availableCurrencies: Currency[]
  setCurrency: (currency: Currency) => void
  formatAmount: (amount: number) => string
  formatAmountFromBase: (amount: number, baseCurrency?: Currency) => string
  convertAmount: (amount: number, fromCurrency: Currency, toCurrency: Currency) => number
  refreshExchangeRates: () => Promise<void>
  lastRateUpdate: Date | null
  isLoadingRates: boolean
  exchangeRates: Record<string, number>
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

// Default currency
const DEFAULT_CURRENCY: Currency = 'GHS'

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [currency, setCurrency] = useState<Currency>('GHS') // Start with GHS as default
  const [availableCurrencies, setAvailableCurrencies] = useState<Currency[]>([])
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({})
  const [baseCurrency, setBaseCurrency] = useState<string>('GHS')
  const [lastRateUpdate, setLastRateUpdate] = useState<Date | null>(null)
  const [isLoadingRates, setIsLoadingRates] = useState(false)

  // Load currencies and exchange rates on mount
  useEffect(() => {
    // Skip on server-side rendering or if auth is still loading
    if (typeof window === 'undefined' || authLoading) return

    // Skip if currencies already loaded (prevents rate limiting)
    if (availableCurrencies.length > 0) return

    const loadData = async () => {
      setIsLoadingRates(true)
      try {
        // Load available currencies - getCurrencies returns the currencies array directly
        const currenciesData = await getCurrencies()
        if (Array.isArray(currenciesData) && currenciesData.length > 0) {
          const currencyCodes = currenciesData.map((c: any) => c.code)
          setAvailableCurrencies(currencyCodes)
        }

        // Load exchange rates with error handling
        try {
          const response = await getExchangeRates({ base: baseCurrency }) as any
          let ratesWithBase = { ...response.rates, [baseCurrency]: 1.0 }
          
          // If no rates are available, add some fallback rates for common currencies
          if (Object.keys(ratesWithBase).length === 1) { // Only base currency
            const fallbackRates = {
              'USD': baseCurrency === 'GHS' ? 0.083 : 12.0,  // GHS to USD or USD to GHS
              'EUR': baseCurrency === 'GHS' ? 0.076 : 13.2,  // GHS to EUR or EUR to GHS  
              'GBP': baseCurrency === 'GHS' ? 0.065 : 15.4,  // GHS to GBP or GBP to GHS
            }
            ratesWithBase = { ...ratesWithBase, ...fallbackRates }
            
          }
          
          setExchangeRates(ratesWithBase)
          setLastRateUpdate(new Date())
        } catch (rateError) {
          
          // Set minimal fallback rates
          setExchangeRates({ [baseCurrency]: 1.0 })
          setLastRateUpdate(new Date())
        }

        // Apply custom merchant rates if available
        const customRatesValue = cookieUtils.getCookie('merchant-currency-rates')
        if (customRatesValue) {
          try {
            let customRates: Record<string, number>
            
            // Handle both string (JSON) and object formats
            if (typeof customRatesValue === 'string') {
              customRates = JSON.parse(customRatesValue)
            } else if (typeof customRatesValue === 'object' && customRatesValue !== null) {
              customRates = customRatesValue as Record<string, number>
            } else {
              
              return
            }
            
            setExchangeRates(prev => ({ ...prev, ...customRates }))
          } catch (error) {
            
          }
        }
      } catch (error: any) {
        if (error?.response?.status === 429) {
          
          // Optionally set fallback currencies here
        } else {
          
          // No fallback data - let components handle empty state
        }
      } finally {
        setIsLoadingRates(false)
      }
    }
    loadData()
  }, [authLoading, availableCurrencies.length, baseCurrency]) // Add authLoading dependency

  const convertAmount = (amount: number, fromCurrency: Currency, toCurrency: Currency): number => {
    if (fromCurrency === toCurrency) return amount
    if (!exchangeRates[fromCurrency] || !exchangeRates[toCurrency]) return amount

    // Convert through base currency
    const amountInBase = amount / exchangeRates[fromCurrency]
    const amountInTarget = amountInBase * exchangeRates[toCurrency]

    return Math.round(amountInTarget * 100) / 100 // Round to 2 decimal places
  }

  const refreshExchangeRates = async (): Promise<void> => {
    setIsLoadingRates(true)
    try {
      const response = await getExchangeRates({ base: baseCurrency }) as any
      let ratesWithBase = { ...response.rates, [baseCurrency]: 1.0 }
      
      // If no rates are available, add some fallback rates for common currencies
      if (Object.keys(ratesWithBase).length === 1) { // Only base currency
        const fallbackRates = {
          'USD': baseCurrency === 'GHS' ? 0.083 : 12.0,  // GHS to USD or USD to GHS
          'EUR': baseCurrency === 'GHS' ? 0.076 : 13.2,  // GHS to EUR or EUR to GHS  
          'GBP': baseCurrency === 'GHS' ? 0.065 : 15.4,  // GHS to GBP or GBP to GHS
        }
        ratesWithBase = { ...ratesWithBase, ...fallbackRates }
        
      }
      
      setExchangeRates(ratesWithBase)
      setLastRateUpdate(new Date())
    } catch (error) {
      
      throw error
    } finally {
      setIsLoadingRates(false)
    }
  }

  const formatAmountFromBase = (amount: number, baseCurrency: Currency = 'GHS'): string => {
    // Convert the amount to the display currency
    const convertedAmount = convertAmount(amount, baseCurrency, currency)
    return formatAmount(convertedAmount)
  }

  const formatAmount = (amount: number): string => {
    // Safeguard against empty or invalid currency codes
    if (!currency || currency.trim() === '') {
      return new Intl.NumberFormat('en-GH', {
        style: 'currency',
        currency: DEFAULT_CURRENCY
      }).format(amount)
    }

    try {
      return new Intl.NumberFormat('en-GH', {
        style: 'currency',
        currency: currency
      }).format(amount)
    } catch (error) {
      // Fallback to default currency if the provided currency is invalid
      
      return new Intl.NumberFormat('en-GH', {
        style: 'currency',
        currency: DEFAULT_CURRENCY
      }).format(amount)
    }
  }

  const value: CurrencyContextType = {
    currency,
    availableCurrencies,
    setCurrency,
    formatAmount,
    formatAmountFromBase,
    convertAmount,
    refreshExchangeRates,
    lastRateUpdate,
    isLoadingRates,
    exchangeRates
  }

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
}
