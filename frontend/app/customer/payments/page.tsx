'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CreditCard, TrendingUp, Shield, Users, Receipt, Smartphone, Building2, Globe, Bitcoin } from 'lucide-react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { getAvailablePaymentMethods } from '@/lib/api/payments'
import { PaymentCheckoutModal } from '@/components/payments/payment-checkout-modal'
import { useState } from 'react'
import { TransactionContext, TransactionType } from '@/lib/types/payments'

// Force dynamic rendering to prevent SSR issues with auth
export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export default function PaymentsPage() {
  // Fetch available payment methods to display category overview
  const { data: availableMethodsResponse } = useQuery({
    queryKey: ['available-payment-methods'],
    queryFn: getAvailablePaymentMethods,
  })

  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false)
  const [checkoutTransaction, setCheckoutTransaction] = useState<TransactionContext | null>(null)

  const availableMethods = availableMethodsResponse?.success ? availableMethodsResponse.data : {}

  const handlePaymentTypeClick = (type: TransactionType) => {
    // Create transaction context for checkout modal
    const transactionContext: TransactionContext = {
      type: type,
      amount: 100, // Default amount - user will modify in modal
      currency: 'GHS',
      description: `${type.replace('_', ' ').toUpperCase()} Payment`,
    }

    setCheckoutTransaction(transactionContext)
    setIsCheckoutModalOpen(true)
  }

  // Create dynamic payment categories from available methods
  const paymentCategories = Object.keys(availableMethods || {}).map(categoryId => {
    const methods = (availableMethods as any)?.[categoryId] || []
    const categoryConfig: Record<string, { icon: React.ReactNode, title: string, description: string }> = {
      sikaRemit_balance: { icon: <Receipt className="h-6 w-6 text-emerald-600" />, title: 'SikaRemit Balance', description: 'Pay with your account balance' },
      sikaremit_balance: { icon: <Receipt className="h-6 w-6 text-emerald-600" />, title: 'SikaRemit Balance', description: 'Pay with your account balance' },
      credit_debit_cards: { icon: <CreditCard className="h-6 w-6 text-blue-600" />, title: 'Credit/Debit Cards', description: 'Visa, Mastercard, American Express' },
      bank_transfers: { icon: <Building2 className="h-6 w-6 text-green-600" />, title: 'Bank Transfers', description: 'Direct bank account transfers' },
      mobile_money_ghana: { icon: <Smartphone className="h-6 w-6 text-orange-600" />, title: 'Mobile Money Ghana', description: 'MTN, AirtelTigo, Telecel payments' },
      paypal: { icon: <Globe className="h-6 w-6 text-indigo-600" />, title: 'PayPal', description: 'International PayPal payments' },
      cryptocurrency: { icon: <Bitcoin className="h-6 w-6 text-indigo-600" />, title: 'Cryptocurrency', description: 'Bitcoin, Ethereum, and crypto' },
      qr_code: { icon: <Smartphone className="h-6 w-6 text-cyan-600" />, title: 'QR Code Payments', description: 'Scan QR codes to pay merchants' }
    }

    const config = categoryConfig[categoryId as keyof typeof categoryConfig] || {
      icon: <CreditCard className="h-6 w-6 text-gray-600" />,
      title: categoryId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: `${methods.length} payment option${methods.length !== 1 ? 's' : ''} available`
    }

    return {
      icon: config.icon,
      title: config.title,
      description: config.description,
      available: methods.length > 0,
      gateways: Array.from(new Set((Array.isArray(methods) ? methods : []).reduce((acc, method) => acc.concat(method.available_gateways || []), []))) as string[]
    }
  })

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-sikaremit-foreground mb-1 sm:mb-2">Payment Services</h1>
          <p className="text-sikaremit-muted text-sm sm:text-base">
            Choose from our payment solutions
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/customer/transactions" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            View Transactions
          </Link>
        </Button>
      </div>

      {/* Payment Method Categories Overview */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {paymentCategories.map((category, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                {category.icon}
                {category.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-xs mb-2">
                {category.description}
              </CardDescription>
              <div className="flex flex-wrap gap-1">
                {category.gateways.map((gateway, gIndex) => (
                  <span
                    key={gIndex}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary"
                  >
                    {gateway}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Features Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Fast Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              Instant transfers and payments with real-time processing
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              Secure & Compliant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              Bank-level security with full regulatory compliance
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" />
              Global Reach
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              Send money worldwide with competitive exchange rates
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-orange-600" />
              Hierarchical Structure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              Organized payment methods with intelligent gateway selection
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Call to Action */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Ready to Make a Payment?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start your transaction with our improved payment experience
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => handlePaymentTypeClick('transfer_domestic')}>
                Transfer Money
              </Button>
              <Button variant="outline" onClick={() => handlePaymentTypeClick('merchant_checkout')}>
                Send Payment
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Checkout Modal */}
      <PaymentCheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        transactionContext={checkoutTransaction!}
      />
    </div>
  )
}
