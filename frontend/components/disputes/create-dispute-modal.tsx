'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, AlertTriangle, Clock, CheckCircle, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCustomerTransactions } from '@/lib/api/transactions'
import { createDispute } from '@/lib/api/customer-disputes'
import { Transaction } from '@/types/transaction'
import { useToast } from '@/hooks/use-toast'

interface CreateDisputeModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateDisputeModal({ isOpen, onClose }: CreateDisputeModalProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [disputeReason, setDisputeReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch customer's completed transactions
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['customer-transactions', { status: 'completed' }],
    queryFn: () => getCustomerTransactions({ status: 'completed' }),
    enabled: isOpen
  })

  // Create dispute mutation
  const createDisputeMutation = useMutation({
    mutationFn: createDispute,
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: 'Dispute created successfully!'
      })
      queryClient.invalidateQueries({ queryKey: ['customer-disputes'] })
      handleClose()
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create dispute',
        variant: 'destructive'
      })
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedTransaction) {
      toast({
        title: 'Error',
        description: 'Please select a transaction',
        variant: 'destructive'
      })
      return
    }

    if (!disputeReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for the dispute',
        variant: 'destructive'
      })
      return
    }

    if (disputeReason.length < 50) {
      toast({
        title: 'Error',
        description: 'Please provide more details about the dispute (minimum 50 characters)',
        variant: 'destructive'
      })
      return
    }

    setIsSubmitting(true)
    
    try {
      await createDisputeMutation.mutateAsync({
        transaction: selectedTransaction.id.toString(),
        reason: disputeReason.trim(),
        dispute_type: 'customer_merchant'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setSelectedTransaction(null)
    setDisputeReason('')
    setIsSubmitting(false)
    onClose()
  }

  const transactions = transactionsData?.results || []

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <DialogTitle>Create a Dispute</DialogTitle>
              <DialogDescription>
                File a dispute for a transaction that needs resolution
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Important Information */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Before you create a dispute:</strong> Only completed transactions can be disputed. Provide detailed information about the issue. The merchant will have 48 hours to respond.
            </AlertDescription>
          </Alert>

          {/* Transaction Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Transaction</CardTitle>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                  <p className="mt-2 text-muted-foreground">Loading transactions...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No completed transactions available for dispute</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {transactions.map((transaction: Transaction) => (
                    <label
                      key={transaction.id}
                      className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedTransaction?.id === transaction.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="transaction"
                        value={transaction.id}
                        checked={selectedTransaction?.id === transaction.id}
                        onChange={() => setSelectedTransaction(transaction)}
                        className="mr-4"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">
                              {transaction.description || 'Payment'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {transaction.recipient || 'Merchant'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              ${transaction.amount} {transaction.currency}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(transaction.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dispute Reason */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dispute Reason</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="reason" className="block text-sm font-medium mb-2">
                  Please describe the issue in detail *
                </label>
                <textarea
                  id="reason"
                  rows={4}
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Provide detailed information about what went wrong, including any relevant dates, communications, or evidence..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  {disputeReason.length}/500 characters (minimum 50)
                </p>
              </div>

              {/* Common Dispute Reasons */}
              <div>
                <p className="text-sm font-medium mb-2">
                  Common dispute reasons (click to add):
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Product not as described',
                    'Service not delivered',
                    'Wrong item received',
                    'Quality issues',
                    'Billing discrepancy',
                    'Delivery problems'
                  ].map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => {
                        const newReason = disputeReason 
                          ? `${disputeReason}\n\n${reason}` 
                          : reason
                        setDisputeReason(newReason)
                      }}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !selectedTransaction || !disputeReason.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Dispute...
                </>
              ) : (
                'Create Dispute'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
