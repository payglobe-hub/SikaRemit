'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import * as TransactionsAPI from '@/lib/api/transactions'

// Prevent static generation for this page since it uses functions that can't be serialized
export const dynamic = 'force-dynamic'
export const runtime = 'edge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Search,
  Filter,
  Download,
  Eye,
  ArrowUpDown,
  Calendar,
  Receipt,
  TrendingUp,
  TrendingDown,
  Activity,
  CreditCard,
  Smartphone,
  Building,
  MoreHorizontal,
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  Mail,
  Printer
} from 'lucide-react'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import {
  generateReceipt,
  downloadReceipt,
  emailReceipt,
  getMerchantNotifications,
  markMerchantNotificationAsRead,
  markAllMerchantNotificationsAsRead,
  getMerchantTransactionStats,
  MerchantTransactionStats
} from '@/lib/api/merchant'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { useCurrency } from '@/hooks/useCurrency'

export default function MerchantTransactionsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined } | undefined>()

  const { formatAmount, currency, convertAmount } = useCurrency()
  const { toast } = useToast()

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['merchant-transactions', searchTerm, statusFilter, sortBy, sortOrder, dateRange],
    queryFn: () => TransactionsAPI.getTransactions({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      start_date: dateRange?.from?.toISOString(),
      end_date: dateRange?.to?.toISOString()
    })
  })

  const { data: transactionStats } = useQuery({
    queryKey: ['merchant-transaction-stats'],
    queryFn: getMerchantTransactionStats
  })

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )
      case 'processing':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800">
            <Activity className="w-3 h-3 mr-1" />
            Processing
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'card':
        return <CreditCard className="w-4 h-4 text-blue-600" />
      case 'mtn_momo':
      case 'telecel':
      case 'airtel_tigo':
      case 'g_money':
      case 'mobile_money':
        return <Smartphone className="w-4 h-4 text-indigo-600" />
      case 'bank':
      case 'bank_transfer':
        return <Building className="w-4 h-4 text-green-600" />
      case 'sikaremit_balance':
        return <Receipt className="w-4 h-4 text-emerald-600" />
      case 'qr':
        return <Receipt className="w-4 h-4 text-cyan-600" />
      default:
        return <Receipt className="w-4 h-4 text-gray-600" />
    }
  }

  const getRiskIndicator = (score: number) => {
    if (score < 20) return <div className="w-2 h-2 bg-green-500 rounded-full" title="Low Risk"></div>
    if (score < 50) return <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Medium Risk"></div>
    return <div className="w-2 h-2 bg-red-500 rounded-full" title="High Risk"></div>
  }

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  const handleSelectTransaction = (id: string) => {
    setSelectedTransactions(prev =>
      prev.includes(id)
        ? prev.filter(t => t !== id)
        : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedTransactions.length === transactions?.length) {
      setSelectedTransactions([])
    } else {
      setSelectedTransactions(transactions?.map((t: any) => t.id) || [])
    }
  }

  const handleGenerateReceipt = async (transactionId: string) => {
    try {
      await generateReceipt(transactionId)
      toast({
        title: 'Receipt Generated',
        description: 'Receipt has been generated successfully.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate receipt.',
        variant: 'destructive'
      })
    }
  }

  const handleDownloadReceipt = async (transactionId: string) => {
    try {
      const blob = await downloadReceipt(transactionId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `receipt-${transactionId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: 'Receipt Downloaded',
        description: 'Receipt PDF has been downloaded.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download receipt.',
        variant: 'destructive'
      })
    }
  }

  const handleEmailReceipt = async (transactionId: string) => {
    const email = prompt('Enter email address to send receipt:')
    if (email) {
      try {
        await emailReceipt(transactionId, email)
        toast({
          title: 'Receipt Sent',
          description: `Receipt has been sent to ${email}.`,
        })
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to send receipt.',
          variant: 'destructive'
        })
      }
    }
  }

  const handlePrintReceipt = async (transactionId: string) => {
    try {
      // For demo, we'll open a print dialog. In production, this would generate and print the receipt.
      window.print()
      toast({
        title: 'Print Receipt',
        description: 'Print dialog opened. In production, this would print the actual receipt.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to print receipt.',
        variant: 'destructive'
      })
    }
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
              <Receipt className="w-5 h-5 mr-3 text-blue-600 group-hover:rotate-12 transition-transform duration-300" />
              Transaction Management
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6 leading-tight animate-in slide-in-from-bottom duration-1000 delay-500">
              Transaction History
              <span className="block bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent drop-shadow-sm">Monitor your payment activity</span>
            </h1>
            <p className="text-lg text-slate-600/90 mb-8 max-w-2xl mx-auto leading-relaxed animate-in slide-in-from-bottom duration-1000 delay-700 font-medium">
              Track, analyze, and manage all your payment transactions with advanced filtering and reporting tools.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center animate-in slide-in-from-bottom duration-1000 delay-900">
              <div className="flex items-center space-x-3 bg-white/40 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 hover:bg-white/50 group">
                <CheckCircle className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-slate-700 font-medium">Real-time updates</span>
              </div>
              <div className="flex items-center space-x-3 bg-white/40 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 hover:bg-white/50 group">
                <TrendingUp className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-slate-700 font-medium">Advanced analytics</span>
              </div>
              <div className="flex items-center space-x-3 bg-white/40 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 hover:bg-white/50 group">
                <Download className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-slate-700 font-medium">Export capabilities</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-12 lg:px-8 space-y-12">
        {/* Key Metrics Overview - Matching Dashboard Style */}
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-sikaremit-foreground mb-4">Transaction Overview</h2>
            <p className="text-lg text-sikaremit-muted max-w-2xl mx-auto">Your payment performance at a glance</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
            <Card className="bg-sikaremit-card/80 backdrop-blur-sm group cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/10 relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${'from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20'} opacity-0 group-hover:opacity-100 transition-all duration-500`} />
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-10 -mt-10"></div>

              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 relative z-10">
                <CardTitle className="text-sm font-semibold text-sikaremit-muted uppercase tracking-wide">
                  Total Volume
                </CardTitle>
                <div className={`p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
              </CardHeader>

              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-sikaremit-foreground mb-2">{formatAmount(transactionStats?.total_volume || 0)}</div>
                <div className="space-y-1">
                  <div className={`text-xs font-semibold px-2 py-1 rounded-full inline-flex items-center bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400`}>
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +12.5%
                  </div>
                  <p className="text-xs text-sikaremit-muted">vs last month</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-sikaremit-card/80 backdrop-blur-sm group cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/10 relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${'from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20'} opacity-0 group-hover:opacity-100 transition-all duration-500`} />
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-10 -mt-10"></div>

              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 relative z-10">
                <CardTitle className="text-sm font-semibold text-sikaremit-muted uppercase tracking-wide">
                  Success Rate
                </CardTitle>
                <div className={`p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
              </CardHeader>

              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-sikaremit-foreground mb-2">{transactionStats?.success_rate?.toFixed(1) || 0}%</div>
                <div className="space-y-1">
                  <div className={`text-xs font-semibold px-2 py-1 rounded-full inline-flex items-center bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400`}>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Excellent
                  </div>
                  <p className="text-xs text-sikaremit-muted">Above industry average</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-sikaremit-card/80 backdrop-blur-sm group cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/10 relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${'from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20'} opacity-0 group-hover:opacity-100 transition-all duration-500`} />
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-10 -mt-10"></div>

              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 relative z-10">
                <CardTitle className="text-sm font-semibold text-sikaremit-muted uppercase tracking-wide">
                  Avg. Transaction
                </CardTitle>
                <div className={`p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
              </CardHeader>

              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-sikaremit-foreground mb-2">{formatAmount(transactionStats?.average_transaction || 0)}</div>
                <div className="space-y-1">
                  <div className={`text-xs font-semibold px-2 py-1 rounded-full inline-flex items-center bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400`}>
                    <Activity className="w-3 h-3 mr-1" />
                    Steady
                  </div>
                  <p className="text-xs text-sikaremit-muted">Per transaction</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-sikaremit-card/80 backdrop-blur-sm group cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/10 relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${'from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20'} opacity-0 group-hover:opacity-100 transition-all duration-500`} />
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-10 -mt-10"></div>

              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 relative z-10">
                <CardTitle className="text-sm font-semibold text-sikaremit-muted uppercase tracking-wide">
                  Processing
                </CardTitle>
                <div className={`p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Clock className="h-5 w-5 text-white" />
                </div>
              </CardHeader>

              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-sikaremit-foreground mb-2">{transactionStats?.processing_count || 0}</div>
                <div className="space-y-1">
                  <div className={`text-xs font-semibold px-2 py-1 rounded-full inline-flex items-center bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400`}>
                    <Clock className="w-3 h-3 mr-1" />
                    In Progress
                  </div>
                  <p className="text-xs text-sikaremit-muted">Real-time status</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Advanced Filters */}
        <Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 animate-in slide-in-from-bottom-1 duration-700">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-800 dark:to-gray-800"></div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-blue-400/20 to-cyan-600/20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-500"></div>

          <CardContent className="p-6 relative z-10">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    placeholder="Search transactions by ID, email, or reference..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 text-base border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl shadow-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48 h-12 border-2 border-gray-200 dark:border-gray-700 rounded-xl">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">✅ Completed</SelectItem>
                    <SelectItem value="pending">⏳ Pending</SelectItem>
                    <SelectItem value="processing">🔄 Processing</SelectItem>
                    <SelectItem value="failed">❌ Failed</SelectItem>
                  </SelectContent>
                </Select>

                <div className="w-full sm:w-64">
                  <DateRangePicker
                    value={dateRange}
                    onChange={setDateRange}
                    placeholder="Select date range"
                    className="h-12 border-2 border-gray-200 dark:border-gray-700 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {selectedTransactions.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    {selectedTransactions.length} transaction{selectedTransactions.length !== 1 ? 's' : ''} selected
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                      Export Selected
                    </Button>
                    <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
                      Refund Selected
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 animate-in slide-in-from-bottom-2 duration-700">
          <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800"></div>

          <CardHeader className="relative z-10 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                  <Receipt className="w-7 h-7 mr-3 text-blue-600" />
                  Transaction Records
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400 text-lg mt-1">
                  {transactions?.length || 0} transactions found • Last updated: {new Date().toLocaleTimeString()}
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                  Live Data
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 relative z-10">
            {isLoading ? (
              <div className="p-8 space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedTransactions.length === transactions?.length && transactions.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </TableHead>
                      <TableHead className="min-w-[140px]">
                        <Button variant="ghost" onClick={() => handleSort('date')} className="h-auto p-0 font-semibold text-gray-900 dark:text-white hover:text-blue-600">
                          Date & Time
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead className="min-w-[120px]">Transaction ID</TableHead>
                      <TableHead className="min-w-[150px]">Customer</TableHead>
                      <TableHead className="min-w-[100px]">
                        <Button variant="ghost" onClick={() => handleSort('amount')} className="h-auto p-0 font-semibold text-gray-900 dark:text-white hover:text-blue-600">
                          Amount
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead className="min-w-[80px] hidden md:table-cell">Fee</TableHead>
                      <TableHead className="min-w-[130px]">Payment Method</TableHead>
                      <TableHead className="min-w-[80px] hidden lg:table-cell">Risk</TableHead>
                      <TableHead className="min-w-[100px]">
                        <Button variant="ghost" onClick={() => handleSort('status')} className="h-auto p-0 font-semibold text-gray-900 dark:text-white hover:text-blue-600">
                          Status
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead className="min-w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions?.map((transaction: any, index: number) => (
                      <TableRow
                        key={transaction.id}
                        className="group border-b border-gray-100 dark:border-gray-700 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-transparent dark:hover:from-blue-950/20 dark:hover:to-transparent transition-all duration-300 animate-in slide-in-from-left duration-500"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedTransactions.includes(transaction.id)}
                            onChange={() => handleSelectTransaction(transaction.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {new Date(transaction.created_at).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(transaction.created_at).toLocaleTimeString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                            {transaction.id}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {transaction.reference}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center">
                              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                {transaction.customer_email?.[0]?.toUpperCase() || '?'}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {transaction.customer_email || 'Anonymous'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-lg text-gray-900 dark:text-white">
                            {formatAmount(transaction.amount)}
                          </div>
                          {transaction.currency && transaction.currency !== currency && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              ≈ {formatAmount(convertAmount(transaction.amount, transaction.currency, currency))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-600 dark:text-gray-400 hidden md:table-cell">
                            {formatAmount(transaction.fee)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getPaymentMethodIcon(transaction.payment_method)}
                            <span className="text-sm font-medium capitalize text-gray-700 dark:text-gray-300">
                              {transaction.payment_method.replace('_', ' ')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center space-x-2">
                            {getRiskIndicator(transaction.risk_score)}
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {transaction.risk_score}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(transaction.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm" asChild className="hover:bg-blue-50 dark:hover:bg-blue-950/30">
                              <Link href={`/merchant/transactions/${transaction.id}`}>
                                <Eye className="w-4 h-4 text-blue-600" />
                              </Link>
                            </Button>

                            {/* Receipt Actions Dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                  <FileText className="w-4 h-4 text-gray-600" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Receipt Actions</DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => handleGenerateReceipt(transaction.id)}
                                  className="cursor-pointer"
                                >
                                  <FileText className="w-4 h-4 mr-2" />
                                  Generate Receipt
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDownloadReceipt(transaction.id)}
                                  className="cursor-pointer"
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  Download PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleEmailReceipt(transaction.id)}
                                  className="cursor-pointer"
                                >
                                  <Mail className="w-4 h-4 mr-2" />
                                  Email Receipt
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handlePrintReceipt(transaction.id)}
                                  className="cursor-pointer"
                                >
                                  <Printer className="w-4 h-4 mr-2" />
                                  Print Receipt
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>

                            <Button variant="ghost" size="sm" className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {transactions?.length === 0 && !isLoading && (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Receipt className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  No transactions found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
                  Try adjusting your search or filter criteria
                </p>
                <Button
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('all')
                  }}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
