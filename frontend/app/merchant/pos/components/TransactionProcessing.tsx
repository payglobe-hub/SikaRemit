'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { CreditCard, Smartphone, Monitor, DollarSign, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api/axios'

interface TransactionProcessingProps {
  devices: any[];
  onTransactionComplete: (transaction: any) => void;
}

const TransactionProcessing = ({ devices, onTransactionComplete }: TransactionProcessingProps) => {
  const [selectedDevice, setSelectedDevice] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('GHS')
  const [cardData, setCardData] = useState({
    card_number: '',
    exp_month: '',
    exp_year: '',
    cvv: '',
    cardholder_name: ''
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [transactionResult, setTransactionResult] = useState<any>(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [receipt, setReceipt] = useState('')
  const [currencies, setCurrencies] = useState<{code: string, name: string, symbol: string, flag_emoji?: string}[]>([])

  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const response = await api.get('/api/v1/payments/currencies/')
        const currencyList = Array.isArray(response.data) ? response.data : (response.data.results || [])
        setCurrencies(currencyList.filter((c: any) => c.is_active))
      } catch (error) {
        
      }
    }
    fetchCurrencies()
  }, [])

  const activeDevices = devices.filter(device => device.status === 'active')

  const deviceTypeIcons = {
    virtual_terminal: Monitor,
    mobile_reader: Smartphone,
    countertop: Monitor
  }

  const handleProcessTransaction = async () => {
    if (!selectedDevice || !amount) {
      toast.error('Please select a device and enter an amount')
      return
    }

    const device = devices.find(d => d.id.toString() === selectedDevice)
    if (!device) {
      toast.error('Selected device not found')
      return
    }

    setIsProcessing(true)
    setTransactionResult(null)

    try {
      const transactionData: any = {
        device_id: device.device_id,
        device_type: device.device_type,
        amount: parseFloat(amount),
        currency,
        transaction_type: 'sale'
      }

      // Add card data for virtual terminal
      if (device.device_type === 'virtual_terminal') {
        if (!cardData.card_number || !cardData.exp_month || !cardData.exp_year || !cardData.cvv) {
          toast.error('Please enter complete card information')
          setIsProcessing(false)
          return
        }
        transactionData.card_data = cardData
      }

      const response = await api.post('/api/v1/payments/pos/process-transaction/', transactionData)

      setTransactionResult(response.data)
      toast.success('Transaction processed successfully')
      onTransactionComplete(response.data)
    } catch (error) {
      setTransactionResult({ success: false, error: 'Network error occurred' })
      toast.error('Network error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleGenerateReceipt = async () => {
    if (!transactionResult?.transaction_id) return

    try {
      const response = await api.post('/api/v1/payments/pos/generate-receipt/', {
        transaction_id: transactionResult.transaction_id,
        receipt_type: 'customer'
      })

      setReceipt(response.data.receipt_text)
      setShowReceipt(true)
    } catch (error) {
      toast.error('Failed to generate receipt')
    }
  }

  const resetForm = () => {
    setSelectedDevice('')
    setAmount('')
    setCurrency('GHS')
    setCardData({
      card_number: '',
      exp_month: '',
      exp_year: '',
      cvv: '',
      cardholder_name: ''
    })
    setTransactionResult(null)
    setShowReceipt(false)
    setReceipt('')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Process POS Transaction</CardTitle>
          <CardDescription>
            Process a payment using one of your registered POS devices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Device Selection */}
          <div>
            <Label htmlFor="device">Select POS Device</Label>
            <Select value={selectedDevice} onValueChange={setSelectedDevice}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a device" />
              </SelectTrigger>
              <SelectContent>
                {activeDevices.map((device) => {
                  const Icon = (deviceTypeIcons as any)[device.device_type] || Monitor
                  return (
                    <SelectItem key={device.id} value={device.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {device.device_name} ({device.device_type.replace('_', ' ')})
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            {activeDevices.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                No active devices available. Please register and activate a device first.
              </p>
            )}
          </div>

          {/* Amount and Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.length > 0 ? currencies.map((curr) => (
                    <SelectItem key={curr.code} value={curr.code}>
                      {curr.flag_emoji} {curr.code} ({curr.symbol})
                    </SelectItem>
                  )) : (
                    <SelectItem value="loading" disabled>Loading currencies...</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Card Data for Virtual Terminal */}
          {selectedDevice && devices.find(d => d.id.toString() === selectedDevice)?.device_type === 'virtual_terminal' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Card Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="card_number">Card Number</Label>
                  <Input
                    id="card_number"
                    value={cardData.card_number}
                    onChange={(e) => setCardData(prev => ({ ...prev, card_number: e.target.value }))}
                    placeholder="1234 5678 9012 3456"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="exp_month">Month</Label>
                    <Input
                      id="exp_month"
                      value={cardData.exp_month}
                      onChange={(e) => setCardData(prev => ({ ...prev, exp_month: e.target.value }))}
                      placeholder="MM"
                    />
                  </div>
                  <div>
                    <Label htmlFor="exp_year">Year</Label>
                    <Input
                      id="exp_year"
                      value={cardData.exp_year}
                      onChange={(e) => setCardData(prev => ({ ...prev, exp_year: e.target.value }))}
                      placeholder="YY"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      value={cardData.cvv}
                      onChange={(e) => setCardData(prev => ({ ...prev, cvv: e.target.value }))}
                      placeholder="123"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="cardholder_name">Cardholder Name</Label>
                  <Input
                    id="cardholder_name"
                    value={cardData.cardholder_name}
                    onChange={(e) => setCardData(prev => ({ ...prev, cardholder_name: e.target.value }))}
                    placeholder="John Doe"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Process Button */}
          <Button
            onClick={handleProcessTransaction}
            disabled={isProcessing || !selectedDevice || !amount}
            className="w-full"
          >
            {isProcessing ? 'Processing...' : 'Process Transaction'}
          </Button>

          {/* Transaction Result */}
          {transactionResult && (
            <Card className={transactionResult.success ? 'border-green-500' : 'border-red-500'}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {transactionResult.success ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Transaction Successful
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-500" />
                      Transaction Failed
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {transactionResult.success ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Transaction ID:</span>
                      <span className="font-mono">{transactionResult.transaction_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span>₵{transactionResult.amount} {transactionResult.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <Badge variant="default">{transactionResult.status}</Badge>
                    </div>
                    {transactionResult.card_last4 && (
                      <div className="flex justify-between">
                        <span>Card:</span>
                        <span>****{transactionResult.card_last4}</span>
                      </div>
                    )}
                    <div className="flex gap-2 mt-4">
                      <Button onClick={handleGenerateReceipt} variant="outline">
                        Generate Receipt
                      </Button>
                      <Button onClick={resetForm} variant="outline">
                        New Transaction
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-red-600">{transactionResult.error}</p>
                    <Button onClick={resetForm} variant="outline" className="mt-4">
                      Try Again
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transaction Receipt</DialogTitle>
          </DialogHeader>
          <div className="font-mono text-sm whitespace-pre-wrap bg-gray-50 p-4 rounded">
            {receipt}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowReceipt(false)} className="flex-1">
              Close
            </Button>
            <Button variant="outline" className="flex-1">
              Print Receipt
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TransactionProcessing
