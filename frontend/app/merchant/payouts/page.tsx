'use client'

// Prevent static generation for this page since it uses functions that can't be serialized
export const dynamic = 'force-dynamic'

import React from 'react'
import { useState } from 'react'
import api from '@/lib/api/axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
  Wallet,
  Plus,
  Search,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  DollarSign,
  TrendingUp,
  Activity,
  CreditCard,
  Building,
  Smartphone,
  Repeat,
  Play,
  Pause
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useCurrency } from '@/hooks/useCurrency'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import * as PayoutsAPI from '@/lib/api/payouts'

interface Payout {
  id: string
  amount: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  method: 'bank_transfer' | 'mobile_money' | 'card'
  created_at: string
  processed_at?: string
  reference: string
  fee: number
}

interface ScheduledPayout {
  id: number
  merchant_id: number
  amount: number
  currency: string
  schedule: string
  is_active: boolean
  next_execution: string
  last_execution?: string
  execution_count: number
  created_at: string
  payment_method: string
}

async function getScheduledPayouts(): Promise<ScheduledPayout[]> {
  const response = await api.get('/api/v1/payments/scheduled-payouts/')
  return response.data
}

async function createScheduledPayout(data: {
  amount: number
  schedule: string
  payment_method: string
}) {
  const response = await api.post('/api/v1/payments/scheduled-payouts/', data)
  return response.data
}

async function toggleScheduledPayout(id: number, isActive: boolean) {
  const response = await api.patch(`/api/v1/payments/scheduled-payouts/${id}/`, { is_active: isActive })
  return response.data
}

const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return { variant: 'default' as const, className: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Completed' }
    case 'processing':
      return { variant: 'secondary' as const, className: 'bg-blue-100 text-blue-800', icon: Clock, text: 'Processing' }
    case 'pending':
      return { variant: 'outline' as const, className: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Pending' }
    case 'failed':
      return { variant: 'destructive' as const, className: 'bg-red-100 text-red-800', icon: XCircle, text: 'Failed' }
    default:
      return { variant: 'outline' as const, className: '', icon: null, text: status }
  }
}

const getMethodBadge = (method: string) => {
  const variants: Record<string, string> = {
    bank_transfer: 'bg-blue-100 text-blue-800',
    mobile_money: 'bg-indigo-100 text-indigo-800',
    card: 'bg-green-100 text-green-800'
  }

  return {
    variant: 'outline' as const,
    className: variants[method] || 'bg-gray-100 text-gray-800',
    text: method.replace('_', ' ').toUpperCase()
  }
}

export default function MerchantPayoutsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false)
  const [requestAmount, setRequestAmount] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [activeTab, setActiveTab] = useState('payouts')

  const { formatAmount, convertAmount, currency } = useCurrency()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: payouts, isLoading } = useQuery({
    queryKey: ['merchant-payouts', searchTerm, statusFilter],
    queryFn: () => PayoutsAPI.getPayouts({
      status: statusFilter !== 'all' ? statusFilter : undefined
    }),
    enabled: activeTab === 'payouts'
  })

  const { data: scheduledPayouts, isLoading: scheduledLoading } = useQuery({
    queryKey: ['scheduled-payouts'],
    queryFn: getScheduledPayouts,
    enabled: activeTab === 'scheduled'
  })

  const { data: payoutStats } = useQuery({
    queryKey: ['merchant-payout-balance'],
    queryFn: PayoutsAPI.getBalance
  })

  const requestPayoutMutation = useMutation({
    mutationFn: ({ amount, recipient_name, recipient_email }: { amount: number; recipient_name: string; recipient_email: string }) => 
      PayoutsAPI.requestPayout(amount, recipient_name, recipient_email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-payouts'] })
      queryClient.invalidateQueries({ queryKey: ['merchant-payout-balance'] })
      toast({ title: 'Success', description: 'Payout requested successfully' })
      setIsRequestDialogOpen(false)
      setRequestAmount('')
      setRecipientName('')
      setRecipientEmail('')
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to request payout', variant: 'destructive' })
    }
  })

  const createScheduledPayoutMutation = useMutation({
    mutationFn: createScheduledPayout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-payouts'] })
      toast({ title: 'Success', description: 'Scheduled payout created successfully' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: 'Failed to create scheduled payout', variant: 'destructive' })
    }
  })

  const toggleScheduledPayoutMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => toggleScheduledPayout(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-payouts'] })
      toast({ title: 'Success', description: 'Scheduled payout updated successfully' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: 'Failed to update scheduled payout', variant: 'destructive' })
    }
  })

  const handleRequestPayout = () => {
    const amount = parseFloat(requestAmount)
    if (amount > 0 && amount <= (payoutStats?.available_balance || 0) && recipientName && recipientEmail) {
      requestPayoutMutation.mutate({
        amount,
        recipient_name: recipientName,
        recipient_email: recipientEmail
      })
    } else {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields and ensure the amount is valid.',
        variant: 'destructive'
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>
      case 'processing':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Processing</Badge>
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case 'failed':
        return <Badge variant="destructive" className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getMethodBadge = (method: string) => {
    const variants: Record<string, string> = {
      bank_transfer: 'bg-blue-100 text-blue-800',
      mobile_money: 'bg-indigo-100 text-indigo-800',
      card: 'bg-green-100 text-green-800'
    }

    return (
      <Badge variant="outline" className={variants[method] || 'bg-gray-100 text-gray-800'}>
        {method.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Hero Section */}
      <div className="relative py-16 lg:py-24 overflow-hidden bg-gradient-to-br from-blue-50/30 via-blue-50/20 to-blue-50/30">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-blue-400/20 to-blue-300/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-blue-400/15 to-indigo-400/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-conic from-blue-500/5 via-transparent to-blue-400/5 rounded-full blur-2xl animate-spin" style={{animationDuration: '20s'}}></div>
        </div>

        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto animate-in slide-in-from-bottom duration-1000">
            <div className="inline-flex items-center px-6 py-3 rounded-full bg-white/40 backdrop-blur-xl border border-white/30 shadow-lg shadow-blue-500/5 text-slate-700 text-sm font-semibold mb-8 animate-in zoom-in-50 duration-700 delay-300 hover:bg-white/50 hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 group">
              <Wallet className="w-5 h-5 mr-3 text-blue-600 group-hover:rotate-12 transition-transform duration-300" />
              Payout Management
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6 leading-tight animate-in slide-in-from-bottom duration-1000 delay-500">
              Financial Operations
              <span className="block bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent drop-shadow-sm">Manage payouts and track earnings</span>
            </h1>
            <p className="text-lg text-slate-600/90 mb-8 max-w-2xl mx-auto leading-relaxed animate-in slide-in-from-bottom duration-1000 delay-700 font-medium">
              Monitor your available balance, request withdrawals, and keep track of all your payout transactions with comprehensive financial management tools.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center animate-in slide-in-from-bottom duration-1000 delay-900">
              <div className="flex items-center space-x-3 bg-white/40 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 hover:bg-white/50 group">
                <Wallet className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-slate-700 font-medium">Balance management</span>
              </div>
              <div className="flex items-center space-x-3 bg-white/40 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 hover:bg-white/50 group">
                <Activity className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-slate-700 font-medium">Transaction tracking</span>
              </div>
              <div className="flex items-center space-x-3 bg-white/40 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 hover:bg-white/50 group">
                <DollarSign className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-slate-700 font-medium">Payout processing</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 lg:px-8 space-y-8">
        {/* Balance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-sikaremit-card/80 backdrop-blur-sm group cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/10 relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${'from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20'} opacity-0 group-hover:opacity-100 transition-all duration-500`} />
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-10 -mt-10"></div>

            <CardContent className="relative z-10 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-sikaremit-muted">Available Balance</p>
                  <p className="text-3xl font-bold text-sikaremit-foreground">{formatAmount(payoutStats?.available_balance || 0)}</p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Wallet className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-xs text-sikaremit-muted mt-2">
                Ready to withdraw
              </p>
            </CardContent>
          </Card>

          <Card className="bg-sikaremit-card/80 backdrop-blur-sm group cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/10 relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${'from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20'} opacity-0 group-hover:opacity-100 transition-all duration-500`} />
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-10 -mt-10"></div>

            <CardContent className="relative z-10 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-sikaremit-muted">Pending Payouts</p>
                  <p className="text-3xl font-bold text-sikaremit-foreground">{formatAmount(payoutStats?.pending_amount || 0)}</p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Clock className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-xs text-sikaremit-muted mt-2">
                In processing
              </p>
            </CardContent>
          </Card>

          <Card className="bg-sikaremit-card/80 backdrop-blur-sm group cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/10 relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${'from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20'} opacity-0 group-hover:opacity-100 transition-all duration-500`} />
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-10 -mt-10"></div>

            <CardContent className="relative z-10 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-sikaremit-muted">Total Paid</p>
                  <p className="text-3xl font-bold text-sikaremit-foreground">{formatAmount(payoutStats?.total_paid || 0)}</p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-xs text-sikaremit-muted mt-2">
                All time earnings
              </p>
            </CardContent>
          </Card>

          <Card className="bg-sikaremit-card/80 backdrop-blur-sm group cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/10 relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${'from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20'} opacity-0 group-hover:opacity-100 transition-all duration-500`} />
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-10 -mt-10"></div>

            <CardContent className="relative z-10 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-sikaremit-muted">This Month</p>
                  <p className="text-3xl font-bold text-sikaremit-foreground">{formatAmount(payoutStats?.monthly_paid || 0)}</p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Calendar className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-xs text-sikaremit-muted mt-2">
                November earnings
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="payouts" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Payouts
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="flex items-center gap-2">
              <Repeat className="h-4 w-4" />
              Scheduled Payouts
            </TabsTrigger>
          </TabsList>

          {/* Payouts Tab */}
          <TabsContent value="payouts" className="space-y-6">
            {/* Search and Request Payout */}
        <Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 animate-in slide-in-from-bottom-1 duration-700">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-800 dark:to-gray-800"></div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-blue-400/20 to-blue-300/20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-500"></div>

          <CardContent className="p-6 relative z-10">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    placeholder="Search payouts by ID or reference..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 text-base border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl shadow-sm"
                  />
                </div>
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48 h-12 border-2 border-gray-200 dark:border-gray-700 rounded-xl">
                  <Clock className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">⏳ Pending</SelectItem>
                  <SelectItem value="processing">🔄 Processing</SelectItem>
                  <SelectItem value="completed">✅ Completed</SelectItem>
                  <SelectItem value="failed">❌ Failed</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" className="h-12 px-6 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>

              <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-500 to-blue-700 shadow-2xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-500 font-semibold hover:scale-105 relative overflow-hidden group h-12 px-6 rounded-xl">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                    <Plus className="w-4 h-4 mr-2" />
                    Request Payout
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Request New Payout</DialogTitle>
                    <DialogDescription>
                      Withdraw funds from your available balance.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="amount">Amount to withdraw</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={requestAmount}
                        onChange={(e) => setRequestAmount(e.target.value)}
                        placeholder="0.00"
                        max={payoutStats?.available_balance || 0}
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Available balance: {formatAmount(payoutStats?.available_balance || 0)}
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="recipientName">Recipient Name</Label>
                      <Input
                        id="recipientName"
                        type="text"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="Enter full name"
                        required
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Full name of the payout recipient for verification
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="recipientEmail">Recipient Email</Label>
                      <Input
                        id="recipientEmail"
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="Enter email address"
                        required
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Email for notifications and payment confirmation
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setIsRequestDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleRequestPayout}
                      disabled={
                        requestPayoutMutation.isPending || 
                        !requestAmount || 
                        parseFloat(requestAmount) <= 0 || 
                        parseFloat(requestAmount) > (payoutStats?.available_balance || 0) ||
                        !recipientName || 
                        !recipientEmail
                      }
                    >
                      {requestPayoutMutation.isPending ? 'Requesting...' : 'Request Payout'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Payouts Table */}
        <Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 animate-in slide-in-from-bottom-2 duration-700">
          <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800"></div>

          <CardHeader className="relative z-10 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-sikaremit-foreground flex items-center">
                  <div className={`p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg mr-3`}>
                    <Wallet className="h-6 w-6 text-white" />
                  </div>
                  Payout History
                </CardTitle>
                <CardDescription className="text-sikaremit-muted text-lg mt-1">
                  {payouts?.length || 0} payouts found • Track your withdrawal history and status
                </CardDescription>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-600 dark:text-blue-400/30 dark:text-blue-300">
                Financial Records
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0 relative z-10">
            {isLoading ? (
              <div className="p-8 space-y-4">
                {[...Array(5)].map((_, i) => (
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
                      <TableHead>
                        <Button variant="ghost" className="h-auto p-0 font-semibold text-gray-900 dark:text-white hover:text-violet-600">
                          Payout ID
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" className="h-auto p-0 font-semibold text-gray-900 dark:text-white hover:text-violet-600">
                          Amount
                        </Button>
                      </TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Processed</TableHead>
                      <TableHead>Fee</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts?.map((payout: any, index: number) => (
                      <TableRow
                        key={payout.id}
                        className="group border-b border-gray-100 dark:border-gray-700 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-transparent dark:hover:from-blue-950/20 dark:hover:to-transparent transition-all duration-300 animate-in slide-in-from-left duration-500"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg flex items-center justify-center">
                              <Wallet className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{payout.id}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{payout.reference}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-lg text-gray-900 dark:text-white">
                            {formatAmount(payout.amount)}
                          </div>
                          {payout.currency !== currency && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              ≈ {formatAmount(convertAmount(payout.amount, payout.currency, currency))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {payout.recipient_name || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {payout.recipient_email || 'N/A'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {payout.method === 'bank_transfer' && <Building className="w-4 h-4 text-blue-600" />}
                            {payout.method === 'mobile_money' && <Smartphone className="w-4 h-4 text-blue-600" />}
                            {payout.method === 'card' && <CreditCard className="w-4 h-4 text-green-600" />}
                            {getMethodBadge(payout.method)}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(payout.status)}</TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-900 dark:text-white">
                            {new Date(payout.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(payout.created_at).toLocaleTimeString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          {payout.processed_at ? (
                            <>
                              <div className="text-sm text-gray-900 dark:text-white">
                                {new Date(payout.processed_at).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(payout.processed_at).toLocaleTimeString()}
                              </div>
                            </>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {formatAmount(payout.fee)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {payouts?.length === 0 && !isLoading && (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Wallet className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  No payouts found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
                  Your payout history will appear here once you make withdrawals
                </p>
                <Button
                  onClick={() => setIsRequestDialogOpen(true)}
                  className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-500 to-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Request First Payout
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

        {/* Scheduled Payouts Tab */}
        <TabsContent value="scheduled" className="space-y-6">
          <Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-800 dark:to-gray-800"></div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-blue-400/20 to-blue-300/20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-500"></div>

            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Scheduled Payouts</h3>
                  <p className="text-gray-600 dark:text-gray-400">Automated recurring payouts</p>
                </div>
                <Button className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-500 to-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Schedule
                </Button>
              </div>

              {scheduledLoading ? (
                <div className="text-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 dark:text-gray-400 mt-4">Loading scheduled payouts...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {scheduledPayouts?.map((scheduled) => (
                    <Card key={scheduled.id} className="bg-white/80 backdrop-blur-sm border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {formatAmount(scheduled.amount)} {scheduled.currency}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Schedule: {scheduled.schedule}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              Next: {new Date(scheduled.next_execution).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={scheduled.is_active}
                              onCheckedChange={(checked) => 
                                toggleScheduledPayoutMutation.mutate({ id: scheduled.id, isActive: checked })
                              }
                            />
                            <Badge variant={scheduled.is_active ? "default" : "secondary"}>
                              {scheduled.is_active ? "Active" : "Paused"}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      </div>
    </div>
  )
}
