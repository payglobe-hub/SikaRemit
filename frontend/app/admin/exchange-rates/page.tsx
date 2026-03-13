'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api/axios'
import {
  Plus,
  Edit,
  Trash2,
  History,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  DollarSign,
  TrendingUp,
  Eye,
  EyeOff
} from 'lucide-react'

// Types for exchange rates
interface ExchangeRate {
  id: string
  from_currency: {
    id: number
    code: string
    name: string
    symbol: string
  }
  to_currency: {
    id: number
    code: string
    name: string
    symbol: string
  }
  from_currency_code: string
  to_currency_code: string
  from_currency_name: string
  to_currency_name: string
  rate: number
  inverse_rate: number
  source: string
  timestamp: string
  is_latest: boolean
  valid_from: string
  valid_to?: string
  spread?: number
  metadata: any
}

interface ExchangeRateHistory {
  id: number
  rate_display: string
  old_rate?: number
  new_rate: number
  changed_by_name: string
  changed_at: string
  change_reason: string
  notes: string
}

interface Currency {
  id: number
  code: string
  name: string
  symbol: string
  flag_emoji?: string
  is_active: boolean
}

export default function ExchangeRatesAdmin() {
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([])
  const [selectedRate, setSelectedRate] = useState<ExchangeRate | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const { toast } = useToast()

  // Form state for creating/editing rates
  const [formData, setFormData] = useState({
    from_currency: 'GHS',
    to_currency: 'USD',
    rate: '',
    effective_from: '',
    effective_until: '',
    notes: '',
    is_active: true
  })

  useEffect(() => {
    loadExchangeRates()
    loadCurrencies()
  }, [])

  const loadCurrencies = async () => {
    try {
      const response = await api.get('/api/v1/payments/currencies/')
      const data = response.data
      const currencyList = Array.isArray(data) ? data : (data.results || [])
      setCurrencies(currencyList.filter((c: Currency) => c.is_active))
    } catch (error) {
      console.error('Failed to load currencies:', error)
      toast({
        title: 'Warning',
        description: 'Failed to load currencies. Please refresh the page.',
        variant: 'destructive'
      })
    }
  }

  const loadExchangeRates = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/v1/payments/exchange-rates-admin/')
      const data = response.data
      // Handle both array and paginated response
      const rates = Array.isArray(data) ? data : (data.results || [])
      setExchangeRates(rates)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load exchange rates',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRate = async () => {
    try {
      await api.post('/api/v1/payments/exchange-rates-admin/', {
        from_currency: formData.from_currency,
        to_currency: formData.to_currency,
        rate: parseFloat(formData.rate),
        valid_from: formData.effective_from || new Date().toISOString(),
        valid_to: formData.effective_until || null,
        source: 'admin'
      })

      await loadExchangeRates()
      setIsCreateDialogOpen(false)
      resetForm()

      toast({
        title: 'Success',
        description: 'Exchange rate created successfully'
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create exchange rate',
        variant: 'destructive'
      })
    }
  }

  const handleUpdateRate = async () => {
    if (!selectedRate) return

    try {
      await api.put(`/api/v1/payments/exchange-rates-admin/${selectedRate.id}/`, {
        from_currency: formData.from_currency,
        to_currency: formData.to_currency,
        rate: parseFloat(formData.rate),
        valid_from: formData.effective_from || selectedRate.valid_from,
        valid_to: formData.effective_until || null,
        source: 'admin'
      })

      await loadExchangeRates()
      setIsEditDialogOpen(false)
      setSelectedRate(null)
      resetForm()

      toast({
        title: 'Success',
        description: 'Exchange rate updated successfully'
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update exchange rate',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteRate = async (rateId: string) => {
    if (!confirm('Are you sure you want to delete this exchange rate?')) return

    try {
      await api.delete(`/api/v1/payments/exchange-rates-admin/${rateId}/`)

      await loadExchangeRates()

      toast({
        title: 'Success',
        description: 'Exchange rate deleted successfully'
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete exchange rate',
        variant: 'destructive'
      })
    }
  }

  const handleToggleActive = async (rate: ExchangeRate) => {
    try {
      const newStatus = !rate.is_latest
      await api.patch(`/api/v1/payments/exchange-rates-admin/${rate.id}/`, { is_latest: newStatus })

      await loadExchangeRates()

      toast({
        title: 'Success',
        description: `Exchange rate ${newStatus ? 'activated' : 'deactivated'}`
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to toggle rate status',
        variant: 'destructive'
      })
    }
  }

  const resetForm = () => {
    setFormData({
      from_currency: 'GHS',
      to_currency: 'USD',
      rate: '',
      effective_from: '',
      effective_until: '',
      notes: '',
      is_active: true
    })
  }

  const openEditDialog = (rate: ExchangeRate) => {
    setSelectedRate(rate)
    setFormData({
      from_currency: rate.from_currency.code,
      to_currency: rate.to_currency.code,
      rate: rate.rate.toString(),
      effective_from: rate.valid_from.split('T')[0],
      effective_until: rate.valid_to ? rate.valid_to.split('T')[0] : '',
      notes: '',
      is_active: rate.is_latest
    })
    setIsEditDialogOpen(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (rate: ExchangeRate) => {
    if (!rate.is_latest) {
      return <Badge variant="secondary">Inactive</Badge>
    }
    return <Badge variant="default" className="bg-green-500">Active</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading exchange rates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exchange Rates</h1>
          <p className="text-muted-foreground">
            Manage currency conversion rates for international remittances
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Rate
        </Button>
      </div>

      <Tabs defaultValue="rates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rates">Exchange Rates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="rates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Current Exchange Rates
              </CardTitle>
              <CardDescription>
                Manage and monitor exchange rates for currency conversion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Currency Pair</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Effective From</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exchangeRates.map((rate) => (
                      <TableRow key={rate.id}>
                        <TableCell className="font-medium">
                          {rate.from_currency.code} → {rate.to_currency.code}
                        </TableCell>
                        <TableCell>{rate.rate}</TableCell>
                        <TableCell>{getStatusBadge(rate)}</TableCell>
                        <TableCell>{formatDate(rate.valid_from)}</TableCell>
                        <TableCell>{formatDate(rate.timestamp)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(rate)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsHistoryDialogOpen(true)}
                            >
                              {rate.is_latest ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsHistoryDialogOpen(true)}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRate(rate.id as string)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Rates</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {exchangeRates.filter(r => r.is_latest).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Currently active exchange rates
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Scheduled Rates</CardTitle>
                <Calendar className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {exchangeRates.filter(r => !r.is_latest).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Rates scheduled for future activation
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Rate Change</CardTitle>
                <TrendingUp className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2.3%</div>
                <p className="text-xs text-muted-foreground">
                  Average monthly rate change
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alerts Active</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">
                  Active rate change alerts
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rate Change Alerts</CardTitle>
              <CardDescription>
                Configure alerts for exchange rate changes and thresholds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Alert configuration coming soon. This will allow you to set up notifications
                  when rates change by certain percentages or reach specific thresholds.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Rate Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Exchange Rate</DialogTitle>
            <DialogDescription>
              Create a new exchange rate for currency conversion.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="from_currency">From Currency</Label>
                <Select
                  value={formData.from_currency}
                  onValueChange={(value) => setFormData({...formData, from_currency: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.flag_emoji} {currency.code} ({currency.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="to_currency">To Currency</Label>
                <Select
                  value={formData.to_currency}
                  onValueChange={(value) => setFormData({...formData, to_currency: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.flag_emoji} {currency.code} ({currency.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate">Exchange Rate</Label>
              <Input
                id="rate"
                type="number"
                step="0.0001"
                placeholder="0.0000"
                value={formData.rate}
                onChange={(e) => setFormData({...formData, rate: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="effective_from">Effective From</Label>
              <Input
                id="effective_from"
                type="datetime-local"
                value={formData.effective_from}
                onChange={(e) => setFormData({...formData, effective_from: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="effective_until">Effective Until (Optional)</Label>
              <Input
                id="effective_until"
                type="datetime-local"
                value={formData.effective_until}
                onChange={(e) => setFormData({...formData, effective_until: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about this rate..."
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
              />
              <Label htmlFor="is_active">Latest</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRate}>Create Rate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Rate Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Exchange Rate</DialogTitle>
            <DialogDescription>
              Update the exchange rate settings.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_from_currency">From Currency</Label>
                <Select
                  value={formData.from_currency}
                  onValueChange={(value) => setFormData({...formData, from_currency: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.flag_emoji} {currency.code} ({currency.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_to_currency">To Currency</Label>
                <Select
                  value={formData.to_currency}
                  onValueChange={(value) => setFormData({...formData, to_currency: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.flag_emoji} {currency.code} ({currency.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_rate">Exchange Rate</Label>
              <Input
                id="edit_rate"
                type="number"
                step="0.0001"
                placeholder="0.0000"
                value={formData.rate}
                onChange={(e) => setFormData({...formData, rate: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_effective_from">Effective From</Label>
              <Input
                id="edit_effective_from"
                type="datetime-local"
                value={formData.effective_from}
                onChange={(e) => setFormData({...formData, effective_from: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_effective_until">Effective Until (Optional)</Label>
              <Input
                id="edit_effective_until"
                type="datetime-local"
                value={formData.effective_until}
                onChange={(e) => setFormData({...formData, effective_until: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_notes">Notes</Label>
              <Textarea
                id="edit_notes"
                placeholder="Additional notes about this rate..."
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit_is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
              />
              <Label htmlFor="edit_is_active">Latest</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRate}>Update Rate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
