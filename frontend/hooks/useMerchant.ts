import { useEffect, useState } from 'react'
import { getMerchant } from '@/lib/api/merchant'
import { Merchant, MerchantPaymentLimits } from '@/lib/types/merchant'
import { formatCurrency } from '@/lib/utils/currency'

export function useMerchant(merchantId: string) {
  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [limits, setLimits] = useState<MerchantPaymentLimits | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchMerchantData = async () => {
      try {
        const data = await getMerchant(merchantId)
        
        const merchant: Merchant = {
          id: data.id,
          name: data.name || '',
          email: data.email,
          business_name: data.business_name || data.businessName || '',
          status: data.status || 'active',
          created_at: data.created_at || new Date().toISOString(),
          balance: data.balance || 0,
          available_balance: data.available_balance || data.balance || 0,
          pending_balance: data.pending_balance || 0,
          verificationStatus: data.verificationStatus,
          totalRevenue: data.totalRevenue,
          default_payout_method: data.default_payout_method ? {
            id: data.default_payout_method.id,
            type: data.default_payout_method.type as 'bank' | 'mobile_money',
            verified: Boolean(data.default_payout_method.verified)
          } : undefined
        }
        
        setMerchant(merchant)
        
        setLimits({
          daily_limit: data.daily_limit || 10000,
          monthly_limit: data.monthly_limit || 100000,
          per_transaction_limit: data.per_transaction_limit || 5000,
          daily_used: data.daily_used || 0,
          monthly_used: data.monthly_used || 0,
          currency: data.currency || 'USD'
        })
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load merchant'))
      } finally {
        setLoading(false)
      }
    }

    fetchMerchantData()
  }, [merchantId])

  return { merchant, limits, loading, error }
}
