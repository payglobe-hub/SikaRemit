'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { CalendarIcon, Download, FileText, BarChart3, Clock, Play, Pause, Plus, Trash2, RefreshCw, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'

// Force dynamic rendering to prevent SSR issues with auth
export const dynamic = 'force-dynamic'
export const runtime = 'edge'
import {
  getReportTemplates,
  getMerchantReports,
  regenerateReport,
  cancelReport,
  deleteReport,
  downloadReport,
  getScheduledReports,
  createScheduledReport,
  pauseScheduledReport,
  resumeScheduledReport,
  runScheduledReportNow,
  deleteScheduledReport,
  createMerchantReport,
  type ReportTemplate,
  type MerchantReport,
  type ScheduledReport,
  type ReportGenerationParams,
  type ScheduledReportCreateParams
} from '@/lib/api/merchant'

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('generate')
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null)
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [reportFormat, setReportFormat] = useState<'pdf' | 'csv' | 'excel' | 'json'>('pdf')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false)

  const queryClient = useQueryClient()

  // Fetch data
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['report-templates'],
    queryFn: getReportTemplates
  })

  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['merchant-reports'],
    queryFn: getMerchantReports
  })

  const { data: scheduledReports = [], isLoading: scheduledLoading } = useQuery({
    queryKey: ['scheduled-reports'],
    queryFn: getScheduledReports
  })

  // Mutations
  const createReportMutation = useMutation({
    mutationFn: async (params: ReportGenerationParams) => {
      const response = await createMerchantReport(params);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-reports'] })
      setIsCreateDialogOpen(false)
      toast.success('Report generation started')
      setActiveTab('history') // Navigate to history tab to show progress
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create report - please try again')
    }
  })

  const regenerateMutation = useMutation({
    mutationFn: (reportId: number) => regenerateReport(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-reports'] })
      toast.success('Report regeneration started')
    },
    onError: () => {
      toast.error('Failed to regenerate report')
    }
  })

  const cancelMutation = useMutation({
    mutationFn: (reportId: number) => cancelReport(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-reports'] })
      toast.success('Report cancelled')
    },
    onError: () => {
      toast.error('Failed to cancel report')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (reportId: number) => deleteReport(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-reports'] })
      toast.success('Report deleted')
    },
    onError: () => {
      toast.error('Failed to delete report')
    }
  })

  const downloadMutation = useMutation({
    mutationFn: async (reportId: number) => {
      const blob = await downloadReport(reportId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report-${reportId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    },
    onError: () => {
      toast.error('Failed to download report')
    }
  })

  const createScheduledMutation = useMutation({
    mutationFn: createScheduledReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] })
      setIsScheduleDialogOpen(false)
      toast.success('Scheduled report created')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create scheduled report')
    }
  })

  const pauseScheduledMutation = useMutation({
    mutationFn: (scheduledReportId: number) => pauseScheduledReport(scheduledReportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] })
      toast.success('Scheduled report paused')
    },
    onError: () => {
      toast.error('Failed to pause scheduled report')
    }
  })

  const resumeScheduledMutation = useMutation({
    mutationFn: (scheduledReportId: number) => resumeScheduledReport(scheduledReportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] })
      toast.success('Scheduled report resumed')
    },
    onError: () => {
      toast.error('Failed to resume scheduled report')
    }
  })

  const runNowMutation = useMutation({
    mutationFn: (scheduledReportId: number) => runScheduledReportNow(scheduledReportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-reports'] })
      toast.success('Report generation started')
    },
    onError: () => {
      toast.error('Failed to run scheduled report')
    }
  })

  const deleteScheduledMutation = useMutation({
    mutationFn: (scheduledReportId: number) => deleteScheduledReport(scheduledReportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] })
      toast.success('Scheduled report deleted')
    },
    onError: () => {
      toast.error('Failed to delete scheduled report')
    }
  })

  const handleCreateReport = () => {
    if (!selectedTemplate || !startDate || !endDate) {
      toast.error('Please fill in all required fields')
      return
    }

    const params: ReportGenerationParams = {
      template: selectedTemplate,
      format: reportFormat,
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd')
    }

    createReportMutation.mutate(params)
  }

  const handleCreateScheduledReport = (formData: FormData) => {
    const template = parseInt(formData.get('template') as string)
    const name = formData.get('name') as string
    const frequency = formData.get('frequency') as 'daily' | 'weekly' | 'monthly' | 'quarterly'
    const format = formData.get('format') as 'pdf' | 'csv' | 'excel' | 'json'
    const emailRecipients = (formData.get('emailRecipients') as string)
      .split(',')
      .map(email => email.trim())
      .filter(email => email)

    const params: ScheduledReportCreateParams = {
      template,
      name,
      frequency,
      format,
      email_recipients: emailRecipients
    }

    createScheduledMutation.mutate(params)
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      generating: 'default',
      completed: 'default',
      failed: 'destructive'
    } as const

    return <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>{status}</Badge>
  }

  const getScheduledStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      paused: 'secondary',
      expired: 'destructive'
    } as const

    return <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>{status}</Badge>
  }

  return (
    <div className="space-y-12 animate-in fade-in-0 duration-700">
      {/* Hero Section - Matching Dashboard Design */}
      <section className="relative py-16 lg:py-24 overflow-hidden bg-gradient-to-br from-blue-50/30 via-blue-50/20 to-blue-50/30">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-blue-400/20 to-blue-300/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-blue-400/15 to-blue-400/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-conic from-blue-500/5 via-transparent to-blue-400/5 rounded-full blur-2xl animate-spin" style={{animationDuration: '20s'}}></div>
        </div>

        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto animate-in slide-in-from-bottom duration-1000">
            <div className="inline-flex items-center px-6 py-3 rounded-full bg-white/40 backdrop-blur-xl border border-white/30 shadow-lg shadow-blue-500/5 text-slate-700 text-sm font-semibold mb-8 animate-in zoom-in-50 duration-700 delay-300 hover:bg-white/50 hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 group">
              <BarChart3 className="w-5 h-5 mr-3 text-blue-600 group-hover:rotate-12 transition-transform duration-300" />
              Analytics & Reporting
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6 leading-tight animate-in slide-in-from-bottom duration-1000 delay-500">
              Business Intelligence
              <span className="block bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent drop-shadow-sm">Generate insights from your data</span>
            </h1>
            <p className="text-lg text-slate-600/90 mb-8 max-w-2xl mx-auto leading-relaxed animate-in slide-in-from-bottom duration-1000 delay-700 font-medium">
              Create custom reports, analyze trends, and make data-driven decisions with comprehensive business analytics tools.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center animate-in slide-in-from-bottom duration-1000 delay-900">
              <div className="flex items-center space-x-3 bg-white/40 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 hover:bg-white/50 group">
                <BarChart3 className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-slate-700 font-medium">Custom reports</span>
              </div>
              <div className="flex items-center space-x-3 bg-white/40 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 hover:bg-white/50 group">
                <Download className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-slate-700 font-medium">Export options</span>
              </div>
              <div className="flex items-center space-x-3 bg-white/40 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 hover:bg-white/50 group">
                <Clock className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-slate-700 font-medium">Scheduled delivery</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-12 lg:px-8 space-y-12">

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="generate">Generate Reports</TabsTrigger>
          <TabsTrigger value="history">Report History</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 animate-in slide-in-from-bottom-1 duration-700">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-800 dark:to-gray-800"></div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-blue-400/20 to-blue-600/20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-500"></div>

            <CardHeader className="relative z-10 border-b border-gray-200 dark:border-gray-700">
              <CardTitle className="text-2xl font-bold text-sikaremit-foreground flex items-center">
                <div className={`p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg mr-3`}>
                  <FileText className="h-6 w-6 text-white" />
                </div>
                Generate New Report
              </CardTitle>
              <CardDescription className="text-sikaremit-muted text-lg mt-1">
                Create custom reports for your business analytics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="template">Report Template</Label>
                  <Select value={selectedTemplate?.toString() || ""} onValueChange={(value) => setSelectedTemplate(value ? parseInt(value) : null)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id.toString()}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        selected={startDate}
                        onSelect={setStartDate}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        selected={endDate}
                        onSelect={setEndDate}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="format">Format</Label>
                  <Select value={reportFormat} onValueChange={(value: any) => setReportFormat(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleCreateReport}
                disabled={createReportMutation.isPending}
                className="w-full md:w-auto bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-2xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-500 font-semibold hover:scale-105 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                <FileText className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="bg-sikaremit-card/80 backdrop-blur-sm group cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/10 relative overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${'from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20'} opacity-0 group-hover:opacity-100 transition-all duration-500`} />
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-10 -mt-10"></div>

                <CardHeader className="relative z-10">
                  <CardTitle className="flex items-center gap-2 text-sikaremit-foreground">
                    <div className={`p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg`}>
                      <BarChart3 className="h-4 w-4 text-white" />
                    </div>
                    {template.name}
                  </CardTitle>
                  <CardDescription className="text-sikaremit-muted">{template.description}</CardDescription>
                </CardHeader>
                <CardContent className="relative z-10">
                  <Button
                    variant="outline"
                    className="w-full hover:bg-blue-50/50 border-blue-200 hover:border-blue-300"
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    Select Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 animate-in slide-in-from-bottom-2 duration-700">
            <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800"></div>

            <CardHeader className="relative z-10 border-b border-gray-200 dark:border-gray-700">
              <CardTitle className="text-2xl font-bold text-sikaremit-foreground flex items-center">
                <div className={`p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg mr-3`}>
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                Report History
              </CardTitle>
              <CardDescription className="text-sikaremit-muted text-lg mt-1">
                View and manage your generated reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.name}</TableCell>
                      <TableCell>{report.template_name}</TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell>{format(new Date(report.created_at), 'PPp')}</TableCell>
                      <TableCell className="uppercase">{report.format}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {report.status === 'completed' && report.file_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadMutation.mutate(report.id)}
                              disabled={downloadMutation.isPending}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          {['pending', 'generating'].includes(report.status) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => cancelMutation.mutate(report.id)}
                              disabled={cancelMutation.isPending}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          )}
                          {report.status === 'failed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => regenerateMutation.mutate(report.id)}
                              disabled={regenerateMutation.isPending}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Report</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this report? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(report.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Scheduled Reports</h3>
              <p className="text-sm text-muted-foreground">
                Automatically generate reports on a schedule
              </p>
            </div>
            <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-2xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-500 font-semibold hover:scale-105 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule Report
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Schedule New Report</DialogTitle>
                  <DialogDescription>
                    Set up automatic report generation
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const formData = new FormData(e.currentTarget)
                    handleCreateScheduledReport(formData)
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="template">Template</Label>
                    <Select name="template" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id.toString()}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Report Name</Label>
                    <Input name="name" placeholder="Enter report name" required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frequency</Label>
                    <Select name="frequency" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="format">Format</Label>
                    <Select name="format" defaultValue="pdf">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="excel">Excel</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emailRecipients">Email Recipients (comma-separated)</Label>
                    <Input name="emailRecipients" placeholder="email@example.com, another@example.com" />
                  </div>

                  <DialogFooter>
                    <Button type="submit" disabled={createScheduledMutation.isPending}>
                      Schedule Report
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 animate-in slide-in-from-bottom-3 duration-700">
            <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800"></div>

            <CardContent className="pt-6 relative z-10">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Next Run</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduledReports.map((scheduled) => (
                    <TableRow key={scheduled.id}>
                      <TableCell className="font-medium">{scheduled.name}</TableCell>
                      <TableCell>{scheduled.template_name}</TableCell>
                      <TableCell className="capitalize">{scheduled.frequency}</TableCell>
                      <TableCell>{format(new Date(scheduled.next_run), 'PPp')}</TableCell>
                      <TableCell>{getScheduledStatusBadge(scheduled.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {scheduled.status === 'active' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => pauseScheduledMutation.mutate(scheduled.id)}
                                disabled={pauseScheduledMutation.isPending}
                              >
                                <Pause className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => runNowMutation.mutate(scheduled.id)}
                                disabled={runNowMutation.isPending}
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {scheduled.status === 'paused' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resumeScheduledMutation.mutate(scheduled.id)}
                              disabled={resumeScheduledMutation.isPending}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Scheduled Report</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this scheduled report? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteScheduledMutation.mutate(scheduled.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  )
}
