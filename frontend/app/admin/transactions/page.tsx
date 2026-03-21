'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import {
  CreditCard,
  Search,
  Filter,
  MoreHorizontal,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  DollarSign,
  Shield,
  ExternalLink
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import * as TransactionsAPI from '@/lib/api/transactions'
import type { Transaction } from '@/lib/api/transactions'

export default function AdminTransactionsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('')
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)

  // Modal states
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [showDisputeModal, setShowDisputeModal] = useState(false)
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)

  // Form states
  const [statusForm, setStatusForm] = useState({ status: '', reason: '' })
  const [refundForm, setRefundForm] = useState({ amount: '', reason: '' })
  const [disputeForm, setDisputeForm] = useState({ reason: '' })
  const [resolveForm, setResolveForm] = useState({ resolution: '', action: '' })
  const [completeForm, setCompleteForm] = useState({ reason: '' })

  const queryClient = useQueryClient()

  // Fetch transactions
  const { data: transactions, isLoading, refetch } = useQuery({
    queryKey: ['admin-transactions', searchTerm, statusFilter, userFilter],
    queryFn: () => TransactionsAPI.getAdminTransactions({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      user_id: userFilter || undefined
    })
  })

  // Mutations for admin actions
  const statusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string, status: string, reason: string }) =>
      TransactionsAPI.overrideTransactionStatus(id, status, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-transactions'] })
      setShowStatusModal(false)
      setStatusForm({ status: '', reason: '' })
      toast.success('Transaction status updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update status')
    }
  })

  const refundMutation = useMutation({
    mutationFn: ({ id, amount, reason }: { id: string, amount?: number, reason?: string }) =>
      TransactionsAPI.processAdminRefund(id, amount, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-transactions'] })
      setShowRefundModal(false)
      setRefundForm({ amount: '', reason: '' })
      toast.success('Refund processed successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to process refund')
    }
  })

  const disputeMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string, reason: string }) =>
      TransactionsAPI.createTransactionDispute(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-transactions'] })
      setShowDisputeModal(false)
      setDisputeForm({ reason: '' })
      toast.success('Dispute created successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create dispute')
    }
  })

  const resolveMutation = useMutation({
    mutationFn: ({ id, resolution, action }: { id: string, resolution: string, action?: string }) =>
      TransactionsAPI.resolveTransactionDispute(id, resolution, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-transactions'] })
      setShowResolveModal(false)
      setResolveForm({ resolution: '', action: '' })
      toast.success('Dispute resolved successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to resolve dispute')
    }
  })

  const completeMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string, reason: string }) =>
      TransactionsAPI.manualCompleteTransaction(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-transactions'] })
      setShowCompleteModal(false)
      setCompleteForm({ reason: '' })
      toast.success('Transaction manually completed')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to complete transaction')
    }
  })

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      refunded: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    }
    return (
      <Badge className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    )
  }

  const getDisputeBadge = (status?: string) => {
    if (!status) return null
    const variants = {
      open: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      under_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
    return (
      <Badge className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  const formatAmount = (amount: number, currency: string = 'GHS') => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const handleStatusOverride = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setStatusForm({ status: transaction.status, reason: '' })
    setShowStatusModal(true)
  }

  const handleRefund = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setRefundForm({ amount: transaction.amount.toString(), reason: '' })
    setShowRefundModal(true)
  }

  const handleCreateDispute = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setDisputeForm({ reason: '' })
    setShowDisputeModal(true)
  }

  const handleResolveDispute = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setResolveForm({ resolution: '', action: '' })
    setShowResolveModal(true)
  }

  const handleManualComplete = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setCompleteForm({ reason: '' })
    setShowCompleteModal(true)
  }

  const filteredTransactions = transactions?.results?.filter((transaction: Transaction) =>
    !searchTerm ||
    transaction.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  return (
    <div className="w-full space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Admin Transaction Management
          </h1>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search by ID, email, name, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="min-w-[150px]">
                <Label htmlFor="status">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[150px]">
                <Label htmlFor="user">User ID</Label>
                <Input
                  id="user"
                  placeholder="User ID"
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Transactions ({filteredTransactions.length})
            </CardTitle>
            <CardDescription>
              Manage and intervene in transaction issues across all users
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading transactions...</div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-16">
                <CreditCard className="w-24 h-24 text-gray-400 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  No transactions found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                  Try adjusting your search or filter criteria
                </p>
                <Button
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('all')
                    setUserFilter('')
                  }}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Dispute</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction: Transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-mono text-sm">
                          {transaction.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{transaction.customer_name}</div>
                            <div className="text-sm text-gray-500">{transaction.customer_email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {formatAmount(transaction.amount, transaction.currency)}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{transaction.type}</Badge>
                        </TableCell>
                        <TableCell>
                          {getDisputeBadge(transaction.dispute_status)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDate(transaction.created_at)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleStatusOverride(transaction)}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Override Status
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleRefund(transaction)}>
                                <DollarSign className="h-4 w-4 mr-2" />
                                Process Refund
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleManualComplete(transaction)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Manual Complete
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleCreateDispute(transaction)}>
                                <AlertTriangle className="h-4 w-4 mr-2" />
                                Create Dispute
                              </DropdownMenuItem>
                              {transaction.dispute_status && transaction.dispute_status !== 'resolved' && (
                                <DropdownMenuItem onClick={() => handleResolveDispute(transaction)}>
                                  <Shield className="h-4 w-4 mr-2" />
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

        {/* Status Override Modal */}
        <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Override Transaction Status</DialogTitle>
              <DialogDescription>
                Manually change the status of transaction {selectedTransaction?.id.slice(0, 8)}...
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="status-select">New Status</Label>
                <Select value={statusForm.status} onValueChange={(value) => setStatusForm(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status-reason">Reason (Required)</Label>
                <Textarea
                  id="status-reason"
                  placeholder="Explain why you're overriding the status..."
                  value={statusForm.reason}
                  onChange={(e) => setStatusForm(prev => ({ ...prev, reason: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowStatusModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => statusMutation.mutate({
                  id: selectedTransaction!.id,
                  status: statusForm.status,
                  reason: statusForm.reason
                })}
                disabled={!statusForm.status || !statusForm.reason || statusMutation.isPending}
              >
                {statusMutation.isPending ? 'Updating...' : 'Update Status'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Refund Modal */}
        <Dialog open={showRefundModal} onOpenChange={setShowRefundModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Process Refund</DialogTitle>
              <DialogDescription>
                Refund transaction {selectedTransaction?.id.slice(0, 8)}... for {selectedTransaction && formatAmount(selectedTransaction.amount, selectedTransaction.currency)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="refund-amount">Refund Amount</Label>
                <Input
                  id="refund-amount"
                  type="number"
                  placeholder="Leave empty for full refund"
                  value={refundForm.amount}
                  onChange={(e) => setRefundForm(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="refund-reason">Reason (Required)</Label>
                <Textarea
                  id="refund-reason"
                  placeholder="Explain why you're processing this refund..."
                  value={refundForm.reason}
                  onChange={(e) => setRefundForm(prev => ({ ...prev, reason: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRefundModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => refundMutation.mutate({
                  id: selectedTransaction!.id,
                  amount: refundForm.amount ? parseFloat(refundForm.amount) : undefined,
                  reason: refundForm.reason
                })}
                disabled={!refundForm.reason || refundMutation.isPending}
              >
                {refundMutation.isPending ? 'Processing...' : 'Process Refund'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Dispute Modal */}
        <Dialog open={showDisputeModal} onOpenChange={setShowDisputeModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Dispute</DialogTitle>
              <DialogDescription>
                Create a dispute for transaction {selectedTransaction?.id.slice(0, 8)}...
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="dispute-reason">Dispute Reason (Required)</Label>
                <Textarea
                  id="dispute-reason"
                  placeholder="Describe the dispute..."
                  value={disputeForm.reason}
                  onChange={(e) => setDisputeForm(prev => ({ ...prev, reason: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDisputeModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => disputeMutation.mutate({
                  id: selectedTransaction!.id,
                  reason: disputeForm.reason
                })}
                disabled={!disputeForm.reason || disputeMutation.isPending}
              >
                {disputeMutation.isPending ? 'Creating...' : 'Create Dispute'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Resolve Dispute Modal */}
        <Dialog open={showResolveModal} onOpenChange={setShowResolveModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resolve Dispute</DialogTitle>
              <DialogDescription>
                Resolve dispute for transaction {selectedTransaction?.id.slice(0, 8)}...
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="resolve-action">Resolution Action</Label>
                <Select value={resolveForm.action} onValueChange={(value) => setResolveForm(prev => ({ ...prev, action: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="refund">Process Refund</SelectItem>
                    <SelectItem value="complete">Complete Transaction</SelectItem>
                    <SelectItem value="close">Close Dispute Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="resolve-details">Resolution Details (Required)</Label>
                <Textarea
                  id="resolve-details"
                  placeholder="Describe how the dispute was resolved..."
                  value={resolveForm.resolution}
                  onChange={(e) => setResolveForm(prev => ({ ...prev, resolution: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowResolveModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => resolveMutation.mutate({
                  id: selectedTransaction!.id,
                  resolution: resolveForm.resolution,
                  action: resolveForm.action
                })}
                disabled={!resolveForm.resolution || resolveMutation.isPending}
              >
                {resolveMutation.isPending ? 'Resolving...' : 'Resolve Dispute'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manual Complete Modal */}
        <Dialog open={showCompleteModal} onOpenChange={setShowCompleteModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manual Complete Transaction</DialogTitle>
              <DialogDescription>
                Manually mark transaction {selectedTransaction?.id.slice(0, 8)}... as completed
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="complete-reason">Reason (Required)</Label>
                <Textarea
                  id="complete-reason"
                  placeholder="Explain why you're manually completing this transaction..."
                  value={completeForm.reason}
                  onChange={(e) => setCompleteForm(prev => ({ ...prev, reason: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCompleteModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => completeMutation.mutate({
                  id: selectedTransaction!.id,
                  reason: completeForm.reason
                })}
                disabled={!completeForm.reason || completeMutation.isPending}
              >
                {completeMutation.isPending ? 'Completing...' : 'Complete Transaction'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  )
}
