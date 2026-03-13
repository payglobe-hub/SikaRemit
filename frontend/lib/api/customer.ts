import api from '@/lib/api/axios'

export interface Payment {
  id: string
  amount: number
  currency: string
  status: string
  merchant: string
  description: string
  created_at: string
  payment_method: string
}

export interface Receipt {
  id: string
  payment_id: string
  amount: number
  currency: string
  merchant: string
  date: string
  receipt_number: string
  download_url: string
}

export interface AccountBalance {
  available: number
  pending: number
  currency: string
  last_updated: string
}

export interface CustomerStatement {
  id: number
  period_name: string
  start_date: string
  end_date: string
  format: string
  status: 'generating' | 'completed' | 'failed'
  transaction_count: number
  opening_balance: number
  closing_balance: number
  created_at: string
  file_url?: string
  file_size?: number
}

export interface StatementParams {
  start_date: string
  end_date: string
  format: 'pdf' | 'excel'
  include_charts?: boolean
}

export interface StatementPreview {
  period_name: string
  start_date: string
  end_date: string
  opening_balance: number
  closing_balance: number
  net_change: number
  transaction_count: number
  recent_transactions: Array<{
    date: string
    description: string
    category: string
    amount: number
  }>
  spending_categories: Array<{
    name: string
    amount: number
    percentage: number
  }>
}

export async function getCustomerPayments(params?: any): Promise<Payment[]> {
  const response = await api.get('/api/v1/accounts/customers/payments/', { params })
  return response.data.data || response.data.results || response.data || []
}

export async function getCustomerReceipts(): Promise<Receipt[]> {
  const response = await api.get('/api/v1/accounts/customers/receipts/')

  const data = response.data
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.results)) return data.results
  if (Array.isArray(data?.receipts)) return data.receipts
  return []
}

export async function getAccountBalance(): Promise<AccountBalance> {
  const response = await api.get('/api/v1/accounts/customers/balance/')
  return response.data.data || response.data
}

export async function getCurrentCustomerProfile() {
  const response = await api.get('/api/v1/accounts/customers/profile/')
  return response.data.data || response.data
}

export async function updateCustomerProfile(data: any) {
  const response = await api.patch('/api/v1/accounts/customers/profile/', data)
  return response.data
}

// Support Ticket API functions
export async function getSupportTickets(): Promise<any[]> {
  const response = await api.get('/api/v1/accounts/customers/support-tickets/')
  return response.data.results || response.data
}

export async function getSupportTicket(ticketId: string): Promise<any> {
  const response = await api.get(`/api/v1/accounts/customers/support-tickets/${ticketId}/`)
  return response.data
}

export async function createSupportTicket(data: any): Promise<any> {
  const response = await api.post('/api/v1/accounts/customers/support-tickets/', data)
  return response.data
}

export async function addSupportMessage(ticketId: string, message: string): Promise<any> {
  const response = await api.post(
    `/api/v1/accounts/customers/support-tickets/${ticketId}/messages/`,
    { message }
  )
  return response.data
}

export interface CustomerStats {
  transactions_this_month: number;
  success_rate: number;
  total_transactions: number;
  completed_transactions: number;
  failed_transactions: number;
}

export async function getCustomerStats(): Promise<CustomerStats> {
  const response = await api.get('/api/v1/accounts/customers/stats/')
  return response.data.data || response.data
}

export async function getCustomerStatements(): Promise<CustomerStatement[]> {
  const response = await api.get('/api/v1/accounts/customers/statements/')
  return response.data.results || response.data || []
}

export async function generateCustomerStatement(params: StatementParams): Promise<CustomerStatement> {
  const response = await api.post('/api/v1/accounts/customers/statements/generate/', params)
  return response.data
}

export async function getStatementPreview(params: StatementParams): Promise<StatementPreview> {
  const response = await api.post('/api/v1/accounts/customers/statements/preview/', params)
  return response.data
}

export async function downloadCustomerStatement(statementId: number): Promise<Blob> {
  const response = await api.get(`/api/v1/accounts/customers/statements/${statementId}/download/`, {
    responseType: 'blob'
  })
  return new Blob([response.data])
}

export async function getCustomerTransactions(params?: {
  start_date?: string;
  end_date?: string;
  category?: string;
  status?: string;
  page?: number;
}): Promise<{
  results: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    merchant: string;
    description: string;
    created_at: string;
    payment_method: string;
    category: string;
    type: 'credit' | 'debit';
  }>;
  count: number;
  next?: string;
  previous?: string;
}> {
  const response = await api.get('/api/v1/accounts/customers/transactions/', { params })
  return response.data
}

export async function getCustomerSpendingByCategory(params?: {
  start_date?: string;
  end_date?: string;
}): Promise<Array<{
  category: string;
  amount: number;
  percentage: number;
  transaction_count: number;
}>> {
  const response = await api.get('/api/v1/accounts/customers/spending-by-category/', { params })
  return response.data
}

export async function getCustomerBalanceHistory(params?: {
  start_date?: string;
  end_date?: string;
  granularity?: 'daily' | 'weekly' | 'monthly';
}): Promise<Array<{
  date: string;
  balance: number;
  change: number;
  change_percentage: number;
}>> {
  const response = await api.get('/api/v1/accounts/customers/balance-history/', {
    params: {
      granularity: 'daily',
      ...params
    }
  })
  return response.data
}
