export type ExternalPaymentMethodType = 'card' | 'bank' | 'mtn_momo' | 'telecel' | 'airtel_tigo' | 'g_money' | 'qr'
export type PaymentMethodType = ExternalPaymentMethodType | 'sikaremit_balance'

export interface CreatePaymentMethod {
  method_type: ExternalPaymentMethodType
  details: any
  is_default?: boolean
  provider?: string
}

export function getPaymentMethodDisplay(method: any): string {
  if (method.method_type === 'card' || method.type === 'card') {
    return `Card ending in ${method.last4 || method.details?.last4}`
  }
  if (method.method_type === 'mtn_momo' || method.method_type === 'telecel' || method.method_type === 'airtel_tigo' || method.method_type === 'g_money') {
    const providerNames: { [key: string]: string } = {
      'mtn_momo': 'MTN Momo',
      'telecel': 'Telecel',
      'airtel_tigo': 'AirtelTigo',
      'g_money': 'G-Money'
    }
    const provider = providerNames[method.method_type] || method.details?.provider || method.provider
    const phone = method.phone || method.details?.phone_number
    return `Mobile Money - ${provider}${phone ? ` ${phone}` : ''}`
  }
  if (method.method_type === 'bank' || method.type === 'bank') {
    const details = method.details || method
    const bankName = details.bank_name
    const bankBranch = details.bank_branch
    const accountNumber = details.account_number
    const accountName = details.account_name
    
    if (bankName && accountNumber) {
      return `${bankName}${bankBranch ? ` (${bankBranch})` : ''} - ${accountName || ''} ${accountNumber}`.trim()
    }
    return `Bank Account - ${accountNumber || method.account_number}`
  }
  if (method.method_type === 'sikaremit_balance') {
    return 'SikaRemit Balance'
  }
  return method.method_type || method.type || 'Unknown'
}

export interface PaymentMethod {
  id: string
  type: string
  method_type: PaymentMethodType
  last4?: string
  phone?: string
  provider?: string
  account_number?: string
  is_default: boolean
  details?: {
    verified?: boolean
    [key: string]: any
  }
  created_at?: string
}

export type TransactionType =
  | 'transfer_domestic'
  | 'transfer_international'
  | 'transfer_outbound'
  | 'transfer_global'
  | 'bill_payment'
  | 'airtime'
  | 'data'
  | 'merchant_checkout'
  | 'p2p_send'
  | 'account_topup'
  | 'transfer_to_bank'
  | 'qr_payment'

export interface TransactionContext {
  type: TransactionType
  amount: number
  currency?: string
  description?: string
  // Transfer specific
  recipient?: {
    type: 'sikaremit' | 'bank' | 'mobile' | 'international'
    email?: string
    phone?: string
    name?: string
    accountNumber?: string
    bankName?: string
    bankBranch?: string
    mobileProvider?: string
    country?: string
    // SikaRemit wallet transfer
    sikaremit_identifier?: string
    // Delivery method for international remittances (inbound)
    deliveryMethod?: 'mtn_momo' | 'telecel' | 'airtel_tigo' | 'g_money' | 'bank'
    deliveryPhone?: string
    deliveryAccountNumber?: string
    deliveryBankName?: string
    deliveryBankBranch?: string
    deliveryMobileProvider?: string
    // Delivery method for outbound international remittances
    delivery_method?: string
    delivery_phone?: string
    delivery_account_number?: string
    delivery_bank_name?: string
    delivery_bank_branch?: string
    delivery_routing_number?: string
    delivery_swift_code?: string
    delivery_mobile_provider?: string
    delivery_address?: string
    delivery_city?: string
    delivery_postal_code?: string
    delivery_wallet_id?: string
    // SikaRemit wallet delivery for international
    delivery_sikaremit_identifier?: string
  }
  sender?: {
    name?: string
    email?: string
    phone?: string
    address?: string
    country?: string
  }
  // Bill payment specific
  billDetails?: {
    billType: string
    billerName: string
    billReference: string
  }
  // Airtime/Data specific
  telecomDetails?: {
    provider: string
    phoneNumber: string
    planId?: string
    dataAmount?: number
  }
  // QR Payment specific
  qrDetails?: any
  // Merchant checkout specific
  merchantDetails?: {
    merchantId: string
  }
}
