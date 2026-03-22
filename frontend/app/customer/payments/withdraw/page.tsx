'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Smartphone, Building2, ArrowLeft, Loader2, CheckCircle, AlertCircle, Info, Wallet } from 'lucide-react'
import Link from 'next/link'
import { useQuery, useMutation } from '@tanstack/react-query'

// Force dynamic rendering to prevent SSR issues with auth
export const dynamic = 'force-dynamic'
export const runtime = 'edge'
import { 
  withdrawMobileMoney, 
  withdrawBankTransfer, 
  getWithdrawalLimits, 
  WithdrawMobileMoneyRequest,
  WithdrawBankTransferRequest
} from '@/lib/api/payments'

const MOBILE_MONEY_PROVIDERS = [
  { id: 'MTN', name: 'MTN Mobile Money', color: 'bg-yellow-500', prefixes: ['024', '054', '055', '059'], logo: '/logos/mtn-momo.png' },
  { id: 'Telecel', name: 'Telecel Cash', color: 'bg-red-500', prefixes: ['020', '050'], logo: '/logos/telecel-cash.jpg' },
  { id: 'AirtelTigo', name: 'AirtelTigo Money', color: 'bg-blue-500', prefixes: ['026', '056', '027', '057'], logo: '/logos/airteltigo-money.jpg' },
  { id: 'G-Money', name: 'G-Money', color: 'bg-green-500', prefixes: ['023', '025'], logo: '/logos/g-money.svg' },
]

export default function WithdrawPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('mobile-money')
  const [success, setSuccess] = useState<{ message: string; transactionId: string } | null>(null)
  
  // Mobile Money form state
  const [momoAmount, setMomoAmount] = useState('')
  const [momoProvider, setMomoProvider] = useState<'MTN' | 'Telecel' | 'AirtelTigo' | 'G-Money'>('MTN')
  const [momoPhone, setMomoPhone] = useState('')
  
  // Bank Transfer form state
  const [bankAmount, setBankAmount] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')

  // Fetch withdrawal limits
  const { data: limitsResponse, isLoading: limitsLoading } = useQuery({
    queryKey: ['withdrawal-limits'],
    queryFn: () => getWithdrawalLimits('GHS'),
  })

  const limits = limitsResponse?.data

  // Mobile Money withdrawal mutation
  const momoMutation = useMutation({
    mutationFn: (data: WithdrawMobileMoneyRequest) => withdrawMobileMoney(data),
    onSuccess: (response) => {
      if (response.success && response.data) {
        setSuccess({
          message: response.data.message,
          transactionId: response.data.transaction_id
        })
        // Reset form
        setMomoAmount('')
        setMomoPhone('')
      }
    }
  })

  // Bank Transfer withdrawal mutation
  const bankMutation = useMutation({
    mutationFn: (data: WithdrawBankTransferRequest) => withdrawBankTransfer(data),
    onSuccess: (response) => {
      if (response.success && response.data) {
        setSuccess({
          message: response.data.message,
          transactionId: response.data.transaction_id
        })
        // Reset form
        setBankAmount('')
        setAccountNumber('')
        setAccountName('')
      }
    }
  })

  // Auto-detect provider from phone number
  useEffect(() => {
    if (momoPhone.length >= 3) {
      const prefix = momoPhone.startsWith('0') ? momoPhone.substring(0, 3) : '0' + momoPhone.substring(0, 2)
      const provider = MOBILE_MONEY_PROVIDERS.find(p => p.prefixes.includes(prefix))
      if (provider) {
        setMomoProvider(provider.id as 'MTN' | 'Telecel' | 'AirtelTigo' | 'G-Money')
      }
    }
  }, [momoPhone])

  // Calculate fees
  const calculateMomoFee = (amount: number) => {
    if (!limits) return 0
    return Math.max(amount * (limits.mobile_money.fee_percentage / 100), limits.mobile_money.min_fee)
  }

  const calculateBankFee = (amount: number) => {
    if (!limits) return 0
    return Math.max(amount * (limits.bank_transfer.fee_percentage / 100), limits.bank_transfer.min_fee)
  }

  const handleMomoSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    momoMutation.mutate({
      amount: parseFloat(momoAmount),
      provider: momoProvider,
      phone_number: momoPhone,
      currency: 'GHS'
    })
  }

  const handleBankSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    bankMutation.mutate({
      amount: parseFloat(bankAmount),
      currency: 'GHS',
      account_number: accountNumber,
      account_name: accountName
    })
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
              <h2 className="text-2xl font-bold text-green-800 dark:text-green-200">Withdrawal Initiated!</h2>
              <p className="text-green-700 dark:text-green-300">{success.message}</p>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mt-4">
                <p className="text-sm text-muted-foreground">Transaction Reference</p>
                <p className="font-mono font-bold text-lg">{success.transactionId}</p>
              </div>
              <div className="flex gap-3 justify-center mt-6">
                <Button variant="outline" onClick={() => setSuccess(null)}>
                  Make Another Withdrawal
                </Button>
                <Button asChild>
                  <Link href="/customer/transactions">View Transactions</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/customer/dashboard" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Withdraw Funds
          </CardTitle>
          <CardDescription>
            Withdraw money from your SikaRemit wallet to Mobile Money or Bank Account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Balance Display */}
          {limits && (
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Available Balance</p>
                  <p className="text-xl font-bold">GHS {limits.available_balance.toFixed(2)}</p>
                </div>
                <Wallet className="h-8 w-8 text-primary/50" />
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Withdraw Funds
              </CardTitle>
              <CardDescription>
                Withdraw money from your SikaRemit wallet to Mobile Money or Bank Account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="mobile-money" className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Mobile Money
                  </TabsTrigger>
                  <TabsTrigger value="bank-transfer" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Bank Transfer
                  </TabsTrigger>
                </TabsList>

                {/* Mobile Money Tab */}
                <TabsContent value="mobile-money" className="space-y-3 mt-3">
                  <form onSubmit={handleMomoSubmit} className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="momo-amount">Amount (GHS)</Label>
                      <Input
                        id="momo-amount"
                        type="number"
                        placeholder="Enter amount"
                        value={momoAmount}
                        onChange={(e) => setMomoAmount(e.target.value)}
                        min={limits?.mobile_money.min_amount}
                        max={limits && limits.available_balance > 0 ? Math.min(limits.mobile_money.max_amount, limits.available_balance) : limits?.mobile_money.max_amount}
                        step="0.01"
                        required
                      />
                      {momoAmount && parseFloat(momoAmount) > 0 && (
                        <p className="text-sm text-muted-foreground">
                          Fee: GHS {calculateMomoFee(parseFloat(momoAmount)).toFixed(2)} | 
                          Total Deduction: GHS {(parseFloat(momoAmount) + calculateMomoFee(parseFloat(momoAmount))).toFixed(2)}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="momo-phone">Phone Number</Label>
                      <Input
                        id="momo-phone"
                        type="tel"
                        placeholder="0241234567"
                        value={momoPhone}
                        onChange={(e) => setMomoPhone(e.target.value.replace(/\D/g, ''))}
                        maxLength={10}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="momo-provider">Provider</Label>
                      <Select value={momoProvider} onValueChange={(value: 'MTN' | 'Telecel' | 'AirtelTigo' | 'G-Money') => setMomoProvider(value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          {MOBILE_MONEY_PROVIDERS.map((provider) => (
                            <SelectItem key={provider.id} value={provider.id}>
                              <div className="flex items-center gap-2">
                                <img 
                                  src={provider.logo} 
                                  alt={provider.name} 
                                  className="w-6 h-6 rounded object-contain"
                                />
                                {provider.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Selected Provider Display */}
                    {momoProvider && (
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <img 
                          src={MOBILE_MONEY_PROVIDERS.find(p => p.id === momoProvider)?.logo} 
                          alt={momoProvider} 
                          className="w-10 h-10 rounded-lg object-contain"
                        />
                        <div>
                          <p className="font-medium text-sm">{MOBILE_MONEY_PROVIDERS.find(p => p.id === momoProvider)?.name}</p>
                          <p className="text-xs text-muted-foreground">Selected provider</p>
                        </div>
                      </div>
                    )}

                    {momoMutation.data && !momoMutation.data.success && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{momoMutation.data.error}</AlertDescription>
                      </Alert>
                    )}

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={momoMutation.isPending || !momoAmount || !momoPhone || momoPhone.length < 10}
                    >
                      {momoMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Smartphone className="mr-2 h-4 w-4" />
                          Withdraw to Mobile Money
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>

                {/* Bank Transfer Tab */}
                <TabsContent value="bank-transfer" className="space-y-4 mt-4">
                  <form onSubmit={handleBankSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <Label htmlFor="bank-amount">Amount (GHS)</Label>
                      <Input
                        id="bank-amount"
                        type="number"
                        placeholder="Enter amount"
                        value={bankAmount}
                        onChange={(e) => setBankAmount(e.target.value)}
                        min={limits?.bank_transfer.min_amount}
                        max={limits && limits.available_balance > 0 ? Math.min(limits.bank_transfer.max_amount, limits.available_balance) : limits?.bank_transfer.max_amount}
                        step="0.01"
                        required
                      />
                      {bankAmount && parseFloat(bankAmount) > 0 && (
                        <p className="text-sm text-muted-foreground">
                          Fee: GHS {calculateBankFee(parseFloat(bankAmount)).toFixed(2)} | 
                          Total Deduction: GHS {(parseFloat(bankAmount) + calculateBankFee(parseFloat(bankAmount))).toFixed(2)}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="account-number">Account Number</Label>
                      <Input
                        id="account-number"
                        type="text"
                        placeholder="Enter account number"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                        maxLength={20}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="account-name">Account Name</Label>
                      <Input
                        id="account-name"
                        type="text"
                        placeholder="Enter account holder name"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        required
                      />
                    </div>

                    {bankMutation.data && !bankMutation.data.success && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{bankMutation.data.error}</AlertDescription>
                      </Alert>
                    )}

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={bankMutation.isPending || !bankAmount || !accountNumber || !accountName}
                    >
                      {bankMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Building2 className="mr-2 h-4 w-4" />
                          Withdraw to Bank Account
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

    </div>
  )
}
