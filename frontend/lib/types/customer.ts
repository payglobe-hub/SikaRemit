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

export interface CustomerProfile {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string
  country: string
  kyc_status: 'pending' | 'verified' | 'rejected'
  created_at: string
}

export interface SupportTicket {
  id: string
  subject: string
  category: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'waiting_for_customer' | 'resolved' | 'closed'
  description: string
  created_at: string
  updated_at: string
  messages?: SupportMessage[]
}

export interface SupportMessage {
  id: string
  ticket_id: string
  message: string
  sender: 'customer' | 'support'
  created_at: string
}
