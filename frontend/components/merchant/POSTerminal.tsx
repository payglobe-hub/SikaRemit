'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api/axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CreditCard,
  DollarSign,
  Check,
  X,
  Printer,
  RefreshCw,
  Terminal
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface POSTerminalProps {
  merchantId: number
  deviceType?: 'virtual_terminal' | 'mobile_reader' | 'countertop'
}

export function POSTerminal({ merchantId, deviceType = 'virtual_terminal' }: POSTerminalProps) {
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [cardNumber, setCardNumber] = useState('')
  const [expMonth, setExpMonth] = useState('')
  const [expYear, setExpYear] = useState('')
  const [cvv, setCvv] = useState('')
  const [cardholderName, setCardholderName] = useState('')
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [currencies, setCurrencies] = useState<{code: string, name: string, symbol: string, flag_emoji?: string}[]>([])

  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const response = await api.get('/api/v1/payments/currencies/')
        const data = response.data
        const currencyList = Array.isArray(data) ? data : (data.results || [])
        setCurrencies(currencyList.filter((c: any) => c.is_active))
      } catch (error) {
        
      }
    }
    fetchCurrencies()
  }, [])

  const [deviceId, setDeviceId] = useState<string | null>(null)

  const handleProcess = async () => {
    try {
      setProcessing(true)

      // First, get or create a virtual terminal device
      let currentDeviceId = deviceId
      
      if (!currentDeviceId) {
        const registerResponse = await api.post('/api/v1/payments/pos/register-device/', {
          device_type: deviceType,
          device_name: `Virtual Terminal ${Date.now()}`,
          device_info: { terminal_type: 'web_based' }
        })
        currentDeviceId = registerResponse.data.device_id
        setDeviceId(currentDeviceId)
      }

      const response = await api.post('/api/v1/payments/pos/process-transaction/', {
        device_id: currentDeviceId,
        device_type: deviceType,
        amount: parseFloat(amount),
        currency,
        card_data: {
          card_number: cardNumber.replace(/\s/g, ''),
          exp_month: expMonth,
          exp_year: expYear,
          cvv,
          cardholder_name: cardholderName
        }
      })

      const data = response.data
      setResult(data)

      if (data.success) {
        // Clear form on success
        setTimeout(() => {
          resetForm()
        }, 3000)
      }
    } catch (error) {
      
      setResult({ success: false, error: 'Transaction failed' })
    } finally {
      setProcessing(false)
    }
  }

  const resetForm = () => {
    setAmount('')
    setCardNumber('')
    setExpMonth('')
    setExpYear('')
    setCvv('')
    setCardholderName('')
    setResult(null)
  }

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '')
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned
    return formatted
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-sikaremit-primary" />
              Virtual POS Terminal
            </CardTitle>
            <CardDescription>
              Process card payments manually
            </CardDescription>
          </div>
          <Badge variant="outline">{deviceType.replace('_', ' ')}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Amount */}
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="pl-9 text-lg font-semibold"
              min="0"
              step="0.01"
            />
          </div>
        </div>

        {/* Currency */}
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger id="currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.length > 0 ? currencies.map((curr) => (
                <SelectItem key={curr.code} value={curr.code}>
                  {curr.flag_emoji} {curr.code} - {curr.name}
                </SelectItem>
              )) : (
                <SelectItem value="loading" disabled>Loading currencies...</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Card Details */}
        <div className="space-y-4 p-4 rounded-lg border-2 border-dashed">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CreditCard className="w-4 h-4" />
            Card Information
          </div>

          {/* Cardholder Name */}
          <div className="space-y-2">
            <Label htmlFor="cardholder">Cardholder Name</Label>
            <Input
              id="cardholder"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              placeholder="John Doe"
            />
          </div>

          {/* Card Number */}
          <div className="space-y-2">
            <Label htmlFor="card-number">Card Number</Label>
            <Input
              id="card-number"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value.replace(/\s/g, '').slice(0, 16))}
              placeholder="4242 4242 4242 4242"
              maxLength={19}
              className="font-mono"
            />
          </div>

          {/* Expiry and CVV */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="exp-month">Month</Label>
              <Input
                id="exp-month"
                value={expMonth}
                onChange={(e) => setExpMonth(e.target.value.slice(0, 2))}
                placeholder="MM"
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-year">Year</Label>
              <Input
                id="exp-year"
                value={expYear}
                onChange={(e) => setExpYear(e.target.value.slice(0, 4))}
                placeholder="YYYY"
                maxLength={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cvv">CVV</Label>
              <Input
                id="cvv"
                type="password"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.slice(0, 4))}
                placeholder="123"
                maxLength={4}
              />
            </div>
          </div>
        </div>

        {/* Result Display */}
        {result && (
          <div className={cn(
            "p-4 rounded-lg border-2",
            result.success 
              ? "bg-green-50 dark:bg-green-950/20 border-green-500" 
              : "bg-red-50 dark:bg-red-950/20 border-red-500"
          )}>
            <div className="flex items-center gap-2 mb-2">
              {result.success ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : (
                <X className="w-5 h-5 text-red-600" />
              )}
              <span className="font-semibold">
                {result.success ? 'Transaction Approved' : 'Transaction Declined'}
              </span>
            </div>
            {result.success && (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction ID:</span>
                  <span className="font-mono">{result.transaction_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-semibold">{currency} {amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Card:</span>
                  <span>****{result.card_last4}</span>
                </div>
              </div>
            )}
            {!result.success && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {result.error || 'Please check card details and try again'}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleProcess}
            disabled={processing || !amount || !cardNumber || !expMonth || !expYear || !cvv}
            className="flex-1"
          >
            {processing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Process Payment
              </>
            )}
          </Button>

          {result?.success && (
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" />
              Print Receipt
            </Button>
          )}

          <Button variant="outline" onClick={resetForm}>
            <X className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>

        {/* Security Notice */}
        <div className="text-xs text-muted-foreground text-center p-3 bg-muted rounded-lg">
          🔒 All card data is encrypted and processed securely. PCI DSS compliant.
        </div>
      </CardContent>
    </Card>
  )
}
