'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Eye, AlertTriangle } from 'lucide-react'
import { getRecentTransactions, Transaction as TransactionType } from '@/lib/api/payments'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

type Transaction = TransactionType & {
  reference_number?: string
  recipient?: string
  destination?: string
}

export default function TransactionsPage() {
  const { data: transactions, isLoading, error, refetch } = useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: () => getRecentTransactions(20), // Get last 20 transactions
  })

  return (
    <div className="min-h-screen bg-sikaremit-card space-y-6 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-sikaremit-foreground">Transaction History</h1>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-sikaremit-primary text-sikaremit-primary">
              {transactions?.length || 0} Transactions
            </Badge>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sikaremit-foreground">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-sikaremit-muted">
                <p>Loading transactions...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-600">
                <p>Failed to load transactions. Please try again.</p>
              </div>
            ) : !transactions || transactions.length === 0 ? (
              <div className="text-center py-8 text-sikaremit-muted">
                <p>No transactions found</p>
                <p className="text-sm mt-1">Your transaction history will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((tx: Transaction) => (
                  <div key={tx.id} className="flex items-center justify-between p-4 border border-sikaremit-border rounded-lg hover:bg-sikaremit-accent/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        tx.amount > 0
                          ? 'bg-green-100 text-green-600'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {/* Icon would go here */}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sikaremit-foreground">
                          {tx.description || 'Payment'}
                        </p>
                        <p className="text-sm text-sikaremit-muted">
                          {new Date(tx.created_at).toLocaleString()}
                        </p>
                        {tx.reference_number && (
                          <p className="text-xs text-sikaremit-muted">
                            Ref: {tx.reference_number}
                          </p>
                        )}
                        {tx.recipient && tx.destination && (
                          <p className="text-xs text-sikaremit-muted">
                            To: {tx.recipient} ({tx.destination})
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${
                        tx.amount > 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {tx.amount > 0 ? '+' : ''}₵{Math.abs(tx.amount).toFixed(2)}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded ${
                        tx.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : tx.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                      </div>
                      {tx.status === 'completed' && (
                        <div className="mt-2">
                          <Link
                            href="/customer/disputes/create-dispute"
                            className="inline-flex items-center px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded hover:bg-orange-200 transition-colors"
                          >
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Report Issue
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
