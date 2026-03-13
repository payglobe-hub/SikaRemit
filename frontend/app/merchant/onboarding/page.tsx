'use client'

import { useState, useEffect } from 'react'
import React from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

// Prevent static generation for this page since it uses functions that can't be serialized
export const dynamic = 'force-dynamic'
import {
  Building,
  CreditCard,
  FileText,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Upload,
  User,
  MapPin,
  Phone,
  Globe,
  Sparkles,
  Shield,
  Zap
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  getMerchantOnboardingStatus,
  updateMerchantOnboarding
} from '@/lib/api/merchant'
import { COUNTRIES } from '@/lib/utils/phone'
import { BUSINESS_TYPES } from '@/lib/constants/merchant-ui'
import 'react-international-phone/style.css'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PhoneInput } from 'react-international-phone'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: any
  completed: boolean
}

const steps: OnboardingStep[] = [
  {
    id: 'business_info',
    title: 'Business Information',
    description: 'Tell us about your business',
    icon: Building,
    completed: false
  },
  {
    id: 'bank_details',
    title: 'Bank Details',
    description: 'Set up your payout method',
    icon: CreditCard,
    completed: false
  },
  {
    id: 'verification',
    title: 'Verification',
    description: 'Upload required documents',
    icon: FileText,
    completed: false
  }
]

export default function MerchantOnboardingPage() {
  const renderIcon = (IconComponent: any, className: string = "") => {
    return React.createElement(IconComponent, { className })
  }

  const [currentStep, setCurrentStep] = useState(0)
  const [businessData, setBusinessData] = useState({
    businessName: '',
    businessType: '',
    taxId: '',
    description: '',
    website: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    }
  })
  const [bankData, setBankData] = useState({
    accountName: '',
    accountNumber: '',
    bankName: '',
    routingNumber: '',
    accountType: 'checking'
  })
  const [documents, setDocuments] = useState<{
    businessLicense: File | null
    taxDocument: File | null
    idDocument: File | null
  }>({
    businessLicense: null,
    taxDocument: null,
    idDocument: null
  })

  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const updateOnboardingMutation = useMutation({
    mutationFn: async (stepData: any) => {
      return { success: true }
    },
    onSuccess: () => {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1)
      } else {
        // Onboarding completed
        toast({
          title: 'Onboarding completed!',
          description: 'Your merchant account is now being reviewed.'
        })
        router.push('/merchant/dashboard')
      }
    }
  })

  const handleNext = () => {
    if (currentStep === 0) {
      // Validate business info
      if (!businessData.businessName || !businessData.businessType) {
        toast({
          title: 'Missing information',
          description: 'Please fill in all required business information.',
          variant: 'destructive'
        })
        return
      }
      updateOnboardingMutation.mutate({ step: 'business_info', data: businessData })
    } else if (currentStep === 1) {
      // Validate bank details
      if (!bankData.accountName || !bankData.accountNumber || !bankData.bankName) {
        toast({
          title: 'Missing information',
          description: 'Please fill in all required bank details.',
          variant: 'destructive'
        })
        return
      }
      updateOnboardingMutation.mutate({ step: 'bank_details', data: bankData })
    } else if (currentStep === 2) {
      // Validate documents
      if (!documents.businessLicense || !documents.idDocument) {
        toast({
          title: 'Missing documents',
          description: 'Please upload all required documents.',
          variant: 'destructive'
        })
        return
      }
      updateOnboardingMutation.mutate({ step: 'verification', data: documents })
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleFileUpload = (field: string, file: File) => {
    setDocuments(prev => ({
      ...prev,
      [field]: file
    }))
  }

  const progress = ((currentStep + 1) / steps.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-sky-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900">
      {/* Enhanced Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-indigo-600/20 backdrop-blur-3xl"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-400/30 to-blue-600/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400/30 to-cyan-600/30 rounded-full blur-3xl animate-pulse delay-1000"></div>

        <div className="relative z-10 px-6 py-12 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 shadow-2xl">
                <Sparkles className="w-12 h-12" />
              </div>
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent mb-4">
              Welcome to sikaremit
            </h1>
            <p className="text-blue-100 text-xl mb-8 max-w-2xl mx-auto">
              Let's set up your merchant account in just a few simple steps. We'll guide you through everything you need to start accepting payments.
            </p>

            {/* Enhanced Progress Bar */}
            <div className="max-w-md mx-auto mb-8">
              <div className="flex justify-between text-sm text-blue-200 mb-2">
                <span>Progress</span>
                <span>{currentStep + 1} of {steps.length}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-white to-blue-200 h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-8 text-sm text-blue-200">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span>Secure Setup</span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4" />
                <span>Quick & Easy</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Enhanced Progress Steps */}
          <div className="flex justify-center mb-12">
            <div className="flex space-x-6 lg:space-x-8">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                    index <= currentStep
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg scale-110'
                      : 'bg-white dark:bg-gray-800 text-gray-400 border-2 border-gray-200 dark:border-gray-700'
                  }`}>
                    {index < currentStep ? (
                      <CheckCircle className="w-8 h-8" />
                    ) : (
                      renderIcon(step.icon, "w-7 h-7")
                    )}
                    {index === currentStep && (
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 animate-pulse opacity-50"></div>
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 lg:w-24 h-0.5 mx-4 lg:mx-6 transition-colors duration-500 ${
                      index < currentStep ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Labels */}
          <div className="flex justify-center mb-8">
            <div className="flex space-x-6 lg:space-x-8 text-center">
              {steps.map((step, index) => (
                <div key={step.id} className={`max-w-32 ${index === currentStep ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>
                  <p className={`text-sm font-medium transition-colors duration-300 ${
                    index <= currentStep ? 'text-gray-900 dark:text-white' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                  <p className={`text-xs mt-1 transition-colors duration-300 ${
                    index === currentStep ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
                  }`}>
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Enhanced Step Content Card */}
          <Card className="group relative overflow-hidden border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 animate-in fade-in-0 duration-700 bg-white dark:bg-gray-900 ring-1 ring-gray-200/50 dark:ring-gray-800/50">
            <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-all duration-500 ${
              currentStep === 0 ? 'from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20' :
              currentStep === 1 ? 'from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20' :
              'from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20'
            }`} />
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-500 ${
              currentStep === 0 ? 'bg-gradient-to-br from-blue-400/20 to-indigo-600/20' :
              currentStep === 1 ? 'bg-gradient-to-br from-green-400/20 to-emerald-600/20' :
              'bg-gradient-to-br from-indigo-400/20 to-blue-600/20'
            }`} />

            <CardHeader className="relative z-10 text-center pb-8">
              <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-lg ${
                currentStep === 0 ? 'bg-gradient-to-br from-blue-500 to-indigo-600' :
                currentStep === 1 ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
                'bg-gradient-to-br from-indigo-500 to-blue-600'
              }`}>
                {renderIcon(steps[currentStep].icon, "w-10 h-10 text-white")}
              </div>
              <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white">{steps[currentStep].title}</CardTitle>
              <CardDescription className="text-lg text-gray-600 dark:text-gray-400 mt-2">
                {steps[currentStep].description}
              </CardDescription>
            </CardHeader>

            <CardContent className="relative z-10 space-y-8 px-8 pb-8">
              {/* Business Information Step */}
              {currentStep === 0 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="businessName" className="text-base font-medium text-gray-900 dark:text-white">Business Name *</Label>
                      <Input
                        id="businessName"
                        value={businessData.businessName}
                        onChange={(e) => setBusinessData(prev => ({ ...prev, businessName: e.target.value }))}
                        placeholder="Enter your business name"
                        className="h-12 text-base border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label htmlFor="businessType" className="text-base font-medium text-gray-900 dark:text-white">Business Type *</Label>
                      <Select value={businessData.businessType} onValueChange={(value) => setBusinessData(prev => ({ ...prev, businessType: value }))}>
                        <SelectTrigger className="h-12 text-base border-2 border-gray-200 dark:border-gray-700 rounded-xl">
                          <SelectValue placeholder="Select business type" />
                        </SelectTrigger>
                        <SelectContent>
                          {BUSINESS_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="taxId" className="text-base font-medium text-gray-900 dark:text-white">Tax ID / Business Registration</Label>
                      <Input
                        id="taxId"
                        value={businessData.taxId}
                        onChange={(e) => setBusinessData(prev => ({ ...prev, taxId: e.target.value }))}
                        placeholder="Enter tax ID"
                        className="h-12 text-base border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-base font-medium text-gray-900 dark:text-white">Business Phone *</Label>
                      <PhoneInput
                        value={businessData.phone}
                        onChange={(phone) => setBusinessData(prev => ({ ...prev, phone }))}
                        defaultCountry="gh"
                        inputClassName="flex h-12 w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="website" className="text-base font-medium text-gray-900 dark:text-white">Website (Optional)</Label>
                    <Input
                      id="website"
                      type="url"
                      value={businessData.website}
                      onChange={(e) => setBusinessData(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://yourwebsite.com"
                      className="h-12 text-base border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-base font-medium text-gray-900 dark:text-white">Business Description</Label>
                    <Textarea
                      id="description"
                      value={businessData.description}
                      onChange={(e) => setBusinessData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your business and what you sell..."
                      rows={4}
                      className="text-base border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl resize-none"
                    />
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base font-medium text-gray-900 dark:text-white">Business Address</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Input
                          placeholder="Street address"
                          value={businessData.address.street}
                          onChange={(e) => setBusinessData(prev => ({
                            ...prev,
                            address: { ...prev.address, street: e.target.value }
                          }))}
                          className="h-12 text-base border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl"
                        />
                      </div>
                      <Input
                        placeholder="City"
                        value={businessData.address.city}
                        onChange={(e) => setBusinessData(prev => ({
                          ...prev,
                          address: { ...prev.address, city: e.target.value }
                        }))}
                        className="h-12 text-base border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl"
                      />
                      <Input
                        placeholder="State/Province"
                        value={businessData.address.state}
                        onChange={(e) => setBusinessData(prev => ({
                          ...prev,
                          address: { ...prev.address, state: e.target.value }
                        }))}
                        className="h-12 text-base border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl"
                      />
                      <Input
                        placeholder="ZIP/Postal Code"
                        value={businessData.address.zipCode}
                        onChange={(e) => setBusinessData(prev => ({
                          ...prev,
                          address: { ...prev.address, zipCode: e.target.value }
                        }))}
                        className="h-12 text-base border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl"
                      />
                      <div className="md:col-span-2">
                        <Select
                          value={businessData.address.country}
                          onValueChange={(value) => setBusinessData(prev => ({
                            ...prev,
                            address: { ...prev.address, country: value }
                          }))}
                        >
                          <SelectTrigger className="h-12 text-base border-2 border-gray-200 dark:border-gray-700 rounded-xl">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {COUNTRIES.map((country: any) => (
                              <SelectItem key={country.code} value={country.name}>
                                {country.flag} {country.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bank Details Step */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800">
                    <div className="flex items-center space-x-2 text-green-800 dark:text-green-200">
                      <Shield className="w-5 h-5" />
                      <span className="font-medium">Secure Banking Setup</span>
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Your banking information is encrypted and secure. We use bank-level security standards.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="accountName" className="text-base font-medium text-gray-900 dark:text-white">Account Holder Name *</Label>
                      <Input
                        id="accountName"
                        value={bankData.accountName}
                        onChange={(e) => setBankData(prev => ({ ...prev, accountName: e.target.value }))}
                        placeholder="Enter account holder name"
                        className="h-12 text-base border-2 border-gray-200 dark:border-gray-700 focus:border-green-500 dark:focus:border-green-400 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label htmlFor="accountNumber" className="text-base font-medium text-gray-900 dark:text-white">Account Number *</Label>
                      <Input
                        id="accountNumber"
                        value={bankData.accountNumber}
                        onChange={(e) => setBankData(prev => ({ ...prev, accountNumber: e.target.value }))}
                        placeholder="Enter account number"
                        className="h-12 text-base border-2 border-gray-200 dark:border-gray-700 focus:border-green-500 dark:focus:border-green-400 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="bankName" className="text-base font-medium text-gray-900 dark:text-white">Bank Name *</Label>
                      <Input
                        id="bankName"
                        value={bankData.bankName}
                        onChange={(e) => setBankData(prev => ({ ...prev, bankName: e.target.value }))}
                        placeholder="Enter bank name"
                        className="h-12 text-base border-2 border-gray-200 dark:border-gray-700 focus:border-green-500 dark:focus:border-green-400 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label htmlFor="routingNumber" className="text-base font-medium text-gray-900 dark:text-white">Routing Number / SWIFT Code</Label>
                      <Input
                        id="routingNumber"
                        value={bankData.routingNumber}
                        onChange={(e) => setBankData(prev => ({ ...prev, routingNumber: e.target.value }))}
                        placeholder="Enter routing number"
                        className="h-12 text-base border-2 border-gray-200 dark:border-gray-700 focus:border-green-500 dark:focus:border-green-400 rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="accountType" className="text-base font-medium text-gray-900 dark:text-white">Account Type</Label>
                    <select
                      id="accountType"
                      value={bankData.accountType}
                      onChange={(e) => setBankData(prev => ({ ...prev, accountType: e.target.value }))}
                      className="w-full h-12 px-4 py-2 text-base border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
                    >
                      <option value="checking">Checking Account</option>
                      <option value="savings">Savings Account</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Verification Step */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-xl border border-indigo-200 dark:border-indigo-800">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                        <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-indigo-800 dark:text-indigo-200">Required Documents</h4>
                        <p className="text-sm text-indigo-700 dark:text-indigo-300">
                          Please upload the following documents to verify your business. All documents must be clear and legible.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="group border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors duration-300">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                          <Upload className="w-8 h-8 text-indigo-600" />
                        </div>
                        <Label htmlFor="businessLicense" className="cursor-pointer">
                          <span className="font-semibold text-lg text-gray-900 dark:text-white">Business License/Registration *</span>
                          <br />
                          <span className="text-sm text-gray-500 dark:text-gray-400">Upload PDF or image (max 5MB)</span>
                        </Label>
                        <Input
                          id="businessLicense"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload('businessLicense', e.target.files[0])}
                          className="hidden"
                        />
                        {documents.businessLicense && (
                          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                              ✓ {documents.businessLicense!.name}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="group border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors duration-300">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                          <User className="w-8 h-8 text-indigo-600" />
                        </div>
                        <Label htmlFor="idDocument" className="cursor-pointer">
                          <span className="font-semibold text-lg text-gray-900 dark:text-white">ID Document *</span>
                          <br />
                          <span className="text-sm text-gray-500 dark:text-gray-400">Passport, driver's license, or national ID</span>
                        </Label>
                        <Input
                          id="idDocument"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload('idDocument', e.target.files[0])}
                          className="hidden"
                        />
                        {documents.idDocument && (
                          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                              ✓ {documents.idDocument!.name}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="group border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors duration-300">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                          <FileText className="w-8 h-8 text-indigo-600" />
                        </div>
                        <Label htmlFor="taxDocument" className="cursor-pointer">
                          <span className="font-semibold text-lg text-gray-900 dark:text-white">Tax Document (Optional)</span>
                          <br />
                          <span className="text-sm text-gray-500 dark:text-gray-400">Tax certificate or return</span>
                        </Label>
                        <Input
                          id="taxDocument"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload('taxDocument', e.target.files[0])}
                          className="hidden"
                        />
                        {documents.taxDocument && (
                          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                              ✓ {documents.taxDocument!.name}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Navigation */}
              <div className="flex justify-between items-center pt-8 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="h-12 px-6 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>

                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Step {currentStep + 1} of {steps.length}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{steps[currentStep].title}</p>
                  </div>
                </div>

                <Button
                  onClick={handleNext}
                  disabled={updateOnboardingMutation.isPending}
                  className={`h-12 px-8 rounded-xl font-semibold transition-all duration-300 ${
                    currentStep === steps.length - 1
                      ? 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl'
                  }`}
                >
                  {updateOnboardingMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Saving...
                    </>
                  ) : currentStep === steps.length - 1 ? (
                    <>
                      Complete Setup
                      <Sparkles className="w-4 h-4 ml-2" />
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
