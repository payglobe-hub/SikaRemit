'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  FileText,
  Download,
  Trash2,
  Loader2,
  BarChart3,
  TrendingUp,
  Calendar,
  Filter,
  Plus,
  Clock,
  Users,
  Building,
  AlertTriangle,
  DollarSign,
  Activity,
  Settings,
  Mail
} from 'lucide-react'
import {
  generateReport,
  getReports,
  downloadReport,
  deleteReport,
  getReportStats,
  getSystemMetrics,
  getComplianceReport,
  getMerchantPerformance,
  getCustomerAnalytics,
  getFinancialSummary,
  scheduleReport,
  getScheduledReports,
  cancelScheduledReport,
  REPORT_TYPES,
  REPORT_FORMATS,
  type Report,
  type ReportParams
} from '@/lib/api/reports'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useCurrency } from '@/hooks/useCurrency'

export default function ReportsPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { formatAmount } = useCurrency()
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [activeView, setActiveView] = useState<'reports' | 'analytics' | 'scheduled'>('reports')
  const [formData, setFormData] = useState<ReportParams>({
    report_type: 'payments',
    date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    date_to: new Date().toISOString().split('T')[0],
    format: 'pdf',
    include_charts: true,
    include_summary: true
  })

  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: getReports,
    refetchInterval: 10000
  })

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['report-stats', formData.report_type, formData.date_from, formData.date_to],
    queryFn: () => getReportStats({
      report_type: formData.report_type,
      date_from: formData.date_from,
      date_to: formData.date_to
    }),
    enabled: !!formData.report_type && !!formData.date_from && !!formData.date_to
  })

  // Advanced Analytics Queries
  const { data: systemMetrics, isLoading: systemMetricsLoading } = useQuery({
    queryKey: ['system-metrics'],
    queryFn: getSystemMetrics,
    refetchInterval: 30000 // Refresh every 30 seconds
  })

  const { data: complianceData, isLoading: complianceLoading } = useQuery({
    queryKey: ['compliance-report'],
    queryFn: () => getComplianceReport({
      start_date: formData.date_from,
      end_date: formData.date_to
    }),
    enabled: !!formData.date_from && !!formData.date_to
  })

  const { data: merchantPerformance, isLoading: merchantPerfLoading } = useQuery({
    queryKey: ['merchant-performance'],
    queryFn: () => getMerchantPerformance({
      start_date: formData.date_from,
      end_date: formData.date_to,
      sort_by: 'revenue'
    }),
    enabled: !!formData.date_from && !!formData.date_to
  })

  const { data: customerAnalytics, isLoading: customerAnalyticsLoading } = useQuery({
    queryKey: ['customer-analytics'],
    queryFn: () => getCustomerAnalytics({
      start_date: formData.date_from,
      end_date: formData.date_to
    }),
    enabled: !!formData.date_from && !!formData.date_to
  })

  const { data: financialSummary, isLoading: financialLoading } = useQuery({
    queryKey: ['financial-summary'],
    queryFn: () => getFinancialSummary({
      start_date: formData.date_from,
      end_date: formData.date_to,
      granularity: 'daily'
    }),
    enabled: !!formData.date_from && !!formData.date_to
  })

  const { data: scheduledReports, isLoading: scheduledLoading } = useQuery({
    queryKey: ['scheduled-reports'],
    queryFn: getScheduledReports,
    refetchInterval: 60000 // Refresh every minute
  })

  const generateMutation = useMutation({
    mutationFn: generateReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      toast({ title: 'Success', description: 'Report generation started' })
      setShowGenerateDialog(false)
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to generate report', variant: 'destructive' })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      toast({ title: 'Success', description: 'Report deleted successfully' })
      setShowDeleteDialog(false)
      setSelectedReport(null)
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete report', variant: 'destructive' })
    }
  })

  const handleGenerate = () => {
    if (!formData.report_type || !formData.date_from || !formData.date_to) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      })
      return
    }
    generateMutation.mutate(formData)
  }

  const handleDownload = async (report: Report) => {
    try {
      const blob = await downloadReport(report.id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${report.report_type}_${report.date_from}_${report.date_to}.${report.format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast({ title: 'Success', description: 'Report downloaded successfully' })
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to download report', variant: 'destructive' })
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; color: string }> = {
      completed: { variant: 'default', color: 'text-green-600' },
      processing: { variant: 'secondary', color: 'text-blue-600' },
      pending: { variant: 'secondary', color: 'text-orange-600' },
      failed: { variant: 'destructive', color: 'text-red-600' }
    }
    const config = variants[status] || variants.pending
    return <Badge variant={config.variant}>{status}</Badge>
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  return (
    <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Payment Reports
            </h1>
            <p className="text-muted-foreground mt-1">
              Generate and download payment reports
            </p>
          </div>
          <Button onClick={() => setShowGenerateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
        </div>

        {/* Stats Preview */}
        {stats && !statsLoading && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatAmount(stats.total_amount)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Count</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_count}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Average Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatAmount(stats.average_amount || 0)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">By Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {Object.entries(stats.by_status || {}).map(([status, count]) => (
                    <div key={status} className="flex justify-between text-sm">
                      <span className="capitalize">{status}:</span>
                      <span className="font-semibold">{String(count)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Reports List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Generated Reports
            </CardTitle>
            <CardDescription>View and download previously generated reports</CardDescription>
          </CardHeader>
          <CardContent>
            {reportsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : reports && reports.length > 0 ? (
              <div className="space-y-4">
                {reports.map((report) => (
                  <Card key={report.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            <h3 className="font-semibold capitalize">
                              {report.report_type.replace('_', ' ')} Report
                            </h3>
                            {getStatusBadge(report.status)}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Date Range</p>
                              <p className="font-medium">
                                {report.date_from ? new Date(report.date_from).toLocaleDateString() : 'N/A'} -{' '}
                                {report.date_to ? new Date(report.date_to).toLocaleDateString() : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Format</p>
                              <p className="font-medium uppercase">{report.format}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Records</p>
                              <p className="font-medium">{report.total_records}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">File Size</p>
                              <p className="font-medium">{formatFileSize(report.file_size)}</p>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Created {new Date(report.created_at).toLocaleString()} by {report.created_by}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          {report.status === 'completed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(report)}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedReport(report)
                              setShowDeleteDialog(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No reports generated</p>
                <p className="text-muted-foreground mt-1">
                  Generate your first report to get started
                </p>
                <Button onClick={() => setShowGenerateDialog(true)} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Generate Report
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

      {/* Generate Report Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate Report</DialogTitle>
            <DialogDescription>
              Configure report parameters and generate a new report
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="report_type">Report Type</Label>
              <Select
                value={formData.report_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, report_type: value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-sm text-muted-foreground">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date_from">From Date</Label>
                <Input
                  id="date_from"
                  type="date"
                  value={formData.date_from}
                  onChange={(e) => setFormData({ ...formData, date_from: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_to">To Date</Label>
                <Input
                  id="date_to"
                  type="date"
                  value={formData.date_to}
                  onChange={(e) => setFormData({ ...formData, date_to: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="format">Export Format</Label>
              <Select
                value={formData.format}
                onValueChange={(value) => setFormData({ ...formData, format: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_FORMATS.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.icon} {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview Stats */}
            {stats && !statsLoading && (
              <Card className="bg-muted">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Report Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Records:</span>
                    <span className="font-semibold">{stats.total_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Amount:</span>
                    <span className="font-semibold">{formatAmount(stats.total_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average:</span>
                    <span className="font-semibold">{formatAmount(stats.average_amount)}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={generateMutation.isPending}>
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Report</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this report? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedReport && deleteMutation.mutate(selectedReport.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
