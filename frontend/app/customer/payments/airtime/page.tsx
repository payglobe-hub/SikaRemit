'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Smartphone, ArrowLeft } from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'
import { UnifiedCheckout } from '@/components/payments/unified-checkout'
import { TransactionContext } from '@/lib/types/payments'
import { getProviderImage } from '@/lib/utils/provider-images'

// Force dynamic rendering to prevent SSR issues with auth
export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export default function AirtimePage() {
  const router = useRouter()
  const { currency, formatAmount } = useCurrency()
  const getCurrencySymbol = (currencyCode: string) => {
    const symbols: Record<string, string> = {
      'GHS': 'GH₵',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'CAD': 'C$',
      'AUD': 'A$'
    }
    return symbols[currencyCode] || currencyCode
  }
  const currencySymbol = getCurrencySymbol(currency)

  const [phoneNumber, setPhoneNumber] = useState('')
  const [amount, setAmount] = useState('')
  const [network, setNetwork] = useState('')
  const [showCheckout, setShowCheckout] = useState(false)
  const [error, setError] = useState('')

  const numAmount = parseFloat(amount) || 0

  const handleProceedToPayment = () => {
    if (isFormValid()) {
      setShowCheckout(true)
    }
  }

  const handlePaymentSuccess = (result: any) => {
    router.push('/customer/payments/success')
  }

  const isFormValid = () => {
    return phoneNumber && amount && network && numAmount >= 1
  }

  const transactionContext: TransactionContext = {
    type: 'airtime',
    amount: numAmount,
    telecomDetails: {
      provider: network,
      phoneNumber: phoneNumber,
    }
  }

  const networks = [
    { value: 'mtn', label: 'MTN', providerKey: 'MTN' },
    { value: 'airteltigo', label: 'AirtelTigo', providerKey: 'AirtelTigo' },
    { value: 'telecel', label: 'Telecel', providerKey: 'telecel' }
  ]

  const quickAmounts = [5, 10, 20, 50, 100]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/customer/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Buy Airtime</h1>
            <p className="text-muted-foreground">Purchase airtime or data for any network</p>
          </div>
        </div>

        {!showCheckout ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Airtime Purchase
              </CardTitle>
              <CardDescription>
                Enter the recipient's phone number and select the amount
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="network">Network Provider</Label>
                  <Select value={network} onValueChange={setNetwork}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select network" />
                    </SelectTrigger>
                    <SelectContent>
                      {networks.map((net) => {
                        const image = net.providerKey ? getProviderImage(net.providerKey) : null
                        return (
                          <SelectItem key={net.value} value={net.value}>
                            <div className="flex items-center">
                              {image && <img src={image} className="w-6 h-6 mr-2 rounded" />}
                              {net.label}
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter phone number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="amount">Amount ({currencySymbol})</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="1"
                  />
                </div>

                <div>
                  <Label>Quick Select</Label>
                  <div className="grid grid-cols-5 gap-2 mt-2">
                    {quickAmounts.map((amt) => (
                      <Button
                        key={amt}
                        variant="outline"
                        size="sm"
                        onClick={() => setAmount(amt.toString())}
                        className="text-xs"
                      >
                        {formatAmount(amt)}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleProceedToPayment}
                disabled={!isFormValid()}
                className="w-full"
                size="lg"
              >
                Proceed to Payment
              </Button>
            </CardContent>
          </Card>
        ) : (
          <UnifiedCheckout
            transactionContext={transactionContext}
            onSuccess={handlePaymentSuccess}
            onCancel={() => setShowCheckout(false)}
          />
        )}
      </div>
    </div>
  )
}
