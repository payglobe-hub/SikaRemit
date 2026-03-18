'use client'

import { useState, useEffect } from 'react'
// Note: This component renders a visual phone mockup for the landing page with demo data
import { ArrowDownLeft, ArrowUpRight, Smartphone, Wallet, Send, Receipt } from 'lucide-react'

interface Transaction {
  id: string
  type: 'send' | 'receive' | 'topup' | 'bill' | 'transfer' | 'airtime' | 'deposit'
  name: string
  amount: number
  currency: string
  date: string
  status: 'completed' | 'pending'
}

const getRecentTransactions = async (): Promise<Transaction[]> => {
  try {
    // Fetch real data from API when available
    // For now, return empty array for production
    return []
  } catch (error) {
    
    return []
  }
}

const getTransactionIcon = (type: Transaction['type']) => {
  switch (type) {
    case 'send':
    case 'transfer':
      return <ArrowUpRight className="w-4 h-4" />
    case 'receive':
    case 'deposit':
      return <ArrowDownLeft className="w-4 h-4" />
    case 'topup':
    case 'airtime':
      return <Smartphone className="w-4 h-4" />
    case 'bill':
      return <Receipt className="w-4 h-4" />
    default:
      return <Send className="w-4 h-4" />
  }
}

const getTransactionColor = (type: Transaction['type']) => {
  switch (type) {
    case 'send':
    case 'transfer':
      return 'bg-orange-500/10 text-orange-500'
    case 'receive':
    case 'deposit':
      return 'bg-green-500/10 text-green-500'
    case 'topup':
    case 'airtime':
      return 'bg-blue-500/10 text-blue-500'
    case 'bill':
      return 'bg-purple-500/10 text-purple-500'
    default:
      return 'bg-gray-500/10 text-gray-500'
  }
}

export function PhoneMockup() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [balance, setBalance] = useState({ available: 0, currency: 'GHS' })
  const [isLoading, setIsLoading] = useState(true)

  // Fetch real data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch recent transactions
        const recentTxns = await getRecentTransactions()
        setTransactions(recentTxns.slice(0, 5)) // Show only 5 most recent
        
        // Fetch account balance - disabled for SSR safety
        // In a real app, this would be replaced with server-side data fetching
        setBalance({
          available: 2500.00,
          currency: 'GHS'
        })
      } catch (error) {
        
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [])

  // Format amount for display
  const formatAmount = (amount: number | string, currency: string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return `${currency} ${num.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return dateString // Return original if parsing fails
      }
      
      const now = new Date()
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
      
      if (diffInHours < 24) {
        return `Today, ${date.toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })}`
      } else if (diffInHours < 48) {
        return 'Yesterday'
      } else {
        return date.toLocaleDateString('en-GH', { month: 'short', day: 'numeric' })
      }
    } catch {
      return dateString
    }
  }

  // Show loading state while fetching data
  if (isLoading) {
    return (
      <div className="relative mx-auto w-[280px] md:w-[320px]">
        {/* Phone Frame */}
        <div className="relative bg-gray-900 rounded-[3rem] p-3 shadow-2xl shadow-black/50">
          {/* Phone Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-gray-900 rounded-b-2xl z-20"></div>
          
          {/* Phone Screen */}
          <div className="relative bg-white rounded-[2.5rem] overflow-hidden h-[580px] md:h-[620px]">
            {/* Status Bar */}
            <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
              <span className="text-xs font-medium text-gray-600">9:41</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-2 bg-gray-600 rounded-sm"></div>
                <div className="w-4 h-2 bg-gray-600 rounded-sm"></div>
                <div className="w-6 h-3 bg-green-500 rounded-sm"></div>
              </div>
            </div>

            {/* App Header */}
            <div className="bg-white px-5 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center overflow-hidden">
                  <img src="/logos/SikaRemit.jpeg" alt="SikaRemit" className="w-8 h-8 object-cover rounded-lg" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">SikaRemit</h3>
                  <p className="text-xs text-gray-500">Your Digital Wallet</p>
                </div>
              </div>
            </div>

            {/* Loading State */}
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">Loading...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative mx-auto w-[280px] md:w-[320px]">
      {/* Phone Frame */}
      <div className="relative bg-gray-900 rounded-[3rem] p-3 shadow-2xl shadow-black/50">
        {/* Phone Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-gray-900 rounded-b-2xl z-20"></div>
        
        {/* Phone Screen */}
        <div className="relative bg-white rounded-[2.5rem] overflow-hidden h-[580px] md:h-[620px]">
          {/* Status Bar */}
          <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
            <span className="text-xs font-medium text-gray-600">9:41</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-2 bg-gray-600 rounded-sm"></div>
              <div className="w-4 h-2 bg-gray-600 rounded-sm"></div>
              <div className="w-6 h-3 bg-green-500 rounded-sm"></div>
            </div>
          </div>

          {/* App Header */}
          <div className="bg-white px-5 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center overflow-hidden">
                <img src="/logos/SikaRemit.jpeg" alt="SikaRemit" className="w-8 h-8 object-cover rounded-lg" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">SikaRemit</h3>
                <p className="text-xs text-gray-500">Your Digital Wallet</p>
              </div>
            </div>
          </div>

          {/* Balance Card */}
          <div className="px-4 py-4">
            <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl p-5 text-white shadow-lg">
              <p className="text-sm opacity-80 mb-1">Available Balance</p>
              <p className="text-3xl font-bold mb-3">{formatAmount(balance.available, balance.currency)}</p>
              <div className="flex gap-3">
                <button className="flex-1 bg-white/20 backdrop-blur-sm rounded-xl py-2 text-xs font-medium hover:bg-white/30 transition-colors">
                  <Send className="w-3 h-3 inline mr-1" />
                  Send
                </button>
                <button className="flex-1 bg-white/20 backdrop-blur-sm rounded-xl py-2 text-xs font-medium hover:bg-white/30 transition-colors">
                  <ArrowDownLeft className="w-3 h-3 inline mr-1" />
                  Request
                </button>
              </div>
            </div>
          </div>

          {/* Transactions */}
          <div className="px-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900 text-sm">Recent Transactions</h4>
              <span className="text-xs text-blue-600 font-medium">See all</span>
            </div>
            
            <div className="space-y-2">
              {transactions.length > 0 ? (
                transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${getTransactionColor(transaction.type)}`}>
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{transaction.name || 'Transaction'}</p>
                        <p className="text-xs text-gray-500">{formatDate(transaction.date)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold text-sm ${
                        transaction.amount > 0 ? 'text-green-500' : 'text-gray-900'
                      }`}>
                        {transaction.amount > 0 ? '+' : ''}{Math.abs(transaction.amount).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">{transaction.currency}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">No transactions yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3">
            <div className="flex items-center justify-around">
              <div className="flex flex-col items-center gap-1">
                <div className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-[10px] text-blue-600 font-medium">Home</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center">
                  <Send className="w-4 h-4 text-gray-400" />
                </div>
                <span className="text-[10px] text-gray-400">Send</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center">
                  <Receipt className="w-4 h-4 text-gray-400" />
                </div>
                <span className="text-[10px] text-gray-400">History</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-gray-400" />
                </div>
                <span className="text-[10px] text-gray-400">More</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute -z-10 top-1/4 -left-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl"></div>
      <div className="absolute -z-10 bottom-1/4 -right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"></div>
    </div>
  )
}

export default PhoneMockup
