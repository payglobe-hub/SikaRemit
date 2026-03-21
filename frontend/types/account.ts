export interface AccountBalance {
  available: number
  pending: number
  currency: string
  lastUpdated: string
}

export interface AccountDetails {
  id: string
  accountNumber: string
  accountType: string
  status: 'active' | 'suspended' | 'closed'
  createdAt: string
}
