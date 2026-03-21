export interface Merchant {
  id: string
  name: string
  email: string
  business_name?: string
  status: 'active' | 'inactive' | 'suspended'
  created_at: string
  balance?: number
  available_balance?: number
  pending_balance?: number
  currency?: string
  verificationStatus?: string
  totalRevenue?: number
  default_payout_method?: {
    id: string
    type: 'bank' | 'mobile_money'
    verified: boolean
  }
}

export interface MerchantPaymentLimits {
  daily_limit: number
  monthly_limit: number
  per_transaction_limit: number
  daily_used: number
  monthly_used: number
  currency: string
  allowedMethods?: string[]
}

export interface SubscriptionUpgradeRequest {
  plan_id: string
  payment_method_id: string
}

export interface SubscriptionUpgradeResponse {
  success: boolean
  subscription_id: string
  message: string
}

export interface RemittancePaymentRequest {
  recipient: string
  amount: number
  currency: string
  payment_method_id: string
  purpose?: string
}

export interface BillPaymentRequest {
  bill_id: string
  payment_method_id: string
  amount?: number
}

export interface PaymentResponse {
  success: boolean
  transaction_id: string
  amount: number
  currency: string
  status: string
  message: string
}

export interface PaymentContext {
  merchant_id?: string
  merchantId?: string
  customer_id?: string
  session_id?: string
  businessName?: string
  defaultPayoutMethod?: string
  metadata?: Record<string, any>
}
