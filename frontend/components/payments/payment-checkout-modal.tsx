'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { UnifiedCheckout } from '@/components/payments/unified-checkout'
import { TransactionContext } from '@/lib/types/payments'
import { useToast } from '@/hooks/use-toast'

interface PaymentCheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  transactionContext: TransactionContext
}

export function PaymentCheckoutModal({ isOpen, onClose, transactionContext }: PaymentCheckoutModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const { toast } = useToast()

  const handlePaymentSuccess = (result: any) => {
    setIsProcessing(false)
    setShowSuccess(true)
    
    // Show success toast
    toast({
      title: "Payment Successful!",
      description: "Your payment has been completed successfully.",
    })

    // Auto-close after 3 seconds
    setTimeout(() => {
      setShowSuccess(false)
      onClose()
    }, 3000)
  }

  const handlePaymentError = (error: any) => {
    setIsProcessing(false)
    toast({
      title: "Payment Failed",
      description: error.message || "There was an error processing your payment.",
      variant: "destructive",
    })
  }

  const handleProcessingStart = () => {
    setIsProcessing(true)
  }

  if (showSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center space-y-6 py-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            
            <div className="space-y-2">
              <DialogTitle className="text-xl font-semibold text-green-800">
                Payment Successful!
              </DialogTitle>
              <DialogDescription className="text-green-700">
                Your payment has been processed and sent to the recipient
              </DialogDescription>
            </div>

            <div className="grid gap-4 text-sm">
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-green-800">Transaction Complete</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Clock className="w-4 h-4 text-green-600" />
                <span className="text-green-800">Processing Time: Instant</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-green-600" />
                <span className="text-green-800">Security: Encrypted</span>
              </div>
            </div>

            <Button 
              onClick={onClose}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <DialogTitle>Complete Payment</DialogTitle>
              <DialogDescription>
                Review and complete your payment
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold">
                    {transactionContext.currency} {transactionContext.amount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Description</span>
                  <span className="font-medium">{transactionContext.description}</span>
                </div>
                {transactionContext.merchantDetails && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Merchant</span>
                    <span className="font-medium">ID: {transactionContext.merchantDetails.merchantId}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Processing Fee</span>
                  <Badge variant="secondary">Free</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <UnifiedCheckout
            transactionContext={transactionContext}
            onSuccess={handlePaymentSuccess}
            onCancel={onClose}
            showSummary={false}
          />

          {/* Security Notice */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <h4 className="font-semibold mb-1">Secure Payment</h4>
                  <p className="text-blue-700">
                    Your payment is protected by industry-standard encryption and security measures.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
