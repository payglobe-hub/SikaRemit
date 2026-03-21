'use client'

import { CheckCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function showPaymentSuccessToast() {
  const { toast } = useToast()
  
  return toast({
    title: "Payment Successful!",
    description: "Your payment has been completed successfully.",
    action: (
      <div className="flex items-center space-x-2">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <span className="text-sm">Transaction Complete</span>
      </div>
    ),
    className: "bg-green-50 border-green-200 text-green-800",
    duration: 5000,
  } as any)
}

export function showPaymentErrorToast(error?: string) {
  const { toast } = useToast()
  
  return toast({
    title: "Payment Failed",
    description: error || "There was an error processing your payment.",
    variant: "destructive",
    duration: 5000,
  })
}
