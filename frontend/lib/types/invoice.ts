export interface Invoice {
  id: string
  invoice_number: string
  customer_name: string
  customer_email: string
  amount: number
  currency: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  due_date: string
  created_at: string
  items: InvoiceItem[]
}

export interface InvoiceItem {
  description: string
  quantity: number
  unit_price: number
  total: number
}

export interface CreateInvoiceData {
  customer_name: string
  customer_email: string
  customer_phone?: string
  customer_address?: string
  due_date: string
  items: Array<{
    description: string
    quantity: number
    unit_price: number
  }>
  tax_rate?: number
  payment_terms?: string
  notes?: string
}

export const PAYMENT_TERMS = [
  { value: 'net_15', label: 'Net 15' },
  { value: 'net_30', label: 'Net 30' },
  { value: 'net_60', label: 'Net 60' },
  { value: 'due_on_receipt', label: 'Due on Receipt' },
]

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: 'gray',
  sent: 'blue',
  paid: 'green',
  overdue: 'red',
  cancelled: 'gray',
}
