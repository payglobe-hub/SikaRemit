'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Activity,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  BarChart3,
  UserCheck,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { AdminCards } from '@/components/admin/AdminCards'
import { adminStyles, cn } from '@/lib/design-system/admin-components'
import api from '@/lib/api/axios'
import { authTokens } from '@/lib/utils/cookie-auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface DashboardStats {
  overview: {
    total_users: number
    active_users: number
    total_revenue: number
    revenue_growth: number
    total_transactions: number
    transaction_growth: number
    pending_verifications: number
    failed_payments: number
  }
  recent_activities?: Array<{
    id: string
    title: string
    description: string
    timestamp: string
    status?: 'success' | 'warning' | 'error' | 'info'
    user?: string
  }>
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  const token = authTokens.getAccessToken()
  if (!token) {
    return {
      overview: {
        total_users: 0,
        active_users: 0,
        total_revenue: 0,
        revenue_growth: 0,
        total_transactions: 0,
        transaction_growth: 0,
        pending_verifications: 0,
        failed_payments: 0
      }
    }
  }

  try {
    const response = await api.get('/api/v1/dashboard/stats/')
    return response.data
  } catch (error) {
    
    // Return empty data - no mock data
    return {
      overview: {
        total_users: 0,
        active_users: 0,
        total_revenue: 0,
        revenue_growth: 0,
        total_transactions: 0,
        transaction_growth: 0,
        pending_verifications: 0,
        failed_payments: 0
      },
      recent_activities: []
    }
  }
}

export default function AdminOverviewPage() {
  const [refreshing, setRefreshing] = useState(false)

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['admin-overview-stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: false
  })

  const overview = stats?.overview || {
    total_users: 0,
    active_users: 0,
    total_revenue: 0,
    revenue_growth: 0,
    total_transactions: 0,
    transaction_growth: 0,
    pending_verifications: 0,
    failed_payments: 0
  }

  const recentActivities = stats?.recent_activities || []

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refetch()
    } catch (error) {
      
    }
    setRefreshing(false)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS'
    }).format(amount)
  }

  // Quick actions for the dashboard
  const quickActions = [
    {
      id: 'add-user',
      label: 'Add New User',
      description: 'Create customer or merchant account',
      icon: <UserCheck className="h-5 w-5" />,
      variant: 'primary' as const,
      onClick: () => window.location.href = '/admin/customers'
    },
    {
      id: 'view-transactions',
      label: 'View Transactions',
      description: 'Monitor payment activities',
      icon: <CreditCard className="h-5 w-5" />,
      variant: 'secondary' as const,
      onClick: () => window.location.href = '/admin/transactions'
    },
    {
      id: 'system-health',
      label: 'System Health',
      description: 'Check system status and alerts',
      icon: <Activity className="h-5 w-5" />,
      variant: 'secondary' as const,
      onClick: () => window.location.href = '/admin/analytics'
    }
  ]

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <h1 className={cn(
            adminStyles.text.h1,
            'flex items-center gap-3'
          )}>
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <LayoutDashboard className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            </div>
            Overview Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-base">
            Real-time platform overview and key performance metrics
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/admin/analytics">
            <Button variant="outline" className="w-full sm:w-auto">
              <BarChart3 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Advanced Analytics</span>
              <span className="sm:hidden">Analytics</span>
            </Button>
          </Link>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw className={cn(
              "h-4 w-4 mr-2",
              refreshing && "animate-spin"
            )} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <AdminCards.StatCard
          title="Active Users"
          value={overview.active_users.toLocaleString()}
          change={{
            value: 5.2,
            label: 'vs last week',
            trend: 'up'
          }}
          icon={<Users className="h-5 w-5 text-blue-600" />}
          description="Currently online users"
          variant="elevated"
        />

        <AdminCards.StatCard
          title="Total Transactions"
          value={overview.total_transactions.toLocaleString()}
          change={{
            value: overview.transaction_growth,
            label: 'vs last month',
            trend: overview.transaction_growth >= 0 ? 'up' : 'down'
          }}
          icon={<CreditCard className="h-5 w-5 text-emerald-600" />}
          description="Processed this month"
          variant="elevated"
        />

        <AdminCards.StatCard
          title="Revenue"
          value={formatCurrency(overview.total_revenue)}
          change={{
            value: overview.revenue_growth,
            label: 'vs last month',
            trend: overview.revenue_growth >= 0 ? 'up' : 'down'
          }}
          icon={<DollarSign className="h-5 w-5 text-green-600" />}
          description="Total platform revenue"
          variant="elevated"
        />

        <AdminCards.StatCard
          title="System Health"
          value={`${overview.pending_verifications + overview.failed_payments}`}
          icon={<AlertTriangle className="h-5 w-5 text-orange-600" />}
          description={`${overview.pending_verifications} pending, ${overview.failed_payments} failed`}
          variant="elevated"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Statistics */}
        <div className="lg:col-span-1">
          <AdminCards.MetricCard
            title="User Statistics"
            icon={<Users className="h-5 w-5 text-blue-600" />}
            metrics={[
              {
                label: 'Total Users',
                value: overview.total_users.toLocaleString(),
                change: 3.2
              },
              {
                label: 'Active Users',
                value: overview.active_users.toLocaleString(),
                change: 5.2,
                status: 'success'
              },
              {
                label: 'New This Month',
                value: '1,234',
                change: 12.8,
                status: 'info'
              }
            ]}
            variant="elevated"
          />
        </div>

        {/* Transaction Analytics */}
        <div className="lg:col-span-1">
          <AdminCards.MetricCard
            title="Transaction Analytics"
            icon={<Activity className="h-5 w-5 text-emerald-600" />}
            metrics={[
              {
                label: 'Total Volume',
                value: overview.total_transactions.toLocaleString(),
                change: overview.transaction_growth
              },
              {
                label: 'Success Rate',
                value: '98.7%',
                change: 0.3,
                status: 'success'
              },
              {
                label: 'Avg. Transaction',
                value: formatCurrency(overview.total_revenue / overview.total_transactions || 0),
                change: -2.1
              }
            ]}
            variant="elevated"
          />
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <AdminCards.QuickActionCard
            title="Quick Actions"
            actions={quickActions}
            variant="elevated"
          />
        </div>
      </div>

      {/* Recent Activities */}
      <AdminCards.ActivityCard
        title="Recent Activities"
        activities={recentActivities}
        variant="elevated"
        maxItems={6}
      />

      {/* Performance Overview Chart Placeholder */}
      <Card className={cn(adminStyles.card.elevated)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-900 dark:text-white">
            <TrendingUp className="h-6 w-6 text-blue-600" />
            Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-xl border-2 border-dashed border-blue-200 dark:border-blue-800">
            <div className="text-center space-y-4">
              <BarChart3 className="h-12 w-12 text-blue-400 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Interactive Charts Coming Soon
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mt-1 max-w-md">
                  Real-time performance metrics and trend visualization will be displayed here with advanced charting capabilities.
                </p>
              </div>
              <Badge variant="secondary" className="mt-4">
                <Clock className="h-3 w-3 mr-1" />
                In Development
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
