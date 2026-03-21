import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getAuthHeaders() {
  // Auth headers will be added by axios interceptor
  return {}
}

export interface RealtimeMetrics {
  transactions_last_24h: number
  transaction_value_last_24h: number
  active_alerts: number
  system_health: string
}

export interface DashboardSnapshot {
  date: string
  total_transactions: number
  total_transaction_value: number
  total_fee_revenue: number
  active_merchants: number
  active_customers: number
  new_registrations: number
  successful_transactions: number
  failed_transactions: number
  transactions_by_country: Record<string, number>
  revenue_by_country: Record<string, number>
  payment_method_usage: Record<string, number>
  top_merchants_by_volume: Array<{
    merchant_id: number
    business_name: string
    value: number
  }>
  top_merchants_by_revenue: Array<{
    merchant_id: number
    business_name: string
    value: number
  }>
  kyc_completion_rate: number
  high_risk_transactions: number
  reported_to_regulator: number
  success_rate?: number // Calculated field
}

export interface AnalyticsOverview {
  period: {
    start: string
    end: string
    days: number
  }
  summary: {
    total_transactions: number
    total_revenue: number
    fee_revenue: number
    average_transaction: number
    customer_growth: number
    merchant_growth: number
    success_rate: number
  }
  geographic_distribution: Array<{
    country_to: string
    count: number
    revenue: number
  }>
  daily_trends: Array<{
    date: string
    transactions: number
    revenue: number
  }>
  alerts_count: number
}

export interface PerformanceAlert {
  id: number
  alert_type: string
  severity: string
  title: string
  description: string
  is_active: boolean
  created_at: string
}

export interface MerchantInsights {
  merchant: {
    id: number
    name: string
    status: string
  }
  period_days: number
  transaction_trends: Array<{
    date: string
    count: number
    revenue: number
  }>
  customer_growth: Array<{
    date: string
    unique_customers: number
  }>
  total_revenue: number
  total_transactions: number
}

export async function getRealtimeMetrics(): Promise<RealtimeMetrics> {
  const response = await axios.get(`${API_URL}/api/v1/payments/analytics/realtime_metrics/`, {
    headers: getAuthHeaders()
  })
  return response.data
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const response = await axios.get(`${API_URL}/api/v1/payments/analytics/dashboard_snapshot/`, {
    headers: getAuthHeaders()
  })
  return response.data
}

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  const response = await axios.get(`${API_URL}/api/v1/payments/analytics/overview/`, {
    headers: getAuthHeaders()
  })
  return response.data
}

export async function getRevenueAnalytics(params?: {
  period?: string
}): Promise<any> {
  const response = await axios.get(`${API_URL}/api/v1/payments/analytics/revenue/`, {
    headers: getAuthHeaders(),
    params
  })
  return response.data
}

export async function getMerchantInsights(merchantId: number, days: number = 30): Promise<MerchantInsights> {
  const response = await axios.get(`${API_URL}/api/v1/payments/analytics/merchant_insights/`, {
    headers: getAuthHeaders(),
    params: { merchant_id: merchantId, days }
  })
  return response.data
}

export async function updateDashboardSnapshot(date?: string): Promise<{ message: string }> {
  const response = await axios.post(`${API_URL}/api/v1/payments/analytics/update_snapshot/`, {
    date
  }, {
    headers: getAuthHeaders()
  })
  return response.data
}

export async function getPerformanceAlerts(): Promise<PerformanceAlert[]> {
  const response = await axios.get(`${API_URL}/api/v1/payments/alerts/`, {
    headers: getAuthHeaders()
  })
  return response.data.results || response.data
}

export async function acknowledgeAlert(alertId: number): Promise<{ message: string }> {
  const response = await axios.post(`${API_URL}/api/v1/payments/alerts/${alertId}/acknowledge/`, {}, {
    headers: getAuthHeaders()
  })
  return response.data
}

export async function checkPerformanceAlerts(): Promise<{ message: string }> {
  const response = await axios.post(`${API_URL}/api/v1/payments/alerts/check_alerts/`, {}, {
    headers: getAuthHeaders()
  })
  return response.data
}
