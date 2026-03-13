'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Prevent static generation for this page since it uses functions that can't be serialized
export const dynamic = 'force-dynamic'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Send,
  CheckCircle,
  DollarSign,
  Calendar,
  User,
  AlertCircle,
  Eye,
  Mail,
  Printer,
  Edit,
  Trash2,
  Clock,
  TrendingUp
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  getMerchantInvoices,
  createMerchantInvoice,
  sendMerchantInvoice,
  downloadMerchantInvoice
} from '@/lib/api/merchant'
import { useCurrency } from '@/hooks/useCurrency'
import { INVOICE_STATUSES } from '@/lib/constants/merchant-ui'

interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  amount: number
}

interface MerchantInvoice {
  id: string
  invoiceNumber: string
  customerName: string
  customerEmail: string
  amount: number
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  dueDate: string
  createdAt: string
  items: InvoiceItem[]
}

export default function MerchantInvoicesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newInvoice, setNewInvoice] = useState({
    customerName: '',
    customerEmail: '',
    items: [{ description: '', quantity: 1, unitPrice: 0 }],
    taxRate: 0,
    dueDate: '',
    notes: ''
  })

  const { toast } = useToast()
  const { formatAmount } = useCurrency()
  const queryClient = useQueryClient()

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['merchant-invoices', searchTerm, statusFilter],
    queryFn: getMerchantInvoices,
  })

  // Calculate invoice statistics from real data
  const calculateInvoiceStats = () => {
    if (!invoices || invoices.length === 0) {
      return {
        totalInvoiced: 0,
        totalPaid: 0,
        totalPending: 0,
        totalOverdue: 0,
        paidPercentage: 0,
        pendingPercentage: 0,
        overduePercentage: 0,
        growthRate: 0
      }
    }

    const totalInvoiced = invoices.reduce((sum: number, invoice: any) => sum + (invoice.amount || invoice.total || 0), 0)
    const paidInvoices = invoices.filter((invoice: any) => invoice.status === 'paid')
    const pendingInvoices = invoices.filter((invoice: any) => invoice.status === 'sent' || invoice.status === 'pending')
    const overdueInvoices = invoices.filter((invoice: any) => {
      return invoice.status === 'sent' && new Date(invoice.dueDate) < new Date()
    })

    const totalPaid = paidInvoices.reduce((sum: number, invoice: any) => sum + (invoice.amount || invoice.total || 0), 0)
    const totalPending = pendingInvoices.reduce((sum: number, invoice: any) => sum + (invoice.amount || invoice.total || 0), 0)
    const totalOverdue = overdueInvoices.reduce((sum: number, invoice: any) => sum + (invoice.amount || invoice.total || 0), 0)

    return {
      totalInvoiced,
      totalPaid,
      totalPending,
      totalOverdue,
      paidPercentage: totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0,
      pendingPercentage: totalInvoiced > 0 ? (totalPending / totalInvoiced) * 100 : 0,
      overduePercentage: totalInvoiced > 0 ? (totalOverdue / totalInvoiced) * 100 : 0,
      growthRate: invoices?.length > 1 ? ((totalInvoiced - (invoices.slice(Math.floor(invoices.length / 2)).reduce((sum: number, inv: any) => sum + (parseFloat(inv.total_amount || inv.amount) || 0), 0) * 2)) / (totalInvoiced || 1)) * 100 : 0
    }
  }

  const stats = calculateInvoiceStats()

  const createMutation = useMutation({
    mutationFn: async (invoiceData: any) => {
      // Calculate totals
      const subtotal = invoiceData.items.reduce((sum: number, item: InvoiceItem) =>
        sum + (item.quantity * item.unitPrice), 0)
      const taxAmount = subtotal * (invoiceData.taxRate / 100)
      const total = subtotal + taxAmount

      return createMerchantInvoice({
        ...invoiceData,
        subtotal,
        taxAmount,
        total,
        status: 'draft'
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-invoices'] })
      setIsCreateDialogOpen(false)
      setNewInvoice({
        customerName: '',
        customerEmail: '',
        items: [{ description: '', quantity: 1, unitPrice: 0 }],
        taxRate: 0,
        dueDate: '',
        notes: ''
      })
      toast({
        title: 'Invoice Created',
        description: 'Invoice has been created successfully.',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create invoice.',
        variant: 'destructive'
      })
    }
  })

  const sendMutation = useMutation({
    mutationFn: ({ invoiceId }: { invoiceId: string; email: string }) =>
      sendMerchantInvoice(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-invoices'] })
      toast({
        title: 'Invoice Sent',
        description: 'Invoice has been sent successfully.',
      })
    }
  })

  const downloadMutation = useMutation({
    mutationFn: ({ invoiceId }: { invoiceId: string; format: 'pdf' | 'html' }) =>
      downloadMerchantInvoice(invoiceId),
    onSuccess: (blob, { invoiceId, format }) => {
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${invoiceId}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: 'Invoice Downloaded',
        description: `Invoice has been downloaded as ${format.toUpperCase()}.`,
      })
    }
  })

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">Paid</Badge>
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">Sent</Badge>
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Overdue</Badge>
      case 'draft':
        return <Badge variant="outline">Draft</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleAddItem = () => {
    setNewInvoice(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unitPrice: 0 }]
    }))
  }

  const handleRemoveItem = (index: number) => {
    setNewInvoice(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const handleItemChange = (index: number, field: string, value: any) => {
    setNewInvoice(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const calculateSubtotal = () => {
    return newInvoice.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  }

  const calculateTax = () => {
    return calculateSubtotal() * (newInvoice.taxRate / 100)
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax()
  }

  const handleSendInvoice = (invoiceId: string, email: string) => {
    // Implementation would use sendMerchantInvoice
    
  }

  const handleDownloadInvoice = (invoiceId: string, format: 'pdf' | 'html') => {
    // Implementation would use downloadMerchantInvoice
    
  }

  const handlePrintInvoice = (invoiceId: string) => {
    // Implementation would generate printable version
    
  }

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-700">
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
              <FileText className="w-5 h-5 mr-3 text-blue-600 group-hover:rotate-12 transition-transform duration-300" />
              Invoice Management
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6 leading-tight animate-in slide-in-from-bottom duration-1000 delay-500">
              Professional Invoicing
              <span className="block bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent drop-shadow-sm">Create and manage invoices effortlessly</span>
            </h1>
            <p className="text-lg text-slate-600/90 mb-8 max-w-2xl mx-auto leading-relaxed animate-in slide-in-from-bottom duration-1000 delay-700 font-medium">
              Generate professional invoices, track payments, and manage your billing with automated reminders and payment tracking.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center animate-in slide-in-from-bottom duration-1000 delay-900">
              <div className="flex items-center space-x-3 bg-white/40 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 hover:bg-white/50 group">
                <CheckCircle className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-slate-700 font-medium">Professional templates</span>
              </div>
              <div className="flex items-center space-x-3 bg-white/40 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 hover:bg-white/50 group">
                <DollarSign className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-slate-700 font-medium">Payment tracking</span>
              </div>
              <div className="flex items-center space-x-3 bg-white/40 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 hover:bg-white/50 group">
                <Send className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-slate-700 font-medium">Automated sending</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-12 lg:px-8 space-y-12">
        {/* Key Metrics Overview - Matching Dashboard Style */}
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-sikaremit-foreground mb-4">Invoice Overview</h2>
            <p className="text-lg text-sikaremit-muted max-w-2xl mx-auto">Your billing performance at a glance</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
            <Card className="bg-sikaremit-card/80 backdrop-blur-sm group cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/10 relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${'from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20'} opacity-0 group-hover:opacity-100 transition-all duration-500`} />
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-10 -mt-10"></div>

              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 relative z-10">
                <CardTitle className="text-sm font-semibold text-sikaremit-muted uppercase tracking-wide">
                  Total Invoiced
                </CardTitle>
                <div className={`p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <FileText className="h-5 w-5 text-white" />
                </div>
              </CardHeader>

              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-sikaremit-foreground mb-2">{formatAmount(stats.totalInvoiced)}</div>
                <div className="space-y-1">
                  <div className={`text-xs font-semibold px-2 py-1 rounded-full inline-flex items-center ${stats.growthRate >= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {stats.growthRate >= 0 ? '+' : ''}{stats.growthRate.toFixed(1)}%
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
                  Paid
                </CardTitle>
                <div className={`p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
              </CardHeader>

              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-sikaremit-foreground mb-2">{formatAmount(stats.totalPaid)}</div>
                <div className="space-y-1">
                  <div className={`text-xs font-semibold px-2 py-1 rounded-full inline-flex items-center bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400`}>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {stats.paidPercentage.toFixed(1)}%
                  </div>
                  <p className="text-xs text-sikaremit-muted">Payment rate</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-sikaremit-card/80 backdrop-blur-sm group cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/10 relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${'from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20'} opacity-0 group-hover:opacity-100 transition-all duration-500`} />
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-10 -mt-10"></div>

              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 relative z-10">
                <CardTitle className="text-sm font-semibold text-sikaremit-muted uppercase tracking-wide">
                  Pending
                </CardTitle>
                <div className={`p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Clock className="h-5 w-5 text-white" />
                </div>
              </CardHeader>

              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-sikaremit-foreground mb-2">{formatAmount(stats.totalPending)}</div>
                <div className="space-y-1">
                  <div className={`text-xs font-semibold px-2 py-1 rounded-full inline-flex items-center bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400`}>
                    <Clock className="w-3 h-3 mr-1" />
                    {stats.pendingPercentage.toFixed(1)}%
                  </div>
                  <p className="text-xs text-sikaremit-muted">Awaiting payment</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-sikaremit-card/80 backdrop-blur-sm group cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/10 relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${'from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20'} opacity-0 group-hover:opacity-100 transition-all duration-500`} />
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-10 -mt-10"></div>

              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 relative z-10">
                <CardTitle className="text-sm font-semibold text-sikaremit-muted uppercase tracking-wide">
                  Overdue
                </CardTitle>
                <div className={`p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <AlertCircle className="h-5 w-5 text-white" />
                </div>
              </CardHeader>

              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-sikaremit-foreground mb-2">{formatAmount(stats.totalOverdue)}</div>
                <div className="space-y-1">
                  <div className={`text-xs font-semibold px-2 py-1 rounded-full inline-flex items-center bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400`}>
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {stats.overduePercentage.toFixed(1)}%
                  </div>
                  <p className="text-xs text-sikaremit-muted">Needs attention</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Invoice Management Section */}
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-sikaremit-foreground">Invoice Management</h2>
              <p className="text-lg text-sikaremit-muted">Create and manage professional invoices</p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-2xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-500 font-semibold hover:scale-105 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  <Plus className="w-5 h-5 mr-2" />
                  Create Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white/90 backdrop-blur-xl border-white/30 shadow-2xl shadow-blue-500/10 sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Invoice</DialogTitle>
                  <DialogDescription>
                    Create a professional invoice for your customer
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Customer Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customerName">Customer Name</Label>
                      <Input
                        id="customerName"
                        value={newInvoice.customerName}
                        onChange={(e) => setNewInvoice(prev => ({ ...prev, customerName: e.target.value }))}
                        placeholder="Enter customer name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerEmail">Customer Email</Label>
                      <Input
                        id="customerEmail"
                        type="email"
                        value={newInvoice.customerEmail}
                        onChange={(e) => setNewInvoice(prev => ({ ...prev, customerEmail: e.target.value }))}
                        placeholder="customer@example.com"
                      />
                    </div>
                  </div>

                  {/* Invoice Items */}
                  <div>
                    <Label>Invoice Items</Label>
                    <div className="space-y-3 mt-2">
                      {newInvoice.items.map((item, index) => (
                        <div key={index} className="flex gap-3 items-end">
                          <div className="flex-1">
                            <Input
                              placeholder="Item description"
                              value={item.description}
                              onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            />
                          </div>
                          <div className="w-20">
                            <Input
                              type="number"
                              placeholder="Qty"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                            />
                          </div>
                          <div className="w-28">
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Price"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div className="w-24 text-right font-medium">
                            {formatAmount(item.quantity * item.unitPrice)}
                          </div>
                          {newInvoice.items.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveItem(index)}
                              className="px-2"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddItem}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Item
                      </Button>
                    </div>
                  </div>

                  {/* Tax and Due Date */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="taxRate">Tax Rate (%)</Label>
                      <Input
                        id="taxRate"
                        type="number"
                        step="0.01"
                        value={newInvoice.taxRate}
                        onChange={(e) => setNewInvoice(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dueDate">Due Date</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={newInvoice.dueDate}
                        onChange={(e) => setNewInvoice(prev => ({ ...prev, dueDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={newInvoice.notes}
                      onChange={(e) => setNewInvoice(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes or terms..."
                      rows={3}
                    />
                  </div>

                  {/* Invoice Summary */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{formatAmount(calculateSubtotal())}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax ({newInvoice.taxRate}%):</span>
                        <span>{formatAmount(calculateTax())}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total:</span>
                        <span>{formatAmount(calculateTotal())}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => createMutation.mutate(newInvoice)}
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? 'Creating...' : 'Create Invoice'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </section>
      <Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 animate-in slide-in-from-bottom-1 duration-700">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-800 dark:to-gray-800"></div>
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-teal-400/20 to-green-600/20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-500"></div>

        <CardContent className="p-6 relative z-10">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Search invoices by customer, number, or amount..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 text-base border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl shadow-sm"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 h-12 border-2 border-gray-200 dark:border-gray-700 rounded-xl">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 animate-in slide-in-from-bottom-2 duration-700">
        <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800"></div>

        <CardHeader className="relative z-10 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                <FileText className="w-7 h-7 mr-3 text-teal-600" />
                Invoice Records
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400 text-lg mt-1">
                {invoices?.length || 0} invoices found â€¢ Manage your billing
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                Professional Invoicing
              </Badge>
            </div>
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
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices?.map((invoice: any, index: number) => (
                    <TableRow
                      key={invoice.id}
                      className="group border-b border-gray-100 dark:border-gray-700 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-transparent dark:hover:from-blue-950/20 dark:hover:to-transparent transition-all duration-300 animate-in slide-in-from-left duration-500"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <TableCell className="font-mono font-medium text-gray-900 dark:text-white">
                        {invoice.invoiceNumber || `INV-${invoice.id?.slice(-6)}`}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {invoice.customerName}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {invoice.customerEmail}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-lg text-gray-900 dark:text-white">
                        {formatAmount(invoice.amount || invoice.total || 0)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(invoice.status)}
                      </TableCell>
                      <TableCell>
                        {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {new Date(invoice.createdAt || invoice.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" className="hover:bg-blue-50 dark:hover:bg-blue-950/30">
                            <Eye className="w-4 h-4 text-blue-600" />
                          </Button>

                          {/* Invoice Actions Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                <FileText className="w-4 h-4 text-gray-600" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Invoice Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => handleSendInvoice(invoice.id, invoice.customerEmail)}
                                className="cursor-pointer"
                              >
                                <Mail className="w-4 h-4 mr-2" />
                                Send Invoice
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDownloadInvoice(invoice.id, 'pdf')}
                                className="cursor-pointer"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handlePrintInvoice(invoice.id)}
                                className="cursor-pointer"
                              >
                                <Printer className="w-4 h-4 mr-2" />
                                Print
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <Button variant="ghost" size="sm" className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {invoices?.length === 0 && !isLoading && (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                No invoices found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
                Create your first professional invoice to get started
              </p>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Invoice
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  )
}

