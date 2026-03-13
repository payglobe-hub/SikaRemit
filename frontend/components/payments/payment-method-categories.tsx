'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  CreditCard,
  Building2,
  Smartphone,
  Wallet,
  Plus,
  Edit,
  Trash2,
  Shield,
  CheckCircle,
  QrCode
} from 'lucide-react'
import Image from 'next/image'
import { useToast } from '@/hooks/use-toast'
import { createPaymentMethod, getPaymentMethods, getCardType, deletePaymentMethod } from '@/lib/api/payments'
import { PaymentMethod } from '@/lib/types/payments'
import { getMobileProvider } from '@/lib/utils/payment-methods'

interface PaymentMethodCategoriesProps {
  mode: 'unified' | 'management'
  selectedCategory?: string
  selectedMethod?: string
  onCategorySelect?: (category: string) => void
  onMethodSelect?: (methodId: string) => void
  onPaymentTrigger?: () => void
  amount?: number
  currency?: string
  showManagement?: boolean
  transactionType?: string
}

const PaymentMethodCategories: React.FC<PaymentMethodCategoriesProps> = ({
  mode,
  selectedCategory = '',
  selectedMethod = '',
  onCategorySelect,
  onMethodSelect,
  amount,
  currency,
  showManagement = false,
  transactionType,
  onPaymentTrigger
}) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedFormCategory, setSelectedFormCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Form states for adding new payment methods
  const [cardForm, setCardForm] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: ''
  })

  const [bankForm, setBankForm] = useState({
    accountNumber: '',
    accountName: '',
    bankName: '',
    bankCode: ''
  })

  const [mobileForm, setMobileForm] = useState({
    provider: '',
    phoneNumber: ''
  })

  const [detectedCardType, setDetectedCardType] = useState<string | null>(null)
  const [detectedMobileProvider, setDetectedMobileProvider] = useState<string | null>(null)

  useEffect(() => {
    loadPaymentMethods()
  }, [])

  useEffect(() => {
    const detectCardType = async () => {
      if (cardForm.cardNumber) {
        const cardType = await getCardType(cardForm.cardNumber)
        setDetectedCardType(cardType)
      } else {
        setDetectedCardType(null)
      }
    }
    detectCardType()
  }, [cardForm.cardNumber])

  useEffect(() => {
    const detectMobileProvider = () => {
      if (mobileForm.phoneNumber) {
        const provider = getMobileProvider(mobileForm.phoneNumber)
        setDetectedMobileProvider(provider)
        // Auto-populate the provider field if detected and not manually selected
        if (provider && !mobileForm.provider) {
          setMobileForm(prev => ({ ...prev, provider }))
        }
      } else {
        setDetectedMobileProvider(null)
      }
    }
    detectMobileProvider()
  }, [mobileForm.phoneNumber])

  const loadPaymentMethods = async () => {
    try {
      const methods = await getPaymentMethods()
      setPaymentMethods(methods)
    } catch (error) {
      console.error('Failed to load payment methods:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCategorySelect = (category: string) => {
    if (onCategorySelect) {
      onCategorySelect(category)
    }
    setSelectedFormCategory(category)
  }

  const handleMethodSelect = (methodId: string) => {
    if (onMethodSelect) {
      onMethodSelect(methodId)
    }
  }

  const handleAddPaymentMethod = async () => {
    try {
      let details: any = {}
      let methodType: 'card' | 'bank' | 'mtn_momo' | 'telecel' | 'airtel_tigo' | 'g_money' = 'card'

      switch (selectedFormCategory) {
        case 'card':
          // Card payments now handled by StripeCardForm component
          // This should not be reached - use StripeCardForm instead
          throw new Error('Please use Stripe card form for secure card payments')
          break

        case 'bank':
          methodType = 'bank'
          if (!bankForm.accountNumber || !bankForm.accountName || !bankForm.bankName) {
            throw new Error('Please fill all bank details')
          }
          details = {
            account_number: bankForm.accountNumber,
            account_name: bankForm.accountName,
            bank_name: bankForm.bankName,
            bank_code: bankForm.bankCode
          }
          break

        case 'mobile':
          const provider = mobileForm.provider || detectedMobileProvider
          if (!provider || !mobileForm.phoneNumber) {
            throw new Error('Please select provider and enter phone number')
          }
          methodType = provider as 'mtn_momo' | 'telecel' | 'airtel_tigo' | 'g_money'
          const backendProvider = provider === 'mtn_momo' ? 'mtn' : 
                                 provider === 'telecel' ? 'telecel' : 
                                 provider === 'airtel_tigo' ? 'airtel_tigo' : 
                                 provider === 'g_money' ? 'g_money' : provider
          details = {
            provider: backendProvider,
            phone_number: mobileForm.phoneNumber
          }
          break
      }

      // Calculate backend provider for mobile money
      const backendProvider = methodType === 'mtn_momo' ? 'mtn' : 
                             methodType === 'telecel' ? 'telecel' : 
                             methodType === 'airtel_tigo' ? 'airtel_tigo' : 
                             methodType === 'g_money' ? 'g_money' : null
      const newMethod = await createPaymentMethod({
        method_type: methodType,
        ...(backendProvider && { provider: backendProvider }),  // Only add provider for mobile money
        details
      })

      setPaymentMethods([...paymentMethods, newMethod])
      setShowAddForm(false)
      resetForms()

      // Auto-select the newly added payment method
      if (onMethodSelect) {
        onMethodSelect(newMethod.id)
      }

      toast({
        title: 'Success',
        description: 'Payment method added successfully'
      })
    } catch (error: any) {
      console.error('Add payment method failed:', error.message)
      // Show detailed backend error if available
      const backendError = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          error.response?.data?.error ||
                          error.message
      toast({
        title: 'Error',
        description: backendError || 'Failed to add payment method',
        variant: 'destructive'
      })
    }
  }

  const resetForms = () => {
    setCardForm({ cardNumber: '', expiryMonth: '', expiryYear: '', cvv: '', cardholderName: '' })
    setBankForm({ accountNumber: '', accountName: '', bankName: '', bankCode: '' })
    setMobileForm({ provider: '', phoneNumber: '' })
  }

  const handleDeletePaymentMethod = async (methodId: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) {
      return
    }
    
    try {
      await deletePaymentMethod(methodId)
      
      // Refresh the payment methods list to ensure UI is in sync
      const refreshedMethods = await getPaymentMethods()
      setPaymentMethods(refreshedMethods)
      
      // Clear selection if deleted method was selected
      if (selectedMethod === methodId && onMethodSelect) {
        onMethodSelect('')
      }
      
      toast({
        title: 'Success',
        description: 'Payment method deleted successfully'
      })
    } catch (error: any) {
      console.error('Delete payment method error:', error)
      
      // Provide more specific error messages
      let errorMessage = 'Failed to delete payment method'
      let suggestions: string[] = []
      
      if (error.message?.includes('Server error')) {
        errorMessage = 'Server error occurred while deleting the payment method.'
        suggestions = [
          'Try again in a few moments',
          'Check if the payment method is linked to any active transactions',
          'Contact support if the problem persists'
        ]
      } else if (error.message?.includes('Cannot delete this payment method as it is used') || 
                 error.message?.includes('Cannot delete this payment method as it is linked') ||
                 error.message?.includes('Cannot delete this payment method as it is referenced')) {
        errorMessage = 'This payment method cannot be deleted because it is associated with existing transactions.'
        suggestions = [
          'The payment method is linked to your transaction history for record-keeping',
          'You can still use other payment methods for new transactions',
          'Contact support if you need to remove this method for security reasons'
        ]
      } else if (error.message?.includes('constraint') || error.message?.includes('related')) {
        errorMessage = 'Cannot delete payment method as it may be linked to active transactions or subscriptions.'
        suggestions = [
          'Cancel any pending transactions using this method',
          'Remove this method from any active subscriptions',
          'Contact support for assistance'
        ]
      } else if (error.message?.includes('permission') || error.message?.includes('authorized')) {
        errorMessage = 'You do not have permission to delete this payment method.'
        suggestions = [
          'Ensure you are logged into the correct account',
          'Contact the account owner if needed'
        ]
      } else if (error.message) {
        errorMessage = error.message
      }
      
      const fullMessage = suggestions.length > 0 
        ? `${errorMessage}\n\nSuggestions:\n${suggestions.map(s => `• ${s}`).join('\n')}`
        : errorMessage
      
      toast({
        title: 'Error',
        description: fullMessage,
        variant: 'destructive'
      })
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'card':
        return <CreditCard className="h-6 w-6 text-blue-600" />
      case 'bank':
        return <Building2 className="h-6 w-6 text-green-600" />
      case 'mobile':
        return <Smartphone className="h-6 w-6 text-yellow-600" />
      case 'qr':
        return <QrCode className="h-6 w-6 text-green-600" />
      case 'wallet':
        return <Wallet className="h-6 w-6 text-blue-600" />
      default:
        return <CreditCard className="h-6 w-6 text-gray-600" />
    }
  }

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'card':
        return 'Credit/Debit Cards'
      case 'bank':
        return 'Bank Transfer'
      case 'mobile':
        return 'Mobile Money'
      case 'qr':
        return 'QR Code Payment'
      case 'wallet':
        return 'SikaRemit Wallet'
      default:
        return category
    }
  }

  const getMethodDisplay = (method: PaymentMethod) => {
    switch (method.method_type) {
      case 'card':
        return `•••• ${method.details?.last4 || '****'}`
      case 'bank':
        return `${method.details?.bank_name || 'Bank'} - ${method.details?.account_number?.slice(-4) || '****'}`
      case 'mtn_momo':
      case 'telecel':
      case 'airtel_tigo':
      case 'g_money':
        const provider = method.details?.provider
        return `${provider?.toUpperCase() || method.method_type.replace('_', ' ').toUpperCase()} - ${method.details?.phone_number?.slice(-4) || '****'}`
      default:
        return method.method_type
    }
  }

  const getProviderLogo = (provider: string) => {
    switch (provider?.toLowerCase()) {
      case 'mtn':
      case 'mtn_momo':
        return '/logos/mtn-momo.png'
      case 'airtel_tigo':
      case 'airteltigo':
        return '/logos/airteltigo-money.jpg'
      case 'telecel':
        return '/logos/telecel-cash.jpg'
      case 'g_money':
      case 'gmoney':
        return '/logos/g-money.svg'
      default:
        return null
    }
  }

  const categories = [
    { id: 'card', label: 'Credit/Debit Cards', icon: CreditCard },
    { id: 'bank', label: 'Bank Transfer', icon: Building2 },
    { id: 'mobile', label: 'Mobile Money', icon: Smartphone },
    { id: 'qr', label: 'QR Code Payment', icon: QrCode },
    ...(transactionType && !transactionType.includes('topup') ? [{ id: 'wallet', label: 'SikaRemit Wallet', icon: Wallet }] : [])
  ]

  if (loading) {
    return <div className="flex justify-center p-8">Loading payment methods...</div>
  }

  return (
    <div className="space-y-6">
      {/* Category Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {categories.map((category) => {
          const Icon = category.icon
          const isSelected = selectedCategory === category.id

          return (
            <Card
              key={category.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
              }`}
              onClick={() => handleCategorySelect(category.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-full ${isSelected ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <Icon className={`h-6 w-6 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{category.label}</h3>
                    <p className="text-sm text-muted-foreground">
                      {category.id === 'card' && 'Visa, Mastercard, etc.'}
                      {category.id === 'bank' && 'Direct bank account'}
                      {category.id === 'mobile' && 'MTN, AirtelTigo, Telecel'}
                      {category.id === 'qr' && 'Scan to pay merchants'}
                      {category.id === 'wallet' && 'SikaRemit balance'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Payment Method Selection */}
      {selectedCategory && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getCategoryIcon(selectedCategory)}
              {getCategoryTitle(selectedCategory)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedCategory === 'mobile' && (
              <div className="space-y-4">
                {/* Existing Mobile Money */}
                <RadioGroup value={selectedMethod} onValueChange={handleMethodSelect}>
                  {paymentMethods.filter(m => ['mtn_momo', 'telecel', 'airtel_tigo', 'g_money'].includes(m.method_type)).map((method) => {
                    const logo = getProviderLogo(method.details?.provider || method.method_type)
                    return (
                      <div key={method.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={method.id} id={method.id} />
                        <Label htmlFor={method.id} className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                              {logo && (
                                <Image
                                  src={logo}
                                  alt={method.details?.provider || method.method_type}
                                  width={32}
                                  height={32}
                                  className="object-contain rounded"
                                  unoptimized
                                />
                              )}
                              <span>{getMethodDisplay(method)}</span>
                              {method.is_default && <CheckCircle className="h-4 w-4 text-green-600" />}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeletePaymentMethod(method.id); }}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </Label>
                      </div>
                    )
                  })}
                </RadioGroup>

                {/* Add New Mobile Money */}
                {showManagement && (
                  <Button
                    variant="outline"
                    onClick={() => setShowAddForm(true)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Mobile Money
                  </Button>
                )}
              </div>
            )}

            {selectedCategory === 'qr' && (
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-green-50">
                  <div className="flex items-center gap-3">
                    <QrCode className="h-6 w-6 text-green-600" />
                    <div>
                      <h4 className="font-semibold">QR Code Payment</h4>
                      <p className="text-sm text-muted-foreground">Scan QR codes to pay merchants instantly</p>
                    </div>
                  </div>
                  <Button
                    className="w-full mt-4 bg-green-600 hover:bg-green-700"
                    onClick={() => onPaymentTrigger && onPaymentTrigger()}
                  >
                    Open QR Scanner
                  </Button>
                </div>
              </div>
            )}

            {selectedCategory === 'wallet' && (
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-blue-50">
                  <div className="flex items-center gap-3">
                    <Wallet className="h-6 w-6 text-blue-600" />
                    <div>
                      <h4 className="font-semibold">SikaRemit Wallet</h4>
                      <p className="text-sm text-muted-foreground">Pay with your wallet balance</p>
                    </div>
                  </div>
                  <Button
                    className="w-full mt-4"
                    onClick={() => handleMethodSelect('wallet')}
                    disabled={selectedMethod === 'wallet'}
                  >
                    {selectedMethod === 'wallet' ? 'Selected' : 'Select Wallet'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Payment Method Form */}
      {showAddForm && selectedFormCategory && (
        <Card>
          <CardHeader>
            <CardTitle>Add {getCategoryTitle(selectedFormCategory)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedFormCategory === 'card' && (
              // Use Stripe Elements for PCI-compliant card handling
              <div className="text-sm text-muted-foreground">
                <p>For security, card payments use Stripe Elements.</p>
                <p className="mt-2">Import and use StripeCardForm component instead of this form.</p>
              </div>
            )}
            {selectedFormCategory === 'card_old' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <div className="relative">
                    <Input
                      id="cardNumber"
                      placeholder="Enter card number"
                      value={cardForm.cardNumber}
                      onChange={(e) => setCardForm({...cardForm, cardNumber: e.target.value})}
                      className="pr-12"
                    />
                    {detectedCardType && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Image
                          src={`/logos/cards/${detectedCardType}.svg`}
                          alt={detectedCardType}
                          width={32}
                          height={20}
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="expiryMonth">Expiry Month</Label>
                  <Input
                    id="expiryMonth"
                    placeholder="MM"
                    value={cardForm.expiryMonth}
                    onChange={(e) => setCardForm({...cardForm, expiryMonth: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="expiryYear">Expiry Year</Label>
                  <Input
                    id="expiryYear"
                    placeholder="YYYY"
                    value={cardForm.expiryYear}
                    onChange={(e) => setCardForm({...cardForm, expiryYear: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    placeholder="Enter CVV"
                    value={cardForm.cvv}
                    onChange={(e) => setCardForm({...cardForm, cvv: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="cardholderName">Cardholder Name</Label>
                  <Input
                    id="cardholderName"
                    placeholder="Enter name on card"
                    value={cardForm.cardholderName}
                    onChange={(e) => setCardForm({...cardForm, cardholderName: e.target.value})}
                  />
                </div>
              </div>
            )}

            {selectedFormCategory === 'bank' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    placeholder="Enter account number"
                    value={bankForm.accountNumber}
                    onChange={(e) => setBankForm({...bankForm, accountNumber: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="accountName">Account Name</Label>
                  <Input
                    id="accountName"
                    placeholder="Enter account name"
                    value={bankForm.accountName}
                    onChange={(e) => setBankForm({...bankForm, accountName: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    placeholder="Enter bank name"
                    value={bankForm.bankName}
                    onChange={(e) => setBankForm({...bankForm, bankName: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="bankCode">Bank Branch</Label>
                  <Input
                    id="bankCode"
                    placeholder="Enter bank branch"
                    value={bankForm.bankCode}
                    onChange={(e) => setBankForm({...bankForm, bankCode: e.target.value})}
                  />
                </div>
              </div>
            )}

            {selectedFormCategory === 'mobile' && (
              <div className="space-y-4">
                <div>
                  <Label>Provider</Label>
                  <RadioGroup
                    value={mobileForm.provider || detectedMobileProvider || ''}
                    onValueChange={(value) => setMobileForm({...mobileForm, provider: value})}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2"
                  >
                    {[
                      { id: 'mtn_momo', name: 'MTN Mobile Money', logo: '/logos/mtn-momo.png' },
                      { id: 'airtel_tigo', name: 'AirtelTigo Money', logo: '/logos/airteltigo-money.jpg' },
                      { id: 'telecel', name: 'Telecel Cash', logo: '/logos/telecel-cash.jpg' },
                      { id: 'g_money', name: 'G-Money', logo: '/logos/g-money.svg' }
                    ].map((provider) => (
                      <div key={provider.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={provider.id} id={provider.id} />
                        <Label htmlFor={provider.id} className="flex items-center gap-2 cursor-pointer">
                          <Image
                            src={provider.logo}
                            alt={provider.name}
                            width={24}
                            height={24}
                            className="object-contain"
                            unoptimized
                          />
                          {provider.name}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <div className="relative">
                    <Input
                      id="phoneNumber"
                      placeholder="+233xxxxxxxxx"
                      value={mobileForm.phoneNumber}
                      onChange={(e) => setMobileForm({...mobileForm, phoneNumber: e.target.value})}
                      className="pr-12"
                    />
                    {detectedMobileProvider && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Image
                          src={getProviderLogo(detectedMobileProvider) || '/logos/mtn-momo.png'}
                          alt={detectedMobileProvider}
                          width={24}
                          height={24}
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button onClick={() => handleAddPaymentMethod()}>
                Add Payment Method
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default PaymentMethodCategories