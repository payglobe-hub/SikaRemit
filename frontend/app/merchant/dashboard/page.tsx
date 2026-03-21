'use client'

import { DollarSign, TrendingUp, Wallet, Activity, BarChart3, CreditCard, CheckCircle, ArrowRight } from 'lucide-react'
import { useSafeAuth, useSafeSession } from '@/lib/auth/safe-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { getMerchantDashboard } from '@/lib/api/merchant'
import { useCurrency } from '@/hooks/useCurrency'
import { QUICK_ACTIONS } from '@/lib/constants/merchant-ui'
import RecentTransactions from '@/components/merchant/recent-transactions'
import { RevenueChart, SalesChart, ChartWrapper } from '@/components/lazy/LazyCharts'
import { useAuth } from '@/lib/auth/context'
import { useSession } from '@/lib/auth/session-provider'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export default function MerchantDashboard() {
  const session = useSafeSession()
  const { userTypeInfo } = useSafeAuth()
  const { formatAmount } = useCurrency()

  const { data: dashboardData } = useQuery({
    queryKey: ['merchant-dashboard'],
    queryFn: getMerchantDashboard,
    refetchInterval: 30000
  })

  const stats = [
    {
      title: 'Revenue',
      value: formatAmount(dashboardData?.overview?.total_revenue || 0),
      icon: DollarSign,
      gradient: 'from-blue-600 to-blue-500',
      bgGradient: 'from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20',
      trend: '',
      change: ''
    },
    {
      title: 'Today',
      value: formatAmount(0),
      icon: TrendingUp,
      gradient: 'from-emerald-600 to-emerald-500',
      bgGradient: 'from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20',
      trend: '',
      change: ''
    },
    {
      title: 'Balance',
      value: formatAmount(dashboardData?.overview?.pending_payouts || 0),
      icon: Wallet,
      gradient: 'from-indigo-600 to-indigo-500',
      bgGradient: 'from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20',
      trend: 'Available',
      change: 'Ready to withdraw'
    },
    {
      title: 'Transactions',
      value: dashboardData?.overview?.total_transactions || 0,
      icon: CreditCard,
      gradient: 'from-sky-600 to-sky-500',
      bgGradient: 'from-sky-50 to-blue-50 dark:from-sky-950/20 dark:to-blue-950/20',
      trend: 'This month',
      change: 'Active payments'
    }
  ]

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6">
      {/* Dashboard Header - Compact, data-focused */}
      <div className="relative overflow-hidden rounded-xl p-6 bg-gradient-to-br from-primary to-blue-700 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24" />
        <div className="relative z-10">
          <p className="text-blue-100 text-sm font-medium">Welcome back,</p>
          <h1 className="text-xl sm:text-2xl font-bold mt-1">{session?.user?.name || 'Merchant'}</h1>
          <p className="text-blue-200 text-sm mt-1">Here's your business overview</p>
          {userTypeInfo && (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 mt-3 rounded-full text-xs font-medium bg-white/20 text-white`}>
              <span>{userTypeInfo.icon}</span>
              {userTypeInfo.label}
            </span>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <section>
        <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4">Key Metrics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="group hover:shadow-lg hover:border-primary/50 transition-all duration-300 relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-0 group-hover:opacity-100 transition-all duration-500`} />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.gradient}`}>
                  <stat.icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                {stat.trend && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                      stat.trend.includes('+') ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      stat.trend.includes('Available') ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {stat.trend}
                    </span>
                    {stat.change && <span className="text-xs text-muted-foreground">{stat.change}</span>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.title} href={action.href}>
              <Card className="group hover:shadow-lg hover:border-primary/50 transition-all duration-300 h-full">
                <CardContent className="p-4 sm:p-5">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200">
                    <Activity className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {action.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Analytics */}
      <section>
        <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4">Analytics & Insights</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Revenue Trends</CardTitle>
                  <CardDescription>Monthly revenue performance</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-72 w-full">
                <ChartWrapper title="Revenue Trends">
                  <RevenueChart />
                </ChartWrapper>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Activity className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
                  <CardDescription>Latest transactions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-72">
                <RecentTransactions />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-4 sm:mt-6">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Performance Overview</CardTitle>
                <CardDescription>Sales analytics and business insights</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-72 w-full">
              <ChartWrapper title="Sales Analytics">
                <SalesChart />
              </ChartWrapper>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
