import api from './axios'

export interface Payout {
  id: string
  amount: number
  currency: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  bank_account?: string
  recipient_name: string
  recipient_email: string
  created_at: string
  completed_at?: string
}

export interface Balance {
  available: number
  pending: number
  currency: string
}

export async function getBalance() {
  const response = await api.get('/api/v1/accounts/merchant/payouts/balance/')
  return response.data
}

export async function getPayouts(params?: { status?: string; page?: number }) {
  const response = await api.get('/api/v1/accounts/merchant/payouts/', {
    params
  })
  return response.data
}

export async function requestPayout(
  amount: number, 
  recipient_name: string,
  recipient_email: string,
  bank_account_id?: string
) {
  const response = await api.post(
    '/api/v1/accounts/merchant/payouts/',
    { amount, recipient_name, recipient_email, bank_account_id }
  )
  return response.data
}

export async function getPayout(id: string) {
  const response = await api.get(`/api/v1/accounts/merchant/payouts/${id}/`)
  return response.data
}
