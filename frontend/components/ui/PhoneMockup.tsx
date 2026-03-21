'use client'

import React, { useState, useEffect } from 'react'
import { 
  ArrowUpRight, ArrowDownRight, QrCode, CreditCard, 
  Home, Plus, User, Bell, Settings, Search, Filter,
  Eye, EyeOff, TrendingUp, TrendingDown, Activity,
  Smartphone, Wifi, Battery, Signal, Volume2,
  Shield, Lock, Fingerprint, SmartphoneNfc,
  Clock, CheckCircle, AlertCircle, X, Menu,
  ChevronRight, MoreVertical, Star, Heart,
  Download, Upload, RefreshCw, LogOut, FileText
} from 'lucide-react'

interface Transaction {
  id: number
  name: string
  amount: string
  time: string
  type: string
  status: 'success' | 'pending' | 'failed'
  icon: string
  color: string
}

interface BalanceCard {
  currency: string
  amount: string
  change: string
  changePercent: string
  isPositive: boolean
}

export default function EnhancedPhoneMockup() {
  const [isVisible, setIsVisible] = useState(false)
  const [showBalance, setShowBalance] = useState(true)
  const [activeTab, setActiveTab] = useState('home')
  const [currentTime, setCurrentTime] = useState('9:41')
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: 1,
      name: 'MTN MoMo',
      amount: '-GHS 50.00',
      time: '2 min ago',
      type: 'Airtime',
      status: 'success',
      icon: '📱',
      color: 'bg-orange-100 text-orange-600'
    },
    {
      id: 2,
      name: 'Telecel Cash',
      amount: '+GHS 200.00',
      time: '1 hour ago',
      type: 'Transfer',
      status: 'success',
      icon: '📞',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      id: 3,
      name: 'G-Money',
      amount: '-GHS 150.00',
      time: '3 hours ago',
      type: 'Payment',
      status: 'success',
      icon: '💰',
      color: 'bg-green-100 text-green-600'
    },
    {
      id: 4,
      name: 'AirtelTigo',
      amount: '+GHS 500.00',
      time: '5 hours ago',
      type: 'Deposit',
      status: 'pending',
      icon: '📶',
      color: 'bg-purple-100 text-purple-600'
    }
  ])

  const balanceData: BalanceCard = {
    currency: 'GHS',
    amount: '5,420.00',
    change: '+250.00',
    changePercent: '+4.8%',
    isPositive: true
  }

  useEffect(() => {
    setIsVisible(true)
    
    // Update time every minute
    const timer = setInterval(() => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: false 
      }))
    }, 60000)

    return () => clearInterval(timer)
  }, [])

  const quickActions = [
    { icon: ArrowUpRight, label: 'Send', color: 'bg-blue-500' },
    { icon: ArrowDownRight, label: 'Receive', color: 'bg-green-500' },
    { icon: QrCode, label: 'Scan', color: 'bg-purple-500' },
    { icon: CreditCard, label: 'Pay', color: 'bg-orange-500' }
  ]

  const bottomNavItems = [
    { icon: Home, label: 'Home', active: true },
    { icon: CreditCard, label: 'Cards', active: false },
    { icon: Plus, label: 'Add', active: false },
    { icon: Bell, label: 'Alerts', active: false },
    { icon: User, label: 'Profile', active: false }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'failed':
        return <X className="w-4 h-4 text-red-500" />
      default:
        return null
    }
  }

  return (
    <div className={`relative mx-auto border-gray-800 bg-gray-800 border-[8px] rounded-[3.5rem] h-[600px] w-[300px] shadow-2xl transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
      <div className="rounded-[2.5rem] overflow-hidden w-full h-full bg-white">
        {/* Status Bar */}
        <div className="bg-gray-900 px-6 py-2 flex justify-between items-center">
          <span className="text-white text-xs font-medium">{currentTime}</span>
          <div className="flex gap-1 items-center">
            <Signal className="w-4 h-3 text-white" />
            <Wifi className="w-4 h-3 text-white" />
            <Battery className="w-4 h-3 text-white" />
          </div>
        </div>
        
        {/* App Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <Menu className="w-5 h-5 text-white" />
              <h3 className="text-white font-bold text-lg">SikaRemit</h3>
            </div>
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-white" />
              <Search className="w-5 h-5 text-white" />
            </div>
          </div>
          
          {/* Balance Card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-blue-100 text-xs mb-1">Total Balance</p>
                <div className="flex items-center gap-2">
                  <p className="text-white text-2xl font-bold">
                    {showBalance ? `${balanceData.currency} ${balanceData.amount}` : '••••••'}
                  </p>
                  <button
                    onClick={() => setShowBalance(!showBalance)}
                    className="text-blue-200 hover:text-white transition-colors"
                  >
                    {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {balanceData.isPositive ? (
                    <TrendingUp className="w-4 h-4 text-green-300" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-300" />
                  )}
                  <span className={`text-xs ${balanceData.isPositive ? 'text-green-300' : 'text-red-300'}`}>
                    {balanceData.change} ({balanceData.changePercent})
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Download className="w-4 h-4 text-blue-200" />
                <Upload className="w-4 h-4 text-blue-200" />
                <RefreshCw className="w-4 h-4 text-blue-200" />
              </div>
            </div>
            
            {/* Mini Chart */}
            <div className="flex items-end gap-1 h-12">
              {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 50, 95].map((height, index) => (
                <div
                  key={index}
                  className="flex-1 bg-white/30 rounded-t-sm"
                  style={{ height: `${height}%` }}
                ></div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 bg-gray-50 p-6 overflow-y-auto">
          {/* Quick Actions */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {quickActions.map((action, index) => (
              <button
                key={index}
                className="group flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-white transition-all duration-200"
              >
                <div className={`${action.color} rounded-xl p-3 group-hover:scale-110 transition-transform duration-200`}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs text-gray-700 font-medium">{action.label}</span>
              </button>
            ))}
          </div>
          
          {/* Services */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-gray-900">Services</h4>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-3 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <SmartphoneNfc className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900">Mobile Money</span>
                </div>
                <p className="text-xs text-gray-500">Send & receive</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-900">Bank Transfer</span>
                </div>
                <p className="text-xs text-gray-500">Direct deposit</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <QrCode className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-900">QR Payment</span>
                </div>
                <p className="text-xs text-gray-500">Scan & pay</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-orange-600" />
                  <span className="text-sm font-medium text-gray-900">Bill Payment</span>
                </div>
                <p className="text-xs text-gray-500">Pay bills</p>
              </div>
            </div>
          </div>
          
          {/* Recent Transactions */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-gray-900">Recent Activity</h4>
              <button className="text-xs text-blue-600 hover:text-blue-700">See all</button>
            </div>
            
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="bg-white rounded-xl p-3 border border-gray-200 hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${transaction.color} rounded-full flex items-center justify-center text-sm font-medium`}>
                        {transaction.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{transaction.name}</p>
                        <p className="text-xs text-gray-500">{transaction.type} • {transaction.time}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{transaction.amount}</p>
                      <div className="flex items-center gap-1 justify-end">
                        {getStatusIcon(transaction.status)}
                        <span className="text-xs capitalize text-gray-500">{transaction.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Bottom Navigation */}
        <div className="bg-white border-t border-gray-200 px-6 py-3">
          <div className="flex justify-around">
            {bottomNavItems.map((item, index) => (
              <button
                key={index}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200 ${
                  item.active ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Phone Notch */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-7 w-40 bg-gray-800 rounded-b-3xl"></div>
      
      {/* Floating Notification Badge */}
      <div className="absolute top-8 right-8 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
    </div>
  )
}
