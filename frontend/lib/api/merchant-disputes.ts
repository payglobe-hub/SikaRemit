import axios from 'axios'
import { API_CONFIG } from '../config'
import { getAuthHeaders } from './auth'

// Types for merchant dispute data
export interface MerchantDispute {
  id: number
  transaction_id: string
  transaction_amount: number
  transaction_currency: string
  transaction_date: string
  customer_name: string
  customer_email: string
  dispute_type: string
  reason: string
  status: string
  merchant_response?: string
  merchant_response_time?: string
  merchant_resolution?: string
  merchant_resolution_time?: string
  escalated_to_admin: boolean
  escalated_at?: string
  escalation_reason?: string
  customer_satisfied?: boolean
  customer_feedback?: string
  created_at: string
  updated_at: string
  resolved_at?: string
  days_open: number
  response_deadline: string
}

export interface MerchantDisputeStats {
  total_disputes: number
  open_disputes: number
  under_review_disputes: number
  resolved_disputes: number
  escalated_disputes: number
  overdue_disputes: number
  avg_response_time_hours: number
  satisfaction_rate: number
}

export interface MerchantDisputeFilters {
  status?: string
  escalated?: string
  search?: string
  start_date?: string
  end_date?: string
}

export interface DisputeResponseRequest {
  response_text: string
}

export interface DisputeResolutionRequest {
  resolution_text: string
}

export interface DisputeEscalationRequest {
  escalation_reason: string
}

// Merchant Dispute API Functions
export async function getMerchantDisputes(
  filters?: MerchantDisputeFilters
): Promise<MerchantDispute[]> {
  try {
    const response = await axios.get(
      `${API_CONFIG.BASE_URL}/api/v1/payments/merchant/disputes/`,
      {
        headers: getAuthHeaders(),
        params: filters
      }
    )
    return response.data  // Return array directly since backend doesn't paginate
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to fetch disputes')
  }
}

export async function getMerchantDisputeDetails(disputeId: number): Promise<MerchantDispute> {
  try {
    const response = await axios.get(
      `${API_CONFIG.BASE_URL}/api/v1/payments/merchant/disputes/${disputeId}/`,
      { headers: getAuthHeaders() }
    )
    return response.data
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to fetch dispute details')
  }
}

export async function respondToDispute(
  disputeId: number,
  data: DisputeResponseRequest
): Promise<{ message: string, dispute: MerchantDispute }> {
  try {
    const response = await axios.post(
      `${API_CONFIG.BASE_URL}/api/v1/payments/merchant/disputes/${disputeId}/respond/`,
      data,
      { headers: getAuthHeaders() }
    )
    return response.data
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to respond to dispute')
  }
}

export async function resolveDispute(
  disputeId: number,
  data: DisputeResolutionRequest
): Promise<{ message: string, dispute: MerchantDispute }> {
  try {
    const response = await axios.post(
      `${API_CONFIG.BASE_URL}/api/v1/payments/merchant/disputes/${disputeId}/resolve/`,
      data,
      { headers: getAuthHeaders() }
    )
    return response.data
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to resolve dispute')
  }
}

export async function escalateDispute(
  disputeId: number,
  data: DisputeEscalationRequest
): Promise<{ message: string, dispute: MerchantDispute }> {
  try {
    const response = await axios.post(
      `${API_CONFIG.BASE_URL}/api/v1/payments/merchant/disputes/${disputeId}/escalate/`,
      data,
      { headers: getAuthHeaders() }
    )
    return response.data
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to escalate dispute')
  }
}

export async function getMerchantDisputeStats(): Promise<MerchantDisputeStats> {
  try {
    const response = await axios.get(
      `${API_CONFIG.BASE_URL}/api/v1/payments/merchant/disputes/stats/`,
      { headers: getAuthHeaders() }
    )
    return response.data
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to fetch dispute statistics')
  }
}

export async function getOverdueDisputes(): Promise<MerchantDispute[]> {
  try {
    const response = await axios.get(
      `${API_CONFIG.BASE_URL}/api/v1/payments/merchant/disputes/overdue/`,
      { headers: getAuthHeaders() }
    )
    return response.data  // Return the array directly, not response.data.results
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to fetch overdue disputes')
  }
}

// Helper functions
export const getMerchantDisputeStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'open': 'bg-yellow-100 text-yellow-800',
    'merchant_response': 'bg-red-100 text-red-800',
    'under_review': 'bg-purple-100 text-purple-800',
    'pending_escalation': 'bg-orange-100 text-orange-800',
    'resolved': 'bg-green-100 text-green-800',
    'closed': 'bg-gray-100 text-gray-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

export const getMerchantDisputeStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'open': 'Open',
    'merchant_response': 'Awaiting Your Response',
    'under_review': 'Customer Reviewing',
    'pending_escalation': 'Escalated to Admin',
    'resolved': 'Resolved',
    'closed': 'Closed'
  }
  return labels[status] || status
}

export const isDisputeOverdue = (dispute: MerchantDispute): boolean => {
  if (dispute.status !== 'merchant_response') return false
  const deadline = new Date(dispute.response_deadline)
  return new Date() > deadline
}

export const getResponseUrgency = (dispute: MerchantDispute): 'high' | 'medium' | 'low' => {
  if (dispute.status !== 'merchant_response') return 'low'
  
  const deadline = new Date(dispute.response_deadline)
  const now = new Date()
  const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)
  
  if (hoursRemaining < 12) return 'high'
  if (hoursRemaining < 24) return 'medium'
  return 'low'
}

export const canRespondToDispute = (dispute: MerchantDispute): boolean => {
  return dispute.status === 'open' || dispute.status === 'merchant_response'
}

export const canResolveDispute = (dispute: MerchantDispute): boolean => {
  return (dispute.status === 'under_review' || dispute.status === 'merchant_response') && 
         !!dispute.merchant_response && !dispute.merchant_resolution
}

export const canEscalateDispute = (dispute: MerchantDispute): boolean => {
  return dispute.escalated_to_admin === false
}
