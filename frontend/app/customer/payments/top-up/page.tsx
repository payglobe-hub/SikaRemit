'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, DollarSign, Globe } from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'
import { UnifiedCheckout } from '@/components/payments/unified-checkout'
import { TransactionContext } from '@/lib/types/payments'
import { ArrowLeft } from 'lucide-react'

// Force dynamic rendering to prevent SSR issues with auth
export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export default function TopUpAccountPage() {
  const router = useRouter()
  const { currency, setCurrency, formatAmount, formatAmountFromBase, convertAmount } = useCurrency()

  const [amount, setAmount] = useState('')
  const [showCheckout, setShowCheckout] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')
  const [selectedCurrency, setSelectedCurrency] = useState<string>('GHS')

  const numAmount = parseFloat(amount) || 0

  const handleProceedToPayment = () => {
    if (isAmountValid()) {
      setShowCheckout(true)
    }
  }

  const handlePaymentSuccess = (result: any) => {
    setIsSuccess(true)
    setTimeout(() => {
      router.push('/customer/payments/success')
    }, 2000)
  }

  const isAmountValid = () => {
    if (!amount || numAmount < 10) return false
    return numAmount <= 50000
  }

  const transactionContext: TransactionContext = {
    type: 'account_topup',
    amount: numAmount,
    currency: selectedCurrency,
    description: `Account balance top-up of ${formatAmount(numAmount)}`
  }

  if (showCheckout) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setShowCheckout(false)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Complete Top-up</h1>
              <p className="text-muted-foreground">Review and complete your account top-up</p>
            </div>
          </div>

          <UnifiedCheckout
            transactionContext={transactionContext}
            onSuccess={handlePaymentSuccess}
            onCancel={() => setShowCheckout(false)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Top Up Account Balance</h1>
            <p className="text-muted-foreground">Add funds to your sikaremit account for instant access to all payment features</p>
          </div>
        </div>

        {isSuccess && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <div className="font-medium">Top-up Successful!</div>
              <div className="text-sm mt-1">
                Amount Added: {formatAmount(numAmount)} | New Balance: Available in your account
              </div>
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="max-w-xl">
          {/* Top-up Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Add Funds
              </CardTitle>
              <CardDescription>
                Enter the amount you want to add to your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Amount Input */}
              <div className="space-y-4">
                <Label htmlFor="amount">Top-up Amount (GH₵)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="10"
                  max="50000"
                  step="0.01"
                />
              </div>

              {isAmountValid() && (
                <div className="space-y-4">
                  <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4">
                    <h3 className="font-medium mb-2">Ready to Top Up</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Amount: {formatAmount(numAmount)}. Click below to proceed to payment.
                    </p>
                    <Button
                      onClick={handleProceedToPayment}
                      className="w-full"
                      size="lg"
                    >
                      Proceed to Payment
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
