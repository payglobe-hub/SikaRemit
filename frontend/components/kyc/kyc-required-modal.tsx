'use client'

import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ShieldCheck, Clock, XCircle, CheckCircle } from 'lucide-react'

interface KYCRequiredModalProps {
  open: boolean
  onClose: () => void
  kycStatus?: 'pending' | 'approved' | 'rejected' | 'not_submitted' | null
}

export function KYCRequiredModal({ open, onClose, kycStatus = 'not_submitted' }: KYCRequiredModalProps) {
  const router = useRouter()

  const getStatusContent = () => {
    switch (kycStatus) {
      case 'pending':
        return {
          icon: Clock,
          iconColor: 'text-yellow-500',
          iconBg: 'bg-yellow-100',
          title: 'Verification In Progress',
          message: 'Your KYC verification is being reviewed. This usually takes 1-2 business days. We\'ll notify you once it\'s approved.',
          buttonText: 'Check Status',
          showButton: true,
        }
      case 'rejected':
        return {
          icon: XCircle,
          iconColor: 'text-red-500',
          iconBg: 'bg-red-100',
          title: 'Verification Rejected',
          message: 'Your KYC verification was rejected. Please review the feedback and submit your documents again.',
          buttonText: 'Resubmit Documents',
          showButton: true,
        }
      case 'approved':
        return {
          icon: CheckCircle,
          iconColor: 'text-green-500',
          iconBg: 'bg-green-100',
          title: 'Verification Complete',
          message: 'Your identity has been verified. You can now send money locally and internationally.',
          buttonText: 'Continue',
          showButton: false,
        }
      case 'not_submitted':
      default:
        return {
          icon: ShieldCheck,
          iconColor: 'text-purple-500',
          iconBg: 'bg-purple-100',
          title: 'Verify Your Identity',
          message: 'To send money locally or internationally, you need to complete identity verification. This helps us keep your account secure and comply with regulations.',
          buttonText: 'Verify Now',
          showButton: true,
        }
    }
  }

  const content = getStatusContent()
  const IconComponent = content.icon

  const handleVerifyNow = () => {
    onClose()
    router.push('/customer/kyc')
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className={`w-16 h-16 rounded-full ${content.iconBg} flex items-center justify-center`}>
              <IconComponent className={`w-8 h-8 ${content.iconColor}`} />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">{content.title}</DialogTitle>
          <DialogDescription className="text-center">
            {content.message}
          </DialogDescription>
        </DialogHeader>

        {kycStatus === 'not_submitted' && (
          <div className="space-y-3 my-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span className="text-sm">Send money locally & internationally</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span className="text-sm">Higher transaction limits</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span className="text-sm">Enhanced account security</span>
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          {content.showButton && (
            <Button onClick={handleVerifyNow} className="w-full">
              <ShieldCheck className="w-4 h-4 mr-2" />
              {content.buttonText}
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} className="w-full">
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
