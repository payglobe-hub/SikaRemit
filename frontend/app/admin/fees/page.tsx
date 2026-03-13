'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api/axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DollarSign,
  Plus,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Trash2,
  RefreshCw,
  Building2,
  Users,
  Globe
} from 'lucide-react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { getFeeAnalytics, FeeAnalytics } from '@/lib/api/fees'


interface FeeFormData {
  name: string
  fee_type: string
  calculation_method: string
  fixed_fee: string
  percentage_fee: string
  currency: string
  corridor_from: string
  corridor_to: string
  description: string
}

const initialFormData: FeeFormData = {
  name: '',
  fee_type: '',
  calculation_method: '',
  fixed_fee: '',
  percentage_fee: '',
  currency: 'GHS',
  corridor_from: '',
  corridor_to: '',
  description: ''
}

export default function AdminFeesPage() {
  const [activeTab, setActiveTab] = useState('configurations')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedFee, setSelectedFee] = useState<any>(null)
  const [formData, setFormData] = useState<FeeFormData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currencies, setCurrencies] = useState<{code: string, name: string, symbol: string, flag_emoji?: string}[]>([])
  const [countries, setCountries] = useState<{code: string, name: string, flag_emoji?: string, currency_code?: string}[]>([])
  const { toast } = useToast()
  const queryClient = useQueryClient()

  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        const response = await api.get('/api/v1/payments/currencies/')
        const data = response.data
        const currencyList = Array.isArray(data) ? data : (data.results || [])
        setCurrencies(currencyList.filter((c: any) => c.is_active))
      } catch (error) {
        console.error('Failed to load currencies:', error)
      }
    }
    
    const loadCountries = async () => {
      try {
        const response = await api.get('/api/v1/payments/countries/')
        const data = response.data
        const countryList = Array.isArray(data) ? data : (data.results || [])
        setCountries(countryList.filter((c: any) => c.is_active))
      } catch (error) {
        console.error('Failed to load countries:', error)
      }
    }
    
    loadCurrencies()
    loadCountries()
  }, [])

  // Fetch fee configurations from API
  const { data: feeConfigurations = [], isLoading } = useQuery({
    queryKey: ['fee-configurations'],
    queryFn: async () => {
      const response = await api.get('/api/v1/payments/fees/')
      const data = response.data
      if (Array.isArray(data)) return data
      if (data.results && Array.isArray(data.results)) return data.results
      if (data.data && Array.isArray(data.data)) return data.data
      return []
    },
    retry: false
  })

  // Fetch fee analytics from API
  const { data: feeAnalytics } = useQuery({
    queryKey: ['fee-analytics'],
    queryFn: getFeeAnalytics
  })

  const getFeeTypeColor = (feeType: string) => {
    const colors: Record<string, string> = {
      remittance: 'blue',
      domestic_transfer: 'green',
      payment: 'indigo',
      merchant_service: 'orange',
      platform_fee: 'red',
      withdrawal: 'yellow',
      deposit: 'cyan',
      bill_payment: 'pink',
      airtime: 'indigo',
      data_bundle: 'teal',
    }
    return colors[feeType] || 'gray'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>
      case 'inactive':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Inactive</Badge>
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleCreateFee = async () => {
    if (!formData.name || !formData.fee_type) {
      toast({ title: 'Error', description: 'Name and fee type are required', variant: 'destructive' })
      return
    }

    setIsSubmitting(true)
    try {
      await api.post('/api/v1/admin/fee-configurations/', {
        name: formData.name,
        fee_type: formData.fee_type,
        calculation_method: formData.calculation_method || 'fixed',
        fixed_fee: parseFloat(formData.fixed_fee) || 0,
        percentage_fee: (parseFloat(formData.percentage_fee) || 0) / 100,
        currency: formData.currency,
        corridor_from: formData.corridor_from && formData.corridor_from !== 'all' ? formData.corridor_from : null,
        corridor_to: formData.corridor_to && formData.corridor_to !== 'all' ? formData.corridor_to : null,
        description: formData.description,
        is_active: true
      })

      queryClient.invalidateQueries({ queryKey: ['fee-configurations'] })
      setShowCreateDialog(false)
      setFormData(initialFormData)
      toast({ title: 'Success', description: 'Fee configuration created successfully' })
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to create fee configuration', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditFee = async () => {
    if (!selectedFee) return

    setIsSubmitting(true)
    try {
      await api.put(`/api/v1/admin/fee-configurations/${selectedFee.id}/`, {
        name: formData.name,
        fee_type: formData.fee_type,
        calculation_method: formData.calculation_method || 'fixed',
        fixed_fee: parseFloat(formData.fixed_fee) || 0,
        percentage_fee: (parseFloat(formData.percentage_fee) || 0) / 100,
        currency: formData.currency,
        corridor_from: formData.corridor_from && formData.corridor_from !== 'all' ? formData.corridor_from : null,
        corridor_to: formData.corridor_to && formData.corridor_to !== 'all' ? formData.corridor_to : null,
        description: formData.description
      })

      queryClient.invalidateQueries({ queryKey: ['fee-configurations'] })
      setShowEditDialog(false)
      setSelectedFee(null)
      setFormData(initialFormData)
      toast({ title: 'Success', description: 'Fee configuration updated successfully' })
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update fee configuration', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteFee = async (feeId: number) => {
    if (!confirm('Are you sure you want to delete this fee configuration?')) return

    try {
      await api.delete(`/api/v1/admin/fee-configurations/${feeId}/`)

      queryClient.invalidateQueries({ queryKey: ['fee-configurations'] })
      toast({ title: 'Success', description: 'Fee configuration deleted successfully' })
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete fee configuration', variant: 'destructive' })
    }
  }

  const openEditDialog = (fee: any) => {
    setSelectedFee(fee)
    setFormData({
      name: fee.name || '',
      fee_type: fee.fee_type || '',
      calculation_method: fee.calculation_method || '',
      fixed_fee: fee.fixed_fee?.toString() || '',
      percentage_fee: fee.percentage_fee ? (parseFloat(fee.percentage_fee) * 100).toString() : '', // Convert decimal back to percentage for display
      currency: fee.currency || 'GHS',
      corridor_from: fee.corridor_from || '',
      corridor_to: fee.corridor_to || '',
      description: fee.description || ''
    })
    setShowEditDialog(true)
  }

  return (
    <div className="w-full space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <DollarSign className="h-8 w-8" />
              Fee Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure and manage dynamic fee structures for all services
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Fee Configuration
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Fee Configuration</DialogTitle>
                <DialogDescription>
                  Set up a new fee structure for transactions
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Configuration Name</Label>
                    <Input 
                      id="name" 
                      placeholder="e.g., Standard Remittance Fee" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fee_type">Fee Type</Label>
                    <Select value={formData.fee_type} onValueChange={(value) => setFormData({...formData, fee_type: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select fee type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="remittance">Cross-border Remittance</SelectItem>
                        <SelectItem value="domestic_transfer">Domestic Transfer</SelectItem>
                        <SelectItem value="payment">Payment Processing</SelectItem>
                        <SelectItem value="merchant_service">Merchant Service</SelectItem>
                        <SelectItem value="withdrawal">Withdrawal</SelectItem>
                        <SelectItem value="deposit">Deposit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="calculation_method">Calculation Method</Label>
                    <Select value={formData.calculation_method} onValueChange={(value) => setFormData({...formData, calculation_method: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage of Amount</SelectItem>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                        <SelectItem value="tiered">Tiered Pricing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="fixed_fee">Fixed Fee (₵)</Label>
                    <Input 
                      id="fixed_fee" 
                      type="number" 
                      step="0.01" 
                      placeholder="5.00" 
                      value={formData.fixed_fee}
                      onChange={(e) => setFormData({...formData, fixed_fee: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="percentage_fee">Percentage Fee (%)</Label>
                    <Input 
                      id="percentage_fee" 
                      type="number" 
                      step="0.01" 
                      placeholder="2.50" 
                      value={formData.percentage_fee}
                      onChange={(e) => setFormData({...formData, percentage_fee: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={formData.currency} onValueChange={(value) => setFormData({...formData, currency: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.length > 0 ? currencies.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.flag_emoji} {currency.code} ({currency.symbol})
                          </SelectItem>
                        )) : (
                          <SelectItem value="loading" disabled>Loading currencies...</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="corridor_from">From Country</Label>
                    <Select value={formData.corridor_from} onValueChange={(value) => setFormData({...formData, corridor_from: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Source country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Countries</SelectItem>
                        {countries.length > 0 ? countries.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.flag_emoji} {country.name}
                          </SelectItem>
                        )) : (
                          <SelectItem value="loading" disabled>Loading countries...</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="corridor_to">To Country</Label>
                    <Select value={formData.corridor_to} onValueChange={(value) => setFormData({...formData, corridor_to: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Destination country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Countries</SelectItem>
                        {countries.length > 0 ? countries.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.flag_emoji} {country.name}
                          </SelectItem>
                        )) : (
                          <SelectItem value="loading" disabled>Loading countries...</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Describe this fee configuration..." 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => { setShowCreateDialog(false); setFormData(initialFormData); }}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateFee} disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Configuration'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Fee Dialog */}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Fee Configuration</DialogTitle>
                <DialogDescription>
                  Update the fee structure settings
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-name">Configuration Name</Label>
                    <Input 
                      id="edit-name" 
                      placeholder="e.g., Standard Remittance Fee" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-fee_type">Fee Type</Label>
                    <Select value={formData.fee_type} onValueChange={(value) => setFormData({...formData, fee_type: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select fee type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="remittance">Cross-border Remittance</SelectItem>
                        <SelectItem value="domestic_transfer">Domestic Transfer</SelectItem>
                        <SelectItem value="payment">Payment Processing</SelectItem>
                        <SelectItem value="merchant_service">Merchant Service</SelectItem>
                        <SelectItem value="withdrawal">Withdrawal</SelectItem>
                        <SelectItem value="deposit">Deposit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-calculation_method">Calculation Method</Label>
                    <Select value={formData.calculation_method} onValueChange={(value) => setFormData({...formData, calculation_method: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage of Amount</SelectItem>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                        <SelectItem value="tiered">Tiered Pricing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-fixed_fee">Fixed Fee (₵)</Label>
                    <Input 
                      id="edit-fixed_fee" 
                      type="number" 
                      step="0.01" 
                      placeholder="5.00" 
                      value={formData.fixed_fee}
                      onChange={(e) => setFormData({...formData, fixed_fee: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-percentage_fee">Percentage Fee (%)</Label>
                    <Input 
                      id="edit-percentage_fee" 
                      type="number" 
                      step="0.01" 
                      placeholder="2.50" 
                      value={formData.percentage_fee}
                      onChange={(e) => setFormData({...formData, percentage_fee: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-currency">Currency</Label>
                    <Select value={formData.currency} onValueChange={(value) => setFormData({...formData, currency: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.length > 0 ? currencies.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.flag_emoji} {currency.code} ({currency.symbol})
                          </SelectItem>
                        )) : (
                          <SelectItem value="loading" disabled>Loading currencies...</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-description">Description (Optional)</Label>
                  <Textarea 
                    id="edit-description" 
                    placeholder="Describe this fee configuration..." 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => { setShowEditDialog(false); setSelectedFee(null); setFormData(initialFormData); }}>
                    Cancel
                  </Button>
                  <Button onClick={handleEditFee} disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Fee Management Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="configurations">Configurations</TabsTrigger>
            <TabsTrigger value="overrides">Merchant Overrides</TabsTrigger>
            <TabsTrigger value="analytics">Fee Analytics</TabsTrigger>
            <TabsTrigger value="calculator">Fee Calculator</TabsTrigger>
          </TabsList>

          {/* Fee Configurations Tab */}
          <TabsContent value="configurations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Fee Configurations
                </CardTitle>
                <CardDescription>
                  Manage fee structures for different transaction types and corridors
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-4 border rounded-lg">
                        <div className="animate-pulse space-y-2">
                          <div className="h-4 bg-muted rounded w-1/4"></div>
                          <div className="h-3 bg-muted rounded w-1/2"></div>
                          <div className="h-3 bg-muted rounded w-1/3"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(Array.isArray(feeConfigurations) ? feeConfigurations : [])?.map((fee: any) => (
                      <div key={fee.id} className="p-4 border rounded-lg hover:bg-muted/20 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{fee.name}</h3>
                              <Badge className={`bg-${getFeeTypeColor(fee.fee_type)}-100 text-${getFeeTypeColor(fee.fee_type)}-800`}>
                                {fee.fee_type.replace('_', ' ')}
                              </Badge>
                              {getStatusBadge(fee.status)}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Scope:</span>
                                <div className="flex items-center gap-1">
                                  {fee.merchant_specific ? (
                                    <><Building2 className="h-3 w-3" /> {fee.scope}</>
                                  ) : (
                                    <><Globe className="h-3 w-3" /> {fee.scope}</>
                                  )}
                                </div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Corridor:</span>
                                <div>{fee.corridor}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Method:</span>
                                <div>{fee.calculation_method}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Fee:</span>
                                <div className="font-semibold">{fee.fee_amount}</div>
                              </div>
                            </div>

                            <div className="text-xs text-muted-foreground">
                              Created {fee.created_at}
                            </div>
                          </div>

                          <div className="flex gap-2 ml-4">
                            <Button variant="outline" size="sm" onClick={() => openEditDialog(fee)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeleteFee(fee.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Merchant Overrides Tab */}
          <TabsContent value="overrides" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Merchant Fee Overrides
                </CardTitle>
                <CardDescription>
                  Manage custom fee structures requested by merchants
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No merchant overrides</p>
                  <p className="text-muted-foreground mt-1">
                    Merchants can request custom fee structures here
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fee Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Fee Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₵{feeAnalytics?.total_fee_revenue?.toLocaleString() || '0'}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {feeAnalytics?.revenue_change_percent !== undefined ? (
                      feeAnalytics.revenue_change_percent >= 0 ? `+${feeAnalytics.revenue_change_percent}%` : `${feeAnalytics.revenue_change_percent}%`
                    ) : '0%'} from last month
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Average Fee per Transaction</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₵{feeAnalytics?.average_fee_per_transaction?.toFixed(2) || '0.00'}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {feeAnalytics?.avg_fee_change_percent !== undefined ? (
                      feeAnalytics.avg_fee_change_percent >= 0 ? `+${feeAnalytics.avg_fee_change_percent}%` : `${feeAnalytics.avg_fee_change_percent}%`
                    ) : '0%'} from last month
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Fee Configurations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{feeAnalytics?.total_configurations || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {feeAnalytics?.active_configurations || 0} active, {feeAnalytics?.inactive_configurations || 0} inactive
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Fee Revenue Trends</CardTitle>
                <CardDescription>Monthly fee revenue over the last 12 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-muted/20 rounded-lg">
                  <div className="text-center">
                    <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Revenue chart would be displayed here</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Peak: ₵{feeAnalytics?.peak_revenue?.toLocaleString() || '0'} ({feeAnalytics?.peak_month || 'N/A'})
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fee Calculator Tab */}
          <TabsContent value="calculator" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Fee Calculator
                </CardTitle>
                <CardDescription>
                  Calculate fees for different transaction scenarios
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="calc_fee_type">Fee Type</Label>
                      <Select defaultValue="remittance">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="remittance">Cross-border Remittance</SelectItem>
                          <SelectItem value="domestic_transfer">Domestic Transfer</SelectItem>
                          <SelectItem value="payment">Payment Processing</SelectItem>
                          <SelectItem value="withdrawal">Withdrawal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="calc_amount">Transaction Amount (₵)</Label>
                      <Input id="calc_amount" type="number" placeholder="100.00" />
                    </div>

                    <div>
                      <Label htmlFor="calc_from">From Country</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.length > 0 ? countries.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.flag_emoji} {country.name}
                            </SelectItem>
                          )) : (
                            <SelectItem value="loading" disabled>Loading countries...</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="calc_to">To Country</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.length > 0 ? countries.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.flag_emoji} {country.name}
                            </SelectItem>
                          )) : (
                            <SelectItem value="loading" disabled>Loading countries...</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button className="w-full">
                      Calculate Fee
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Fee Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span>Base Fee:</span>
                          <span>₵5.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Percentage Fee (2.5%):</span>
                          <span>₵2.50</span>
                        </div>
                        <div className="border-t pt-2 flex justify-between font-semibold">
                          <span>Total Fee:</span>
                          <span>₵7.50</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Recipient Receives:</span>
                          <span>₵92.50</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  )
}
