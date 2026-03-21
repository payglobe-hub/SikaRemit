'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Prevent static generation for this page since it uses functions that can't be serialized
export const dynamic = 'force-dynamic'
export const runtime = 'edge'
import {
  Users,
  Search,
  Plus,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  UserPlus,
  MoreHorizontal,
  Filter,
  TrendingUp
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import {
  getMerchantCustomers,
  onboardMerchantCustomer,
  suspendMerchantCustomer,
  activateMerchantCustomer,
  getMerchantCustomerStats,
  submitMerchantCustomerKYC,
  MerchantCustomer,
  MerchantCustomerStats
} from '@/lib/api/merchant'

export default function MerchantCustomersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedKYCStatus, setSelectedKYCStatus] = useState<string>('all')
  const [onboardDialogOpen, setOnboardDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<MerchantCustomer | null>(null)
  const [onboardForm, setOnboardForm] = useState({
    customerEmail: '',
    kycRequired: true,
    notes: ''
  })

  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch customers and stats
  const { data: customersResponse, isLoading: customersLoading } = useQuery({
    queryKey: ['merchant-customers', searchTerm, selectedStatus, selectedKYCStatus],
    queryFn: () => getMerchantCustomers({
      search: searchTerm || undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
      kyc_status: selectedKYCStatus !== 'all' ? selectedKYCStatus : undefined,
    }),
  })

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['merchant-customer-stats'],
    queryFn: getMerchantCustomerStats,
  })

  const customers = customersResponse?.results || []
  const totalCount = customersResponse?.count || 0

  // Mutations
  const onboardMutation = useMutation({
    mutationFn: (data: { customerId: number; kycRequired: boolean; notes: string }) =>
      onboardMerchantCustomer(data.customerId, {
        kyc_required: data.kycRequired,
        notes: data.notes
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-customers'] })
      queryClient.invalidateQueries({ queryKey: ['merchant-customer-stats'] })
      setOnboardDialogOpen(false)
      setOnboardForm({ customerEmail: '', kycRequired: true, notes: '' })
      toast({
        title: 'Success',
        description: 'Customer onboarded successfully',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to onboard customer',
        variant: 'destructive'
      })
    }
  })

  const suspendMutation = useMutation({
    mutationFn: (customerId: number) => suspendMerchantCustomer(customerId, 'Suspended by merchant'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-customers'] })
      queryClient.invalidateQueries({ queryKey: ['merchant-customer-stats'] })
      toast({
        title: 'Success',
        description: 'Customer suspended successfully',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to suspend customer',
        variant: 'destructive'
      })
    }
  })

  const activateMutation = useMutation({
    mutationFn: (customerId: number) => activateMerchantCustomer(customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-customers'] })
      queryClient.invalidateQueries({ queryKey: ['merchant-customer-stats'] })
      toast({
        title: 'Success',
        description: 'Customer activated successfully',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to activate customer',
        variant: 'destructive'
      })
    }
  })

  const getStatusBadge = (status: string, kycStatus: string) => {
    if (status === 'blocked') {
      return <Badge variant="destructive">Blocked</Badge>
    }

    switch (kycStatus) {
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>
      case 'pending_review':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Under Review</Badge>
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>
      case 'in_progress':
        return <Badge variant="secondary"><Shield className="w-3 h-3 mr-1" />In Progress</Badge>
      default:
        return <Badge variant="outline">Not Started</Badge>
    }
  }

  const getKYCStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600'
      case 'rejected': return 'text-red-600'
      case 'pending_review': return 'text-orange-600'
      case 'in_progress': return 'text-blue-600'
      default: return 'text-gray-500'
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
              <Users className="w-5 h-5 mr-3 text-blue-600 group-hover:rotate-12 transition-transform duration-300" />
              Customer Management
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6 leading-tight animate-in slide-in-from-bottom duration-1000 delay-500">
              Customer Portfolio
              <span className="block bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent drop-shadow-sm">Manage your customer relationships</span>
            </h1>
            <p className="text-lg text-slate-600/90 mb-8 max-w-2xl mx-auto leading-relaxed animate-in slide-in-from-bottom duration-1000 delay-700 font-medium">
              Onboard, verify, and manage your customers with comprehensive KYC tools and relationship management features.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center animate-in slide-in-from-bottom duration-1000 delay-900">
              <div className="flex items-center space-x-3 bg-white/40 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 hover:bg-white/50 group">
                <Shield className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-slate-700 font-medium">KYC Compliance</span>
              </div>
              <div className="flex items-center space-x-3 bg-white/40 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 hover:bg-white/50 group">
                <CheckCircle className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-slate-700 font-medium">Risk Management</span>
              </div>
              <div className="flex items-center space-x-3 bg-white/40 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 hover:bg-white/50 group">
                <UserPlus className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-slate-700 font-medium">Easy Onboarding</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-12 lg:px-8 space-y-12">
        {/* Key Metrics Overview - Matching Dashboard Style */}
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-sikaremit-foreground mb-4">Customer Overview</h2>
            <p className="text-lg text-sikaremit-muted max-w-2xl mx-auto">Your customer base at a glance</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
            <Card className="bg-sikaremit-card/80 backdrop-blur-sm group cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/10 relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${'from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20'} opacity-0 group-hover:opacity-100 transition-all duration-500`} />
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-10 -mt-10"></div>

              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 relative z-10">
                <CardTitle className="text-sm font-semibold text-sikaremit-muted uppercase tracking-wide">
                  Total Customers
                </CardTitle>
                <div className={`p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Users className="h-5 w-5 text-white" />
                </div>
              </CardHeader>

              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-sikaremit-foreground mb-2">{stats?.total_customers || 0}</div>
                <div className="space-y-1">
                  <div className={`text-xs font-semibold px-2 py-1 rounded-full inline-flex items-center bg-green-100 text-blue-600 dark:text-blue-400/30 dark:text-green-400`}>
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Growing
                  </div>
                  <p className="text-xs text-sikaremit-muted">Active relationships</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-sikaremit-card/80 backdrop-blur-sm group cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/10 relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${'from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20'} opacity-0 group-hover:opacity-100 transition-all duration-500`} />
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-10 -mt-10"></div>

              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 relative z-10">
                <CardTitle className="text-sm font-semibold text-sikaremit-muted uppercase tracking-wide">
                  Active Customers
                </CardTitle>
                <div className={`p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
              </CardHeader>

              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-sikaremit-foreground mb-2">{stats?.active_customers || 0}</div>
                <div className="space-y-1">
                  <div className={`text-xs font-semibold px-2 py-1 rounded-full inline-flex items-center bg-green-100 text-blue-600 dark:text-blue-400/30 dark:text-green-400`}>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verified
                  </div>
                  <p className="text-xs text-sikaremit-muted">Fully active</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-sikaremit-card/80 backdrop-blur-sm group cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/10 relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${'from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20'} opacity-0 group-hover:opacity-100 transition-all duration-500`} />
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-10 -mt-10"></div>

              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 relative z-10">
                <CardTitle className="text-sm font-semibold text-sikaremit-muted uppercase tracking-wide">
                  Pending KYC
                </CardTitle>
                <div className={`p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Clock className="h-5 w-5 text-white" />
                </div>
              </CardHeader>

              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-sikaremit-foreground mb-2">{stats?.kyc_pending || 0}</div>
                <div className="space-y-1">
                  <div className={`text-xs font-semibold px-2 py-1 rounded-full inline-flex items-center bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400`}>
                    <Clock className="w-3 h-3 mr-1" />
                    In Review
                  </div>
                  <p className="text-xs text-sikaremit-muted">Awaiting verification</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-sikaremit-card/80 backdrop-blur-sm group cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/10 relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${'from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20'} opacity-0 group-hover:opacity-100 transition-all duration-500`} />
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-10 -mt-10"></div>

              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 relative z-10">
                <CardTitle className="text-sm font-semibold text-sikaremit-muted uppercase tracking-wide">
                  KYC Approved
                </CardTitle>
                <div className={`p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Shield className="h-5 w-5 text-white" />
                </div>
              </CardHeader>

              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-sikaremit-foreground mb-2">{stats?.kyc_approved || 0}</div>
                <div className="space-y-1">
                  <div className={`text-xs font-semibold px-2 py-1 rounded-full inline-flex items-center bg-green-100 text-blue-600 dark:text-blue-400/30 dark:text-green-400`}>
                    <Shield className="w-3 h-3 mr-1" />
                    Compliant
                  </div>
                  <p className="text-xs text-sikaremit-muted">Fully verified</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Customer Management Section */}
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-sikaremit-foreground">Customer Management</h2>
              <p className="text-lg text-sikaremit-muted">Manage customer relationships and KYC verification</p>
            </div>
            <Dialog open={onboardDialogOpen} onOpenChange={setOnboardDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-500 to-blue-700 dark:hover:from-blue-950/20 hover:to-blue-600 shadow-2xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-500 font-semibold hover:scale-105 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  <UserPlus className="w-5 h-5 mr-2" />
                  Onboard Customer
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white/90 backdrop-blur-xl border-white/30 shadow-2xl shadow-blue-500/10">
                <DialogHeader>
                  <DialogTitle>Onboard New Customer</DialogTitle>
                  <DialogDescription>
                    Add an existing sikaremit customer to your merchant account
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="customerEmail">Customer Email</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      placeholder="customer@example.com"
                      value={onboardForm.customerEmail}
                      onChange={(e) => setOnboardForm(prev => ({ ...prev, customerEmail: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="kycRequired"
                      checked={onboardForm.kycRequired}
                      onChange={(e) => setOnboardForm(prev => ({ ...prev, kycRequired: e.target.checked }))}
                    />
                    <Label htmlFor="kycRequired">KYC Verification Required</Label>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Additional notes about this customer..."
                      value={onboardForm.notes}
                      onChange={(e) => setOnboardForm(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>
                  <Button
                    onClick={() => {
                      // In a real implementation, you'd search for the customer by email first
                      // For now, we'll assume customer ID is provided
                      toast({
                        title: 'Note',
                        description: 'This would search for and onboard the customer',
                      })
                    }}
                    disabled={!onboardForm.customerEmail}
                    className="w-full"
                  >
                    Onboard Customer
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filters and Search */}
          <Card className="border-0 shadow-xl bg-sikaremit-card/80 backdrop-blur-sm bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/5">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                    <Input
                      placeholder="Search customers by email or name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 h-12 text-base border-2 border-slate-200 focus:border-blue-500 rounded-xl shadow-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-48 h-12 border-2 border-slate-200 rounded-xl">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedKYCStatus} onValueChange={setSelectedKYCStatus}>
                    <SelectTrigger className="w-48 h-12 border-2 border-slate-200 rounded-xl">
                      <Shield className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filter by KYC" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All KYC Status</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="pending_review">Under Review</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="not_started">Not Started</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Table */}
          <Card className="border-0 shadow-xl bg-sikaremit-card/80 backdrop-blur-sm bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/5">
            <CardHeader className="border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold text-sikaremit-foreground flex items-center">
                    <Users className="w-7 h-7 mr-3 text-blue-600" />
                    Customer Records
                  </CardTitle>
                  <CardDescription className="text-sikaremit-muted text-lg mt-1">
                    {totalCount} customers found • Manage your customer relationships
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Live Data
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {customersLoading ? (
                <div className="p-8 space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-slate-200 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50/50">
                      <tr className="border-b border-slate-200">
                        <th className="text-left p-6 font-semibold text-slate-900">Customer</th>
                        <th className="text-left p-6 font-semibold text-slate-900">Status</th>
                        <th className="text-left p-6 font-semibold text-slate-900">KYC Status</th>
                        <th className="text-left p-6 font-semibold text-slate-900">Onboarded</th>
                        <th className="text-left p-6 font-semibold text-slate-900">Risk Score</th>
                        <th className="text-left p-6 font-semibold text-slate-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers?.map((customer: MerchantCustomer, index: number) => (
                        <tr
                          key={customer.id}
                          className="group border-b border-slate-100 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-transparent transition-all duration-300 animate-in slide-in-from-left duration-500"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <td className="p-6">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center">
                                <span className="text-sm font-semibold text-slate-600">
                                  {customer.customer.user?.first_name?.[0] || customer.customer.user?.email?.[0]?.toUpperCase() || '?'}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium text-slate-900">
                                  {customer.customer.user?.first_name} {customer.customer.user?.last_name}
                                </div>
                                <div className="text-sm text-slate-500">
                                  {customer.customer.user?.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-6">
                            {customer.status === 'active' ? (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Active
                              </Badge>
                            ) : customer.status === 'suspended' ? (
                              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                                <Clock className="w-3 h-3 mr-1" />
                                Suspended
                              </Badge>
                            ) : (
                              <Badge variant="destructive">Blocked</Badge>
                            )}
                          </td>
                          <td className="p-6">
                            {getStatusBadge(customer.status, customer.kyc_status)}
                          </td>
                          <td className="p-6">
                            <div className="text-sm text-slate-600">
                              {new Date(customer.onboarded_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${
                                customer.risk_score < 30 ? 'bg-green-500' :
                                customer.risk_score < 70 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}></div>
                              <span className="text-sm font-medium text-slate-700">{customer.risk_score}</span>
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm" className="hover:bg-blue-50" onClick={() => setSelectedCustomer(customer)}>
                                <Eye className="w-4 h-4 text-blue-600" />
                              </Button>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="hover:bg-slate-50">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem
                                    onClick={() => suspendMutation.mutate(customer.id)}
                                    className="text-amber-600"
                                  >
                                    <Clock className="w-4 h-4 mr-2" />
                                    Suspend
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => activateMutation.mutate(customer.id)}
                                    className="text-green-600"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Activate
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {customers?.length === 0 && !customersLoading && (
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users className="w-12 h-12 text-slate-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">
                    No customers found
                  </h3>
                  <p className="text-slate-600 mb-8 text-lg">
                    Start by onboarding your first customer
                  </p>
                  <Button
                    onClick={() => setOnboardDialogOpen(true)}
                    className="bg-gradient-to-r from-blue-500 to-blue-700 dark:hover:from-blue-950/20 hover:to-blue-600"
                  >
                    <UserPlus className="w-5 h-5 mr-2" />
                    Onboard Customer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Details Dialog */}
          {selectedCustomer && (
            <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
              <DialogContent className="max-w-2xl bg-white/90 backdrop-blur-xl border-white/30 shadow-2xl shadow-blue-500/10">
                <DialogHeader>
                  <DialogTitle>Customer Details</DialogTitle>
                  <DialogDescription>
                    Detailed information about {selectedCustomer.customer.user.first_name} {selectedCustomer.customer.user.last_name}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Email</Label>
                      <p className="text-sm">{selectedCustomer.customer.user.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Status</Label>
                      <div className="mt-1">
                        {getStatusBadge(selectedCustomer.status, selectedCustomer.kyc_status)}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">KYC Status</Label>
                      <p className={`text-sm capitalize ${getKYCStatusColor(selectedCustomer.kyc_status)}`}>
                        {selectedCustomer.kyc_status.replace('_', ' ')}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Risk Score</Label>
                      <p className="text-sm font-semibold">{selectedCustomer.risk_score}/10</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Onboarded</Label>
                      <p className="text-sm">{new Date(selectedCustomer.onboarded_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Days Onboarded</Label>
                      <p className="text-sm">{selectedCustomer.days_since_onboarded}</p>
                    </div>
                  </div>
                  {selectedCustomer.notes && (
                    <div>
                      <Label className="text-sm font-medium">Notes</Label>
                      <p className="text-sm bg-slate-50 p-2 rounded">{selectedCustomer.notes}</p>
                    </div>
                  )}
                  {selectedCustomer.latest_kyc_submission && (
                    <div>
                      <Label className="text-sm font-medium">Latest KYC Submission</Label>
                      <div className="bg-slate-50 p-3 rounded mt-1">
                        <p className="text-sm">Status: {selectedCustomer.latest_kyc_submission.status}</p>
                        <p className="text-sm">Submitted: {new Date(selectedCustomer.latest_kyc_submission.submitted_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </section>
      </div>
    </div>
  )
}
