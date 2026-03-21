'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Zap, Home, Car, CreditCard, Smartphone, Building2, Wallet, Phone } from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'

const billTypes = [
  { id: 'electricity', name: 'Electricity', icon: Zap, color: 'text-yellow-600' },
  { id: 'water', name: 'Water', icon: Home, color: 'text-blue-600' },
  { id: 'internet', name: 'Internet', icon: Smartphone, color: 'text-purple-600' },
  { id: 'cable_tv', name: 'Cable TV', icon: Building2, color: 'text-red-600' },
  { id: 'phone', name: 'Phone', icon: Phone, color: 'text-green-600' },
  { id: 'insurance', name: 'Insurance', icon: Wallet, color: 'text-indigo-600' },
  { id: 'rent', name: 'Rent', icon: Home, color: 'text-orange-600' },
  { id: 'loan', name: 'Loan Payment', icon: CreditCard, color: 'text-pink-600' }
]

interface BillTypeSelectorProps {
  selectedBillType: string
  onBillTypeChange: (value: string) => void
  billerName: string
  onBillerNameChange: (value: string) => void
  billReference: string
  onBillReferenceChange: (value: string) => void
  amount: string
  onAmountChange: (value: string) => void
}

export function BillTypeSelector({
  selectedBillType,
  onBillTypeChange,
  billerName,
  onBillerNameChange,
  billReference,
  onBillReferenceChange,
  amount,
  onAmountChange
}: BillTypeSelectorProps) {
  const selectedType = billTypes.find(type => type.id === selectedBillType)
  const Icon = selectedType?.icon || Zap
  const { currency } = useCurrency()
  const getCurrencySymbol = (currencyCode: string) => {
    const symbols: Record<string, string> = {
      'GHS': 'GH₵',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'CAD': 'C$',
      'AUD': 'A$'
    }
    return symbols[currencyCode] || currencyCode
  }
  const currencySymbol = getCurrencySymbol(currency)

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div>
          <Label htmlFor="billType">Bill Type</Label>
          <Select value={selectedBillType} onValueChange={onBillTypeChange}>
            <SelectTrigger id="billType">
              <SelectValue placeholder="Select bill type" />
            </SelectTrigger>
            <SelectContent>
              {billTypes.map((type) => {
                const TypeIcon = type.icon
                return (
                  <SelectItem key={type.id} value={type.id}>
                    <div className="flex items-center gap-2">
                      <TypeIcon className={`w-4 h-4 ${type.color}`} />
                      <span>{type.name}</span>
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        {selectedBillType && (
          <>
            <div>
              <Label htmlFor="billerName">Biller/Provider Name</Label>
              <Input
                id="billerName"
                value={billerName}
                onChange={(e) => onBillerNameChange(e.target.value)}
                placeholder="e.g., City Power Company"
              />
            </div>

            <div>
              <Label htmlFor="billReference">Account/Reference Number</Label>
              <Input
                id="billReference"
                value={billReference}
                onChange={(e) => onBillReferenceChange(e.target.value)}
                placeholder="Your account or reference number"
              />
            </div>

            <div>
              <Label htmlFor="amount">Amount ({currencySymbol})</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => onAmountChange(e.target.value)}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export { billTypes }
