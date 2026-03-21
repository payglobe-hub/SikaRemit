'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// Force dynamic rendering to prevent SSR issues with auth
export const dynamic = 'force-dynamic'
export const runtime = 'edge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  ShoppingCart,
  Calendar,
  Download,
  Filter,
  Activity,
  Target,
  Zap
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useCurrency } from '@/hooks/useCurrency'
import RevenueChart from '@/components/merchant/revenue-chart'
import SalesChart from '@/components/merchant/sales-chart'
import * as AnalyticsAPI from '@/lib/api/analytics'

export default function MerchantAnalyticsPage() {
  const [timeRange, setTimeRange] = useState('30d')
  const { formatAmount } = useCurrency()

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['merchant-analytics', timeRange],
    queryFn: () => AnalyticsAPI.getAnalytics()
  })

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const data = analyticsData ? {
    totalRevenue: analyticsData.revenue?.total || 0,
    totalTransactions: analyticsData.transactions?.total || 0,
    totalCustomers: analyticsData.customers?.total || 0,
    averageOrderValue: analyticsData.transactions?.total ? (analyticsData.revenue?.total || 0) / analyticsData.transactions.total : 0,
    conversionRate: analyticsData.conversion_rate || (analyticsData.transactions?.total && analyticsData.customers?.total ? (analyticsData.transactions.total / analyticsData.customers.total * 100) : 0),
    topProducts: analyticsData.top_products || [],
    revenueByDay: analyticsData.revenue?.chart_data || [],
    customerAcquisition: analyticsData.customer_acquisition || { new: analyticsData.customers?.new || 0, returning: analyticsData.customers?.returning || analyticsData.customers?.total || 0, churn: analyticsData.customers?.churn || 0 },
    paymentMethods: analyticsData.payment_methods || []
  } : {
    totalRevenue: 0,
    totalTransactions: 0,
    totalCustomers: 0,
    averageOrderValue: 0,
    conversionRate: 0,
    topProducts: [],
    revenueByDay: [],
    customerAcquisition: { new: 0, returning: 0, churn: 0 },
    paymentMethods: []
  }

  const insights = [
    {
      title: 'Revenue Growth',
      value: '+12.5%',
      description: 'vs last period',
      trend: 'up',
      icon: TrendingUp
    },
    {
      title: 'Customer Retention',
      value: '84.2%',
      description: 'returning customers',
      trend: 'up',
      icon: Users
    },
    {
      title: 'Average Order Value',
      value: formatAmount(data.averageOrderValue),
      description: 'per transaction',
      trend: 'neutral',
      icon: DollarSign
    },
    {
      title: 'Conversion Rate',
      value: `${data.conversionRate}%`,
      description: 'visitor to customer',
      trend: 'up',
      icon: ShoppingCart
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Hero Section */}
      <div className="relative py-16 lg:py-24 overflow-hidden bg-gradient-to-br from-blue-50/30 via-blue-50/20 to-blue-50/30">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-blue-400/20 to-blue-300/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-blue-400/15 to-blue-300/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-conic from-blue-500/5 via-transparent to-blue-400/5 rounded-full blur-2xl animate-spin" style={{animationDuration: '20s'}}></div>
        </div>

        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto animate-in slide-in-from-bottom duration-1000">
            <div className="inline-flex items-center px-6 py-3 rounded-full bg-white/40 backdrop-blur-xl border border-white/30 shadow-lg shadow-blue-500/25 text-slate-700 text-sm font-semibold mb-8 animate-in zoom-in-50 duration-700 delay-300 hover:bg-white/50 hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 group">
              <BarChart3 className="w-5 h-5 mr-3 text-blue-600 group-hover:rotate-12 transition-transform duration-300" />
              Analytics & Insights
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6 leading-tight animate-in slide-in-from-bottom duration-1000 delay-500">
              Data-Driven Intelligence
              <span className="block bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent drop-shadow-sm">Optimize performance with advanced analytics</span>
            </h1>
            <p className="text-lg text-slate-600/90 mb-8 max-w-2xl mx-auto leading-relaxed animate-in slide-in-from-bottom duration-1000 delay-700 font-medium">
              Gain deep insights into your payment processing performance, customer behavior, and business metrics with comprehensive real-time analytics.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center animate-in slide-in-from-bottom duration-1000 delay-900">
              <div className="flex items-center space-x-3 bg-white/40 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 hover:bg-white/50 group">
                <BarChart3 className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-slate-700 font-medium">Revenue analytics</span>
              </div>
              <div className="flex items-center space-x-3 bg-white/40 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 hover:bg-white/50 group">
                <TrendingUp className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-slate-700 font-medium">Performance tracking</span>
              </div>
              <div className="flex items-center space-x-3 bg-white/40 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 hover:bg-white/50 group">
                <Target className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-slate-700 font-medium">Conversion insights</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 lg:px-8 space-y-8">
        {/* Time Range and Export */}
        <Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 animate-in slide-in-from-bottom-1 duration-700 bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/25 hover:shadow-blue-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20"></div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-blue-400/20 to-blue-300/20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-500"></div>

          <CardContent className="p-6 relative z-10">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-5 h-5 text-blue-600" />
                    <span className="text-lg font-semibold text-sikaremit-foreground">Performance Overview</span>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    {timeRange} period
                  </Badge>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Analyze your business metrics and identify growth opportunities
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-48 h-12 border-2 border-gray-200 dark:border-gray-700 rounded-xl">
                    <Calendar className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">📅 Last 7 days</SelectItem>
                    <SelectItem value="30d">📅 Last 30 days</SelectItem>
                    <SelectItem value="90d">📅 Last 90 days</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" className="h-12 px-6 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {insights.map((insight, index) => (
            <Card key={insight.title} className="bg-sikaremit-card/80 backdrop-blur-sm group cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/25 hover:shadow-blue-500/10 relative overflow-hidden animate-in slide-in-from-left duration-500"
                  style={{ animationDelay: `${index * 100}ms` }}>
              <div className={`absolute inset-0 bg-gradient-to-br ${'from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20'} opacity-0 group-hover:opacity-100 transition-all duration-500`} />
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-10 -mt-10"></div>

              <CardContent className="relative z-10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <insight.icon className="h-5 w-5 text-white" />
                  </div>
                  {insight.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-600" />}
                  {insight.trend === 'down' && <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-sikaremit-muted">
                    {insight.title}
                  </p>
                  <p className="text-3xl font-bold text-sikaremit-foreground">
                    {insight.value}
                  </p>
                  <p className="text-xs text-sikaremit-muted">
                    {insight.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 animate-in slide-in-from-bottom-1 duration-700 bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/25 hover:shadow-blue-500/10">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 opacity-0 group-hover:opacity-100 transition-all duration-500" />
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-10 -mt-10" />

            <CardHeader className="relative z-10 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-lg">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-sikaremit-foreground">Revenue Trend</CardTitle>
                  <CardDescription className="text-sikaremit-muted">Daily revenue for the selected period</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 p-6">
              <div className="h-80 w-full">
                <RevenueChart />
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 animate-in slide-in-from-bottom-2 duration-700 bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/25 hover:shadow-blue-500/10">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 opacity-0 group-hover:opacity-100 transition-all duration-500" />
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-10 -mt-10" />

            <CardHeader className="relative z-10 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-sikaremit-foreground">Sales Performance</CardTitle>
                  <CardDescription className="text-sikaremit-muted">Transaction volume and revenue correlation</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 p-6">
              <div className="h-80 w-full">
                <SalesChart />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Products */}
        <Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 animate-in slide-in-from-bottom-3 duration-700 bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/25 hover:shadow-blue-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 opacity-0 group-hover:opacity-100 transition-all duration-500" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-blue-300/20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-500"></div>

          <CardHeader className="relative z-10 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-lg">
                  <ShoppingCart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-sikaremit-foreground">Top Performing Products</CardTitle>
                  <CardDescription className="text-sikaremit-muted text-lg mt-1">Your best-selling products by revenue</CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                Best Sellers
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="relative z-10 p-6">
            <div className="space-y-4">
              {data.topProducts.map((product: any, index: number) => (
                <div key={product.name} className="group flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-transparent dark:hover:from-blue-950/20 dark:hover:to-transparent transition-all duration-300">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-sikaremit-foreground">{product.name}</p>
                      <p className="text-sm text-sikaremit-muted">{product.orders} orders</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-sikaremit-foreground">{formatAmount(product.revenue)}</p>
                    <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-300">
                      {((product.revenue / data.totalRevenue) * 100).toFixed(1)}% of total
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Customer Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 animate-in slide-in-from-bottom-4 duration-700 bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/25 hover:shadow-blue-500/10">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 opacity-0 group-hover:opacity-100 transition-all duration-500" />
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-10 -mt-10" />

            <CardHeader className="relative z-10 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-lg">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-sikaremit-foreground">Customer Acquisition</CardTitle>
                  <CardDescription className="text-sikaremit-muted">New vs returning customers</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 rounded-lg">
                  <span className="text-sm font-medium text-sikaremit-foreground">New Customers</span>
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-sikaremit-foreground">{data.customerAcquisition.new}</span>
                    <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-700 h-2 rounded-full"
                        style={{ width: `${(data.customerAcquisition.new / (data.customerAcquisition.new + data.customerAcquisition.returning)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 rounded-lg">
                  <span className="text-sm font-medium text-sikaremit-foreground">Returning Customers</span>
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-sikaremit-foreground">{data.customerAcquisition.returning}</span>
                    <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-700 h-2 rounded-full"
                        style={{ width: `${(data.customerAcquisition.returning / (data.customerAcquisition.new + data.customerAcquisition.returning)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Churn Rate</span>
                    <span className="text-red-600 font-medium">
                      {((data.customerAcquisition.churn / data.totalCustomers) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 animate-in slide-in-from-bottom-5 duration-700 bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/25 hover:shadow-blue-500/10">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 opacity-0 group-hover:opacity-100 transition-all duration-500" />
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-10 -mt-10" />

            <CardHeader className="relative z-10 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-lg">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-sikaremit-foreground">Payment Methods</CardTitle>
                  <CardDescription className="text-sikaremit-muted">Breakdown of payment methods used</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 p-6">
              <div className="space-y-4">
                {data.paymentMethods?.map((method: any, index: number) => (
                  <div key={method.method} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-900 dark:text-white">{method.method}</span>
                      <span className="text-gray-600 dark:text-gray-400">{formatAmount(method.amount)} ({method.percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${
                          'bg-gradient-to-r from-blue-500 to-indigo-500'
                        }`}
                        style={{ width: `${method.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
