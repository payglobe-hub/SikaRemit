'use client'

import React, { useState, useEffect } from 'react'
import api from '@/lib/api/axios'
import { ArrowRight, DollarSign, Building2, Smartphone, Wallet, CheckCircle, Loader2, XCircle } from 'lucide-react'
import { TransactionContext } from '@/lib/types/payments'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { COUNTRY_CURRENCY_MAP, getCurrencyForCountry } from '@/lib/utils/currency-mapping'
import { convertFromGHS, formatCurrency } from '@/lib/services/exchange-rate'
import { getProviderImage } from '@/lib/utils/provider-images'
import { lookupSikaRemitUser } from '@/lib/api/payments'

interface UnifiedTransferFormProps {
  transferMode: 'domestic' | 'international'
  onSubmit: (transactionContext: TransactionContext) => void
  onCancel: () => void
}

export function UnifiedTransferForm({ transferMode, onSubmit, onCancel }: UnifiedTransferFormProps) {
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('GHS') // Default for domestic
  const [description, setDescription] = useState('')
  const [recipientType, setRecipientType] = useState<'bank' | 'mobile' | 'sikaremit'>('bank')
  
  // SikaRemit wallet transfer state
  const [sikaremitIdentifier, setSikaremitIdentifier] = useState('')
  const [sikaremitLookupResult, setSikaremitLookupResult] = useState<{
    found: boolean
    name?: string
    message?: string
  } | null>(null)
  const [isLookingUp, setIsLookingUp] = useState(false)

  // Recipient details
  const [recipientName, setRecipientName] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientAccountNumber, setRecipientAccountNumber] = useState('')
  const [recipientBankName, setRecipientBankName] = useState('')
  const [recipientBankBranch, setRecipientBankBranch] = useState('')
  const [mobileProvider, setMobileProvider] = useState('')

  // International transfer fields
  const [recipientCountry, setRecipientCountry] = useState('')
  const [recipientCurrency, setRecipientCurrency] = useState('') // Auto-set based on country
  const [conversionResult, setConversionResult] = useState<any>(null) // Conversion preview
  const [deliveryMethod, setDeliveryMethod] = useState('')
  const [deliveryPhone, setDeliveryPhone] = useState('')
  const [deliveryAccountNumber, setDeliveryAccountNumber] = useState('')
  const [deliveryBankName, setDeliveryBankName] = useState('')
  const [deliveryBankBranch, setDeliveryBankBranch] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryCity, setDeliveryCity] = useState('')
  const [deliveryPostalCode, setDeliveryPostalCode] = useState('')
  const [deliveryWalletId, setDeliveryWalletId] = useState('')
  const [currencies, setCurrencies] = useState<{code: string, name: string, symbol: string, flag_emoji?: string}[]>([])
  const [countries, setCountries] = useState<{code: string, name: string, flag_emoji?: string, currency_code?: string}[]>([])

  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const response = await api.get('/api/v1/payments/currencies/')
        const data = response.data
        const currencyList = Array.isArray(data) ? data : (data.results || [])
        setCurrencies(currencyList.filter((c: any) => c.is_active))
      } catch (error) {
        
      }
    }
    
    const fetchCountries = async () => {
      try {
        const response = await api.get('/api/v1/payments/countries/')
        const data = response.data
        const countryList = Array.isArray(data) ? data : (data.results || [])
        setCountries(countryList.filter((c: any) => c.is_active))
      } catch (error) {
        
      }
    }
    
    fetchCurrencies()
    fetchCountries()
  }, [])

  // SikaRemit user lookup with debounce
  useEffect(() => {
    if (recipientType !== 'sikaremit' || !sikaremitIdentifier || sikaremitIdentifier.length < 5) {
      setSikaremitLookupResult(null)
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsLookingUp(true)
      try {
        const result = await lookupSikaRemitUser(sikaremitIdentifier)
        if (result.success && result.data) {
          setSikaremitLookupResult({
            found: result.data.found,
            name: result.data.recipient?.name,
            message: result.data.message
          })
          if (result.data.found && result.data.recipient) {
            setRecipientName(result.data.recipient.name)
          }
        }
      } catch (error) {
        setSikaremitLookupResult({ found: false, message: 'Failed to look up user' })
      } finally {
        setIsLookingUp(false)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [sikaremitIdentifier, recipientType])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const transactionContext: TransactionContext = {
      type: transferMode === 'domestic' ? 'transfer_domestic' : 'transfer_international',
      amount: parseFloat(amount),
      currency,
      description,
      recipient: transferMode === 'domestic' ? {
        type: recipientType,
        name: recipientName,
        ...(recipientType === 'sikaremit' ? {
          sikaremit_identifier: sikaremitIdentifier,
        } : recipientType === 'mobile' ? {
          phone: recipientPhone,
          mobileProvider,
        } : {
          accountNumber: recipientAccountNumber,
          bankBranch: recipientBankBranch,
        })
      } : {
        type: 'international',
        name: recipientName,
        email: recipientEmail || undefined,
        phone: recipientPhone,
        country: recipientCountry,
        delivery_method: deliveryMethod,
        ...(deliveryMethod === 'mobile_money' && {
          delivery_phone: deliveryPhone,
          delivery_mobile_provider: mobileProvider,
        }),
        ...(deliveryMethod === 'bank' && {
          delivery_account_number: deliveryAccountNumber,
          delivery_bank_name: deliveryBankName,
          delivery_bank_branch: deliveryBankBranch || undefined,
        }),
        ...(deliveryMethod === 'cash_pickup' && {
          delivery_address: deliveryAddress,
          delivery_city: deliveryCity,
          delivery_postal_code: deliveryPostalCode || undefined,
        }),
        ...(deliveryMethod === 'sikaremit_wallet' && {
          delivery_sikaremit_identifier: deliveryWalletId,
        }),
      }
    }

    onSubmit(transactionContext)
  }

  const handleCountryChange = async (countryCode: string) => {
    setRecipientCountry(countryCode)

    if (countryCode) {
      // Auto-set recipient currency based on country
      const autoCurrency = getCurrencyForCountry(countryCode)
      setRecipientCurrency(autoCurrency)

      // Trigger conversion if amount is entered
      if (amount && parseFloat(amount) > 0) {
        await performConversion(parseFloat(amount), autoCurrency)
      }
    } else {
      setRecipientCurrency('')
      setConversionResult(null)
    }
  }

  const handleAmountChange = async (value: string) => {
    setAmount(value)

    const numAmount = parseFloat(value)
    if (numAmount > 0 && recipientCountry && recipientCurrency) {
      await performConversion(numAmount, recipientCurrency)
    } else {
      setConversionResult(null)
    }
  }

  const performConversion = async (amount: number, toCurrency: string) => {
    try {
      // Use the exchange rate service for consistent conversion
      const result = await convertFromGHS(amount, toCurrency)
      setConversionResult({
        convertedAmount: result.convertedAmount,
        rate: result.rate,
        fromCurrency: result.fromCurrency,
        toCurrency: result.toCurrency
      })
    } catch (error) {
      
      setConversionResult(null)
    }
  }

  // Form validation logic
  const isFormValid = (() => {
    // Basic required fields
    if (!amount || parseFloat(amount) <= 0) return false
    if (!description.trim()) return false

    if (transferMode === 'domestic') {
      // Domestic transfer validation
      if (recipientType === 'sikaremit') {
        // SikaRemit wallet transfer - need valid lookup result
        if (!sikaremitIdentifier || !sikaremitLookupResult?.found) return false
      } else {
        if (!recipientName.trim()) return false
        if (recipientType === 'mobile' && !recipientPhone) return false
        if (recipientType === 'bank' && (!recipientAccountNumber || !recipientBankBranch)) return false
      }
    } else {
      // International transfer validation
      if (!recipientName.trim()) return false
      if (!recipientCountry) return false
      if (!recipientEmail && !recipientPhone) return false
      if (!deliveryMethod) return false

      // Delivery method specific validation
      if (deliveryMethod === 'sikaremit_wallet' && !deliveryWalletId) return false
      if (deliveryMethod === 'mobile_money' && !deliveryPhone) return false
      if (deliveryMethod === 'bank' && (!deliveryAccountNumber || !deliveryBankName)) return false
    }

    return true
  })()

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          {transferMode === 'domestic' ? 'Domestic Transfer' : 'International Transfer'}
        </CardTitle>
        <CardDescription>
          Send money {transferMode === 'domestic' ? 'within your country' : 'abroad'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount {transferMode === 'domestic' ? '(GH₵)' : ''}</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              required
            />
          </div>

          {/* Conversion Preview - only for international transfers */}
          {transferMode === 'international' && conversionResult && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm font-medium text-blue-800 mb-2">Currency Conversion Preview</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">You send:</span>
                  <span className="font-medium">{formatCurrency(conversionResult.amount, 'GHS')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Recipient receives:</span>
                  <span className="font-medium text-green-600">{formatCurrency(conversionResult.convertedAmount, recipientCurrency)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 border-t pt-1 mt-2">
                  <span>Exchange rate:</span>
                  <span>1 GHS = {conversionResult.rate.toFixed(4)} {recipientCurrency}</span>
                </div>
              </div>
            </div>
          )}

          {/* Currency - only for international transfers */}
          {transferMode === 'international' && (
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.length > 0 ? currencies.map((curr) => (
                    <SelectItem key={curr.code} value={curr.code} textValue={`${curr.code} - ${curr.name}`}>
                      {curr.flag_emoji} {curr.code} - {curr.name}
                    </SelectItem>
                  )) : (
                    <SelectItem value="loading" disabled>Loading currencies...</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Recipient Details */}
          {transferMode === 'domestic' ? (
            <>
              {/* Recipient Type */}
              <div className="space-y-2">
                <Label>Recipient Type</Label>
                <Select value={recipientType} onValueChange={(value: 'bank' | 'mobile' | 'sikaremit') => setRecipientType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipient type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sikaremit">
                      <div className="flex items-center">
                        <Wallet className="w-4 h-4 mr-2 text-primary" />
                        SikaRemit Account
                      </div>
                    </SelectItem>
                    <SelectItem value="bank">
                      <div className="flex items-center">
                        <Building2 className="w-4 h-4 mr-2 text-blue-600" />
                        Bank Account
                      </div>
                    </SelectItem>
                    <SelectItem value="mobile">
                      <div className="flex items-center">
                        <Smartphone className="w-4 h-4 mr-2 text-green-600" />
                        Mobile Money
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Recipient Details */}
              <div className="space-y-4">
                {recipientType === 'sikaremit' ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="sikaremitIdentifier">Phone Number or Email</Label>
                      <div className="relative">
                        <Input
                          id="sikaremitIdentifier"
                          placeholder="Enter phone number or email"
                          value={sikaremitIdentifier}
                          onChange={(e) => setSikaremitIdentifier(e.target.value)}
                          required
                        />
                        {isLookingUp && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Lookup Result */}
                    {sikaremitLookupResult && (
                      <div className={`p-3 rounded-lg flex items-center gap-3 ${
                        sikaremitLookupResult.found 
                          ? 'bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800' 
                          : 'bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800'
                      }`}>
                        {sikaremitLookupResult.found ? (
                          <>
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <div>
                              <p className="font-medium text-green-800 dark:text-green-200">
                                {sikaremitLookupResult.name}
                              </p>
                              <p className="text-sm text-green-600 dark:text-green-400">
                                SikaRemit user found - Instant transfer
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-5 h-5 text-red-600" />
                            <div>
                              <p className="font-medium text-red-800 dark:text-red-200">
                                User not found
                              </p>
                              <p className="text-sm text-red-600 dark:text-red-400">
                                {sikaremitLookupResult.message || 'No SikaRemit account with this phone/email'}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {sikaremitLookupResult?.found && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          <strong>Benefits:</strong> Zero fees • Instant transfer • No external processing
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="recipientName">Recipient Name</Label>
                      <Input
                        id="recipientName"
                        placeholder="Full name"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}

                {recipientType === 'bank' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <Input
                        id="accountNumber"
                        placeholder="Account number"
                        value={recipientAccountNumber}
                        onChange={(e) => setRecipientAccountNumber(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bankBranch">Bank Branch</Label>
                      <Input
                        id="bankBranch"
                        placeholder="Branch name"
                        value={recipientBankBranch}
                        onChange={(e) => setRecipientBankBranch(e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}

                {recipientType === 'mobile' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="Phone number"
                          value={recipientPhone}
                          onChange={(e) => setRecipientPhone(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="provider">Mobile Provider</Label>
                        <Select value={mobileProvider} onValueChange={setMobileProvider}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                      <SelectContent>
                        {[
                          { value: 'MTN', label: 'MTN Mobile Money' },
                          { value: 'Telecel', label: 'Telecel Cash' },
                          { value: 'AirtelTigo', label: 'AirtelTigo Money' },
                          { value: 'G-Money', label: 'G-Money' }
                        ].map((provider) => {
                          const image = getProviderImage(provider.value)
                          return (
                            <SelectItem key={provider.value} value={provider.value}>
                              <div className="flex items-center">
                                {image && <img src={image} className="w-6 h-6 mr-2 rounded" />}
                                {provider.label}
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              {/* International Recipient Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="recipientName">Recipient Name</Label>
                    <Input
                      id="recipientName"
                      placeholder="Full name"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recipientCountry">Recipient Country</Label>
                    <Select value={recipientCountry} onValueChange={handleCountryChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.length > 0 ? countries.map((country) => (
                          <SelectItem key={country.code} value={country.code} textValue={country.name}>
                            {country.flag_emoji} {country.name}
                          </SelectItem>
                        )) : (
                          <SelectItem value="loading" disabled>Loading countries...</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="recipientEmail">Email (Optional)</Label>
                    <Input
                      id="recipientEmail"
                      type="email"
                      placeholder="recipient@example.com"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recipientPhone">Phone Number</Label>
                    <Input
                      id="recipientPhone"
                      type="tel"
                      placeholder="Phone number"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Delivery Method</Label>
                  <Select value={deliveryMethod} onValueChange={setDeliveryMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select delivery method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sikaremit_wallet">
                        <div className="flex items-center">
                          <Wallet className="w-4 h-4 mr-2 text-primary" />
                          SikaRemit Account
                        </div>
                      </SelectItem>
                      <SelectItem value="mobile_money">
                        <div className="flex items-center">
                          <Smartphone className="w-4 h-4 mr-2 text-green-600" />
                          Mobile Money
                        </div>
                      </SelectItem>
                      <SelectItem value="bank">
                        <div className="flex items-center">
                          <Building2 className="w-4 h-4 mr-2 text-blue-600" />
                          Bank Account
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Conditional fields based on delivery method */}
                {deliveryMethod === 'sikaremit_wallet' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="deliveryWalletId">Recipient Phone Number or Email</Label>
                      <div className="relative">
                        <Input
                          id="deliveryWalletId"
                          placeholder="Enter recipient's phone or email"
                          value={deliveryWalletId}
                          onChange={(e) => setDeliveryWalletId(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Benefits:</strong> Zero fees • Instant transfer • Recipient receives in their SikaRemit wallet
                      </p>
                    </div>
                  </>
                )}

                {deliveryMethod === 'mobile_money' && (
                  <div className="space-y-2">
                    <Label htmlFor="deliveryPhone">Delivery Phone Number</Label>
                    <Input
                      id="deliveryPhone"
                      type="tel"
                      placeholder="Phone number for delivery"
                      value={deliveryPhone}
                      onChange={(e) => setDeliveryPhone(e.target.value)}
                      required
                    />
                  </div>
                )}

                {deliveryMethod === 'bank' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="deliveryAccountNumber">Account Number</Label>
                        <Input
                          id="deliveryAccountNumber"
                          placeholder="Account number"
                          value={deliveryAccountNumber}
                          onChange={(e) => setDeliveryAccountNumber(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="deliveryBankName">Bank Name</Label>
                        <Input
                          id="deliveryBankName"
                          placeholder="Bank name"
                          value={deliveryBankName}
                          onChange={(e) => setDeliveryBankName(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deliveryBankBranch">Bank Branch (Optional)</Label>
                      <Input
                        id="deliveryBankBranch"
                        placeholder="Branch name"
                        value={deliveryBankBranch}
                        onChange={(e) => setDeliveryBankBranch(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* Reference */}
          <div className="space-y-2">
            <Label htmlFor="description">Enter reference</Label>
            <Textarea
              id="description"
              placeholder="Enter transfer reference"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={!isFormValid} className="flex-1">
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
