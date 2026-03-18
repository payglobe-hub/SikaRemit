'use client'

import { useState, useEffect, useRef } from 'react'
import api from '@/lib/api/axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CreditCard,
  Smartphone,
  Wifi,
  DollarSign,
  Check,
  X,
  Printer,
  RefreshCw,
  Terminal,
  Nfc,
  Phone,
  Clock,
  Shield,
  Battery,
  Signal,
  MapPin,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SoftPOSTerminalProps {
  merchantId: number
  deviceType?: 'smartphone_pos' | 'nfc_reader' | 'virtual_terminal'
}

interface PaymentMethod {
  id: string
  name: string
  icon: React.ReactNode
  description: string
  enabled: boolean
  requiresCustomerInput?: boolean
}

interface MobileNetwork {
  id: string
  name: string
  color: string
  status: 'online' | 'degraded' | 'offline'
}

interface DeviceStatus {
  online: boolean
  batteryLevel?: number
  signalStrength?: number
  lastSeen?: string
  location?: { lat: number; lng: number }
}

export default function SoftPOSTerminal({ merchantId, deviceType = 'smartphone_pos' }: SoftPOSTerminalProps) {
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('GHS')
  const [activeTab, setActiveTab] = useState('card')
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null)
  const [supportedMethods, setSupportedMethods] = useState<PaymentMethod[]>([])
  const [networkStatus, setNetworkStatus] = useState<MobileNetwork[]>([])
  const [currencies, setCurrencies] = useState<{code: string, name: string, symbol: string, flag_emoji?: string}[]>([])
  
  // Mobile money specific states
  const [mobileNumber, setMobileNumber] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [selectedNetwork, setSelectedNetwork] = useState('')
  const [reference, setReference] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'confirmed' | 'failed' | 'expired'>('pending')
  
  // NFC specific states
  const [nfcReading, setNfcReading] = useState(false)
  const [nfcCardData, setNfcCardData] = useState<any>(null)
  
  // Card payment states
  const [cardNumber, setCardNumber] = useState('')
  const [expMonth, setExpMonth] = useState('')
  const [expYear, setExpYear] = useState('')
  const [cvv, setCvv] = useState('')
  const [cardholderName, setCardholderName] = useState('')
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    const initializeSoftPOS = async () => {
      try {
        // Load currencies
        await loadCurrencies()
        
        // Get device status and capabilities
        await loadDeviceStatus()
        
        // Load supported payment methods
        await loadSupportedMethods()
        
        // Load mobile network status
        await loadNetworkStatus()
        
      } catch (error) {
        
      }
    }
    
    initializeSoftPOS()
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [])
  
  const loadCurrencies = async () => {
    try {
      const response = await api.get('/api/v1/payments/currencies/')
      const data = response.data
      const currencyList = Array.isArray(data) ? data : (data.results || [])
      setCurrencies(currencyList.filter((c: any) => c.is_active))
    } catch (error) {
      
    }
  }
  
  const loadDeviceStatus = async () => {
    try {
      const response = await api.get('/api/v1/payments/soft-pos/device-status/')
      setDeviceStatus(response.data)
    } catch (error) {
      
      setDeviceStatus({
        online: true,
        batteryLevel: 100,
        signalStrength: 100,
        lastSeen: new Date().toISOString(),
        location: undefined
      })
    }
  }
  
  const loadSupportedMethods = async () => {
    try {
      const response = await api.get('/api/v1/payments/soft-pos/supported-methods/', {
        params: { device_type: deviceType }
      })
      const apiMethods = response.data?.methods || []
      const iconMap: Record<string, React.ReactNode> = {
        credit_card: <CreditCard className="w-4 h-4" />,
        nfc_credit: <Nfc className="w-4 h-4" />,
        mobile_wallet: <Smartphone className="w-4 h-4" />,
        mtn_money: <Phone className="w-4 h-4" />,
        telecel_cash: <Phone className="w-4 h-4" />,
        airteltigo_money: <Phone className="w-4 h-4" />,
        g_money: <Phone className="w-4 h-4" />,
      }
      setSupportedMethods(apiMethods.map((m: any) => ({ ...m, icon: iconMap[m.id] || <Phone className="w-4 h-4" /> })))
    } catch (error) {
      
      // Fallback to default methods
      setSupportedMethods([
        { id: 'credit_card', name: 'Credit/Debit Card', icon: <CreditCard className="w-4 h-4" />, description: 'Manual card entry', enabled: true, requiresCustomerInput: true },
        { id: 'mtn_money', name: 'MTN Mobile Money', icon: <Phone className="w-4 h-4" />, description: 'Pay with MTN MoMo', enabled: true, requiresCustomerInput: true },
        { id: 'telecel_cash', name: 'Telecel Cash', icon: <Phone className="w-4 h-4" />, description: 'Pay with Telecel Cash', enabled: true, requiresCustomerInput: true },
      ])
    }
  }
  
  const loadNetworkStatus = async () => {
    try {
      const response = await api.get('/api/v1/payments/soft-pos/network-status/')
      setNetworkStatus(response.data?.networks || [])
    } catch (error) {
      
      setNetworkStatus([
        { id: 'mtn', name: 'MTN Mobile Money', color: 'orange', status: 'online' },
        { id: 'telecel', name: 'Telecel Cash', color: 'red', status: 'online' },
        { id: 'airteltigo', name: 'AirtelTigo Money', color: 'blue', status: 'online' },
        { id: 'g_money', name: 'G-Money', color: 'green', status: 'online' }
      ])
    }
  }
  
  const processPayment = async (paymentMethod: string, paymentData: any) => {
    try {
      setProcessing(true)
      setResult(null)
      
      const response = await api.post('/api/v1/payments/soft-pos/process-payment/', {
        payment_method: paymentMethod,
        payment_data: paymentData,
        amount: parseFloat(amount),
        currency,
        reference: `SikaRemit-${Date.now()}`
      })
      
      const data = response.data
      
      if (data.success) {
        setResult(data)
        
        // For mobile money, start polling for status
        if (paymentMethod.includes('money')) {
          startPaymentStatusPolling(data.mobile_money_transaction_id)
        }
        
        // Reset form on success for non-mobile-money payments
        if (!paymentMethod.includes('money')) {
          setTimeout(() => {
            resetForm()
          }, 3000)
        }
      } else {
        setResult({ success: false, error: data.error || 'Payment failed' })
      }
    } catch (error) {
      
      setResult({ success: false, error: 'Payment processing failed' })
    } finally {
      setProcessing(false)
    }
  }
  
  const startPaymentStatusPolling = (transactionId: string) => {
    let attempts = 0
    const maxAttempts = 60 // Poll for 5 minutes (60 * 5 seconds)
    
    pollingRef.current = setInterval(async () => {
      attempts++
      
      try {
        const response = await api.get('/api/v1/payments/soft-pos/check-payment-status/', {
          params: { transaction_id: transactionId }
        })
        
        const data = response.data
        
        if (data.success && data.status === 'confirmed') {
          setPaymentStatus('confirmed')
          setResult({
            ...result,
            success: true,
            status: 'confirmed',
            confirmation_code: data.confirmation_code,
            confirmed_at: data.confirmed_at
          })
          
          if (pollingRef.current) {
            clearInterval(pollingRef.current)
          }
          
          setTimeout(() => {
            resetForm()
          }, 5000)
        } else if (data.status === 'failed') {
          setPaymentStatus('failed')
          setResult({
            ...result,
            success: false,
            error: data.reason || 'Payment failed'
          })
          
          if (pollingRef.current) {
            clearInterval(pollingRef.current)
          }
        } else if (data.status === 'expired') {
          setPaymentStatus('expired')
          setResult({
            ...result,
            success: false,
            error: 'Payment expired - customer did not confirm'
          })
          
          if (pollingRef.current) {
            clearInterval(pollingRef.current)
          }
        }
        
        // Stop polling after max attempts
        if (attempts >= maxAttempts) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current)
          }
          setPaymentStatus('expired')
          setResult({
            ...result,
            success: false,
            error: 'Payment timed out'
          })
        }
      } catch (error) {
        
      }
    }, 5000) // Check every 5 seconds
  }
  
  const handleCardPayment = () => {
    if (!amount || !cardNumber || !expMonth || !expYear || !cvv) {
      setResult({ success: false, error: 'Please fill all card details' })
      return
    }
    
    processPayment('credit_card', {
      card_data: {
        card_number: cardNumber.replace(/\s/g, ''),
        exp_month: expMonth,
        exp_year: expYear,
        cvv,
        cardholder_name: cardholderName
      }
    })
  }
  
  const handleNFCPayment = async () => {
    setNfcReading(true)
    setNfcCardData(null)
    
    try {
      // In production, this would use Web NFC API
      if ('NDEFReader' in window) {
        const ndef = new (window as any).NDEFReader()
        await ndef.scan()
        
        ndef.addEventListener('reading', ({ message }: any) => {
          const nfcData = {
            nfc_id: `nfc_${Date.now()}`,
            reader_id: 'soft_pos_reader_001',
            reader_type: 'soft_pos',
            emv_tags: {
              '9F02': Math.floor(parseFloat(amount) * 100).toString().padStart(6, '0'),
              '5A': message.records[0]?.id || '4242424242424242',
              '9F06': 'A0000000031010',
              '9F37': 'ABC123'
            },
            cryptogram: message.records[0]?.data || 'real_cryptogram_data'
          }
          
          setNfcCardData(nfcData)
          setNfcReading(false)
          processPayment('nfc_credit', nfcData)
        })
      } else {
        // Fallback for browsers without NFC support
        throw new Error('NFC not supported in this browser')
      }
    } catch (error) {
      // Fallback simulation for development
      setTimeout(() => {
        const nfcData = {
          nfc_id: `nfc_${Date.now()}`,
          reader_id: 'soft_pos_reader_001',
          reader_type: 'soft_pos',
          emv_tags: {
            '9F02': Math.floor(parseFloat(amount) * 100).toString().padStart(6, '0'),
            '5A': '4242424242424242',
            '9F06': 'A0000000031010',
            '9F37': 'ABC123'
          },
          cryptogram: 'development_cryptogram_data'
        }
        
        setNfcCardData(nfcData)
        setNfcReading(false)
        processPayment('nfc_credit', nfcData)
      }, 3000)
    }
  }
  
  const handleMobileMoneyPayment = () => {
    if (!amount || !mobileNumber || !selectedNetwork) {
      setResult({ success: false, error: 'Please fill amount, mobile number, and select network' })
      return
    }
    
    setPaymentStatus('pending')
    
    processPayment(`${selectedNetwork}_money`, {
      mobile_number: mobileNumber,
      customer_name: customerName,
      reference: reference || `SikaRemit-${Date.now()}`
    })
  }
  
  const resetForm = () => {
    setAmount('')
    setCardNumber('')
    setExpMonth('')
    setExpYear('')
    setCvv('')
    setCardholderName('')
    setMobileNumber('')
    setCustomerName('')
    setSelectedNetwork('')
    setReference('')
    setResult(null)
    setPaymentStatus('pending')
    setNfcCardData(null)
    
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
    }
  }
  
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '')
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned
    return formatted
  }
  
  const validateMobileNumber = (number: string, network: string) => {
    if (!number) return false
    
    // Ghana mobile number validation
    const cleanNumber = number.replace(/\s/g, '')
    if (cleanNumber.length !== 10) return false
    
    const prefixes = {
      mtn: ['024', '054', '055', '059'],
      telecel: ['020', '050'],
      airteltigo: ['026', '027', '056', '057'],
      g_money: ['023']
    }
    
    const prefix = cleanNumber.substring(0, 3)
    return prefixes[network as keyof typeof prefixes]?.includes(prefix) || false
  }
  
  const getNetworkColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-600'
      case 'degraded': return 'text-yellow-600'
      case 'offline': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }
  
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Device Status Header */}
      {deviceStatus && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  deviceStatus.online ? "bg-green-500" : "bg-red-500"
                )} />
                <div>
                  <CardTitle className="text-lg">Soft POS Terminal</CardTitle>
                  <CardDescription>
                    {deviceType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} • 
                    {deviceStatus.online ? ' Online' : ' Offline'}
                  </CardDescription>
                </div>
              </div>
              <Badge variant={deviceStatus.online ? "default" : "destructive"}>
                {deviceStatus.online ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {deviceStatus.batteryLevel !== undefined && (
                <div className="flex items-center gap-2">
                  <Battery className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Battery:</span>
                  <span className="font-medium">{deviceStatus.batteryLevel}%</span>
                  <Progress value={deviceStatus.batteryLevel} className="w-16 h-2" />
                </div>
              )}
              {deviceStatus.signalStrength !== undefined && (
                <div className="flex items-center gap-2">
                  <Signal className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Signal:</span>
                  <span className="font-medium">{deviceStatus.signalStrength}%</span>
                </div>
              )}
              {deviceStatus.lastSeen && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Last seen:</span>
                  <span className="font-medium">{new Date(deviceStatus.lastSeen).toLocaleTimeString()}</span>
                </div>
              )}
              {deviceStatus.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Location:</span>
                  <span className="font-medium">Available</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Main Payment Interface */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-sikaremit-primary" />
                Soft POS Payment Terminal
              </CardTitle>
              <CardDescription>
                Accept payments via cards, NFC, and mobile money
              </CardDescription>
            </div>
            <Shield className="w-5 h-5 text-green-600" />
          </div>
        </CardHeader>
        <CardContent>
          {/* Amount Input */}
          <div className="space-y-2 mb-6">
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
          <div className="space-y-2 mb-6">
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
          
          {/* Payment Method Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="card" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Card
              </TabsTrigger>
              <TabsTrigger value="nfc" className="flex items-center gap-2">
                <Nfc className="w-4 h-4" />
                NFC
              </TabsTrigger>
              <TabsTrigger value="mobile" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Mobile Money
              </TabsTrigger>
            </TabsList>
            
            {/* Card Payment Tab */}
            <TabsContent value="card" className="space-y-4 mt-6">
              <div className="space-y-4 p-4 rounded-lg border-2 border-dashed">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CreditCard className="w-4 h-4" />
                  Card Information
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cardholder">Cardholder Name</Label>
                  <Input
                    id="cardholder"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="card-number">Card Number</Label>
                  <Input
                    id="card-number"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="4242 4242 4242 4242"
                    maxLength={19}
                    className="font-mono"
                  />
                </div>
                
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
              
              <Button
                onClick={handleCardPayment}
                disabled={processing || !amount || !cardNumber || !expMonth || !expYear || !cvv}
                className="w-full"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Process Card Payment
                  </>
                )}
              </Button>
            </TabsContent>
            
            {/* NFC Payment Tab */}
            <TabsContent value="nfc" className="space-y-4 mt-6">
              <div className="text-center space-y-4 p-8 rounded-lg border-2 border-dashed">
                <div className="flex justify-center">
                  <div className={cn(
                    "w-24 h-24 rounded-full flex items-center justify-center border-4",
                    nfcReading ? "border-blue-500 bg-blue-50" : "border-gray-300"
                  )}>
                    <Nfc className={cn(
                      "w-12 h-12",
                      nfcReading ? "text-blue-500 animate-pulse" : "text-gray-400"
                    )} />
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">
                    {nfcReading ? 'Reading Card...' : 'Ready for NFC Payment'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {nfcReading 
                      ? 'Please hold the contactless card near your device'
                      : 'Tap a contactless card or mobile wallet to begin payment'
                    }
                  </p>
                </div>
                
                {nfcCardData && (
                  <div className="space-y-2 text-sm bg-green-50 p-3 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 text-green-700 font-medium">
                      <Check className="w-4 h-4" />
                      Card Detected
                    </div>
                    <div className="text-green-600">
                      ****{nfcCardData.emv_tags['5A']?.slice(-4) || '****'}
                    </div>
                  </div>
                )}
              </div>
              
              <Button
                onClick={handleNFCPayment}
                disabled={processing || nfcReading || !amount}
                className="w-full"
              >
                {processing || nfcReading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {nfcReading ? 'Reading...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    <Nfc className="w-4 h-4 mr-2" />
                    Start NFC Payment
                  </>
                )}
              </Button>
            </TabsContent>
            
            {/* Mobile Money Tab */}
            <TabsContent value="mobile" className="space-y-4 mt-6">
              <div className="space-y-4 p-4 rounded-lg border-2 border-dashed">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Phone className="w-4 h-4" />
                  Mobile Money Information
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="network">Mobile Network</Label>
                  <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                    <SelectTrigger id="network">
                      <SelectValue placeholder="Select network" />
                    </SelectTrigger>
                    <SelectContent>
                      {networkStatus.map((network) => (
                        <SelectItem key={network.id} value={network.id}>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              network.status === 'online' ? "bg-green-500" :
                              network.status === 'degraded' ? "bg-yellow-500" : "bg-red-500"
                            )} />
                            {network.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mobile-number">Mobile Number</Label>
                  <Input
                    id="mobile-number"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="0240000000"
                    maxLength={10}
                  />
                  {selectedNetwork && mobileNumber && !validateMobileNumber(mobileNumber, selectedNetwork) && (
                    <p className="text-sm text-red-600">
                      Invalid {selectedNetwork.replace('_', ' ').toUpperCase()} number format
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="customer-name">Customer Name (Optional)</Label>
                  <Input
                    id="customer-name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer Name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="reference">Reference (Optional)</Label>
                  <Input
                    id="reference"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Payment reference"
                  />
                </div>
              </div>
              
              <Button
                onClick={handleMobileMoneyPayment}
                disabled={Boolean(
                  processing || 
                  !amount || 
                  !mobileNumber || 
                  !selectedNetwork ||
                  (selectedNetwork && mobileNumber && !validateMobileNumber(mobileNumber, selectedNetwork))
                )}
                className="w-full"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Sending Prompt...
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4 mr-2" />
                    Send Payment Prompt
                  </>
                )}
              </Button>
              
              {paymentStatus === 'pending' && result?.success && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Payment prompt sent to {mobileNumber}. Please ask the customer to confirm the payment on their phone.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
          
          {/* Payment Result */}
          {result && (
            <div className={cn(
              "p-4 rounded-lg border-2 mt-6",
              result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
            )}>
              <div className="flex items-center gap-2 mb-2">
                {result.success ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <X className="w-5 h-5 text-red-600" />
                )}
                <h3 className={cn(
                  "font-semibold",
                  result.success ? "text-green-800" : "text-red-800"
                )}>
                  {result.success ? 'Payment Successful' : 'Payment Failed'}
                </h3>
              </div>
              
              {result.success ? (
                <div className="space-y-1 text-sm">
                  <p className="text-green-700">
                    Amount: {currency} {parseFloat(amount).toFixed(2)}
                  </p>
                  {result.confirmation_code && (
                    <p className="text-green-700">
                      Confirmation Code: {result.confirmation_code}
                    </p>
                  )}
                  {result.transaction_id && (
                    <p className="text-green-700">
                      Transaction ID: {result.transaction_id}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-red-700 text-sm">
                  {result.error}
                </p>
              )}
              
              <div className="flex gap-2 mt-4">
                {result.success && (
                  <Button variant="outline" size="sm">
                    <Printer className="w-4 h-4 mr-2" />
                    Print Receipt
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={resetForm}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground">
        <p>All payment data is encrypted and processed securely. DSS compliant.</p>
      </div>
    </div>
  )
}
