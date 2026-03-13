'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api/axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowRightLeft, TrendingUp, Info, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
// Toast notifications handled by parent component

interface Currency {
  code: string
  name: string
  symbol: string
  countries: string[]
}

interface ConversionResult {
  original_amount: number
  original_currency: string
  converted_amount: number
  converted_currency: string
  exchange_rate: number
  fee: number
  formatted_original: string
  formatted_converted: string
}

interface CurrencyConverterProps {
  initialAmount?: number
  initialFrom?: string
  initialTo?: string
  onConvert?: (result: ConversionResult) => void
  showFees?: boolean
}

export function CurrencyConverter({
  initialAmount = 100,
  initialFrom = 'USD',
  initialTo = 'EUR',
  onConvert,
  showFees = true
}: CurrencyConverterProps) {
  const [amount, setAmount] = useState(initialAmount.toString())
  const [fromCurrency, setFromCurrency] = useState(initialFrom)
  const [toCurrency, setToCurrency] = useState(initialTo)
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [result, setResult] = useState<ConversionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingCurrencies, setLoadingCurrencies] = useState(true)

  useEffect(() => {
    fetchCurrencies()
  }, [])

  useEffect(() => {
    if (amount && fromCurrency && toCurrency) {
      const debounce = setTimeout(() => {
        convertCurrency()
      }, 500)
      return () => clearTimeout(debounce)
    }
  }, [amount, fromCurrency, toCurrency])

  const fetchCurrencies = async () => {
    try {
      const response = await api.get('/api/v1/payments/currency/list/')
      const data = response.data
      
      if (data.success) {
        setCurrencies(data.currencies)
      }
    } catch (error) {
      console.error('Error fetching currencies:', error)
    } finally {
      setLoadingCurrencies(false)
    }
  }

  const convertCurrency = async () => {
    if (!amount || parseFloat(amount) <= 0) return

    try {
      setLoading(true)
      const response = await api.post('/api/v1/payments/currency/convert/', {
        amount: parseFloat(amount),
        from_currency: fromCurrency,
        to_currency: toCurrency,
        include_fee: showFees
      })

      const data = response.data
      
      if (data.success) {
        setResult(data.conversion)
        onConvert?.(data.conversion)
      } else {
        console.error(data.error || 'Conversion failed')
      }
    } catch (error) {
      console.error('Error converting currency')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const swapCurrencies = () => {
    setFromCurrency(toCurrency)
    setToCurrency(fromCurrency)
  }

  const popularCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR', 'AUD', 'CAD']

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-sikaremit-primary" />
          Currency Converter
        </CardTitle>
        <CardDescription>
          Convert between 135+ currencies with real-time exchange rates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            min="0"
            step="0.01"
            className="text-lg"
          />
        </div>

        {/* From Currency */}
        <div className="space-y-2">
          <Label htmlFor="from-currency">From</Label>
          <Select value={fromCurrency} onValueChange={setFromCurrency}>
            <SelectTrigger id="from-currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                Popular Currencies
              </div>
              {popularCurrencies.map(code => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground border-t mt-2">
                All Currencies
              </div>
              {currencies.map(currency => (
                <SelectItem key={currency.code} value={currency.code}>
                  {currency.code} - {currency.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="icon"
            onClick={swapCurrencies}
            className="rounded-full"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* To Currency */}
        <div className="space-y-2">
          <Label htmlFor="to-currency">To</Label>
          <Select value={toCurrency} onValueChange={setToCurrency}>
            <SelectTrigger id="to-currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                Popular Currencies
              </div>
              {popularCurrencies.map(code => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground border-t mt-2">
                All Currencies
              </div>
              {currencies.map(currency => (
                <SelectItem key={currency.code} value={currency.code}>
                  {currency.code} - {currency.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Result */}
        {result && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between p-4 rounded-lg bg-sikaremit-primary/10">
              <div>
                <div className="text-sm text-muted-foreground">You send</div>
                <div className="text-2xl font-bold">{result.formatted_original}</div>
              </div>
              <ArrowRightLeft className="w-5 h-5 text-muted-foreground" />
              <div className="text-right">
                <div className="text-sm text-muted-foreground">They receive</div>
                <div className="text-2xl font-bold text-sikaremit-primary">
                  {result.formatted_converted}
                </div>
              </div>
            </div>

            {/* Exchange Rate Info */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Exchange Rate</span>
                <span className="font-medium">
                  1 {fromCurrency} = {result.exchange_rate.toFixed(6)} {toCurrency}
                </span>
              </div>
              
              {showFees && result.fee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Conversion Fee</span>
                  <span className="font-medium">{result.fee.toFixed(2)} {toCurrency}</span>
                </div>
              )}
            </div>

            {/* Info Banner */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-xs">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-blue-900 dark:text-blue-100">
                Exchange rates are updated hourly and may vary slightly at the time of transaction.
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="w-5 h-5 animate-spin text-sikaremit-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Converting...</span>
          </div>
        )}

        {/* Convert Button */}
        <Button 
          onClick={convertCurrency} 
          className="w-full"
          disabled={loading || !amount || parseFloat(amount) <= 0}
        >
          {loading ? 'Converting...' : 'Convert Currency'}
        </Button>
      </CardContent>
    </Card>
  )
}
