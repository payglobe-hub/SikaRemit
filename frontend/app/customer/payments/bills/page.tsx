'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { BillTypeSelector, billTypes } from '@/components/payments/bill-type-selector'
import { UnifiedCheckout } from '@/components/payments/unified-checkout'
import { TransactionContext } from '@/lib/types/payments'
import { ArrowLeft, Zap, Home, Car, CreditCard, Smartphone, Building2, Wallet, Phone, Clock, CheckCircle, AlertTriangle, Receipt } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useQuery } from '@tanstack/react-query'
import { getRecentTransactions } from '@/lib/api/payments'
import { format } from 'date-fns'

interface BillPayment {
  id: string
  billType: string
  billerName: string
  billReference: string
  amount: number
  status: 'pending' | 'paid' | 'failed'
  dueDate: string
  paidDate?: string
}

export default function BillPaymentPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [selectedBillType, setSelectedBillType] = useState('')
  const [billerName, setBillerName] = useState('')
  const [billReference, setBillReference] = useState('')
  const [amount, setAmount] = useState('')
  const [showCheckout, setShowCheckout] = useState(false)
  const [recentBills, setRecentBills] = useState<BillPayment[]>([])
  const [savedBills, setSavedBills] = useState<BillPayment[]>([])

  // Fetch recent transactions for bill payments
  const { data: transactions } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: () => getRecentTransactions(10),
    refetchInterval: 30000,
  })

  // Extract bill payments from transactions
  useEffect(() => {
    if (transactions) {
      const billPayments = transactions
        .filter(tx => tx.type === 'bill_payment')
        .map(tx => ({
          id: tx.id,
          billType: tx.billDetails?.billType || 'unknown',
          billerName: tx.billDetails?.billerName || 'Unknown',
          billReference: tx.billDetails?.billReference || 'N/A',
          amount: tx.amount,
          status: (tx.status === 'completed' ? 'paid' : tx.status === 'failed' ? 'failed' : 'pending') as 'pending' | 'paid' | 'failed',
          dueDate: tx.created_at,
          paidDate: tx.completed_at,
        }))
      setRecentBills(billPayments)
    }
  }, [transactions])

  // Note: Bill saving functionality disabled to avoid localStorage SSR issues
  // This would need to be replaced with API-based persistence in a real application
  useEffect(() => {
    // Bill saving disabled in localStorage-free mode
    
  }, [])

  const handleProceedToPayment = () => {
    if (selectedBillType && billerName && billReference && amount) {
      // Save bill for future use
      const newBill: BillPayment = {
        id: Date.now().toString(),
        billType: selectedBillType,
        billerName,
        billReference,
        amount: parseFloat(amount) || 0,
        status: 'pending',
        dueDate: new Date().toISOString(),
      }
      setShowCheckout(true)
    } else {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
    }
  }

  const handlePaymentSuccess = (result: any) => {
    toast({
      title: "Payment Successful",
      description: "Your bill has been paid successfully",
    })
    router.push('/customer/payments/success')
  }

  const handleQuickPay = (bill: BillPayment) => {
    setSelectedBillType(bill.billType)
    setBillerName(bill.billerName)
    setBillReference(bill.billReference)
    setAmount(bill.amount.toString())
    setShowCheckout(true)
  }

  const handleDeleteSavedBill = (billId: string) => {
    const updatedBills = savedBills.filter(bill => bill.id !== billId)
    setSavedBills(updatedBills)
    // Note: localStorage disabled to avoid SSR issues
    // In a real app, this would save to API
    toast({
      title: "Bill Removed",
      description: "The saved bill has been removed (localStorage disabled for SSR safety)",
    })
  }

  const getBillTypeIcon = (billType: string) => {
    const type = billTypes.find(t => t.id === billType)
    return type?.icon || Zap
  }

  const getBillTypeColor = (billType: string) => {
    const type = billTypes.find(t => t.id === billType)
    return type?.color || 'text-gray-600'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-800"><AlertTriangle className="w-3 h-3 mr-1" />Failed</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>
    }
  }

  const transactionContext: TransactionContext = {
    type: 'bill_payment',
    amount: parseFloat(amount) || 0,
    description: `${selectedBillType} bill payment - ${billerName} (${billReference})`,
    billDetails: {
      billType: selectedBillType,
      billerName,
      billReference
    }
  }

  const isBillDetailsComplete = selectedBillType && billerName && billReference && amount

  if (showCheckout) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setShowCheckout(false)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Complete Payment</h1>
              <p className="text-muted-foreground">Review and pay your bill</p>
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
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Pay Bills</h1>
            <p className="text-muted-foreground">Pay your utility bills and services</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Bill Payment Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>New Bill Payment</CardTitle>
                <CardDescription>
                  Enter your bill details to make a payment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <BillTypeSelector
                  selectedBillType={selectedBillType}
                  onBillTypeChange={setSelectedBillType}
                  billerName={billerName}
                  onBillerNameChange={setBillerName}
                  billReference={billReference}
                  onBillReferenceChange={setBillReference}
                  amount={amount}
                  onAmountChange={setAmount}
                />

                {isBillDetailsComplete && (
                  <div className="space-y-4">
                    <Alert>
                      <Receipt className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Payment Summary:</strong> {selectedBillType} - {billerName}<br />
                        Reference: {billReference}<br />
                        Amount: {amount} GHS
                      </AlertDescription>
                    </Alert>
                    <Button
                      onClick={handleProceedToPayment}
                      className="w-full"
                      size="lg"
                    >
                      Proceed to Payment
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Saved Bills */}
            {savedBills.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Saved Bills</CardTitle>
                  <CardDescription>
                    Quick access to your frequent bills
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {savedBills.slice(0, 5).map((bill) => {
                    const Icon = getBillTypeIcon(bill.billType)
                    return (
                      <div key={bill.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                        <div className="flex items-center gap-3">
                          <Icon className={`w-4 h-4 ${getBillTypeColor(bill.billType)}`} />
                          <div>
                            <p className="font-medium text-sm">{bill.billType}</p>
                            <p className="text-xs text-muted-foreground">{bill.billerName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{bill.amount} GHS</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickPay(bill)}
                          >
                            Pay
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteSavedBill(bill.id)}
                          >
                            Ã—
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}

            {/* Recent Bill Payments */}
            {recentBills.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Payments</CardTitle>
                  <CardDescription>
                    Your recent bill payment history
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentBills.slice(0, 5).map((bill) => {
                    const Icon = getBillTypeIcon(bill.billType)
                    return (
                      <div key={bill.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Icon className={`w-4 h-4 ${getBillTypeColor(bill.billType)}`} />
                          <div>
                            <p className="font-medium text-sm">{bill.billType}</p>
                            <p className="text-xs text-muted-foreground">{bill.billerName}</p>
                            <p className="text-xs text-muted-foreground">{bill.billReference}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{bill.amount} GHS</p>
                          {getStatusBadge(bill.status)}
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(bill.dueDate), 'MMM d')}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

