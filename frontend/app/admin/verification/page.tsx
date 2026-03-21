'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  DollarSign,
  Phone,
  Loader2,
  BarChart3,
  Activity
} from 'lucide-react'
import api from '@/lib/api/axios'
import { useCurrency } from '@/hooks/useCurrency'

interface VerificationStats {
  total_verifications: number
  successful_verifications: number
  failed_verifications: number
  pending_verifications: number
  success_rate: number
  average_response_time: number
  total_cost: number
  by_provider: Record<string, {
    count: number
    success: number
    failed: number
    average_time: number
    cost: number
  }>
  by_type: Record<string, number>
  recent_activity: Array<{
    id: number
    type: string
    provider: string
    status: string
    timestamp: string
    response_time: number
  }>
}

async function getVerificationStats(): Promise<VerificationStats> {
  const response = await api.get('/api/v1/payments/verify/analytics/')
  const data = response.data as {
    providers?: Array<{
      provider: string
      total: number
      success_rate: number
      avg_time: number
    }>
    trends?: Array<{ date: string; success_rate: number; avg_response_time: number }>
    geo?: Array<unknown>
    alerts?: unknown
  }

  const providers = data.providers || []

  const totals = providers.reduce(
    (acc, p) => {
      const count = Number(p.total || 0)
      const sr = Number(p.success_rate || 0) / 100
      const success = Math.round(count * sr)
      const failed = Math.max(0, count - success)
      const avgTimeMs = Math.round(Number(p.avg_time || 0) * 1000)

      acc.total += count
      acc.success += success
      acc.failed += failed
      acc.weightedTimeSum += count * avgTimeMs

      acc.by_provider[p.provider] = {
        count,
        success,
        failed,
        average_time: avgTimeMs,
        cost: 0,
      }

      return acc
    },
    {
      total: 0,
      success: 0,
      failed: 0,
      weightedTimeSum: 0,
      by_provider: {} as VerificationStats['by_provider'],
    }
  )

  const overallSuccessRate = totals.total > 0 ? (totals.success / totals.total) * 100 : 0
  const avgResponseTime = totals.total > 0 ? Math.round(totals.weightedTimeSum / totals.total) : 0

  return {
    total_verifications: totals.total,
    successful_verifications: totals.success,
    failed_verifications: totals.failed,
    pending_verifications: 0,
    success_rate: overallSuccessRate,
    average_response_time: avgResponseTime,
    total_cost: 0,
    by_provider: totals.by_provider,
    by_type: {},
    recent_activity: [],
  }
}

export default function VerificationDashboardPage() {
  const { formatAmount } = useCurrency()

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['verification-stats'],
    queryFn: getVerificationStats,
    refetchInterval: 30000
  })

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; color: string }> = {
      success: { variant: 'default', icon: CheckCircle2, color: 'text-green-600' },
      failed: { variant: 'destructive', icon: XCircle, color: 'text-red-600' },
      pending: { variant: 'secondary', icon: Clock, color: 'text-orange-600' }
    }
    const config = variants[status] || variants.pending
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {status}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>
          {error instanceof Error
            ? error.message
            : 'No verification data available'}
        </p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Verification Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor verification services and provider performance
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Verifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_verifications}</div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {stats.success_rate.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.average_response_time}ms</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatAmount(stats.total_cost)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-green-200 dark:border-green-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Successful
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.successful_verifications}
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.failed_verifications}
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-200 dark:border-orange-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats.pending_verifications}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="providers" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="providers">Providers</TabsTrigger>
            <TabsTrigger value="types">By Type</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          </TabsList>

          {/* Providers Tab */}
          <TabsContent value="providers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Provider Performance
                </CardTitle>
                <CardDescription>
                  Compare verification providers by success rate and performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(stats.by_provider).map(([provider, data]) => (
                    <Card key={provider}>
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold capitalize">{provider}</h3>
                            <Badge>
                              {((data.success / data.count) * 100).toFixed(1)}% Success
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Total</p>
                              <p className="font-semibold text-lg">{data.count}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Success</p>
                              <p className="font-semibold text-lg text-green-600">
                                {data.success}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Failed</p>
                              <p className="font-semibold text-lg text-red-600">{data.failed}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Avg Time</p>
                              <p className="font-semibold text-lg">{data.average_time}ms</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Cost</p>
                              <p className="font-semibold text-lg">{formatAmount(data.cost)}</p>
                            </div>
                          </div>
                          {/* Progress Bar */}
                          <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{
                                width: `${(data.success / data.count) * 100}%`
                              }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Types Tab */}
          <TabsContent value="types" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Verification Types
                </CardTitle>
                <CardDescription>
                  Breakdown of verifications by type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats.by_type).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                          <Phone className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                        </div>
                        <div>
                          <p className="font-semibold capitalize">{type.replace('_', ' ')}</p>
                          <p className="text-sm text-muted-foreground">
                            {((count / stats.total_verifications) * 100).toFixed(1)}% of total
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{count}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Latest verification requests and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats.recent_activity && stats.recent_activity.length > 0 ? (
                  <div className="space-y-3">
                    {stats.recent_activity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div>
                            {getStatusBadge(activity.status)}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold capitalize">
                              {activity.type.replace('_', ' ')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Provider: {activity.provider} • {activity.response_time}ms
                            </p>
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            {new Date(activity.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No recent activity</p>
                    <p className="text-muted-foreground mt-1">
                      Verification activity will appear here
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  )
}
