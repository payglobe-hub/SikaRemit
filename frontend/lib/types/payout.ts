export interface Payout {
  id: string
  merchant_id: string
  amount: number
  currency: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  processed_at?: string
  payment_method: string
  reference?: string
}

export interface WebhookEvent {
  id: string
  type: string
  event_type?: string
  payout_id?: string
  data: any
  timestamp: string
  signature?: string
}
