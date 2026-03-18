import api from './axios'
import { getCardType } from '@/lib/utils/payment-methods'
import { PaymentMethod } from '@/lib/types/payments'

export { getCardType }
export type { PaymentMethod }

export interface CheckoutData {
  merchant_id: string
  amount: number
  currency: string
  paymentMethodId: string
  description?: string
}

export interface Transaction {
  id: string
  amount: number
  currency: string
  status: string
  description?: string
  type?: string
  billDetails?: {
    billType: string
    billerName: string
    billReference: string
  }
  created_at: string
  updated_at: string
  completed_at?: string
}

export interface DataPlan {
  id: string
  name: string
  data_amount: string
  validity_period: string
  price: number
  provider: string
  is_active: boolean
}

export async function getDataPlans(): Promise<DataPlan[]> {
  const response = await api.get('/api/v1/payments/data-plans/')
  return response.data.results || response.data
}

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  const response = await api.get('/api/v1/payments/methods/')
  const methods = response.data.results || response.data
  
  // Deduplicate payment methods based on phone number for mobile money
  // and account number for bank accounts
  const deduplicatedMethods = methods.reduce((unique: PaymentMethod[], method: PaymentMethod) => {
    // For mobile money methods, check by phone number
    if (method.method_type === 'mtn_momo' || method.method_type === 'telecel' || method.method_type === 'airtel_tigo') {
      const existingIndex = unique.findIndex(m => 
        m.method_type === method.method_type && 
        m.phone === method.phone
      )
      
      if (existingIndex === -1) {
        unique.push(method)
      } else {
        // Keep the most recent one (higher ID or later created_at)
        const existing = unique[existingIndex]
        if (method.created_at && existing.created_at) {
          if (new Date(method.created_at) > new Date(existing.created_at)) {
            unique[existingIndex] = method
          }
        } else if (parseInt(method.id) > parseInt(existing.id)) {
          unique[existingIndex] = method
        }
      }
    } 
    // For bank accounts, check by account number
    else if (method.method_type === 'bank') {
      const existingIndex = unique.findIndex(m => 
        m.method_type === 'bank' && 
        m.account_number === method.account_number
      )
      
      if (existingIndex === -1) {
        unique.push(method)
      } else {
        // Keep the most recent one
        const existing = unique[existingIndex]
        if (method.created_at && existing.created_at) {
          if (new Date(method.created_at) > new Date(existing.created_at)) {
            unique[existingIndex] = method
          }
        } else if (parseInt(method.id) > parseInt(existing.id)) {
          unique[existingIndex] = method
        }
      }
    }
    // For cards, check by last4
    else if (method.method_type === 'card') {
      const existingIndex = unique.findIndex(m => 
        m.method_type === 'card' && 
        m.last4 === method.last4
      )
      
      if (existingIndex === -1) {
        unique.push(method)
      } else {
        // Keep the most recent one
        const existing = unique[existingIndex]
        if (method.created_at && existing.created_at) {
          if (new Date(method.created_at) > new Date(existing.created_at)) {
            unique[existingIndex] = method
          }
        } else if (parseInt(method.id) > parseInt(existing.id)) {
          unique[existingIndex] = method
        }
      }
    }
    // For other types, just add them
    else {
      unique.push(method)
    }
    
    return unique
  }, [])
  
  return deduplicatedMethods
}

export interface CreatePaymentMethod {
  method_type: 'card' | 'bank' | 'mtn_momo' | 'telecel' | 'airtel_tigo' | 'g_money'
  details: Record<string, any>
  is_default?: boolean
  provider?: string
}

export async function createPaymentMethod(data: CreatePaymentMethod): Promise<PaymentMethod> {
  // Check for duplicates before creating
  const existingMethods = await getPaymentMethods()
  
  // Check for mobile money duplicates
  if (['mtn_momo', 'telecel', 'airtel_tigo', 'mobile_money'].includes(data.method_type)) {
    const phoneNumber = data.details?.phone_number || data.details?.phone
    if (!phoneNumber) {
      throw new Error('Phone number is required for mobile money payments')
    }
    
    const duplicate = existingMethods.find(m => 
      m.method_type === data.method_type && 
      m.phone === phoneNumber
    )
    
    if (duplicate) {
      throw new Error(`A ${data.method_type.replace('_', ' ').toUpperCase()} payment method with phone number ${phoneNumber} already exists`)
    }
  }
  
  // Check for card duplicates
  if (data.method_type === 'card') {
    const cardNumber = data.details?.card_number || data.details?.number
    const last4 = cardNumber?.slice(-4)
    
    if (!last4) {
      throw new Error('Card number is required for card payments')
    }
    
    const duplicate = existingMethods.find(m => 
      m.method_type === 'card' && 
      m.last4 === last4
    )
    
    if (duplicate) {
      throw new Error(`A card ending in ${last4} already exists`)
    }
  }
  
  // Check for bank account duplicates
  if (data.method_type === 'bank') {
    const accountNumber = data.details?.account_number
    if (!accountNumber) {
      throw new Error('Account number is required for bank payments')
    }
    
    const duplicate = existingMethods.find(m => 
      m.method_type === 'bank' && 
      m.account_number === accountNumber
    )
    
    if (duplicate) {
      throw new Error(`A bank account with number ${accountNumber} already exists`)
    }
  }

  // Format data according to backend requirements
  const formattedData: {
    method_type: PaymentMethod['method_type']
    details: Record<string, any>
    is_default: boolean
    provider?: string
  } = {
    method_type: data.method_type,
    details: { ...data.details },
    is_default: data.is_default || false
  }

  // Special handling for mobile money
  if (['mtn_momo', 'telecel', 'airtel_tigo', 'mobile_money'].includes(data.method_type)) {
    formattedData.provider = data.details?.provider || data.provider
    formattedData.details.phone_number = data.details?.phone_number || data.details?.phone
  }

  // Special handling for cards
  if (data.method_type === 'card') {
    formattedData.details.brand = data.details?.brand || getCardType(data.details?.card_number || data.details?.number)
    formattedData.details.last4 = data.details?.last4 || (data.details?.card_number || data.details?.number)?.slice(-4)
  }

  const response = await api.post('/api/v1/payments/methods/', formattedData)
  return response.data
}

export async function setDefaultPaymentMethod(id: string) {
  const response = await api.post(`/api/v1/payments/methods/${id}/set_default/`, {})
  return response.data
}

export async function processCheckout(data: CheckoutData) {
  const response = await api.post('/api/v1/payments/checkout/', {
    merchant_id: data.merchant_id,
    amount: data.amount,
    currency: data.currency,
    payment_method_id: data.paymentMethodId,
    description: data.description
  })
  return response.data
}

export async function getTransactions(params?: any): Promise<Transaction[]> {
  const response = await api.get('/api/v1/payments/transactions/', { params })
  return response.data.results || response.data
}

export async function getTransaction(id: string): Promise<Transaction> {
  const response = await api.get(`/api/v1/payments/transactions/${id}/`)
  return response.data
}

export async function initiatePayment(data: any) {
  const response = await api.post('/api/v1/payments/initiate/', data)
  return response.data
}

export async function verifyPayment(transactionId: string, reference: string) {
  const response = await api.post('/api/v1/payments/verify/', {
    transaction_id: transactionId,
    reference
  })
  return response.data
}

export async function requestRefund(transactionId: string, amount: number, reason: string) {
  const response = await api.post('/api/v1/payments/refund/', {
    transaction_id: transactionId,
    amount,
    reason
  })
  return response.data
}

export async function getWalletBalance() {
  const response = await api.get('/api/v1/payments/wallet/')
  return response.data
}

export async function getCurrencies() {
  const response = await api.get('/api/v1/payments/currencies/')
  return response.data.results || response.data
}

export async function getExchangeRates() {
  const response = await api.get('/api/v1/payments/exchange-rates/')
  return response.data
}

export async function convertCurrency(amount: number, fromCurrency: string, toCurrency: string) {
  const response = await api.post('/api/v1/payments/convert-currency/', {
    amount,
    from_currency: fromCurrency,
    to_currency: toCurrency
  })
  return response.data
}

export async function sendMoney(recipient: string, amount: number, currency: string, description?: string, isPhone: boolean = false, paymentMethodId?: string) {
  const requestData: any = {
    amount,
    currency,
    description,
    recipient
  }

  // Add payment method if provided
  if (paymentMethodId) {
    requestData.payment_method_id = paymentMethodId
  }

  const response = await api.post('/api/v1/payments/send/', requestData)
  return response.data
}

export async function requestMoney(amount: number, currency: string, description?: string) {
  const response = await api.post('/api/v1/payments/request/', {
    amount,
    currency,
    description
  })
  return response.data
}

// Alias functions for compatibility
export const addPaymentMethod = createPaymentMethod
export const setDefaultMethod = setDefaultPaymentMethod

export async function verifyPaymentMethod(methodId: string, verificationData: any = {}) {
  const response = await api.post(`/api/v1/payments/methods/${methodId}/verify/`, verificationData)
  return response.data
}

export async function deletePaymentMethod(methodId: string): Promise<void> {
  try {
    await api.delete(`/api/v1/payments/methods/${methodId}/`)
  } catch (error: any) {

    // If it's a 404, the payment method doesn't exist - treat as success
    if (error.response?.status === 404) {
      return
    }
    
    // If it's a 500 server error, provide more specific error information
    if (error.response?.status === 500) {
      const serverData = error.response?.data
      let errorMessage = 'Server error occurred while deleting payment method'
      
      // Try to extract specific error details from common Django/DRF error formats
      if (serverData) {
        // Check for Django ProtectedError (foreign key constraints)
        if (typeof serverData === 'string' && serverData.includes('ProtectedError')) {
          if (serverData.includes('DomesticTransfer')) {
            errorMessage = 'Cannot delete this payment method as it is used in one or more domestic transfers.'
          } else if (serverData.includes('Transaction')) {
            errorMessage = 'Cannot delete this payment method as it is linked to transaction history.'
          } else {
            errorMessage = 'Cannot delete this payment method as it is referenced by other records in the system.'
          }
        } else if (serverData.detail) {
          errorMessage = serverData.detail
        } else if (serverData.error) {
          errorMessage = serverData.error
        } else if (serverData.message) {
          errorMessage = serverData.message
        } else if (typeof serverData === 'string') {
          // Clean up HTML error pages
          const cleanError = serverData.replace(/<[^>]*>/g, '').trim()
          if (cleanError.includes('ProtectedError')) {
            errorMessage = 'Cannot delete this payment method as it is referenced by other records.'
          } else if (cleanError.length > 0 && cleanError.length < 200) {
            errorMessage = cleanError
          }
        } else if (Array.isArray(serverData)) {
          errorMessage = serverData.join('; ')
        }
      }
      
      throw new Error(`Server error: ${errorMessage}`)
    }
    // For other errors, re-throw them with more context
    const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to delete payment method'
    throw new Error(errorMessage)
  }
}

// Bill payment functions
export interface PendingBill {
  id: string
  amount: number
  currency: string
  due_date: string
  merchant: string
  description: string
  status: string
  bill_issuer: string
  bill_reference: string
  bill_type: string
  late_fee?: number
  is_overdue?: boolean
  days_overdue?: number
}

export async function getPendingBills(): Promise<PendingBill[]> {
  const response = await api.get('/api/v1/payments/bills/pending/')
  return response.data.results || response.data
}

export async function addLateFee(billId: string, amount: number) {
  const response = await api.post(`/api/v1/payments/bills/${billId}/late-fee/`, { amount })
  return response.data
}

export async function payBill(billId: string, paymentMethodId: string) {
  const response = await api.post(`/api/v1/payments/bills/${billId}/pay/`, { payment_method_id: paymentMethodId })
  return response.data
}

export async function upgradeSubscription(planId: string, paymentMethodId: string) {
  const response = await api.post('/api/v1/payments/subscriptions/upgrade/', { plan_id: planId, payment_method_id: paymentMethodId })
  return response.data
}

export async function sendRemittance(data: {
  recipient: string
  recipient_name: string
  recipient_country: string
  amount: number
  currency: string
  payment_method_id: string
  purpose?: string
  // Delivery method information for international remittances
  delivery_method?: string
  delivery_phone?: string
  delivery_account_number?: string
  delivery_bank_name?: string
  delivery_bank_branch?: string
  delivery_mobile_provider?: string
}) {
  const response = await api.post('/api/v1/payments/remittance/', {
    recipient: {
      name: data.recipient_name,
      email: data.recipient.includes('@') ? data.recipient : undefined,
      phone: !data.recipient.includes('@') ? data.recipient : undefined,
    },
    recipient_country: data.recipient_country,
    amount: data.amount,
    currency: data.currency,
    payment_method_id: data.payment_method_id,
    purpose: data.purpose,
    // Delivery method information for international remittances
    delivery_method: data.delivery_method,
    delivery_phone: data.delivery_phone,
    delivery_account_number: data.delivery_account_number,
    delivery_bank_name: data.delivery_bank_name,
    delivery_bank_branch: data.delivery_bank_branch,
    delivery_mobile_provider: data.delivery_mobile_provider
  })
  return response.data
}

export async function sendOutboundRemittance(data: {
  recipient: string
  amount: number
  currency: string
  payment_method_id: string
  purpose: string
  delivery_method: string
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
}) {
  const requestData = {
    recipient: data.recipient,
    amount: data.amount,
    currency: data.currency,
    payment_method_id: data.payment_method_id,
    purpose: data.purpose,
    delivery_method: data.delivery_method,
    ...(data.delivery_phone && { delivery_phone: data.delivery_phone }),
    ...(data.delivery_account_number && { delivery_account_number: data.delivery_account_number }),
    ...(data.delivery_bank_name && { delivery_bank_name: data.delivery_bank_name }),
    ...(data.delivery_bank_branch && { delivery_bank_branch: data.delivery_bank_branch }),
    ...(data.delivery_routing_number && { delivery_routing_number: data.delivery_routing_number }),
    ...(data.delivery_swift_code && { delivery_swift_code: data.delivery_swift_code }),
    ...(data.delivery_mobile_provider && { delivery_mobile_provider: data.delivery_mobile_provider }),
    ...(data.delivery_address && { delivery_address: data.delivery_address }),
    ...(data.delivery_city && { delivery_city: data.delivery_city }),
    ...(data.delivery_postal_code && { delivery_postal_code: data.delivery_postal_code }),
    ...(data.delivery_wallet_id && { delivery_wallet_id: data.delivery_wallet_id })
  }

  const response = await api.post('/api/v1/payments/outbound-remittance/', requestData)
  return response.data
}

export async function sendGlobalRemittance(data: {
  sender_name: string
  sender_email: string
  sender_phone: string
  sender_address?: string
  sender_country: string
  recipient: string
  recipient_name: string
  recipient_email?: string
  recipient_phone?: string
  recipient_country: string
  recipient_currency?: string
  amount: number
  currency: string
  payment_method_id: string
  purpose: string
  delivery_method: string
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
}) {
  const requestData = {
    sender_name: data.sender_name,
    sender_email: data.sender_email,
    sender_phone: data.sender_phone,
    sender_country: data.sender_country,
    ...(data.sender_address && { sender_address: data.sender_address }),
    recipient: data.recipient,
    recipient_name: data.recipient_name,
    recipient_country: data.recipient_country,
    ...(data.recipient_email && { recipient_email: data.recipient_email }),
    ...(data.recipient_phone && { recipient_phone: data.recipient_phone }),
    ...(data.recipient_currency && { recipient_currency: data.recipient_currency }),
    amount: data.amount,
    currency: data.currency,
    payment_method_id: data.payment_method_id,
    purpose: data.purpose,
    delivery_method: data.delivery_method,
    ...(data.delivery_phone && { delivery_phone: data.delivery_phone }),
    ...(data.delivery_account_number && { delivery_account_number: data.delivery_account_number }),
    ...(data.delivery_bank_name && { delivery_bank_name: data.delivery_bank_name }),
    ...(data.delivery_bank_branch && { delivery_bank_branch: data.delivery_bank_branch }),
    ...(data.delivery_routing_number && { delivery_routing_number: data.delivery_routing_number }),
    ...(data.delivery_swift_code && { delivery_swift_code: data.delivery_swift_code }),
    ...(data.delivery_mobile_provider && { delivery_mobile_provider: data.delivery_mobile_provider }),
    ...(data.delivery_address && { delivery_address: data.delivery_address }),
    ...(data.delivery_city && { delivery_city: data.delivery_city }),
    ...(data.delivery_postal_code && { delivery_postal_code: data.delivery_postal_code }),
    ...(data.delivery_wallet_id && { delivery_wallet_id: data.delivery_wallet_id })
  }

  const response = await api.post('/api/v1/payments/global-remittance/', requestData)
  return response.data
}

export async function sendDomesticTransfer(data: {
  amount: number
  currency: string
  description?: string
  recipient: any
  payment_method_id: string | number
}) {
  const requestData = {
    amount: data.amount,
    currency: data.currency,
    description: data.description,
    recipient: data.recipient,
    payment_method: typeof data.payment_method_id === 'string' ? parseInt(data.payment_method_id, 10) : data.payment_method_id
  }
  try {
    const response = await api.post('/api/v1/payments/domestic-transfers/', requestData)
    return response.data
  } catch (error: any) {
    
    throw error
  }
}
export interface PaymentMethodAnalyticsResponse {
  summary: {
    total_transactions: number
    total_amount: number
    success_rate: number
    most_used?: {
      method: string
      display_name: string
      total_transactions: number
      percentage: number
    }
  }
  total_methods: number
  period_days: number
  methods: Array<{
    id: string
    method: string
    display_name: string
    total_transactions: number
    total_amount: number
    success_rate: number
    percentage: number
    avg_transaction: number
    is_default?: boolean
    last_used?: string
  }>
  by_method: Array<{
    method: string
    count: number
    amount: number
    percentage: number
  }>
  by_date: Array<{
    date: string
    count: number
    amount: number
  }>
}

export async function getPaymentMethodAnalytics(period?: number | string): Promise<PaymentMethodAnalyticsResponse> {
  const params = period ? { period: period.toString() } : {}
  const response = await api.get('/api/v1/payments/analytics/methods/', { params })
  return response.data
}

export async function getRecentTransactions(limit: number = 10): Promise<Transaction[]> {
  const response = await api.get('/api/v1/payments/transactions/recent/', { params: { limit } })
  return response.data.results || response.data
}

// QR Payment functions
export interface QRValidationRequest {
  qr_data: string | object
}

export interface QRValidationResponse {
  valid: boolean
  payment_details?: {
    amount: number
    currency: string
    merchant_name: string
    reference: string
  }
  error?: string
}

export interface QRProcessRequest {
  qr_reference: string
  payment_method_id?: string
}

export interface QRProcessResponse {
  success: boolean
  transaction_id?: string
  amount?: number
  currency?: string
  merchant?: string
  reference?: string
  error?: string
}

export async function validateQRPayment(data: QRValidationRequest): Promise<QRValidationResponse> {
  const response = await api.post('/api/v1/payments/qr/validate/', data)
  return response.data
}

export async function getAvailablePaymentMethods(): Promise<{
  success: boolean
  data?: Record<string, Array<{
    type: string
    display_name: string
    icon: string
    description: string
    available_gateways: string[]
    primary_gateway: string
    processing_time: string
    fees?: string
    limits?: { min: number; max: number }
  }>>
  error?: string
}> {
  try {
    const response = await api.get('/api/v1/payments/available-methods/')
    return {
      success: true,
      data: response.data
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to load payment methods'
    }
  }
}

export interface ReportFilters {
  date_from?: string
  date_to?: string
  status?: string
  format?: 'html' | 'pdf' | 'excel'
}

export interface BusinessSummary {
  total_sales: number
  total_volume: number
  top_products: any[]
  payment_methods: Array<{
    method_type: string
    count: number
    total: number
  }>
}

export interface SalesTrend {
  daily_sales: Array<{
    date: string
    total: number
  }>
  period: string
}

export interface AdminStats {
  users: number
  merchants: number
  transactions: number
}

export interface SystemHealth {
  database: boolean
  api: boolean
  cache: boolean
  workers: number
}

// Reporting API Functions
export const generatePaymentReport = async (filters: ReportFilters = {}) => {
  try {
    const queryParams = new URLSearchParams()
    if (filters.date_from) queryParams.append('date_from', filters.date_from)
    if (filters.date_to) queryParams.append('date_to', filters.date_to)
    if (filters.status) queryParams.append('status', filters.status)
    if (filters.format) queryParams.append('format', filters.format || 'html')

    const response = await api.get(`/api/v1/payments/reports/?${queryParams}`)
    return {
      success: true,
      data: response.data
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to generate report'
    }
  }
}

export const getBusinessSummary = async () => {
  try {
    const response = await api.get('/api/v1/admin/dashboard/business-summary/')
    return {
      success: true,
      data: response.data as BusinessSummary
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to load business summary'
    }
  }
}

export const getSalesTrends = async (days: number = 7) => {
  try {
    const response = await api.get(`/api/v1/admin/dashboard/sales-trends/?days=${days}`)
    return {
      success: true,
      data: response.data as SalesTrend
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to load sales trends'
    }
  }
}

export const getAdminStats = async () => {
  try {
    const response = await api.get('/api/v1/admin/dashboard/admin-stats/')
    return {
      success: true,
      data: response.data as AdminStats
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to load admin stats'
    }
  }
}

export const getSystemHealth = async () => {
  try {
    const response = await api.get('/api/v1/admin/dashboard/system-health/')
    return {
      success: true,
      data: response.data as SystemHealth
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to load system health'
    }
  }
}

export const getDashboardStats = async () => {
  try {
    const response = await api.get('/api/v1/admin/dashboard/dashboard-stats/')
    return {
      success: true,
      data: response.data
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to load dashboard stats'
    }
  }
}

// ============== WITHDRAW API FUNCTIONS ==============

export interface WithdrawMobileMoneyRequest {
  amount: number
  provider: 'MTN' | 'Telecel' | 'AirtelTigo' | 'G-Money'
  phone_number: string
  currency?: string
}

export interface WithdrawBankTransferRequest {
  amount: number
  currency?: string
  bank_code?: string
  account_number: string
  account_name: string
}

export interface WithdrawResponse {
  success: boolean
  message: string
  transaction_id: string
  amount: number
  fee: number
  total_deduction: number
  currency: string
  status: string
  estimated_time: string
  provider?: string
  phone_number?: string
  bank_code?: string
  account_number?: string
  account_name?: string
}

export interface WithdrawalLimits {
  currency: string
  available_balance: number
  mobile_money: {
    min_amount: number
    max_amount: number
    fee_percentage: number
    min_fee: number
    estimated_time: string
  }
  bank_transfer: {
    min_amount: number
    max_amount: number
    fee_percentage: number
    min_fee: number
    estimated_time: string
  }
}

export interface SupportedBank {
  code: string
  name: string
  swift: string
}

export async function withdrawMobileMoney(data: WithdrawMobileMoneyRequest): Promise<{
  success: boolean
  data?: WithdrawResponse
  error?: string
}> {
  try {
    const response = await api.post('/api/v1/payments/wallet/withdraw/mobile-money/', {
      amount: data.amount,
      provider: data.provider,
      phone_number: data.phone_number,
      currency: data.currency || 'GHS'
    })
    return {
      success: true,
      data: response.data
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to process withdrawal'
    }
  }
}

export async function withdrawBankTransfer(data: WithdrawBankTransferRequest): Promise<{
  success: boolean
  data?: WithdrawResponse
  error?: string
}> {
  try {
    const response = await api.post('/api/v1/payments/wallet/withdraw/bank-transfer/', {
      amount: data.amount,
      currency: data.currency || 'GHS',
      bank_code: data.bank_code,
      account_number: data.account_number,
      account_name: data.account_name
    })
    return {
      success: true,
      data: response.data
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to process withdrawal'
    }
  }
}

export async function getWithdrawalLimits(currency: string = 'GHS'): Promise<{
  success: boolean
  data?: WithdrawalLimits
  error?: string
}> {
  try {
    const response = await api.get('/api/v1/payments/wallet/withdraw/limits/', {
      params: { currency }
    })
    return {
      success: true,
      data: response.data
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to get withdrawal limits'
    }
  }
}

export async function getSupportedBanks(country: string = 'GH'): Promise<{
  success: boolean
  data?: { country: string; banks: SupportedBank[] }
  error?: string
}> {
  try {
    const response = await api.get('/api/v1/payments/wallet/withdraw/banks/', {
      params: { country }
    })
    return {
      success: true,
      data: response.data
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to get supported banks'
    }
  }
}

// ============== SIKAREMIT WALLET TRANSFER ==============

export interface TransferToSikaRemitRequest {
  amount: number
  currency: string
  recipient_identifier: string  // Phone number or email
  description?: string
}

export interface TransferToSikaRemitResponse {
  success: boolean
  message: string
  transaction_id: string
  amount: number
  currency: string
  recipient: {
    name: string
    identifier: string
  }
  status: string
  estimated_time: string
}

export interface LookupUserResponse {
  found: boolean
  message?: string
  recipient?: {
    name: string
    identifier: string
    verified: boolean
  }
}

export async function transferToSikaRemitWallet(data: TransferToSikaRemitRequest): Promise<{
  success: boolean
  data?: TransferToSikaRemitResponse
  error?: string
}> {
  try {
    const response = await api.post('/api/v1/payments/wallet/transfer/sikaremit/', data)
    return {
      success: true,
      data: response.data
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to process transfer'
    }
  }
}

export async function lookupSikaRemitUser(identifier: string): Promise<{
  success: boolean
  data?: LookupUserResponse
  error?: string
}> {
  try {
    const response = await api.get('/api/v1/payments/wallet/lookup-user/', {
      params: { identifier }
    })
    return {
      success: true,
      data: response.data
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to look up user'
    }
  }
}

