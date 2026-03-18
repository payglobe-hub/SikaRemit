'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api/axios'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalLink, ArrowUpRight, TrendingUp, TrendingDown, Activity, Clock, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { useCurrency } from '@/hooks/useCurrency'

interface Transaction {
  id: string
  amount: number
  status: string
  created_at: string
  customer_email?: string
  payment_method: string
  risk_score: number
}

export default function RecentTransactions() {
  const { formatAmount } = useCurrency()

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['merchant-recent-transactions'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/v1/payments/merchant/dashboard/transactions')
        return response.data.results || []
      } catch (error) {
        
        return []
      }
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 5 * 60 * 1000 // 5 minutes
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
    const icons = {
      card: '💳',
      mobile_money: '📱',
      bank_transfer: '🏦'
    }
    return icons[method as keyof typeof icons] || '💰'
  }

  const getRiskIndicator = (score: number) => {
    if (score < 20) return { color: 'bg-emerald-500', label: 'Low Risk' }
    if (score < 50) return { color: 'bg-amber-500', label: 'Medium Risk' }
    return { color: 'bg-red-500', label: 'High Risk' }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    return date.toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {transactions?.slice(0, 5).map((transaction: Transaction, index: number) => {
        const riskInfo = getRiskIndicator(transaction.risk_score)
        return (
          <div
            key={transaction.id}
            className="group relative overflow-hidden bg-gradient-to-r from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-800/50 hover:from-blue-50/50 hover:to-purple-50/50 dark:hover:from-blue-950/20 dark:hover:to-purple-950/20 p-6 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 hover:border-blue-300/50 dark:hover:border-blue-600/50 transition-all duration-500 hover:shadow-xl hover:-translate-y-1 animate-in slide-in-from-left duration-700"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-300">
              <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full blur-2xl"></div>
            </div>

            <div className="relative flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Transaction Icon */}
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <ArrowUpRight className="w-6 h-6 text-white" />
                  </div>
                  {/* Risk Indicator */}
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${riskInfo.color} rounded-full border-2 border-white dark:border-gray-800`} title={riskInfo.label}></div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      Transaction {transaction.id}
                    </h4>
                    {getStatusBadge(transaction.status)}
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <span className="text-lg">{getPaymentMethodIcon(transaction.payment_method)}</span>
                      <span className="capitalize">{transaction.payment_method.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatTime(transaction.created_at)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-gray-500">Risk:</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        riskInfo.color === 'bg-emerald-500' ? 'bg-emerald-100 text-emerald-800' :
                        riskInfo.color === 'bg-amber-500' ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {transaction.risk_score}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 truncate">
                    <span className="font-medium">Customer:</span> {transaction.customer_email || 'Anonymous'}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {/* Amount */}
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white group-hover:scale-105 transition-transform duration-300">
                    {formatAmount(transaction.amount)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Fee: {formatAmount(transaction.amount * 0.03)}
                  </div>
                </div>

                {/* Action Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl"
                >
                  <Link href={`/merchant/transactions/${transaction.id}`}>
                    <ExternalLink className="w-4 h-4 text-blue-600" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Animated Progress Bar */}
            <div className="mt-4 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-1000 ease-out ${
                  transaction.status === 'completed' ? 'w-full' :
                  transaction.status === 'pending' ? 'w-1/2 animate-pulse' :
                  transaction.status === 'failed' ? 'w-1/4 bg-red-500' : 'w-3/4'
                }`}
              ></div>
            </div>

            {/* Hover Effect Border */}
            <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-blue-300/50 dark:group-hover:border-blue-600/50 transition-colors duration-300 pointer-events-none"></div>
          </div>
        )
      })}

      {(!transactions || transactions.length === 0) && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No recent transactions
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Recent payment activities will appear here
          </p>
        </div>
      )}

      {transactions && transactions.length > 5 && (
        <div className="text-center pt-6">
          <Button
            variant="outline"
            asChild
            className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-950/30 dark:hover:to-purple-950/30 border-blue-200 dark:border-blue-800 rounded-xl"
          >
            <Link href="/merchant/transactions">
              <TrendingUp className="w-4 h-4 mr-2" />
              View All Transactions
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
