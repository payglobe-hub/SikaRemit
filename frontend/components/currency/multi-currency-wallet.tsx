'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  getWalletBalances,
  addFundsToWallet,
  transferWalletFunds,
  getTotalWalletBalance,
  getCurrencies,
  CurrencyWebSocketService
} from '@/lib/api/currency'
import { WalletBalance, Currency } from '@/lib/types/currency'
import { Wallet, Plus, ArrowRightLeft, DollarSign, TrendingUp } from 'lucide-react'

interface MultiCurrencyWalletProps {
  showTransfer?: boolean
  showAddFunds?: boolean
  compact?: boolean
}

export function MultiCurrencyWallet({
  showTransfer = true,
  showAddFunds = true,
  compact = false
}: MultiCurrencyWalletProps) {
  const [balances, setBalances] = useState<WalletBalance[]>([])
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [totalBalance, setTotalBalance] = useState<{ total_balance: number; currency: string; formatted: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [wsService, setWsService] = useState<CurrencyWebSocketService | null>(null)
  const { toast } = useToast()

  // Transfer dialog state
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [fromCurrency, setFromCurrency] = useState('')
  const [toCurrency, setToCurrency] = useState('')
  const [transferAmount, setTransferAmount] = useState('')

  // Add funds dialog state
  const [addFundsDialogOpen, setAddFundsDialogOpen] = useState(false)
  const [addCurrency, setAddCurrency] = useState('')
  const [addAmount, setAddAmount] = useState('')

  useEffect(() => {
    loadData()
    setupWebSocket()

    return () => {
      if (wsService) {
        wsService.disconnect()
      }
    }
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [balancesResponse, currenciesResponse, totalResponse] = await Promise.all([
        getWalletBalances(),
        getCurrencies(),
        getTotalWalletBalance()
      ])

      setBalances(balancesResponse.data)
      setCurrencies(currenciesResponse.data)
      setTotalBalance(totalResponse.data)
    } catch (error) {
      
      toast({
        title: 'Load Failed',
        description: 'Failed to load wallet balances.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const setupWebSocket = () => {
    const service = new CurrencyWebSocketService(
      undefined,
      (updatedBalances) => {
        setBalances(updatedBalances)
      },
      (error) => {
        toast({
          title: 'Connection Error',
          description: error,
          variant: 'destructive',
        })
      }
    )

    service.connect()
    setWsService(service)
  }

  const handleTransfer = async () => {
    if (!fromCurrency || !toCurrency || !transferAmount) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all transfer fields.',
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)
      await transferWalletFunds(fromCurrency, toCurrency, parseFloat(transferAmount))

      toast({
        title: 'Transfer Successful',
        description: `Transferred ${transferAmount} ${fromCurrency} to ${toCurrency}`,
      })

      // Reset form
      setTransferAmount('')
      setTransferDialogOpen(false)

      // Reload data
      await loadData()

    } catch (error: any) {
      toast({
        title: 'Transfer Failed',
        description: error.response?.data?.error || 'Transfer failed.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddFunds = async () => {
    if (!addCurrency || !addAmount) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields.',
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)
      await addFundsToWallet(addCurrency, parseFloat(addAmount))

      toast({
        title: 'Funds Added',
        description: `Added ${addAmount} ${addCurrency} to your wallet`,
      })

      // Reset form
      setAddAmount('')
      setAddFundsDialogOpen(false)

      // Reload data
      await loadData()

    } catch (error: any) {
      toast({
        title: 'Add Funds Failed',
        description: error.response?.data?.error || 'Failed to add funds.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (compact) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              <span className="font-semibold">Total Balance</span>
            </div>
            {totalBalance && (
              <div className="text-right">
                <div className="text-2xl font-bold">{totalBalance.formatted}</div>
                <div className="text-sm text-gray-600">{totalBalance.currency}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Total Balance */}
      {totalBalance && (
        <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Wallet className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-sm opacity-90">Total Balance</div>
                  <div className="text-2xl font-bold">{totalBalance.formatted}</div>
                </div>
              </div>
              <TrendingUp className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {showAddFunds && (
          <Dialog open={addFundsDialogOpen} onOpenChange={setAddFundsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Funds
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Funds to Wallet</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="add-currency">Currency</Label>
                  <Select value={addCurrency} onValueChange={setAddCurrency}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          <div className="flex items-center gap-2">
                            <span>{currency.flag_emoji}</span>
                            <span>{currency.code} - {currency.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="add-amount">Amount</Label>
                  <Input
                    id="add-amount"
                    type="number"
                    step="0.01"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <Button onClick={handleAddFunds} disabled={loading} className="w-full">
                  {loading ? 'Adding...' : 'Add Funds'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {showTransfer && balances.length > 1 && (
          <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                Transfer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Transfer Between Currencies</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>From Currency</Label>
                    <Select value={fromCurrency} onValueChange={setFromCurrency}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select from currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {balances.map((balance) => (
                          <SelectItem key={balance.currency.code} value={balance.currency.code}>
                            <div className="flex items-center gap-2">
                              <span>{balance.currency.flag_emoji}</span>
                              <span>{balance.currency.code}</span>
                              <span className="text-sm text-gray-500">
                                ({balance.formatted_available})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>To Currency</Label>
                    <Select value={toCurrency} onValueChange={setToCurrency}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select to currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            <div className="flex items-center gap-2">
                              <span>{currency.flag_emoji}</span>
                              <span>{currency.code} - {currency.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="transfer-amount">Amount</Label>
                  <Input
                    id="transfer-amount"
                    type="number"
                    step="0.01"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <Button onClick={handleTransfer} disabled={loading} className="w-full">
                  {loading ? 'Transferring...' : 'Transfer Funds'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Individual Currency Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {balances.map((balance) => (
          <Card key={balance.currency.code}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{balance.currency.flag_emoji}</span>
                  <span>{balance.currency.code}</span>
                </div>
                <Badge variant={balance.available_balance > 0 ? 'default' : 'secondary'}>
                  Active
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <div className="text-2xl font-bold">{balance.formatted_available}</div>
                  <div className="text-sm text-gray-600">Available</div>
                </div>

                {balance.pending_balance > 0 && (
                  <div>
                    <div className="text-lg text-orange-600">{balance.formatted_pending}</div>
                    <div className="text-sm text-gray-600">Pending</div>
                  </div>
                )}

                {balance.reserved_balance > 0 && (
                  <div>
                    <div className="text-lg text-blue-600">{balance.formatted_reserved}</div>
                    <div className="text-sm text-gray-600">Reserved</div>
                  </div>
                )}

                <div className="pt-2 border-t">
                  <div className="text-sm text-gray-600">Total: {balance.formatted_total}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {balances.length === 0 && !loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">
              <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <div className="text-lg font-semibold mb-2">No Wallet Balances</div>
              <div className="text-sm">Add funds to get started with multi-currency wallets.</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
