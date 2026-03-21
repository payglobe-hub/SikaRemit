'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { UnifiedTransferForm } from '@/components/payments/unified-transfer-form'
import { UnifiedCheckout } from '@/components/payments/unified-checkout'
import { KYCRequiredModal } from '@/components/kyc/kyc-required-modal'
import { TransactionContext } from '@/lib/types/payments'
import { getKYCStatus } from '@/lib/api/kyc'
import { DEV_CONFIG } from '@/lib/config'
import { ArrowLeft, Send } from 'lucide-react'

// Force dynamic rendering to prevent SSR issues with auth
export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export default function DomesticTransferPage() {
  const router = useRouter()
  const [showCheckout, setShowCheckout] = useState(false)
  const [transactionContext, setTransactionContext] = useState<TransactionContext | null>(null)
  const [showKYCModal, setShowKYCModal] = useState(false)

  // Fetch KYC status
  const { data: kycStatus } = useQuery({
    queryKey: ['kyc-status'],
    queryFn: getKYCStatus,
    staleTime: 5 * 60 * 1000,
  })

  // Check KYC status on mount (bypassed in development mode)
  useEffect(() => {
    if (!DEV_CONFIG.BYPASS_KYC && kycStatus && !kycStatus.is_verified) {
      setShowKYCModal(true)
    }
  }, [kycStatus])

  const handleTransferSubmit = (transactionContext: TransactionContext) => {
    setTransactionContext(transactionContext)
    setShowCheckout(true)
  }

  const handlePaymentSuccess = (result: any) => {
    router.push('/customer/payments/success')
  }

  if (showCheckout && transactionContext) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setShowCheckout(false)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Complete Domestic Transfer</h1>
              <p className="text-muted-foreground">Review and complete your domestic money transfer</p>
            </div>
          </div>

          <UnifiedCheckout
            transactionContext={transactionContext}
            onSuccess={handlePaymentSuccess}
            onCancel={() => setShowCheckout(false)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/customer/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <Send className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Send Domestically</h1>
              <p className="text-muted-foreground">Transfer money within your country</p>
            </div>
          </div>
        </div>

        {/* Domestic Transfer Form */}
        <UnifiedTransferForm
          transferMode="domestic"
          onSubmit={handleTransferSubmit}
          onCancel={() => router.push('/customer/payments')}
        />

        {/* Domestic Transfer Info */}
        <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-6 backdrop-blur-sm">
          <h3 className="font-semibold mb-4">Domestic Transfer Benefits</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Processing Time</div>
              <div className="font-semibold">Instant to 24 hours</div>
            </div>
            <div>
              <div className="text-muted-foreground">Transfer Fee</div>
              <div className="font-semibold">Lower fees</div>
            </div>
            <div>
              <div className="text-muted-foreground">Supported Methods</div>
              <div className="font-semibold">All local methods</div>
            </div>
          </div>
        </div>
      </div>

      {/* KYC Required Modal */}
      <KYCRequiredModal
        open={showKYCModal}
        onClose={() => setShowKYCModal(false)}
        kycStatus={kycStatus?.is_verified ? 'approved' : 'not_submitted'}
      />
    </div>
  )
}
