
'use client'

import { useSession } from '@/lib/auth/session-provider'
import { useAuth } from '@/lib/auth/context'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Send,
  Receipt,
  CreditCard,
  TrendingUp,
  DollarSign,
  ArrowRight,
  History,
  Settings,
  Download,
  Wallet,
  Smartphone,
  Building2,
  Globe,
  Wifi,
  ArrowDownToLine
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useRealtimeUpdates } from '@/lib/hooks/useRealtimeUpdates'
import { getCustomerPayments, getCustomerReceipts, getAccountBalance, getCustomerStats, CustomerStats } from '@/lib/api/customer'
import type { Payment, Receipt as ReceiptType, AccountBalance } from '@/lib/types/customer'
import { useEffect } from 'react'
import { useCurrency } from '@/hooks/useCurrency'

export const dynamic = 'force-dynamic'

export default function CustomerDashboard() {
  const session = useSession()
  const { user, userTypeInfo, loading } = useAuth()
  const status = session.status

  // Enable real-time updates (disabled for now)
  // const { isConnected } = useRealtimeUpdates('dashboard')

  const { formatAmount, formatAmountFromBase, currency } = useCurrency()

  const { data: recentPayments } = useQuery<Payment[]>({
    queryKey: ['customer-payments'],
    queryFn: getCustomerPayments,
    select: (data) => data?.slice(0, 5) // Get only recent 5 payments
  })

  const { data: recentReceipts } = useQuery<ReceiptType[]>({
    queryKey: ['customer-receipts'],
    queryFn: getCustomerReceipts,
    select: (data) => data?.slice(0, 3) // Get only recent 3 receipts
  })

  const { data: accountBalance } = useQuery<AccountBalance>({
    queryKey: ['account-balance'],
    queryFn: getAccountBalance
  })

  const { data: customerStats } = useQuery<CustomerStats>({
    queryKey: ['customer-stats'],
    queryFn: getCustomerStats
  })

  useEffect(() => {
    // Token storage disabled - using cookie-based auth system instead
    // No localStorage access needed
  }, [session])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
            <DollarSign className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">Loading your dashboard</h2>
            <p className="text-muted-foreground">Please wait while we verify your account...</p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated' && !user) {
    redirect('/auth')
    return null
  }

  if (user && user.role !== 'customer') {
    const roleRedirects = {
      admin: '/admin/overview',
      merchant: '/merchant/dashboard',
      customer: '/customer/dashboard'
    };
    const redirectPath = roleRedirects[user.role as keyof typeof roleRedirects] || '/auth';
    redirect(redirectPath);
    return null;
  }

  const quickActions = [
    {
      title: 'Deposit',
      description: 'Add funds to your balance instantly',
      icon: Wallet,
      href: '/customer/payments/top-up',
      iconColor: 'bg-emerald-500/10 text-emerald-500'
    },
    {
      title: 'Withdraw',
      description: 'Withdraw to Mobile Money or Bank',
      icon: ArrowDownToLine,
      href: '/customer/payments/withdraw',
      iconColor: 'bg-red-500/10 text-red-500'
    },
    {
      title: 'Transfer',
      description: 'Transfer money within the same country',
      icon: Send,
      href: '/customer/payments/domestic',
      iconColor: 'bg-blue-500/10 text-blue-500'
    },
    // Temporarily hidden - no permission for international transfers
    // {
    //   title: 'Send International',
    //   description: 'Transfer money across borders',
    //   icon: Globe,
    //   href: '/customer/payments/cross-border',
    //   iconColor: 'bg-green-500/10 text-green-500'
    // },
    {
      title: 'Buy Airtime',
      description: 'Purchase airtime for any network',
      icon: Smartphone,
      href: '/customer/payments/airtime',
      iconColor: 'bg-orange-500/10 text-orange-500'
    },
    {
      title: 'Buy Data Bundle',
      description: 'Buy data packages for internet access',
      icon: Wifi,
      href: '/customer/payments/data',
      iconColor: 'bg-cyan-500/10 text-cyan-500'
    },
    {
      title: 'Pay Bills',
      description: 'Pay utilities, taxes, loans, and other bills',
      icon: Receipt,
      href: '/customer/payments/bills',
      iconColor: 'bg-indigo-500/10 text-indigo-500'
    }
  ]

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
          {/* Header */}
          <div className="mb-6 sm:mb-8 lg:mb-10">
            <div className="mb-4 sm:mb-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-2">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-2xl flex items-center justify-center shadow-soft">
                    <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-foreground truncate">
                      Welcome back, {(session?.user as any)?.firstName || 'Customer'}!
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Your financial dashboard awaits
                    </p>
                    {userTypeInfo && (
                      <div className="mt-3">
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                          <span>{userTypeInfo.icon}</span>
                          {userTypeInfo.label}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-sm">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-full border border-border/50">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
                    <span className="text-muted-foreground">System Online</span>
                  </div>
                  <div className="text-muted-foreground text-xs sm:text-sm">
                    {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Balance Card */}
          <div className="mb-6 sm:mb-10">
            <div className="relative overflow-hidden rounded-xl p-6 bg-gradient-to-br from-primary to-accent text-white shadow-xl">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-12 translate-x-12"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-8 -translate-x-8"></div>
              <div className="relative">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <Wallet className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm text-white/70">Available Balance</p>
                        <p className="text-xs text-white/50 uppercase tracking-wide">{currency}</p>
                      </div>
                    </div>
                    <div className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
                      {formatAmountFromBase(accountBalance?.available || 0, 'GHS')}
                    </div>
                  </div>
                  <div className="text-left sm:text-right space-y-2 sm:space-y-4">
                    <div>
                      <p className="text-sm text-white/60">Pending</p>
                      <p className="text-2xl font-semibold">
                        {formatAmountFromBase(accountBalance?.pending || 0, 'GHS')}
                      </p>
                    </div>
                    <p className="text-xs text-white/40">
                      Updated: {accountBalance?.last_updated ? new Date(accountBalance.last_updated).toLocaleString() : 'Just now'}
                    </p>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-white/20">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 text-sm">
                    <span className="text-white/70">Quick Stats</span>
                    <div className="flex items-center gap-4 sm:gap-6">
                      <div className="text-center">
                        <div className="font-semibold text-lg">{customerStats?.transactions_this_month || 0}</div>
                        <div className="text-xs text-white/60">This Month</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-lg">{customerStats?.success_rate?.toFixed(1) || 0}%</div>
                        <div className="text-xs text-white/60">Success Rate</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-6 sm:mb-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-foreground mb-1">Quick Actions</h2>
                <p className="text-muted-foreground text-sm">Everything you need, just one click away</p>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-success/10 rounded-full">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-success">All Systems Operational</span>
              </div>
            </div>
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {quickActions.map((action) => (
                <Link key={action.title} href={action.href} className="block">
                  <div className="bg-card rounded-xl border border-border/50 p-4 cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg h-full">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${action.iconColor} flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-110 transition-transform duration-200`}>
                      <action.icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold text-foreground text-xs sm:text-sm mb-1 group-hover:text-primary transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed hidden sm:block">
                      {action.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Activity Section */}
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {/* Recent Transactions */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="border-b border-border p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                        <History className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-foreground text-base sm:text-lg">Recent Transactions</CardTitle>
                        <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Your latest payment activity</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                      <Link href="/customer/transactions">View All</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  {!recentPayments || recentPayments.length === 0 ? (
                    <div key="no-payments" className="text-center py-12">
                      <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <History className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-foreground font-medium mb-1">No transactions yet</p>
                      <p className="text-sm text-muted-foreground">Start by sending money or paying a bill</p>
                    </div>
                  ) : (
                    <div key="payments-list" className="space-y-2 sm:space-y-3">
                      {recentPayments.map((payment, index) => (
                        <div key={payment.id || `payment-${index}`} className="flex items-center justify-between p-4 rounded-xl bg-muted/50 transition-colors hover:bg-muted">
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              payment.status === 'completed'
                                ? 'bg-success/10 text-success'
                                : payment.status === 'pending'
                                ? 'bg-warning/10 text-warning'
                                : 'bg-error/10 text-error'
                            }`}>
                              <DollarSign className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{formatAmountFromBase(payment.amount, 'GHS')}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(payment.created_at).toLocaleDateString()} • To: {payment.merchant}
                              </p>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            payment.status === 'completed'
                              ? 'bg-success/10 text-success'
                              : payment.status === 'pending'
                              ? 'bg-warning/10 text-warning'
                              : 'bg-error/10 text-error'
                          }`}>
                            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Receipts */}
            <div className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader className="border-b border-border p-4 sm:p-6">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-secondary/10 rounded-xl flex items-center justify-center">
                      <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />
                    </div>
                    <div>
                      <CardTitle className="text-foreground text-base sm:text-lg">Recent Receipts</CardTitle>
                      <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Your latest receipts</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  {!recentReceipts || recentReceipts.length === 0 ? (
                    <p key="no-receipts" className="text-sm text-muted-foreground text-center py-4">No receipts yet</p>
                  ) : (
                    <div key="receipts-list" className="space-y-3">
                      {recentReceipts.map((receipt, index) => (
                        <div key={receipt.id || `receipt-${index}`} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                          <span className="font-medium text-foreground">{formatAmountFromBase(receipt.amount, 'GHS')}</span>
                          <Button variant="ghost" size="sm" asChild className="text-secondary hover:text-secondary hover:bg-secondary/10">
                            <a href={receipt.download_url} download className="flex items-center gap-1">
                              <Download className="h-3 w-3" />
                              Download
                            </a>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )
    }
