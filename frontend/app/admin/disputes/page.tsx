'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  AlertTriangle, CheckCircle, Clock, Eye, Filter, MoreHorizontal, 
  RefreshCw, Search, Shield, XCircle, DollarSign, Users, TrendingUp
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  getDisputes, getDisputeStats, resolveDispute, 
  Dispute, DisputeStats 
} from '@/lib/api/disputes'

export default function AdminDisputesPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null)
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [resolveForm, setResolveForm] = useState({ resolution: '', action: 'close' as string })

  // Fetch disputes
  const { data: disputesData, isLoading: disputesLoading, refetch } = useQuery({
    queryKey: ['admin-disputes', statusFilter],
    queryFn: () => getDisputes({ 
      status: statusFilter !== 'all' ? statusFilter : undefined 
    })
  })

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['dispute-stats'],
    queryFn: getDisputeStats
  })

  // Resolve mutation
  const resolveMutation = useMutation({
    mutationFn: ({ transactionId, resolution, action }: { 
      transactionId: string, resolution: string, action: 'refund' | 'complete' | 'close' 
    }) => resolveDispute(transactionId, resolution, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-disputes'] })
      queryClient.invalidateQueries({ queryKey: ['dispute-stats'] })
      setShowResolveModal(false)
      setResolveForm({ resolution: '', action: 'close' })
      toast.success('Dispute resolved successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to resolve dispute')
    }
  })

  const disputes = disputesData?.results || []
  const filteredDisputes = disputes.filter(d => 
    searchQuery === '' || 
    d.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.customer_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.transaction_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.reason?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      open: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      under_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
    return (
      <Badge className={variants[status] || variants.open}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }

  const handleResolve = (dispute: Dispute) => {
    setSelectedDispute(dispute)
    setResolveForm({ resolution: '', action: 'close' })
    setShowResolveModal(true)
  }

  const handleViewDetails = (dispute: Dispute) => {
    setSelectedDispute(dispute)
    setShowDetailsModal(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dispute Management</h1>
          <p className="text-muted-foreground">
            Review and resolve customer and merchant disputes
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Open Disputes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.open_disputes ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Under Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats?.under_review ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Being investigated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.resolved_disputes ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Successfully closed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Avg Resolution Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats?.avg_resolution_time_hours ?? 0}h
            </div>
            <p className="text-xs text-muted-foreground">Average time to resolve</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            All Disputes
          </CardTitle>
          <CardDescription>
            {filteredDisputes.length} dispute(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer, email, transaction ID, or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Disputes Table */}
          {disputesLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredDisputes.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No disputes found</h3>
              <p className="text-muted-foreground">
                {statusFilter !== 'all' 
                  ? `No ${statusFilter.replace('_', ' ')} disputes at the moment`
                  : 'All transactions are running smoothly'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDisputes.map((dispute) => (
                    <TableRow key={dispute.id}>
                      <TableCell className="font-mono text-sm">
                        {dispute.transaction_id?.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{dispute.customer_name || 'N/A'}</p>
                          <p className="text-sm text-muted-foreground">{dispute.customer_email || ''}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(dispute.transaction_amount, dispute.transaction_currency)}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="truncate" title={dispute.reason}>
                          {dispute.reason}
                        </p>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(dispute.status)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(dispute.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(dispute)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {(dispute.status === 'open' || dispute.status === 'under_review') && (
                              <DropdownMenuItem onClick={() => handleResolve(dispute)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Resolve Dispute
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolve Dispute Modal */}
      <Dialog open={showResolveModal} onOpenChange={setShowResolveModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve Dispute</DialogTitle>
            <DialogDescription>
              Choose how to resolve this dispute for transaction {selectedDispute?.transaction_id?.slice(0, 8)}...
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="font-semibold">
                  {selectedDispute && formatCurrency(selectedDispute.transaction_amount, selectedDispute.transaction_currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Reason</span>
                <span className="text-sm max-w-[200px] text-right">{selectedDispute?.reason}</span>
              </div>
            </div>
            
            <div>
              <Label htmlFor="resolve-action">Resolution Action</Label>
              <Select 
                value={resolveForm.action} 
                onValueChange={(value) => setResolveForm(prev => ({ ...prev, action: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="refund">
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                      Issue Full Refund
                    </div>
                  </SelectItem>
                  <SelectItem value="complete">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-blue-600" />
                      Complete Transaction
                    </div>
                  </SelectItem>
                  <SelectItem value="close">
                    <div className="flex items-center">
                      <XCircle className="h-4 w-4 mr-2 text-gray-600" />
                      Close Without Action
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="resolution-details">Resolution Details (Required)</Label>
              <Textarea
                id="resolution-details"
                placeholder="Explain how and why this dispute was resolved..."
                value={resolveForm.resolution}
                onChange={(e) => setResolveForm(prev => ({ ...prev, resolution: e.target.value }))}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => resolveMutation.mutate({
                transactionId: selectedDispute!.transaction_id,
                resolution: resolveForm.resolution,
                action: resolveForm.action as 'refund' | 'complete' | 'close'
              })}
              disabled={!resolveForm.resolution || resolveMutation.isPending}
            >
              {resolveMutation.isPending ? 'Resolving...' : 'Resolve Dispute'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Dispute Details</DialogTitle>
          </DialogHeader>
          {selectedDispute && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Transaction ID</Label>
                  <p className="font-mono">{selectedDispute.transaction_id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedDispute.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Amount</Label>
                  <p className="font-semibold text-lg">
                    {formatCurrency(selectedDispute.transaction_amount, selectedDispute.transaction_currency)}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p>{formatDate(selectedDispute.created_at)}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Customer</Label>
                <p className="font-medium">{selectedDispute.customer_name || 'N/A'}</p>
                <p className="text-sm text-muted-foreground">{selectedDispute.customer_email}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Dispute Reason</Label>
                <p className="p-3 bg-muted rounded-lg mt-1">{selectedDispute.reason}</p>
              </div>

              {selectedDispute.resolution && (
                <div>
                  <Label className="text-muted-foreground">Resolution</Label>
                  <p className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg mt-1">
                    {selectedDispute.resolution}
                  </p>
                  {selectedDispute.resolved_at && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Resolved on {formatDate(selectedDispute.resolved_at)}
                      {selectedDispute.resolved_by && ` by ${selectedDispute.resolved_by}`}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
              Close
            </Button>
            {selectedDispute && (selectedDispute.status === 'open' || selectedDispute.status === 'under_review') && (
              <Button onClick={() => {
                setShowDetailsModal(false)
                handleResolve(selectedDispute)
              }}>
                Resolve Dispute
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
