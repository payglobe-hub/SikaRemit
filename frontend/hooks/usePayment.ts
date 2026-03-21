import { useState } from 'react'
import { 
  upgradeSubscription,
  sendRemittance,
  payBill
} from '@/lib/api/payments'
import {
  SubscriptionUpgradeRequest,
  SubscriptionUpgradeResponse,
  RemittancePaymentRequest,
  BillPaymentRequest,
  PaymentResponse,
  PaymentContext,
  MerchantPaymentLimits
} from '@/lib/types/merchant'
import { formatCurrency } from '@/lib/utils/currency'

type PaymentError = {
  message: string
  code?: string
  merchantId?: string
}

type PaymentMethod = {
  id: string
  type: 'card' | 'bank_transfer' | 'mobile_money'
  currency: string
}

type ValidatedMerchantContext = {
  merchantId: string
  defaultPayoutMethod?: string
  businessName: string
  allowedPaymentMethods: PaymentMethod[]
}

export function usePayment(merchantContext: PaymentContext, limits?: MerchantPaymentLimits) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<PaymentError | null>(null)
  const [result, setResult] = useState<PaymentResponse | SubscriptionUpgradeResponse | null>(null)

  const validateMerchantContext = (context: PaymentContext): ValidatedMerchantContext => {
    const merchantId = context?.merchantId || ''
    const businessName = context?.businessName || ''
    
    return {
      merchantId,
      defaultPayoutMethod: context.defaultPayoutMethod || '',
      businessName,
      allowedPaymentMethods: limits?.allowedMethods?.map(method => ({
        id: method,
        type: method.startsWith('card_') ? 'card' : 
              method.startsWith('bank_') ? 'bank_transfer' : 'mobile_money',
        currency: limits?.currency || 'USD'
      })) || []
    }
  }

  const validatePayment = (amount: number, methodId: string, context: ValidatedMerchantContext) => {
    if (amount <= 0) {
      throw new Error('Amount must be positive')
    }
    
    if (limits) {
      if (amount > limits.per_transaction_limit) {
        throw new Error(`Amount exceeds maximum limit of ${limits.per_transaction_limit} ${limits.currency}`)
      }
      
      const methodValid = context.allowedPaymentMethods.some(m => m.id === methodId)
      if (!methodValid) {
        throw new Error(`Payment method ${methodId} not allowed for this merchant`)
      }
    }
  }

  const handlePayment = async (
    type: 'subscription' | 'remittance' | 'bill',
    data: {
      [key: string]: any
      amount?: number
      paymentMethodId: string
    }
  ) => {
    setLoading(true)
    setError(null)
    
    try {
      const validatedContext = validateMerchantContext(merchantContext)
      
      if (type !== 'subscription' && data.amount) {
        validatePayment(data.amount, data.paymentMethodId, validatedContext)
      }
      
      let response: PaymentResponse | SubscriptionUpgradeResponse
      
      switch (type) {
        case 'subscription':
          if (!data.planId) throw new Error('planId is required for subscriptions')
          response = await upgradeSubscription(data.planId, data.paymentMethodId)
          break
        case 'remittance':
          if (!data.recipientName || !data.recipientPhone || !data.recipientCountry || !data.amount) {
            throw new Error('Missing required remittance fields')
          }
          response = await sendRemittance({
            recipient: data.recipientPhone || data.recipientName,
            recipient_name: data.recipientName,
            recipient_country: data.recipientCountry,
            amount: data.amount,
            currency: data.currency,
            payment_method_id: data.paymentMethodId,
            purpose: data.reference
          })
          break
        case 'bill':
          if (!data.billReference || !data.amount) {
            throw new Error('Missing required bill payment fields')
          }
          response = await payBill(data.billReference, data.paymentMethodId)
          break
        default:
          throw new Error('Invalid payment type')
      }
      
      setResult(response)
      return response
    } catch (err) {
      const error = {
        message: err instanceof Error ? err.message : 'Payment failed',
        code: (err as any)?.code,
        merchantId: merchantContext?.merchantId
      }
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  return { 
    handlePayment, 
    loading, 
    error, 
    result,
    setError
  }
}
