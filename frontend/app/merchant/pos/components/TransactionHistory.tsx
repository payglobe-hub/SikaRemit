'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Calendar, Search, Filter, Download, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api/axios'

interface Transaction {
  id: string;
  transaction_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  device_type: string;
  card_brand: string;
  device_id: string;
  card_last4: string;
}

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    device_id: '',
    status: '',
    start_date: '',
    end_date: '',
    search: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    hasNext: false,
    hasPrev: false
  })

  useEffect(() => {
    fetchTransactions()
  }, [filters, pagination.page])

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      })

      const response = await api.get(`/api/v1/payments/pos/transactions/?${queryParams}`)
      
      setTransactions(response.data.results || [])
      setPagination({
        page: pagination.page,
        total: response.data.count || 0,
        hasNext: !!response.data.next,
        hasPrev: !!response.data.previous
      })
    } catch (error) {
      toast.error('Failed to fetch transactions')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleGenerateReceipt = async (transactionId: string) => {
    try {
      const response = await api.post('/api/v1/payments/pos/generate-receipt/', {
        transaction_id: transactionId,
        receipt_type: 'merchant'
      })

      // In a real app, this would trigger a print dialog or download
      toast.success('Receipt generated successfully')
      
    } catch (error) {
      toast.error('Failed to generate receipt')
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default'
      case 'failed':
        return 'destructive'
      case 'pending':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const formatDeviceType = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>POS Transaction History</CardTitle>
          <CardDescription>
            View and manage your point of sale transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-64">
              <Input
                placeholder="Search transactions..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              placeholder="Start Date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
              className="w-40"
            />
            <Input
              type="date"
              placeholder="End Date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
              className="w-40"
            />
            <Button variant="outline" onClick={() => setFilters({
              device_id: '',
              status: '',
              start_date: '',
              end_date: '',
              search: ''
            })}>
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>

          {/* Transactions Table */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No transactions found</h3>
              <p className="text-muted-foreground">
                {Object.values(filters).some(v => v !== '') ?
                  'Try adjusting your filters' :
                  'Your POS transactions will appear here'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Card</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium font-mono text-sm">
                            {transaction.transaction_id}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDeviceType(transaction.device_type)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {transaction.device_id}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            â‚µ{transaction.amount} {transaction.currency}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(transaction.status)}>
                          {transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {transaction.card_last4 ? (
                          <span className="font-mono">
                            ****{transaction.card_last4}
                            {transaction.card_brand && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({transaction.card_brand})
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(transaction.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateReceipt(transaction.transaction_id)}
                        >
                          <Receipt className="h-4 w-4 mr-1" />
                          Receipt
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {transactions.length} of {pagination.total} transactions
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={!pagination.hasPrev}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={!pagination.hasNext}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default TransactionHistory

