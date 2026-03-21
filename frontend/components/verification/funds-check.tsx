'use client'

import { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2, Loader2, Wallet } from 'lucide-react'
import { verifyFunds, type FundsVerificationResult } from '@/lib/api/verification'
import { useCurrency } from '@/hooks/useCurrency'

interface FundsCheckProps {
  amount: number
  currency?: string
  onVerificationComplete?: (result: FundsVerificationResult) => void
  autoCheck?: boolean
}

export function FundsCheck({ amount, currency = 'USD', onVerificationComplete, autoCheck = true }: FundsCheckProps) {
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<FundsVerificationResult | null>(null)
  const [error, setError] = useState('')
  const { formatAmount } = useCurrency()

  useEffect(() => {
    if (autoCheck && amount > 0) {
      checkFunds()
    }
  }, [amount, currency, autoCheck])

  const checkFunds = async () => {
    setChecking(true)
    setError('')

    try {
      const verificationResult = await verifyFunds(amount, currency)
      setResult(verificationResult)
      onVerificationComplete?.(verificationResult)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to verify funds')
      setResult(null)
    } finally {
      setChecking(false)
    }
  }

  if (checking) {
    return (
      <Alert>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertDescription>Verifying available funds...</AlertDescription>
      </Alert>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!result) {
    return null
  }

  if (result.sufficient_funds) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-700 dark:text-green-300">
          <div className="flex items-center justify-between">
            <span>Sufficient funds available</span>
            <span className="font-semibold">
              Balance: {formatAmount(result.available_balance)}
            </span>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-1">
          <p className="font-semibold">Insufficient funds</p>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span>Available:</span>
              <span>{formatAmount(result.available_balance)}</span>
            </div>
            <div className="flex justify-between">
              <span>Required:</span>
              <span>{formatAmount(result.required_amount)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Shortfall:</span>
              <span className="text-red-600">{formatAmount(result.shortfall || 0)}</span>
            </div>
          </div>
          <p className="text-sm mt-2">Please add funds to your account before proceeding.</p>
        </div>
      </AlertDescription>
    </Alert>
  )
}
