'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Globe, DollarSign } from 'lucide-react'

const countries = [
  { code: 'US', name: 'United States', currency: 'USD', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', flag: '🇬🇧' },
  { code: 'EU', name: 'European Union', currency: 'EUR', flag: '🇪🇺' },
  { code: 'CA', name: 'Canada', currency: 'CAD', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', currency: 'AUD', flag: '🇦🇺' },
  { code: 'JP', name: 'Japan', currency: 'JPY', flag: '🇯🇵' },
  { code: 'CN', name: 'China', currency: 'CNY', flag: '🇨🇳' },
  { code: 'IN', name: 'India', currency: 'INR', flag: '🇮🇳' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', flag: '🇳🇬' },
  { code: 'KE', name: 'Kenya', currency: 'KES', flag: '🇰🇪' },
  { code: 'GH', name: 'Ghana', currency: 'GHS', flag: '🇬🇭' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', flag: '🇿🇦' }
]

const currencies = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' }
]

interface CountryCurrencySelectorProps {
  selectedCountry: string
  onCountryChange: (value: string) => void
  sourceCurrency: string
  onSourceCurrencyChange: (value: string) => void
  recipientCurrency: string
  onRecipientCurrencyChange: (value: string) => void
}

export function CountryCurrencySelector({
  selectedCountry,
  onCountryChange,
  sourceCurrency,
  onSourceCurrencyChange,
  recipientCurrency,
  onRecipientCurrencyChange
}: CountryCurrencySelectorProps) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div>
          <Label htmlFor="country">Recipient Country</Label>
          <Select value={selectedCountry} onValueChange={onCountryChange}>
            <SelectTrigger id="country">
              <Globe className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  <div className="flex items-center gap-2">
                    <span>{country.flag}</span>
                    <span>{country.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="sourceCurrency">You Send</Label>
            <Select value={sourceCurrency} onValueChange={onSourceCurrencyChange}>
              <SelectTrigger id="sourceCurrency">
                <DollarSign className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="recipientCurrency">They Receive</Label>
            <Select value={recipientCurrency} onValueChange={onRecipientCurrencyChange}>
              <SelectTrigger id="recipientCurrency">
                <DollarSign className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export { countries, currencies }
