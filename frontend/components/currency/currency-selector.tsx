'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useCurrency } from '@/hooks/useCurrency'
import { getCurrencies, updateCurrencyPreferences, getCurrencyPreferences } from '@/lib/api/currency'
import { Globe, Settings, DollarSign } from 'lucide-react'

interface Currency {
  code: string
  name: string
  symbol: string
  flag_emoji: string
  is_active: boolean
  is_base_currency: boolean
  fee_percentage: number
  created_at: string
  updated_at: string
}

interface CurrencySelectorProps {
  onCurrencyChange?: (currency: Currency) => void
  showPreferences?: boolean
  compact?: boolean
}

// Fallback currencies if API fails
const FALLBACK_CURRENCIES: Currency[] = [
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵', flag_emoji: '🇬🇭', is_active: true, is_base_currency: true, fee_percentage: 0, created_at: '', updated_at: '' },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag_emoji: '🇺🇸', is_active: true, is_base_currency: false, fee_percentage: 0, created_at: '', updated_at: '' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag_emoji: '🇪🇺', is_active: true, is_base_currency: false, fee_percentage: 0, created_at: '', updated_at: '' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag_emoji: '🇬🇧', is_active: true, is_base_currency: false, fee_percentage: 0, created_at: '', updated_at: '' }
]

export function CurrencySelector({ onCurrencyChange, showPreferences = true, compact = false }: CurrencySelectorProps) {
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [selectedCurrency, setSelectedCurrency] = useState<string>('')
  const [preferences, setPreferences] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { setCurrency } = useCurrency()
  const [isLoading, setIsLoading] = useState(true)

  // Use only currencies from API - fallback to static if API fails
  const allCurrencies = currencies.length > 0 ? currencies.map(c => ({
    ...c,
    fee_percentage: 0,
    created_at: c.created_at || new Date().toISOString(),
    updated_at: c.updated_at || new Date().toISOString(),
  })) : FALLBACK_CURRENCIES.map(c => ({
    ...c,
    fee_percentage: 0,
    created_at: c.created_at || new Date().toISOString(),
    updated_at: c.updated_at || new Date().toISOString(),
  }))

  useEffect(() => {
    loadCurrencies()
    if (showPreferences) {
      loadPreferences()
    }
  }, [showPreferences])

  const loadCurrencies = async () => {
    setIsLoading(true)
    // Use fallback currencies directly since API is not implemented
    setCurrencies([])
    setIsLoading(false)
    /*
    try {
      const response = await getCurrencies()
      setCurrencies(response || [])
    } catch (error) {
      
      toast({
        title: 'Warning',
        description: 'Failed to load currencies. Please refresh the page.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
    */
  }

  const loadPreferences = async () => {
    try {
      const response = await getCurrencyPreferences()
      if (response?.data) {
        setPreferences(response.data)
        const currencyCode = response.data.display_currency.code
        setSelectedCurrency(currencyCode)
        setCurrency(currencyCode) // Set global currency from preferences
        
        // Call onCurrencyChange with the initial currency if callback exists
        if (onCurrencyChange) {
          const currency = { code: currencyCode } as Currency
          onCurrencyChange(currency)
        }
      }
    } catch (error) {
      
    }
  }

  const handleCurrencyChange = (currencyCode: string) => {
    setSelectedCurrency(currencyCode)
    setCurrency(currencyCode) // Update global currency
    const currency = allCurrencies.find(c => c.code === currencyCode)
    if (currency && onCurrencyChange) {
      onCurrencyChange(currency)
    } else if (onCurrencyChange) {
      // If currencies haven't loaded yet, create a basic currency object
      onCurrencyChange({ code: currencyCode } as Currency)
    }
  }

  const handlePreferenceUpdate = async (field: string, value: any) => {
    if (!preferences) return

    try {
      setLoading(true)
      const updatedPreferences = { ...preferences, [field]: value }
      await updateCurrencyPreferences(updatedPreferences)
      setPreferences(updatedPreferences)

      toast({
        title: 'Preferences Updated',
        description: 'Your currency preferences have been saved.',
      })
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update currency preferences.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (compact) {
    return (
      <Select value={selectedCurrency} onValueChange={handleCurrencyChange} disabled={isLoading}>
        <SelectTrigger className="w-36 transition-all duration-300 hover:border-primary focus:ring-2 focus:ring-primary/30 hover:shadow-lg rounded-lg bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-2">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary animate-pulse" />
            <SelectValue placeholder={isLoading ? "Loading..." : "Currency"} />
          </div>
        </SelectTrigger>
        <SelectContent className="z-[10000] max-h-60 overflow-y-auto p-2 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 shadow-2xl ring-2 ring-black/10 !bg-white dark:!bg-gray-900">
          {allCurrencies.length > 0 ? allCurrencies.map((currency) => (
            <SelectItem key={currency.code} value={currency.code} textValue={`${currency.code} ${currency.name}`} className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-200 rounded-md px-3 py-2 text-sm font-medium">
              <div className="flex items-center gap-2">
                <span>{currency.flag_emoji}</span>
                <span>{currency.code}</span>
              </div>
            </SelectItem>
          )) : (
            <SelectItem value="loading" disabled>Loading currencies...</SelectItem>
          )}
        </SelectContent>
      </Select>
    )
  }

  return (
    <div className="space-y-4">
      {/* Currency Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Currency Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="currency-select">Display Currency</Label>
              <Select value={selectedCurrency} onValueChange={handleCurrencyChange} disabled={isLoading}>
                <SelectTrigger id="currency-select">
                  <SelectValue placeholder={isLoading ? "Loading currencies..." : "Select currency"} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 shadow-2xl ring-2 ring-black/10 !bg-white dark:!bg-gray-900">
                  {allCurrencies.length > 0 ? allCurrencies.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code} textValue={`${currency.code} ${currency.name}`}>
                      <div className="flex items-center gap-2">
                        <span>{currency.flag_emoji}</span>
                        <span>{currency.name} ({currency.code})</span>
                        {currency.is_base_currency && (
                          <Badge variant="secondary" className="text-xs">Base</Badge>
                        )}
                      </div>
                    </SelectItem>
                  )) : (
                    <SelectItem value="loading" disabled>Loading currencies...</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedCurrency && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Selected Currency:</span>
                  <span className="font-semibold">{selectedCurrency}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      {showPreferences && preferences && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Display Preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <Label>Show Symbol</Label>
                  <Select
                    value={preferences.show_symbol ? 'true' : 'false'}
                    onValueChange={(value) => handlePreferenceUpdate('show_symbol', value === 'true')}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 shadow-2xl ring-2 ring-black/10 !bg-white dark:!bg-gray-900">
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Show Code</Label>
                  <Select
                    value={preferences.show_code ? 'true' : 'false'}
                    onValueChange={(value) => handlePreferenceUpdate('show_code', value === 'true')}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 shadow-2xl ring-2 ring-black/10 !bg-white dark:!bg-gray-900">
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>Decimal Places</Label>
                  <Select
                    value={preferences.decimal_places?.toString()}
                    onValueChange={(value) => handlePreferenceUpdate('decimal_places', parseInt(value))}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 shadow-2xl ring-2 ring-black/10 !bg-white dark:!bg-gray-900">
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Auto Update Rates</Label>
                  <Select
                    value={preferences.auto_update_rates ? 'true' : 'false'}
                    onValueChange={(value) => handlePreferenceUpdate('auto_update_rates', value === 'true')}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 shadow-2xl ring-2 ring-black/10 !bg-white dark:!bg-gray-900">
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Currencies List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Available Currencies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {allCurrencies.map((currency) => (
              <div
                key={currency.code}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedCurrency === currency.code
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleCurrencyChange(currency.code)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{currency.flag_emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {currency.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {currency.code}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
