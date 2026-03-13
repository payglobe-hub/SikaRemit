import api from './axios'

export interface Transaction {
  id: string
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  type: 'payment' | 'refund' | 'payout'
  description?: string
  customer_email?: string
  customer_name?: string
  payment_method?: string
  created_at: string
  updated_at?: string
  // Admin-specific fields
  dispute_id?: string
  dispute_status?: string
  dispute_reason?: string
  dispute_created_at?: string
}

// Admin transaction API functions
export async function getAdminTransactions(params?: {
  user_id?: string
  status?: string
  page?: number
  limit?: number
}) {
  const response = await api.get('/api/v1/payments/admin/transactions/', {
    params
  })
  return response.data
}

export async function getAdminTransaction(id: string) {
  const response = await api.get(`/api/v1/payments/admin/transactions/${id}/`)
  return response.data
}

export async function overrideTransactionStatus(id: string, status: string, reason: string) {
  const response = await api.post(
    `/api/v1/payments/admin/transactions/${id}/override_status/`,
    { status, reason }
  )
  return response.data
}

export async function processAdminRefund(id: string, refundAmount?: number, reason?: string) {
  const response = await api.post(
    `/api/v1/payments/admin/transactions/${id}/process_refund/`,
    { refund_amount: refundAmount, reason }
  )
  return response.data
}

export async function createTransactionDispute(id: string, reason: string) {
  const response = await api.post(
    `/api/v1/payments/admin/transactions/${id}/create_dispute/`,
    { reason }
  )
  return response.data
}

export async function resolveTransactionDispute(id: string, resolution: string, action?: string) {
  const response = await api.post(
    `/api/v1/payments/admin/transactions/${id}/resolve_dispute/`,
    { resolution, action }
  )
  return response.data
}

export async function manualCompleteTransaction(id: string, reason: string) {
  const response = await api.post(
    `/api/v1/payments/admin/transactions/${id}/manual_complete/`,
    { reason }
  )
  return response.data
}

export async function getTransactions(params?: {
  status?: string
  start_date?: string
  end_date?: string
  page?: number
}) {
  const response = await api.get('/api/v1/merchants/transactions/', {
    params
  })
  return response.data
}

export async function getTransaction(id: string) {
  const response = await api.get(`/api/v1/merchants/transactions/${id}/`)
  return response.data
}

export async function exportTransactions(params?: {
  status?: string
  start_date?: string
  end_date?: string
  format?: 'csv' | 'pdf'
}) {
  const response = await api.get('/api/v1/merchants/transactions/export/', {
    params,
    responseType: 'blob'
  })
  return response.data
}

export async function refundTransaction(id: string, amount?: number, reason?: string) {
  const response = await api.post(
    `/api/v1/payments/transactions/${id}/refund/`,
    { amount, reason }
  )
  return response.data
}

// Customer transaction API functions
export async function getCustomerTransactions(params?: {
  status?: string
  start_date?: string
  end_date?: string
  page?: number
}) {
  const response = await api.get('/api/v1/payments/transactions/', {
    params
  })
  return response.data
}

export async function getRecentTransactions(limit: number = 10) {
  const response = await api.get('/api/v1/payments/transactions/', {
    params: { limit }
  })
  return response.data.results || []
}
