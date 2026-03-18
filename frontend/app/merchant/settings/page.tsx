'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import {
  User,
  Building,
  Bell,
  Shield,
  CreditCard,
  Save,
  Upload,
  Mail,
  Phone,
  MapPin,
  Globe,
  DollarSign,
  RefreshCw,
  Settings as SettingsIcon,
  Activity
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { PhoneInput } from 'react-international-phone'
import 'react-international-phone/style.css'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { COUNTRIES, loadCountriesForPhone } from '@/lib/utils/phone'
import { CurrencySelector } from '@/components/currency/currency-selector'
import { ExchangeRateChart } from '@/components/currency/exchange-rate-chart'
import { useSession } from '@/lib/auth'
import api from '@/lib/api/axios'
import { useRouter } from 'next/navigation'
import { cookieUtils } from '@/lib/utils/cookie-auth'

interface MerchantSettings {
  businessName: string
  taxId: string
  email: string
  phone: string
  address: {
    street: string
    city: string
    country: string
    postalCode: string
  }
  notifications: {
    email: boolean
    sms: boolean
    smsNumber: string
    transactionAlerts: boolean
    payoutAlerts: boolean
    securityAlerts: boolean
  }
  payoutSettings: {
    defaultMethod: 'bank_transfer' | 'mobile_money'
    autoPayout: boolean
    minimumPayout: number
  }
  currencySettings: {
    autoConvert: boolean
  }
  currencyRates: Record<string, number>
}

export default function MerchantSettingsPage() {
  const session = useSession()
  const [activeTab, setActiveTab] = useState('business')
  const [countries, setCountries] = useState<any[]>([])
  const [settings, setSettings] = useState<MerchantSettings>({
    businessName: '',
    taxId: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      country: '',
      postalCode: ''
    },
    notifications: {
      email: true,
      sms: false,
      smsNumber: '',
      transactionAlerts: true,
      payoutAlerts: true,
      securityAlerts: true
    },
    payoutSettings: {
      defaultMethod: 'bank_transfer',
      autoPayout: false,
      minimumPayout: 100
    },
    currencySettings: {
      autoConvert: false
    },
    currencyRates: {
      
    }
  })

  const { toast } = useToast()
  const queryClient = useQueryClient()
  const router = useRouter()

  // Load saved currency rates and settings on mount
  useEffect(() => {
    const savedRates = cookieUtils.getCookie('merchant-currency-rates')
    if (savedRates) {
      try {
        let rates: Record<string, number>
        
        // Handle both string (JSON) and object formats
        if (typeof savedRates === 'string') {
          rates = JSON.parse(savedRates)
        } else if (typeof savedRates === 'object' && savedRates !== null) {
          rates = savedRates as Record<string, number>
        } else {
          
          return
        }
        
        setSettings(prev => ({
          ...prev,
          currencyRates: { ...prev.currencyRates, ...rates }
        }))
      } catch (error) {
        
      }
    }

    const savedSettings = cookieUtils.getCookie('merchant-currency-settings')
    if (savedSettings) {
      try {
        let settingsData: any
        
        // Handle both string (JSON) and object formats
        if (typeof savedSettings === 'string') {
          settingsData = JSON.parse(savedSettings)
        } else if (typeof savedSettings === 'object' && savedSettings !== null) {
          settingsData = savedSettings
        } else {
          
          return
        }
        
        setSettings(prev => ({
          ...prev,
          currencySettings: { ...prev.currencySettings, ...settingsData }
        }))
      } catch (error) {
        
      }
    }
  }, [])

  // Load countries for the address select
  useEffect(() => {
    const loadCountries = async () => {
      await loadCountriesForPhone()
      setCountries([...COUNTRIES])
    }
    loadCountries()
  }, [])

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: MerchantSettings) => {
      // Update business settings
      if (newSettings.businessName || newSettings.taxId) {
        await api.patch('/api/v1/merchants/settings/business/', {
          business_name: newSettings.businessName,
          tax_id: newSettings.taxId,
          email: newSettings.email,
          phone: newSettings.phone,
          address: newSettings.address
        })
      }
      
      // Update notification settings
      await api.patch('/api/v1/merchants/settings/notifications/', newSettings.notifications)
      
      // Update payout settings
      await api.patch('/api/v1/merchants/settings/payouts/', {
        default_method: newSettings.payoutSettings.defaultMethod,
        auto_payout: newSettings.payoutSettings.autoPayout,
        minimum_payout: newSettings.payoutSettings.minimumPayout
      })
      
      // Save custom currency rates to localStorage
      cookieUtils.setCookie('merchant-currency-rates', JSON.stringify(newSettings.currencyRates))
      
      // Save currency settings to localStorage
      cookieUtils.setCookie('merchant-currency-settings', JSON.stringify(newSettings.currencySettings))
      
      return newSettings
    },
    onSuccess: () => {
      toast({
        title: 'Settings updated',
        description: 'Your merchant settings have been saved successfully.'
      })
    }
  })

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(settings)
  }

  const handleInputChange = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleNestedChange = (parent: string, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent as keyof MerchantSettings] as object || {}),
        [field]: value
      }
    }))
  }

  const handleAddressChange = (field: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value
      }
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Hero Section */}
      <div className="relative py-16 lg:py-24 overflow-hidden bg-gradient-to-br from-blue-50/30 via-blue-50/20 to-blue-50/30">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-blue-400/20 to-blue-300/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-blue-400/15 to-indigo-400/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-conic from-blue-500/5 via-transparent to-blue-400/5 rounded-full blur-2xl animate-spin" style={{animationDuration: '20s'}}></div>
        </div>

        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto animate-in slide-in-from-bottom duration-1000">
            <div className="inline-flex items-center px-6 py-3 rounded-full bg-white/40 backdrop-blur-xl border border-white/30 shadow-lg shadow-blue-500/5 text-slate-700 text-sm font-semibold mb-8 animate-in zoom-in-50 duration-700 delay-300 hover:bg-white/50 hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 group">
              <SettingsIcon className="w-5 h-5 mr-3 text-blue-600 group-hover:rotate-12 transition-transform duration-300" />
              Settings & Preferences
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6 leading-tight animate-in slide-in-from-bottom duration-1000 delay-500">
              Account Management
              <span className="block bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent drop-shadow-sm">Customize your merchant experience</span>
            </h1>
            <p className="text-lg text-slate-600/90 mb-8 max-w-2xl mx-auto leading-relaxed animate-in slide-in-from-bottom duration-1000 delay-700 font-medium">
              Manage your business information, security settings, notification preferences, and payment configurations all in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center animate-in slide-in-from-bottom duration-1000 delay-900">
              <div className="flex items-center space-x-3 bg-white/40 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 hover:bg-white/50 group">
                <User className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-slate-700 font-medium">Business profile</span>
              </div>
              <div className="flex items-center space-x-3 bg-white/40 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 hover:bg-white/50 group">
                <Shield className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-slate-700 font-medium">Security settings</span>
              </div>
              <div className="flex items-center space-x-3 bg-white/40 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 hover:bg-white/50 group">
                <Bell className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-slate-700 font-medium">Notifications</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 lg:px-8 space-y-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="grid w-full grid-cols-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-1 shadow-lg">
          <TabsTrigger value="business" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-500 data-[state=active]:text-white transition-all duration-300">Business</TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-500 data-[state=active]:text-white transition-all duration-300">Notifications</TabsTrigger>
          <TabsTrigger value="payouts" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-500 data-[state=active]:text-white transition-all duration-300">Payouts</TabsTrigger>
          <TabsTrigger value="currency" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-500 data-[state=active]:text-white transition-all duration-300">Currency</TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-500 data-[state=active]:text-white transition-all duration-300">Security</TabsTrigger>
        </TabsList>

        {/* Business Settings */}
        <TabsContent value="business" className="space-y-6">
          <Card className="bg-sikaremit-card/80 backdrop-blur-sm group cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/10 relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${'from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20'} opacity-0 group-hover:opacity-100 transition-all duration-500`} />
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-10 -mt-10"></div>

            <CardHeader className="relative z-10 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-lg">
                  <Building className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-sikaremit-foreground">Business Information</CardTitle>
                  <CardDescription className="text-sikaremit-muted">Update your business details and contact information</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={settings.businessName}
                    onChange={(e) => handleInputChange('businessName', e.target.value)}
                    placeholder="Enter business name"
                  />
                </div>
                <div>
                  <Label htmlFor="taxId">Tax ID / Business Registration</Label>
                  <Input
                    id="taxId"
                    value={settings.taxId}
                    onChange={(e) => handleInputChange('taxId', e.target.value)}
                    placeholder="Enter tax ID"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="email">Business Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Enter business email"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Business Phone</Label>
                  <PhoneInput
                    value={settings.phone}
                    onChange={(phone) => handleInputChange('phone', phone)}
                    defaultCountry="gh"
                    inputClassName="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label>Business Address</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Input
                      placeholder="Street address"
                      value={settings.address.street}
                      onChange={(e) => handleNestedChange('address', 'street', e.target.value)}
                    />
                  </div>
                  <Input
                    placeholder="City"
                    value={settings.address.city}
                    onChange={(e) => handleNestedChange('address', 'city', e.target.value)}
                  />
                  <Select
                    value={settings.address.country}
                    onValueChange={(value) => handleNestedChange('address', 'country', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {countries.length > 0 ? countries.map((country: any) => (
                        <SelectItem key={country.code} value={country.name}>
                          <span className="flex items-center gap-2">
                            <span className="text-lg leading-none" dangerouslySetInnerHTML={{ __html: country.flag }} />
                            <span>{country.name}</span>
                          </span>
                        </SelectItem>
                      )) : (
                        <SelectItem value="loading" disabled>Loading countries...</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Postal code"
                    value={settings.address.postalCode}
                    onChange={(e) => handleNestedChange('address', 'postalCode', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="bg-sikaremit-card/80 backdrop-blur-sm group cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/10 relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${'from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20'} opacity-0 group-hover:opacity-100 transition-all duration-500`} />
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-10 -mt-10"></div>

            <CardHeader className="relative z-10 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-lg">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-sikaremit-foreground">Notification Preferences</CardTitle>
                  <CardDescription className="text-sikaremit-muted">Choose how you want to be notified about important events</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Email Notifications</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.email}
                    onCheckedChange={(checked) => handleNestedChange('notifications', 'email', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">SMS Notifications</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Receive notifications via SMS
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.sms}
                    onCheckedChange={(checked) => handleNestedChange('notifications', 'sms', checked)}
                  />
                </div>

                {settings.notifications.sms && (
                  <div>
                    <Label htmlFor="smsNumber">SMS Number</Label>
                    <Input
                      id="smsNumber"
                      type="tel"
                      value={settings.notifications.smsNumber}
                      onChange={(e) => handleNestedChange('notifications', 'smsNumber', e.target.value)}
                      placeholder="Enter SMS number"
                    />
                  </div>
                )}
              </div>

              <div className="border-t pt-6">
                <h4 className="text-lg font-medium mb-4">Alert Types</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Transaction Alerts</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Get notified about new transactions
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifications.transactionAlerts}
                      onCheckedChange={(checked) => handleNestedChange('notifications', 'transactionAlerts', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Payout Alerts</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Get notified about payout status changes
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifications.payoutAlerts}
                      onCheckedChange={(checked) => handleNestedChange('notifications', 'payoutAlerts', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Security Alerts</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Get notified about security events
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifications.securityAlerts}
                      onCheckedChange={(checked) => handleNestedChange('notifications', 'securityAlerts', checked)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payout Settings */}
        <TabsContent value="payouts" className="space-y-6">
          <Card className="bg-sikaremit-card/80 backdrop-blur-sm group cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/10 relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${'from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20'} opacity-0 group-hover:opacity-100 transition-all duration-500`} />
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-10 -mt-10"></div>

            <CardHeader className="relative z-10 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-lg">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-sikaremit-foreground">Payout Settings</CardTitle>
                  <CardDescription className="text-sikaremit-muted">Configure your payout preferences and methods</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div>
                    <Label className="text-base font-medium">Default Payout Method</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Choose your preferred payout method</p>
                  </div>
                  <Select value={settings.payoutSettings.defaultMethod} onValueChange={(value) => handleNestedChange('payoutSettings', 'defaultMethod', value)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div>
                    <Label className="text-base font-medium">Auto Payout</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Automatically process payouts when balance reaches threshold</p>
                  </div>
                  <Switch checked={settings.payoutSettings.autoPayout} onCheckedChange={(checked) => handleNestedChange('payoutSettings', 'autoPayout', checked)} />
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div>
                    <Label className="text-base font-medium">Minimum Payout Amount</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Set the minimum amount required for automatic payouts</p>
                  </div>
                  <Input
                    type="number"
                    value={settings.payoutSettings.minimumPayout}
                    onChange={(e) => handleNestedChange('payoutSettings', 'minimumPayout', parseInt(e.target.value))}
                    className="w-32"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Currency Settings */}
        <TabsContent value="currency" className="space-y-6">
          <Card className="bg-sikaremit-card/80 backdrop-blur-sm group cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/10 relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${'from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20'} opacity-0 group-hover:opacity-100 transition-all duration-500`} />
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-blue-300/20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-500"></div>

            <CardHeader className="relative z-10 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-lg">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-sikaremit-foreground">Currency Settings</CardTitle>
                  <CardDescription className="text-sikaremit-muted text-lg mt-1">Manage your currency preferences and exchange rates</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 p-6 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                {/* Currency Selector */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold">Default Currency</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Choose your primary currency for transactions and reporting
                    </p>
                    <CurrencySelector showPreferences={false} />
                  </div>

                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-blue-900 dark:text-blue-100">Live Exchange Rates</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300">Real-time currency conversion</p>
                      </div>
                      <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-currency Settings */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Multi-Currency Support</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div>
                      <Label className="text-base">Accept Multiple Currencies</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Allow customers to pay in different currencies
                      </p>
                    </div>
                    <Switch
                      checked={true}
                      onCheckedChange={() => {}}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div>
                      <Label className="text-base">Auto-convert to Base Currency</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Automatically convert foreign payments
                      </p>
                    </div>
                    <Switch checked={settings.currencySettings.autoConvert} onCheckedChange={(checked) => handleNestedChange('currencySettings', 'autoConvert', checked)} />
                  </div>
                </div>
              </div>

              {/* Custom Exchange Rates */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Custom Exchange Rates</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Set custom exchange rates for currencies (relative to USD). These rates will override the live rates throughout the app.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(settings.currencyRates).map(([currency, rate]) => (
                    <div key={currency} className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <Label className="font-medium w-12">{currency}:</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={rate}
                        onChange={(e) => handleNestedChange('currencyRates', currency, parseFloat(e.target.value) || 0)}
                        placeholder="Enter rate"
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card className="bg-sikaremit-card/80 backdrop-blur-sm group cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/10 relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${'from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20'} opacity-0 group-hover:opacity-100 transition-all duration-500`} />
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-10 -mt-10"></div>

            <CardHeader className="relative z-10 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-lg">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-sikaremit-foreground">Security Settings</CardTitle>
                  <CardDescription className="text-sikaremit-muted">Manage your account security and access controls</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 p-6 space-y-6">
              <div className="space-y-4">
                <div className="p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-800">
                  <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">Password</h4>
                  <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                    For security reasons, password changes must be done through the main authentication system.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => router.push('/auth/change-password')}>
                    Change Password
                  </Button>
                </div>

                <div className="p-4 border border-blue-200 rounded-lg bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Two-Factor Authentication</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                    Add an extra layer of security to your account.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => router.push('/settings/security/2fa')}>
                    Enable 2FA
                  </Button>
                </div>

                <div className="p-4 border border-green-200 rounded-lg bg-green-50 dark:bg-green-900/20 dark:border-green-800">
                  <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">API Keys</h4>
                  <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                    Manage API keys for integrations.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => router.push('/settings/security/api-keys')}>
                    Manage API Keys
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-8">
        <Button
          onClick={handleSaveSettings}
          disabled={updateSettingsMutation.isPending}
          className="bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:shadow-xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105 px-8 py-3"
        >
          {updateSettingsMutation.isPending ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
