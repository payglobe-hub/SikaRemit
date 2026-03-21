import api from './axios'

export interface FeeCalculationRequest {
  transaction_type: string
  amount: number
  currency?: string
  country?: string
  payment_method?: string
}

export interface FeeCalculationResponse {
  success: boolean
  total_fee: number
  fee_breakdown?: {
    base_fee: number
    percentage_fee: number
    additional_fees: number
  }
  error?: string
}

export const calculateTransactionFees = async (
  request: FeeCalculationRequest
): Promise<FeeCalculationResponse> => {
  try {
    const response = await api.post('/api/v1/payments/fees/calculate_fee/', request)
    return response.data
  } catch (error: any) {

    // Only provide fallback for network/server errors, not for validation errors
    if (error?.code === 'NETWORK_ERROR' || error?.response?.status >= 500) {
      
      // Emergency fallback: minimum fee calculation
      const fallbackFee = Math.max(request.amount * 0.005, 0.50)
      return {
        success: false,
        total_fee: fallbackFee,
        error: 'Fee calculation service temporarily unavailable'
      }
    }
    
    // For validation/client errors, don't provide fallback
    throw error
  }
}

export const getFeeStructure = async (
  transactionType: string,
  country?: string
) => {
  try {
    const response = await api.get('/api/v1/payments/fees/preview_fee/', {
      params: { fee_type: transactionType, country }
    })
    return response.data
  } catch (error: any) {
    
    return null
  }
}

export interface FeeAnalytics {
  total_fee_revenue: number;
  revenue_change_percent: number;
  average_fee_per_transaction: number;
  avg_fee_change_percent: number;
  total_configurations: number;
  active_configurations: number;
  inactive_configurations: number;
  peak_revenue: number;
  peak_month: string;
}

export const getFeeAnalytics = async (): Promise<FeeAnalytics> => {
  try {
    const response = await api.get('/api/v1/admin/fee-configurations/analytics/')
    return response.data
  } catch (error: any) {
    
    throw error
  }
}
