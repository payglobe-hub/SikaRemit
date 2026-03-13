import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getAuthHeaders() {
  // Auth headers will be added by axios interceptor
  return {}
}

export interface AnalyticsData {
  revenue: {
    total: number
    change_percentage: number
    chart_data: Array<{ date: string; amount: number }>
  }
  transactions: {
    total: number
    change_percentage: number
  }
  customers: {
    total: number
    change_percentage: number
  }
  sales: {
    total: number
    change_percentage: number
    by_category: Array<{ category: string; amount: number }>
  }
}

export async function getAnalytics(params?: {
  start_date?: string
  end_date?: string
  store_id?: string
}) {
  const response = await axios.get(`${API_BASE_URL}/api/v1/merchants/analytics/`, {
    headers: getAuthHeaders(),
    params
  })
  return response.data
}

export async function getRevenueChart(params?: {
  start_date?: string
  end_date?: string
  interval?: 'day' | 'week' | 'month'
}) {
  const response = await axios.get(`${API_BASE_URL}/api/v1/merchants/analytics/revenue/`, {
    headers: getAuthHeaders(),
    params
  })
  return response.data
}

export async function getSalesMetrics(params?: {
  start_date?: string
  end_date?: string
}) {
  const response = await axios.get(`${API_BASE_URL}/api/v1/merchants/analytics/sales/`, {
    headers: getAuthHeaders(),
    params
  })
  return response.data
}
