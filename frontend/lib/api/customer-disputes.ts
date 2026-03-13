import api from './axios'

// Types for dispute data
export interface Dispute {
  id: number
  transaction_id: string
  transaction_amount: number
  transaction_currency: string
  merchant_name: string
  dispute_type: string
  reason: string
  status: string
  resolution?: string
  merchant_response?: string
  merchant_resolution?: string
  escalated_to_admin: boolean
  customer_satisfied?: boolean
  customer_feedback?: string
  created_at: string
  updated_at: string
  resolved_at?: string
  days_open: number
  is_escalated: boolean
}

export interface DisputeCreateRequest {
  transaction: string
  reason: string
  dispute_type?: string
}

export interface DisputeFeedbackRequest {
  satisfied: boolean
  feedback_text?: string
}

export interface DisputeStats {
  total_disputes: number
  open_disputes: number
  resolved_disputes: number
  escalated_disputes: number
  satisfaction_rate: number
}

// Customer Dispute API Functions
export async function createDispute(data: DisputeCreateRequest): Promise<Dispute> {
  try {
    const response = await api.post(
      '/api/v1/payments/customer/disputes/',
      data
    )
    return response.data
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to create dispute')
  }
}

export async function getCustomerDisputes(params?: {
  status?: string
  escalated?: string
}): Promise<{ results: Dispute[], count: number }> {
  try {
    const response = await api.get(
      '/api/v1/payments/customer/disputes/',
      { params }
    )
    return response.data
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to fetch disputes')
  }
}

export async function getDisputeDetails(disputeId: number): Promise<Dispute> {
  try {
    const response = await api.get(
      `/api/v1/payments/customer/disputes/${disputeId}/`
    )
    return response.data
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to fetch dispute details')
  }
}

export async function provideDisputeFeedback(
  disputeId: number, 
  data: DisputeFeedbackRequest
): Promise<{ message: string, dispute: Dispute }> {
  try {
    const response = await api.post(
      `/api/v1/payments/customer/disputes/${disputeId}/feedback/`,
      data
    )
    return response.data
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to submit feedback')
  }
}

export async function getCustomerDisputeStats(): Promise<DisputeStats> {
  try {
    const response = await api.get(
      '/api/v1/payments/customer/disputes/stats/'
    )
    return response.data
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to fetch dispute statistics')
  }
}

// Helper functions
export const getDisputeStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'open': 'bg-yellow-100 text-yellow-800',
    'merchant_response': 'bg-blue-100 text-blue-800',
    'under_review': 'bg-purple-100 text-purple-800',
    'pending_escalation': 'bg-orange-100 text-orange-800',
    'resolved': 'bg-green-100 text-green-800',
    'closed': 'bg-gray-100 text-gray-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

export const getDisputeStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'open': 'Open',
    'merchant_response': 'Awaiting Merchant Response',
    'under_review': 'Under Review',
    'pending_escalation': 'Pending Escalation',
    'resolved': 'Resolved',
    'closed': 'Closed'
  }
  return labels[status] || status
}

export const formatDisputeDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const isDisputeActionable = (dispute: Dispute): boolean => {
  return dispute.status === 'resolved' && dispute.customer_satisfied === null
}
