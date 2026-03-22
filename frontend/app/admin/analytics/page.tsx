'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Globe,
  CreditCard,
  Shield,
  Target,
  Zap,
  LayoutDashboard
} from 'lucide-react'
import {
  getRealtimeMetrics,
  getDashboardSnapshot,
  getAnalyticsOverview,
  getPerformanceAlerts,
  updateDashboardSnapshot,
  acknowledgeAlert,
  checkPerformanceAlerts,
  type RealtimeMetrics,
  type DashboardSnapshot,
  type AnalyticsOverview,
  type PerformanceAlert
} from '@/lib/api/admin-analytics'
import Link from 'next/link'

export default function AdminAnalyticsPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [refreshing, setRefreshing] = useState(false)

  // Real API queries
  const { data: realtimeData, refetch: refetchRealtime, isLoading: realtimeLoading } = useQuery({
    queryKey: ['analytics-realtime'],
    queryFn: getRealtimeMetrics,
    refetchInterval: 30000 // Refresh every 30 seconds
  })

  const { data: snapshotData, isLoading: snapshotLoading } = useQuery({
    queryKey: ['analytics-snapshot'],
    queryFn: getDashboardSnapshot
  })

  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: getAnalyticsOverview
  })

  const { data: alertsDataRaw, isLoading: alertsLoading } = useQuery({
    queryKey: ['analytics-alerts'],
    queryFn: getPerformanceAlerts
  })

  // Ensure alertsData is always an array
  const alertsData = Array.isArray(alertsDataRaw) ? alertsDataRaw : []

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refetchRealtime()
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100'
      case 'high': return 'text-orange-600 bg-orange-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="w-full space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Advanced Analytics Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive analytics and insights for sikaremit operations
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/overview">
              <Button variant="outline">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Overview
              </Button>
            </Link>
            <Button onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Real-time Status Cards */}
        {realtimeLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <div className="h-4 bg-muted rounded animate-pulse"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded animate-pulse mb-2"></div>
                  <div className="h-3 bg-muted rounded animate-pulse w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : realtimeData ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  24h Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(realtimeData?.transactions_last_24h ?? 0).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(realtimeData?.transaction_value_last_24h ?? 0)} value
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Active Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{realtimeData?.active_alerts ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Require attention
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 capitalize">
                  {realtimeData?.system_health ?? 'unknown'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  All systems operational
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Success Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {snapshotData?.success_rate?.toFixed(1) || '0.0'}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Last 24 hours
                </p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Main Analytics Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="merchants">Merchants</TabsTrigger>
            <TabsTrigger value="geography">Geography</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {overviewLoading ? (
              <div className="space-y-4">
                {/* Loading Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i}>
                      <CardHeader className="pb-3">
                        <div className="h-4 bg-muted rounded animate-pulse"></div>
                      </CardHeader>
                      <CardContent>
                        <div className="h-8 bg-muted rounded animate-pulse"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {/* Loading Chart */}
                <Card>
                  <CardHeader>
                    <div className="h-6 bg-muted rounded animate-pulse w-1/3"></div>
                    <div className="h-4 bg-muted rounded animate-pulse w-1/2 mt-2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 bg-muted/20 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <div className="h-12 w-12 bg-muted rounded animate-pulse mx-auto mb-2"></div>
                        <div className="h-4 bg-muted rounded animate-pulse w-32 mx-auto"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : overviewData ? (
              <>
                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{(overviewData.summary?.total_transactions ?? 0).toLocaleString()}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(overviewData.summary?.total_revenue ?? 0)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Fee Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">{formatCurrency(overviewData.summary?.fee_revenue ?? 0)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Avg Transaction</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(overviewData.summary?.average_transaction ?? 0)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">New Customers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">+{overviewData.summary?.customer_growth ?? 0}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">{overviewData.summary?.success_rate ?? 0}%</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Daily Trends Chart Placeholder */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Transaction Trends (Last 7 Days)
                    </CardTitle>
                    <CardDescription>Daily transaction volume and revenue</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center bg-muted/20 rounded-lg">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">Interactive chart would be displayed here</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Peak: {overviewData.daily_trends?.length ? Math.max(...overviewData.daily_trends.map(d => d.transactions || 0)) : 0} transactions
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            {snapshotData && (
              <>
                {/* Payment Method Usage */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Payment Method Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {snapshotData.payment_method_usage ? Object.entries(snapshotData.payment_method_usage).map(([method, count]) => (
                        <div key={method} className="flex items-center justify-between">
                          <span className="font-medium">{method}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-muted rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{
                                  width: `${(count as number / Math.max(...Object.values(snapshotData.payment_method_usage), 1)) * 100}%`
                                }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground w-12 text-right">{count as number}</span>
                          </div>
                        </div>
                      )) : <p className="text-muted-foreground">No data available</p>}
                    </div>
                  </CardContent>
                </Card>

                {/* Transaction Status Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Card>
                    <CardHeader>
                      <CardTitle>Transaction Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span>Successful</span>
                        <span className="font-semibold text-green-600">{snapshotData.successful_transactions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Failed</span>
                        <span className="font-semibold text-red-600">{snapshotData.failed_transactions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Success Rate</span>
                        <span className="font-semibold">{snapshotData.success_rate}%</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Risk & Compliance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span>KYC Completion Rate</span>
                        <span className="font-semibold">{snapshotData.kyc_completion_rate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>High Risk Transactions</span>
                        <span className="font-semibold text-orange-600">{snapshotData.high_risk_transactions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Reported to Regulator</span>
                        <span className="font-semibold text-blue-600">{snapshotData.reported_to_regulator}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* Merchants Tab */}
          <TabsContent value="merchants" className="space-y-6">
            {snapshotData && (
              <>
                {/* Top Merchants by Volume */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Top Merchants by Transaction Volume
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {snapshotData.top_merchants_by_volume?.length ? snapshotData.top_merchants_by_volume.map((merchant, index) => (
                        <div key={merchant.merchant_id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{merchant.business_name}</p>
                              <p className="text-sm text-muted-foreground">{merchant.value} transactions</p>
                            </div>
                          </div>
                        </div>
                      )) : <p className="text-muted-foreground">No data available</p>}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Merchants by Revenue */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Top Merchants by Fee Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {snapshotData.top_merchants_by_revenue?.length ? snapshotData.top_merchants_by_revenue.map((merchant, index) => (
                        <div key={merchant.merchant_id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-semibold">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{merchant.business_name}</p>
                              <p className="text-sm text-muted-foreground">{formatCurrency(merchant.value)} fees</p>
                            </div>
                          </div>
                        </div>
                      )) : <p className="text-muted-foreground">No data available</p>}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Geography Tab */}
          <TabsContent value="geography" className="space-y-6">
            {snapshotData && overviewData && (
              <>
                {/* Geographic Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Geographic Distribution
                    </CardTitle>
                    <CardDescription>Transaction volume by destination country</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {snapshotData.transactions_by_country ? Object.entries(snapshotData.transactions_by_country).map(([country, count]) => (
                        <div key={country} className="flex items-center justify-between">
                          <span className="font-medium">{country}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-muted rounded-full h-2">
                              <div
                                className="bg-indigo-600 h-2 rounded-full"
                                style={{
                                  width: `${(count as number / Math.max(...Object.values(snapshotData.transactions_by_country), 1)) * 100}%`
                                }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground w-12 text-right">{count as number}</span>
                          </div>
                        </div>
                      )) : <p className="text-muted-foreground">No data available</p>}
                    </div>
                  </CardContent>
                </Card>

                {/* Revenue by Country */}
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Distribution</CardTitle>
                    <CardDescription>Transaction value by destination country</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {snapshotData.revenue_by_country ? Object.entries(snapshotData.revenue_by_country).map(([country, revenue]) => (
                        <div key={country} className="flex items-center justify-between">
                          <span className="font-medium">{country}</span>
                          <span className="font-semibold">{formatCurrency(revenue as number)}</span>
                        </div>
                      )) : <p className="text-muted-foreground">No data available</p>}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-6">
            {alertsData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Performance Alerts
                  </CardTitle>
                  <CardDescription>
                    Active alerts requiring attention ({alertsData.length} total)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {alertsData.map((alert) => (
                      <div key={alert.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge className={getSeverityColor(alert.severity)}>
                              {alert.severity.toUpperCase()}
                            </Badge>
                            <span className="font-medium">{alert.title}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {new Date(alert.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{alert.description}</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">Acknowledge</Button>
                          <Button size="sm">Investigate</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
    </div>
  )
}
