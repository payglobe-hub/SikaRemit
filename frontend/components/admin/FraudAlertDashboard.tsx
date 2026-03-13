'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api/axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  AlertTriangle,
  Shield,
  CheckCircle,
  XCircle,
  Eye,
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface FraudAlert {
  id: number
  transaction_id: string
  customer_email: string
  risk_score: number
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  triggered_rules: Array<{
    rule: string
    score: number
    reason: string
  }>
  status: 'pending_review' | 'approved' | 'blocked' | 'false_positive'
  amount: number
  currency: string
  created_at: string
}

interface FraudStats {
  total_alerts: number
  pending_review: number
  blocked: number
  false_positives: number
  avg_risk_score: number
  trend: 'up' | 'down' | 'stable'
}

export function FraudAlertDashboard() {
  const { toast } = useToast()
  const [alerts, setAlerts] = useState<FraudAlert[]>([])
  const [stats, setStats] = useState<FraudStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [activeTab, setActiveTab] = useState('pending')

  useEffect(() => {
    fetchAlerts()
    fetchStats()
  }, [activeTab])

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/v1/fraud/alerts/', { params: { status: activeTab } })
      const data = response.data
      
      if (data.success) {
        setAlerts(data.alerts)
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load fraud alerts', variant: 'destructive' })
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/v1/fraud/stats/')
      const data = response.data
      
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const handleReview = async (alertId: number, action: 'approve' | 'block' | 'false_positive') => {
    try {
      const response = await api.post(`/api/v1/fraud/alerts/${alertId}/review/`, {
        action,
        notes: reviewNotes
      })

      const data = response.data
      
      if (data.success) {
        toast({ title: 'Success', description: `Alert ${action}ed successfully` })
        setSelectedAlert(null)
        setReviewNotes('')
        fetchAlerts()
        fetchStats()
      } else {
        toast({ title: 'Error', description: data.error || 'Review failed', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Error reviewing alert', variant: 'destructive' })
      console.error(error)
    }
  }

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-500'
      case 'high':
        return 'bg-orange-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'low':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getRiskLevelBadge = (level: string) => {
    const colors = {
      critical: 'destructive',
      high: 'destructive',
      medium: 'default',
      low: 'secondary'
    }
    return colors[level as keyof typeof colors] || 'default'
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_alerts}</div>
              <p className="text-xs text-muted-foreground">
                {stats.trend === 'up' && <TrendingUp className="inline w-3 h-3 text-red-500" />}
                {stats.trend === 'down' && <TrendingDown className="inline w-3 h-3 text-green-500" />}
                {stats.trend === 'stable' && <Activity className="inline w-3 h-3" />}
                <span className="ml-1">Last 30 days</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending_review}</div>
              <p className="text-xs text-muted-foreground">
                Requires attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Blocked</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.blocked}</div>
              <p className="text-xs text-muted-foreground">
                Prevented fraud
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Risk Score</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avg_risk_score.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                Out of 100
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Fraud Alerts</CardTitle>
              <CardDescription>
                Review and manage suspicious transactions
              </CardDescription>
            </div>
            <Button onClick={fetchAlerts} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="blocked">Blocked</TabsTrigger>
              <TabsTrigger value="false_positive">False Positives</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-sikaremit-primary" />
                </div>
              ) : alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No alerts in this category</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Risk Level</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell className="font-mono text-sm">
                          {alert.transaction_id}
                        </TableCell>
                        <TableCell>{alert.customer_email}</TableCell>
                        <TableCell>
                          {alert.currency} {alert.amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRiskLevelBadge(alert.risk_level) as any}>
                            {alert.risk_level}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              getRiskLevelColor(alert.risk_level)
                            )} />
                            <span className="font-medium">{alert.risk_score.toFixed(1)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(alert.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedAlert(alert)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Alert Details Dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Fraud Alert Details</DialogTitle>
            <DialogDescription>
              Review transaction and take action
            </DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-4">
              {/* Alert Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Transaction ID</Label>
                  <div className="font-mono text-sm">{selectedAlert.transaction_id}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Customer</Label>
                  <div>{selectedAlert.customer_email}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Amount</Label>
                  <div className="font-semibold">
                    {selectedAlert.currency} {selectedAlert.amount.toFixed(2)}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Risk Score</Label>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      getRiskLevelColor(selectedAlert.risk_level)
                    )} />
                    <span className="font-semibold">{selectedAlert.risk_score.toFixed(1)}/100</span>
                    <Badge variant={getRiskLevelBadge(selectedAlert.risk_level) as any}>
                      {selectedAlert.risk_level}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Triggered Rules */}
              <div>
                <Label className="mb-2 block">Triggered Rules</Label>
                <div className="space-y-2">
                  {selectedAlert.triggered_rules.map((rule, index) => (
                    <div key={index} className="p-3 rounded-lg bg-muted">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{rule.rule}</span>
                        <Badge variant="outline">{rule.score.toFixed(2)}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{rule.reason}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Review Notes */}
              {selectedAlert.status === 'pending_review' && (
                <div>
                  <Label htmlFor="notes">Review Notes</Label>
                  <Textarea
                    id="notes"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add notes about your decision..."
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          {selectedAlert?.status === 'pending_review' && (
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => handleReview(selectedAlert.id, 'false_positive')}
              >
                Mark as False Positive
              </Button>
              <Button
                variant="default"
                onClick={() => handleReview(selectedAlert.id, 'approve')}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleReview(selectedAlert.id, 'block')}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Block
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
