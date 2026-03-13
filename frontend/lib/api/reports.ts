import api from './axios'

export const REPORT_TYPES = [
  { value: 'transactions', label: 'Transactions', description: 'Transaction history report' },
  { value: 'users', label: 'Users', description: 'User activity report' },
  { value: 'revenue', label: 'Revenue', description: 'Revenue analysis report' },
  { value: 'payments', label: 'Payments', description: 'Payment transactions report' },
  { value: 'merchants', label: 'Merchants', description: 'Merchant performance report' },
  { value: 'compliance', label: 'Compliance', description: 'Compliance and risk report' },
  { value: 'customers', label: 'Customers', description: 'Customer analytics report' },
  { value: 'disputes', label: 'Disputes', description: 'Dispute resolution report' },
  { value: 'audit', label: 'Audit Trail', description: 'System audit log report' },
  { value: 'performance', label: 'Performance', description: 'System performance metrics' }
]

export const REPORT_FORMATS = [
  { value: 'csv', label: 'CSV', icon: '📄' },
  { value: 'pdf', label: 'PDF', icon: '📕' },
  { value: 'excel', label: 'Excel', icon: '📊' },
  { value: 'json', label: 'JSON', icon: '🔧' },
  { value: 'xml', label: 'XML', icon: '🏷️' }
]

export interface Report {
  id: number
  type: string
  report_type: string
  format: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  date_from?: string
  date_to?: string
  file_url?: string
  total_records?: number
  file_size?: number
  created_by?: string
  processing_time?: number
  error_message?: string
  scheduled?: boolean
  next_run?: string
  filters?: Record<string, any>
  metadata?: {
    charts?: boolean
    summary?: boolean
    details?: boolean
    export_options?: string[]
  }
}

export interface ReportParams {
  report_type: string
  format: string
  date_from?: string
  date_to?: string
  filters?: Record<string, any>
  scheduled?: boolean
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  email_recipients?: string[]
  include_charts?: boolean
  include_summary?: boolean
  metadata?: Record<string, any>
}

export async function generateReport(params: ReportParams): Promise<Report> {
  const response = await api.post('/api/admin/reports/generate/', params)
  return response.data
}

export async function getReports(): Promise<Report[]> {
  const response = await api.get('/api/admin/reports/')
  return response.data.results || response.data || []
}

export async function downloadReport(id: number): Promise<Blob> {
  const response = await api.get(`/api/admin/reports/${id}/download/`, {
    responseType: 'blob'
  })
  return new Blob([response.data])
}

export async function deleteReport(id: number): Promise<void> {
  await api.delete(`/api/admin/reports/${id}/`)
}

export async function getReportStats(params?: {
  report_type?: string
  date_from?: string
  date_to?: string
}): Promise<any> {
  const response = await api.get('/api/admin/reports/stats/', { params })
  return response.data
}

// Advanced Admin Reporting Functions
export async function getSystemMetrics(): Promise<{
  total_users: number;
  active_users: number;
  total_merchants: number;
  active_merchants: number;
  total_transactions: number;
  transaction_volume: number;
  success_rate: number;
  average_processing_time: number;
  system_uptime: number;
  error_rate: number;
}> {
  const response = await api.get('/api/admin/reports/system-metrics/')
  return response.data
}

export async function getComplianceReport(params?: {
  start_date?: string;
  end_date?: string;
  risk_level?: string;
}): Promise<{
  total_reviews: number;
  pending_reviews: number;
  completed_reviews: number;
  high_risk_cases: number;
  compliance_score: number;
  risk_distribution: Record<string, number>;
}> {
  const response = await api.get('/api/admin/reports/compliance/', { params })
  return response.data
}

export async function getMerchantPerformance(params?: {
  start_date?: string;
  end_date?: string;
  sort_by?: 'revenue' | 'transactions' | 'success_rate';
}): Promise<{
  top_performers: Array<{
    merchant_id: number;
    business_name: string;
    revenue: number;
    transactions: number;
    success_rate: number;
    growth_rate: number;
  }>;
  industry_benchmarks: Record<string, number>;
}> {
  const response = await api.get('/api/admin/reports/merchant-performance/', { params })
  return response.data
}

export async function getCustomerAnalytics(params?: {
  start_date?: string;
  end_date?: string;
  segment?: string;
}): Promise<{
  total_customers: number;
  active_customers: number;
  new_customers: number;
  retention_rate: number;
  average_lifetime_value: number;
  segment_analysis: Record<string, {
    count: number;
    revenue: number;
    growth_rate: number;
  }>;
}> {
  const response = await api.get('/api/admin/reports/customer-analytics/', { params })
  return response.data
}

export async function getFinancialSummary(params?: {
  start_date?: string;
  end_date?: string;
  granularity?: 'daily' | 'weekly' | 'monthly';
}): Promise<{
  total_revenue: number;
  net_revenue: number;
  gross_profit: number;
  operating_expenses: number;
  profit_margin: number;
  revenue_by_period: Array<{
    period: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
  revenue_by_source: Record<string, number>;
}> {
  const response = await api.get('/api/admin/reports/financial-summary/', { params })
  return response.data
}

export async function scheduleReport(params: ReportParams & {
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  email_recipients: string[];
}): Promise<{ id: number; message: string }> {
  const response = await api.post('/api/admin/reports/schedule/', params)
  return response.data
}

export async function getScheduledReports(): Promise<Array<{
  id: number;
  name: string;
  report_type: string;
  frequency: string;
  next_run: string;
  last_run?: string;
  status: 'active' | 'paused' | 'expired';
  email_recipients: string[];
  created_at: string;
}>> {
  const response = await api.get('/api/admin/reports/scheduled/')
  return response.data.results || response.data || []
}

export async function cancelScheduledReport(reportId: number): Promise<{ message: string }> {
  const response = await api.post(`/api/admin/reports/scheduled/${reportId}/cancel/`)
  return response.data
}
