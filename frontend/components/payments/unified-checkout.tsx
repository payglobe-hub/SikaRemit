'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { 
  CreditCard,
  Building2,
  Smartphone,
  Globe,
  Bitcoin,
  CheckCircle,
  Info,
  Star,
  Shield,
  Zap,
  Wallet,
  QrCode,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import PaymentMethodCategories from './payment-method-categories'
import { QRScanner } from './qr-scanner'
import { useToast } from '@/hooks/use-toast'
import { useCurrency } from '@/hooks/useCurrency'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { calculateTransactionFees } from '@/lib/api/fees'
import { initiatePayment, processCheckout, sendRemittance, sendOutboundRemittance, sendGlobalRemittance, payBill, createPaymentMethod, sendDomesticTransfer, transferToSikaRemitWallet } from '@/lib/api/payments'
import { TransactionContext } from '@/lib/types/payments'
import { getCurrencyForCountry } from '@/lib/utils/currency-mapping'

interface UnifiedCheckoutProps {
  transactionContext: TransactionContext
  onSuccess?: (result: any) => void
  onCancel?: () => void
  showSummary?: boolean
  autoProcess?: boolean
}

export function UnifiedCheckout({
  transactionContext,
  onSuccess,
  onCancel,
  showSummary = true,
  autoProcess = false
}: UnifiedCheckoutProps) {
  // Check if this is a SikaRemit wallet transfer (auto-select wallet balance)
  const isSikaRemitTransfer = transactionContext.recipient?.type === 'sikaremit' || 
    transactionContext.recipient?.delivery_method === 'sikaremit_wallet'
  
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>(
    isSikaRemitTransfer ? 'sikaremit_balance' : ''
  )
  const [selectedCategory, setSelectedCategory] = useState<string>(
    isSikaRemitTransfer ? 'wallet' : ''
  )
  const [isProcessing, setIsProcessing] = useState(false)

  const { toast } = useToast()
  const { formatAmount, currency: userCurrency } = useCurrency()
  const { user } = useAuth()

  // Get appropriate currency for transaction (user preference or contextual)
  const getTransactionCurrency = () => {
    // Priority: explicit currency > user preference > contextual default
    if (transactionContext.currency) return transactionContext.currency
    
    // For international transfers, use recipient country currency
    if (transactionContext.type.includes('international') && transactionContext.recipient?.country) {
      // This would need a country-to-currency mapping service
      return userCurrency // fallback to user preference
    }
    
    return userCurrency // default to user's preferred currency
  }

  const getMobileProviderName = (provider: string) => {
    switch (provider) {
      case 'MTN': return 'MTN Mobile Money'
      case 'Telecel': return 'Telecel Cash'
      case 'AirtelTigo': return 'AirtelTigo Money'
      default: return provider
    }
  }

  const transactionCurrency = getTransactionCurrency()
  const router = useRouter()

  // Calculate fees dynamically from backend
  const calculateFees = async () => {
    try {
      const feeData = await calculateTransactionFees({
        transaction_type: transactionContext.type,
        amount: transactionContext.amount,
        currency: transactionContext.currency,
        country: transactionContext.recipient?.country
      })
      return feeData.total_fee || 0
    } catch (error) {
      console.error('Fee calculation failed:', error)
      // Fallback to minimal fee if calculation fails
      return Math.max(transactionContext.amount * 0.005, 0.50)
    }
  }

  const [fees, setFees] = useState(0)
  const [feesLoading, setFeesLoading] = useState(true)

  // Calculate fees on component mount and when transaction context changes
  useEffect(() => {
    const loadFees = async () => {
      setFeesLoading(true)
      try {
        const calculatedFees = await calculateFees()
        setFees(calculatedFees)
      } catch (error) {
        console.error('Failed to calculate fees:', error)
        setFees(0)
      } finally {
        setFeesLoading(false)
      }
    }
    
    if (transactionContext.amount > 0) {
      loadFees()
    }
  }, [transactionContext.amount, transactionContext.type, transactionContext.currency])

  const totalAmount = transactionContext.amount + fees

  const validateTransaction = () => {
    const { type, amount, recipient, billDetails, telecomDetails, merchantDetails } = transactionContext

    if (!amount || amount <= 0) return 'Invalid amount'

    switch (type) {
      case 'transfer_domestic':
        // SikaRemit wallet transfers only need identifier
        if (recipient?.type === 'sikaremit') {
          if (!recipient?.sikaremit_identifier) return 'Recipient phone or email is required'
          // SikaRemit transfers don't need payment method - uses wallet balance
          return null
        }
        if (!recipient?.email && !recipient?.phone) return 'Recipient email or phone is required'
        if (!recipient?.name) return 'Recipient name is required'
        break
      case 'transfer_international':
        if (!recipient?.email && !recipient?.phone) return 'Recipient email or phone is required'
        if (!recipient?.name) return 'Recipient name is required'
        if (!recipient?.country) return 'Recipient country is required'
        if (!recipient?.delivery_method) return 'Delivery method is required'
        if (recipient?.delivery_method === 'sikaremit_wallet') {
          if (!recipient?.delivery_sikaremit_identifier) return 'Recipient SikaRemit phone or email is required'
          // SikaRemit wallet delivery doesn't need external payment method
          return null
        }
        if (recipient?.delivery_method === 'mobile_money' && !recipient?.delivery_phone) {
          return 'Mobile phone number is required for mobile money delivery'
        }
        if (recipient?.delivery_method === 'bank') {
          if (!recipient?.delivery_account_number || !recipient?.delivery_bank_name) {
            return 'Bank account details are required for bank delivery'
          }
        }
        break
      case 'transfer_outbound':
        if (!recipient?.email && !recipient?.phone) return 'Recipient email or phone is required'
        if (!recipient?.name) return 'Recipient name is required'
        if (!recipient?.country) return 'Recipient country is required'
        if (!recipient?.delivery_method) return 'Delivery method is required'
        if (recipient?.delivery_method === 'bank_transfer' && (!recipient?.delivery_account_number || !recipient?.delivery_bank_name)) {
          return 'Bank account details are required for bank delivery'
        }
        if (recipient?.delivery_method === 'mobile_money' && !recipient?.delivery_phone) {
          return 'Mobile phone number is required for mobile money delivery'
        }
        if (recipient?.delivery_method === 'cash_pickup' && (!recipient?.delivery_address || !recipient?.delivery_city)) {
          return 'Address and city are required for cash pickup'
        }
        break
      case 'transfer_global':
        if (!recipient?.email && !recipient?.phone) return 'Recipient email or phone is required'
        if (!recipient?.name) return 'Recipient name is required'
        if (!recipient?.country) return 'Recipient country is required'
        if (!recipient?.delivery_method) return 'Delivery method is required'
        if (recipient?.delivery_method === 'bank_transfer' && (!recipient?.delivery_account_number || !recipient?.delivery_bank_name)) {
          return 'Bank account details are required for bank delivery'
        }
        if (recipient?.delivery_method === 'mobile_money' && !recipient?.delivery_phone) {
          return 'Mobile phone number is required for mobile money delivery'
        }
        if (recipient?.delivery_method === 'cash_pickup' && (!recipient?.delivery_address || !recipient?.delivery_city)) {
          return 'Address and city are required for cash pickup'
        }
        if (recipient?.delivery_method === 'digital_wallet' && !recipient?.delivery_wallet_id) {
          return 'Wallet ID is required for digital wallet delivery'
        }
        break
      case 'bill_payment':
        if (!billDetails?.billType || !billDetails?.billerName || !billDetails?.billReference) {
          return 'Bill details are incomplete'
        }
        break
      case 'airtime':
      case 'data':
        if (!telecomDetails?.provider || !telecomDetails?.phoneNumber) {
          return 'Telecom details are incomplete'
        }
        break
      case 'merchant_checkout':
        if (!merchantDetails?.merchantId) return 'Merchant ID is required'
        break
      case 'transfer_to_bank':
        // For transfer to bank, user must have a bank account payment method selected
        if (!recipient?.accountNumber || !recipient?.bankName) return 'Bank account details are required for transfer to bank'
        break
      case 'qr_payment':
        // QR payments require QR scanning first
        if (!transactionContext.qrDetails) return 'Please scan a QR code first'
        break
      case 'p2p_send':
        // P2P transfers require SikaRemit recipient
        if (!recipient?.email) return 'Recipient email is required for P2P transfer'
        if (recipient?.type !== 'sikaremit') return 'P2P transfers require SikaRemit recipient'
        break
    }

    if (!selectedPaymentMethodId) return 'Payment method is required'

    return null
  }

  const processTransaction = async () => {
    const validationError = validateTransaction()
    if (validationError) {
      toast({
        title: 'Validation Error',
        description: validationError,
        variant: 'destructive'
      })
      return
    }

    setIsProcessing(true)

    try {
      let result
      const paymentMethodId = selectedPaymentMethodId

      // Process based on transaction type
      switch (transactionContext.type) {
        case 'transfer_domestic': {
          // Check if this is a SikaRemit wallet-to-wallet transfer
          if (transactionContext.recipient?.type === 'sikaremit' && transactionContext.recipient?.sikaremit_identifier) {
            const sikaremitResult = await transferToSikaRemitWallet({
              amount: transactionContext.amount,
              currency: transactionContext.currency || transactionCurrency,
              recipient_identifier: transactionContext.recipient.sikaremit_identifier,
              description: transactionContext.description
            })
            if (sikaremitResult.success) {
              result = sikaremitResult.data
            } else {
              throw new Error(sikaremitResult.error || 'Transfer failed')
            }
          } else {
            result = await sendDomesticTransfer({
              amount: transactionContext.amount,
              currency: transactionContext.currency || transactionCurrency,
              description: transactionContext.description,
              recipient: transactionContext.recipient!,
              payment_method_id: paymentMethodId
            })
          }
          break
        }
        case 'transfer_international': {
          result = await sendRemittance({
            recipient: transactionContext.recipient!.email || transactionContext.recipient!.phone!,
            recipient_name: transactionContext.recipient!.name || '',
            recipient_country: transactionContext.recipient!.country || '',
            amount: transactionContext.amount,
            currency: transactionContext.currency || transactionCurrency,
            payment_method_id: paymentMethodId,
            purpose: transactionContext.description,
            // Delivery method information for international remittances
            delivery_method: transactionContext.recipient!.delivery_method || '',
            delivery_phone: transactionContext.recipient!.delivery_phone,
            delivery_account_number: transactionContext.recipient!.delivery_account_number,
            delivery_bank_name: transactionContext.recipient!.delivery_bank_name,
            delivery_bank_branch: transactionContext.recipient!.delivery_bank_branch,
            delivery_mobile_provider: transactionContext.recipient!.delivery_mobile_provider || undefined
          })
          break
        }
        case 'transfer_outbound': {
          result = await sendOutboundRemittance({
            recipient: transactionContext.recipient!.email || transactionContext.recipient!.phone!,
            amount: transactionContext.amount,
            currency: transactionContext.currency || transactionCurrency,
            payment_method_id: paymentMethodId,
            purpose: transactionContext.description || '',
            // Delivery method information for outbound international remittances
            delivery_method: transactionContext.recipient!.delivery_method!,
            delivery_phone: transactionContext.recipient!.delivery_phone,
            delivery_account_number: transactionContext.recipient!.delivery_account_number,
            delivery_bank_name: transactionContext.recipient!.delivery_bank_name,
            delivery_bank_branch: transactionContext.recipient!.delivery_bank_branch,
            delivery_routing_number: transactionContext.recipient!.delivery_routing_number,
            delivery_swift_code: transactionContext.recipient!.delivery_swift_code,
            delivery_mobile_provider: undefined, // Remove provider for international transfers
            delivery_address: transactionContext.recipient!.delivery_address,
            delivery_city: transactionContext.recipient!.delivery_city,
            delivery_postal_code: transactionContext.recipient!.delivery_postal_code,
            delivery_wallet_id: transactionContext.recipient!.delivery_wallet_id
          })
          break
        }
        case 'transfer_global': {
          result = await sendGlobalRemittance({
            // Sender details from authenticated user
            sender_name: user ? `${user!.firstName || ''} ${user!.lastName || ''}`.trim() || user!.name : '',
            sender_email: user!.email || '',
            sender_phone: '', // User phone not available in basic user object
            sender_country: '', // User country not available in basic user object
            sender_address: '', // User address not available in basic user object
            // Recipient details
            recipient: transactionContext.recipient!.email || transactionContext.recipient!.phone!,
            recipient_name: transactionContext.recipient!.name || '',
            recipient_email: transactionContext.recipient!.email || undefined,
            recipient_phone: transactionContext.recipient!.phone || undefined,
            recipient_country: transactionContext.recipient!.country || '',
            recipient_currency: transactionContext.recipient!.country ? getCurrencyForCountry(transactionContext.recipient!.country) : undefined,
            amount: transactionContext.amount,
            currency: transactionContext.currency || transactionCurrency,
            payment_method_id: paymentMethodId,
            purpose: transactionContext.description || '',
            // Delivery method information for global international remittances
            delivery_method: transactionContext.recipient!.delivery_method!,
            delivery_phone: transactionContext.recipient!.delivery_phone,
            delivery_account_number: transactionContext.recipient!.delivery_account_number,
            delivery_bank_name: transactionContext.recipient!.delivery_bank_name,
            delivery_bank_branch: transactionContext.recipient!.delivery_bank_branch,
            delivery_routing_number: transactionContext.recipient!.delivery_routing_number,
            delivery_swift_code: transactionContext.recipient!.delivery_swift_code,
            delivery_mobile_provider: undefined, // Remove provider for international transfers
            delivery_address: transactionContext.recipient!.delivery_address,
            delivery_city: transactionContext.recipient!.delivery_city,
            delivery_postal_code: transactionContext.recipient!.delivery_postal_code,
            delivery_wallet_id: transactionContext.recipient!.delivery_wallet_id
          })
          break
        }
        case 'bill_payment':
          result = await payBill('temp-bill-id', paymentMethodId)
          break

        case 'airtime':
        case 'data':
          result = await initiatePayment({
            type: transactionContext.type,
            amount: transactionContext.amount,
            payment_method_id: paymentMethodId,
            telecom_details: transactionContext.telecomDetails
          })
          break

        case 'merchant_checkout':
          result = await processCheckout({
            merchant_id: transactionContext.merchantDetails!.merchantId,
            amount: transactionContext.amount,
            currency: transactionContext.currency || transactionCurrency,
            paymentMethodId,
            description: transactionContext.description
          })
          break

        case 'transfer_to_bank':
          result = await initiatePayment({
            type: 'transfer_to_bank',
            amount: transactionContext.amount,
            payment_method_id: paymentMethodId,
            currency: transactionContext.currency,
            description: transactionContext.description || 'Transfer to bank account',
            recipient_details: {
              account_number: transactionContext.recipient!.accountNumber,
              bank_name: transactionContext.recipient!.bankName,
              bank_branch: transactionContext.recipient!.bankBranch
            }
          })
          break

        case 'qr_payment':
          // Process QR payment
          result = await initiatePayment({
            type: 'qr_payment',
            amount: transactionContext.amount,
            payment_method_id: paymentMethodId,
            currency: transactionContext.currency,
            qr_details: transactionContext.qrDetails
          })
          break

        case 'p2p_send':
          // Process peer-to-peer transfer to SikaRemit user
          result = await initiatePayment({
            type: 'p2p_send',
            amount: transactionContext.amount,
            currency: transactionContext.currency || 'USD',
            description: transactionContext.description || 'P2P Transfer',
            recipient_details: {
              user_id: transactionContext.recipient!.email, // This should be the recipient user ID
              recipient_type: 'sikaremit'
            }
          })
          break
      }

      toast({
        title: 'Success!',
        description: 'Transaction completed successfully'
      })

      if (onSuccess) {
        onSuccess(result)
      } else {
        router.push('/customer/payments/success')
      }
    } catch (error: any) {
      toast({
        title: 'Transaction Failed',
        description: error.message || 'An error occurred during processing',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Auto-process if enabled and valid
  useEffect(() => {
    if (autoProcess && selectedPaymentMethodId && !validateTransaction()) {
      processTransaction()
    }
  }, [autoProcess, selectedPaymentMethodId])

  const validationError = validateTransaction()

  return (
    <div className="space-y-6">
      {/* Transaction Summary */}
      {showSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Transaction Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="capitalize">{transactionContext.type.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span>{formatAmount(transactionContext.amount)} {transactionContext.currency || transactionCurrency}</span>
            </div>
            {fees > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fees</span>
                <span>{formatAmount(fees)} {transactionContext.currency || transactionCurrency}</span>
              </div>
            )}
            <div className="border-t pt-3 flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatAmount(totalAmount)} {transactionContext.currency || transactionCurrency}</span>
            </div>
            {transactionContext.telecomDetails && (
              <>
                <div className="border-t pt-3 flex justify-between font-semibold text-sm text-muted-foreground">
                  <span>Phone Number</span>
                  <span>{transactionContext.telecomDetails.phoneNumber}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Provider</span>
                  <span>{getMobileProviderName(transactionContext.telecomDetails.provider)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Method Selection - Enhanced Unified Component */}
      <PaymentMethodCategories
        mode="unified"
        selectedCategory={selectedCategory}
        selectedMethod={selectedPaymentMethodId}
        onCategorySelect={(category: string) => {
          setSelectedCategory(category)
          setSelectedPaymentMethodId('') // Reset when category changes
        }}
        onMethodSelect={(methodId: string) => {
          setSelectedPaymentMethodId(methodId)
        }}
        onPaymentTrigger={processTransaction}
        amount={transactionContext.amount}
        currency={transactionContext.currency || transactionCurrency}
        showManagement={true}
        transactionType={transactionContext.type}
      />

      {/* Action Buttons */}
      <div className="flex gap-3">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
            Cancel
          </Button>
        )}
        <Button
          onClick={processTransaction}
          disabled={isProcessing || !!validationError}
          className="flex-1"
        >
          {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isProcessing ? 'Processing...' : `Pay ${formatAmount(totalAmount)}`}
        </Button>
      </div>

      {/* Validation Error */}
      {validationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
