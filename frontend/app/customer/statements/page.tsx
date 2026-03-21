'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { CalendarIcon, Download, FileText, TrendingUp, PieChart, CreditCard, Smartphone, Building, RefreshCw, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'

// Force dynamic rendering to prevent SSR issues with auth
export const dynamic = 'force-dynamic'
export const runtime = 'edge'
import {
  generateCustomerStatement,
  getCustomerStatements,
  downloadCustomerStatement,
  getStatementPreview,
  getCustomerStats,
  getAccountBalance,
  getCustomerTransactions,
  getCustomerSpendingByCategory,
  getCustomerBalanceHistory,
  type CustomerStatement,
  type StatementParams,
  type StatementPreview,
  type CustomerStats,
  type AccountBalance
} from '@/lib/api/customer'

export default function CustomerStatementsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<'current' | 'last' | 'custom'>('current')
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [statementFormat, setStatementFormat] = useState<'pdf' | 'excel'>('pdf')
  const [includeCharts, setIncludeCharts] = useState(true)
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false)
  const [previewStatement, setPreviewStatement] = useState<StatementPreview | null>(null)
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d' | 'custom'>('30d')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const queryClient = useQueryClient()

  // Fetch customer statements
  const { data: statements = [], isLoading: statementsLoading } = useQuery({
    queryKey: ['customer-statements'],
    queryFn: getCustomerStatements
  })

  // Fetch customer stats
  const { data: customerStats, isLoading: statsLoading } = useQuery({
    queryKey: ['customer-stats'],
    queryFn: getCustomerStats
  })

  // Fetch account balance
  const { data: accountBalance, isLoading: balanceLoading } = useQuery({
    queryKey: ['account-balance'],
    queryFn: getAccountBalance
  })

  // Fetch transactions for current period
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['customer-transactions', selectedTimeRange, selectedCategory],
    queryFn: () => {
      const params: any = {}
      if (selectedTimeRange !== 'custom') {
        const now = new Date()
        const days = selectedTimeRange === '7d' ? 7 : selectedTimeRange === '30d' ? 30 : 90
        params.start_date = format(new Date(now.getTime() - days * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
        params.end_date = format(now, 'yyyy-MM-dd')
      }
      if (selectedCategory !== 'all') {
        params.category = selectedCategory
      }
      return getCustomerTransactions(params)
    }
  })

  // Fetch spending by category
  const { data: spendingByCategory, isLoading: spendingLoading } = useQuery({
    queryKey: ['spending-by-category', selectedTimeRange],
    queryFn: () => {
      const params: any = {}
      if (selectedTimeRange !== 'custom') {
        const now = new Date()
        const days = selectedTimeRange === '7d' ? 7 : selectedTimeRange === '30d' ? 30 : 90
        params.start_date = format(new Date(now.getTime() - days * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
        params.end_date = format(now, 'yyyy-MM-dd')
      }
      return getCustomerSpendingByCategory(params)
    }
  })

  // Fetch balance history
  const { data: balanceHistory, isLoading: balanceHistoryLoading } = useQuery({
    queryKey: ['balance-history', selectedTimeRange],
    queryFn: () => {
      const params: any = {}
      if (selectedTimeRange !== 'custom') {
        const now = new Date()
        const days = selectedTimeRange === '7d' ? 7 : selectedTimeRange === '30d' ? 30 : 90
        params.start_date = format(new Date(now.getTime() - days * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
        params.end_date = format(now, 'yyyy-MM-dd')
      }
      params.granularity = selectedTimeRange === '7d' ? 'daily' : selectedTimeRange === '30d' ? 'daily' : 'weekly'
      return getCustomerBalanceHistory(params)
    }
  })

  // Generate statement mutation
  const generateMutation = useMutation({
    mutationFn: (params: StatementParams) => generateCustomerStatement(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-statements'] })
      toast.success('Statement generated successfully')
      setIsGenerateDialogOpen(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to generate statement')
    }
  })

  // Preview statement mutation
  const previewMutation = useMutation({
    mutationFn: (params: StatementParams) => getStatementPreview(params),
    onSuccess: (data) => {
      setPreviewStatement(data)
      setIsPreviewDialogOpen(true)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to generate preview')
    }
  })

  // Download statement
  const handleDownload = async (statementId: number) => {
    try {
      const blob = await downloadCustomerStatement(statementId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `statement_${format(new Date(), 'yyyy-MM-dd')}.${statementFormat}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Statement downloaded successfully')
    } catch (error) {
      toast.error('Failed to download statement')
    }
  }

  // Generate statement with current parameters
  const handleGenerateStatement = () => {
    let start_date: string
    let end_date: string

    if (selectedPeriod === 'current') {
      const now = new Date()
      start_date = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd')
      end_date = format(now, 'yyyy-MM-dd')
    } else if (selectedPeriod === 'last') {
      const now = new Date()
      start_date = format(new Date(now.getFullYear(), now.getMonth() - 1, 1), 'yyyy-MM-dd')
      end_date = format(new Date(now.getFullYear(), now.getMonth(), 0), 'yyyy-MM-dd')
    } else {
      if (!startDate || !endDate) {
        toast.error('Please select date range')
        return
      }
      start_date = format(startDate, 'yyyy-MM-dd')
      end_date = format(endDate, 'yyyy-MM-dd')
    }

    const params: StatementParams = {
      start_date,
      end_date,
      format: statementFormat,
      include_charts: includeCharts
    }

    generateMutation.mutate(params)
  }

  // Preview statement
  const handlePreviewStatement = () => {
    let start_date: string
    let end_date: string

    if (selectedPeriod === 'current') {
      const now = new Date()
      start_date = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd')
      end_date = format(now, 'yyyy-MM-dd')
    } else if (selectedPeriod === 'last') {
      const now = new Date()
      start_date = format(new Date(now.getFullYear(), now.getMonth() - 1, 1), 'yyyy-MM-dd')
      end_date = format(new Date(now.getFullYear(), now.getMonth(), 0), 'yyyy-MM-dd')
    } else {
      if (!startDate || !endDate) {
        toast.error('Please select date range')
        return
      }
      start_date = format(startDate, 'yyyy-MM-dd')
      end_date = format(endDate, 'yyyy-MM-dd')
    }

    const params: StatementParams = {
      start_date,
      end_date,
      format: statementFormat,
      include_charts: includeCharts
    }

    previewMutation.mutate(params)
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      generating: 'secondary',
      failed: 'destructive'
    } as const

    return <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>{status}</Badge>
  }

  return (
    <div className="min-h-screen bg-sikaremit-card space-y-6 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-sikaremit-foreground flex items-center gap-2">
              <FileText className="h-8 w-8" />
              Account Statements
            </h1>
            <p className="text-muted-foreground mt-1">
              Download your account statements and track your financial activity
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePreviewStatement} disabled={previewMutation.isPending}>
              <Eye className="mr-2 h-4 w-4" />
              {previewMutation.isPending ? 'Generating...' : 'Preview'}
            </Button>
            <Button onClick={() => setIsGenerateDialogOpen(true)}>
              <Download className="mr-2 h-4 w-4" />
              Generate Statement
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Current Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {balanceLoading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-green-600">
                    ₵{typeof accountBalance?.available === 'number' ? accountBalance.available.toFixed(2) : Number(accountBalance?.available || 0).toFixed(2)}
                  </div>
                  {accountBalance?.pending && Number(accountBalance.pending) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      ₵{typeof accountBalance.pending === 'number' ? accountBalance.pending.toFixed(2) : Number(accountBalance.pending || 0).toFixed(2)} pending
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                Monthly Spending
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    ₵{spendingByCategory?.reduce((sum: number, cat: any) => sum + cat.amount, 0).toFixed(2) || '0.00'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {transactionsData?.results?.length || 0} transactions
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Card Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {customerStats?.completed_transactions || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {customerStats?.success_rate ? `${(customerStats.success_rate * 100).toFixed(1)}% success` : 'This month'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Mobile Money
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {transactionsData?.results?.filter((t: any) => t.payment_method?.includes('momo') || t.payment_method?.includes('mobile')).length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">This month</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Spending Overview Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Spending Overview
              </span>
              <Select value={selectedTimeRange} onValueChange={(value: any) => setSelectedTimeRange(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {spendingLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-4 w-24 bg-gray-200 animate-pulse rounded"></div>
                    <div className="h-4 w-32 bg-gray-200 animate-pulse rounded"></div>
                  </div>
                ))}
              </div>
            ) : spendingByCategory && spendingByCategory.length > 0 ? (
              <div className="space-y-3">
                {spendingByCategory.map((category: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm font-medium">{category.name}</span>
                      <span className="text-xs text-muted-foreground">({category.transaction_count} transactions)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${category.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-20 text-right">₵{category.amount.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No spending data available for the selected period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statements History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Statement History
            </CardTitle>
            <CardDescription>View and download your previous statements</CardDescription>
          </CardHeader>
          <CardContent>
            {statementsLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin" />
              </div>
            ) : statements && statements.length > 0 ? (
              <div className="space-y-4">
                {statements.map((statement) => (
                  <Card key={statement.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            <h3 className="font-semibold">
                              {statement.period_name} Statement
                            </h3>
                            {getStatusBadge(statement.status)}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Period</p>
                              <p className="font-medium">
                                {format(new Date(statement.start_date), 'MMM dd')} - {' '}
                                {format(new Date(statement.end_date), 'MMM dd, yyyy')}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Transactions</p>
                              <p className="font-medium">{statement.transaction_count}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Closing Balance</p>
                              <p className="font-medium">₵{typeof statement.closing_balance === 'number' ? statement.closing_balance.toFixed(2) : Number(statement.closing_balance || 0).toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Format</p>
                              <p className="font-medium uppercase">{statement.format}</p>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Generated {format(new Date(statement.created_at), 'MMM dd, yyyy at HH:mm')}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          {statement.status === 'completed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(statement.id)}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No statements generated</p>
                <p className="text-muted-foreground mt-1">
                  Generate your first statement to get started
                </p>
                <Button onClick={() => setIsGenerateDialogOpen(true)} className="mt-4">
                  <Download className="mr-2 h-4 w-4" />
                  Generate Statement
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generate Statement Dialog */}
        <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Generate Account Statement</DialogTitle>
              <DialogDescription>
                Choose the period and format for your statement
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Statement Period</Label>
                <Select
                  value={selectedPeriod}
                  onValueChange={(value: any) => setSelectedPeriod(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Current Month</SelectItem>
                    <SelectItem value="last">Last Month</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedPeriod === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From Date</Label>
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
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>To Date</Label>
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
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Format</Label>
                <Select
                  value={statementFormat}
                  onValueChange={(value: any) => setStatementFormat(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF Document</SelectItem>
                    <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="includeCharts"
                  checked={includeCharts}
                  onChange={(e) => setIncludeCharts(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="includeCharts" className="text-sm">
                  Include charts and graphs
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerateStatement} disabled={generateMutation.isPending}>
                {generateMutation.isPending ? 'Generating...' : 'Generate Statement'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Statement Preview</DialogTitle>
              <DialogDescription>
                Preview of your account statement
              </DialogDescription>
            </DialogHeader>
            {previewStatement && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Opening Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold">₵{typeof previewStatement.opening_balance === 'number' ? previewStatement.opening_balance.toFixed(2) : Number(previewStatement.opening_balance || 0).toFixed(2)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Net Change</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-xl font-bold ${Number(previewStatement.net_change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₵{typeof previewStatement.net_change === 'number' ? previewStatement.net_change.toFixed(2) : Number(previewStatement.net_change || 0).toFixed(2)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Closing Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold">₵{typeof previewStatement.closing_balance === 'number' ? previewStatement.closing_balance.toFixed(2) : Number(previewStatement.closing_balance || 0).toFixed(2)}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Transactions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewStatement.recent_transactions.slice(0, 5).map((transaction, index) => (
                          <TableRow key={index}>
                            <TableCell>{format(new Date(transaction.date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>{transaction.description}</TableCell>
                            <TableCell>{transaction.category}</TableCell>
                            <TableCell className={`text-right font-medium ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {transaction.amount >= 0 ? '+' : ''}₵{Math.abs(transaction.amount).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Spending Categories */}
                {includeCharts && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Spending by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {previewStatement.spending_categories.map((category, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-sm">{category.name}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${category.percentage}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">₵{category.amount.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>
                Close
              </Button>
              <Button onClick={handleGenerateStatement}>
                Generate Full Statement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
