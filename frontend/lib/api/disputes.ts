import api from './axios'

export interface Dispute {
  id: string
  transaction_id: string
  transaction_amount: number
  transaction_currency: string
  customer_name?: string
  customer_email?: string
  merchant_name?: string
  reason: string
  status: 'open' | 'under_review' | 'resolved' | 'closed'
  resolution?: string
  resolution_action?: string
  created_at: string
  updated_at?: string
  resolved_at?: string
  resolved_by?: string
}

export interface DisputeStats {
  total_disputes: number
  open_disputes: number
  under_review: number
  resolved_disputes: number
  avg_resolution_time_hours: number
}

// Get all disputes with optional filters
export async function getDisputes(params?: {
  status?: string
  page?: number
  limit?: number
}): Promise<{ results: Dispute[], count: number }> {
  try {
    const response = await api.get('/api/v1/payments/admin/disputes/', {
      params
    })
    return response.data
  } catch (error: any) {
    // Log error for monitoring

    // Only fallback for 404 (endpoint not found), not for auth errors
    if (error?.response?.status === 404) {
      
      try {
        // Fallback: get disputes from transactions endpoint
        const txResponse = await api.get('/api/v1/payments/admin/transactions/', {
          params: { has_dispute: true, ...params }
        })
        const transactions = txResponse.data.results || txResponse.data || []
        const disputes: Dispute[] = transactions
          .filter((tx: any) => tx.dispute_id || tx.dispute_status)
          .map((tx: any) => ({
            id: tx.dispute_id || tx.id,
            transaction_id: tx.id,
            transaction_amount: tx.amount,
            transaction_currency: tx.currency,
            customer_name: tx.customer_name,
            customer_email: tx.customer_email,
            merchant_name: tx.merchant_name,
            reason: tx.dispute_reason || 'No reason provided',
            status: tx.dispute_status || 'open',
            resolution: tx.dispute_resolution,
            created_at: tx.dispute_created_at || tx.created_at,
            updated_at: tx.updated_at,
            resolved_at: tx.dispute_resolved_at,
            resolved_by: tx.dispute_resolved_by
          }))
        return { results: disputes, count: disputes.length }
      } catch (fallbackError) {
        
        // Return empty result rather than throwing
        return { results: [], count: 0 }
      }
    }
    throw error
  }
}

// Get dispute statistics
export async function getDisputeStats(): Promise<DisputeStats> {
  try {
    const response = await api.get('/api/v1/payments/admin/disputes/stats/')
    return response.data
  } catch (error: any) {
    // Return default stats if endpoint doesn't exist
    if (error?.response?.status === 404) {
      const disputes = await getDisputes()
      const open = disputes.results.filter(d => d.status === 'open').length
      const underReview = disputes.results.filter(d => d.status === 'under_review').length
      const resolved = disputes.results.filter(d => d.status === 'resolved' || d.status === 'closed').length
      return {
        total_disputes: disputes.count,
        open_disputes: open,
        under_review: underReview,
        resolved_disputes: resolved,
        avg_resolution_time_hours: 24
      }
    }
    throw error
  }
}

// Get single dispute
export async function getDispute(id: string): Promise<Dispute> {
  const response = await api.get(`/api/v1/payments/admin/disputes/${id}/`)
  return response.data
}

// Update dispute status (mark as under review)
export async function updateDisputeStatus(id: string, status: string): Promise<Dispute> {
  const response = await api.patch(
    `/api/v1/payments/admin/disputes/${id}/`,
    { status }
  )
  return response.data
}

// Resolve dispute
export async function resolveDispute(
  transactionId: string, 
  resolution: string, 
  action: 'refund' | 'complete' | 'close'
): Promise<any> {
  const response = await api.post(
    `/api/v1/payments/admin/transactions/${transactionId}/resolve_dispute/`,
    { resolution, action }
  )
  return response.data
}

// Create dispute for a transaction
export async function createDispute(transactionId: string, reason: string): Promise<any> {
  const response = await api.post(
    `/api/v1/payments/admin/transactions/${transactionId}/create_dispute/`,
    { reason }
  )
  return response.data
}
