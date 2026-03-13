export interface Transaction {
  id: string
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  type: 'payment' | 'refund' | 'payout'
  description?: string
  customer_email?: string
  customer_name?: string
  payment_method?: string
  created_at: string
  updated_at?: string
  recipient?: string
  destination?: string
  reference_number?: string
  // Dispute related fields
  dispute_id?: string
  dispute_status?: string
  dispute_reason?: string
  dispute_created_at?: string
}
