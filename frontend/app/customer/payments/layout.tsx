'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, CreditCard, Send, Receipt, Download, Globe, FileText, Wallet, Smartphone, Settings, Wifi, ArrowDownToLine } from 'lucide-react'

export default function PaymentsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isMainPaymentsPage = pathname === '/customer/payments'

  return (
    <div className="min-h-screen">
      <div className="container py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/customer/dashboard" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sikaremit-foreground">
              <CreditCard className="h-5 w-5 text-sikaremit-primary" />
              Payment Flows
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isMainPaymentsPage && (
              <nav className="flex gap-2 mb-6 flex-wrap">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/customer/payments/domestic" className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Send Money Locally
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/customer/payments/cross-border" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Send Money Internationally
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/customer/payments/top-up" className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Deposit
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/customer/payments/withdraw" className="flex items-center gap-2">
                    <ArrowDownToLine className="h-4 w-4" />
                    Withdraw
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/customer/payments/bills" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Pay Bills
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/customer/payments/airtime" className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Airtime
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/customer/payments/data" className="flex items-center gap-2">
                    <Wifi className="h-4 w-4" />
                    Data
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/customer/payments/checkout" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Checkout
                  </Link>
                </Button>
              </nav>
            )}
            <div className="space-y-4">
              {children}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
