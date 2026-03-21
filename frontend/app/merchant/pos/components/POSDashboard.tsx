'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Activity, CreditCard, Monitor, TrendingUp, DollarSign, Users } from 'lucide-react'

interface POSDashboardProps {
  data: any;
}

const POSDashboard = ({ data }: POSDashboardProps) => {
  if (!data) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-20"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const { devices, transactions } = data

  const totalDevices = devices.total
  const activeDevices = devices.active
  const totalTransactions = transactions.total_count
  const totalAmount = transactions.total_amount
  const successRate = totalTransactions > 0 ? (transactions.completed_count / totalTransactions) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDevices}</div>
            <p className="text-xs text-muted-foreground">
              {activeDevices} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.today?.count || 0}</div>
            <p className="text-xs text-muted-foreground">
              ₵{transactions.today?.total_amount?.toFixed(2) || '0.00'} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₵{totalAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {transactions.monthly?.count || 0} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate.toFixed(1)}%</div>
            <Progress value={successRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Device Status */}
      <Card>
        <CardHeader>
          <CardTitle>Device Status</CardTitle>
          <CardDescription>Current status of your POS devices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {devices.by_type?.map((deviceType: any) => (
              <div key={deviceType.device_type} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  <span className="capitalize">{deviceType.device_type.replace('_', ' ')}</span>
                </div>
                <Badge variant="secondary">{deviceType.count} devices</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest POS transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.recent_transactions?.slice(0, 5).map((transaction: any) => (
              <div key={transaction.transaction_id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">₵{transaction.amount.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      {transaction.device_type.replace('_', ' ')} • {transaction.card_brand}
                    </p>
                  </div>
                </div>
                <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                  {transaction.status}
                </Badge>
              </div>
            )) || (
              <p className="text-muted-foreground text-center py-4">No recent transactions</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default POSDashboard
