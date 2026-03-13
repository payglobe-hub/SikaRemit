'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Settings, Shield, Bell, Database, Building, Globe, Lock, Mail, AlertTriangle, Save, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PermissionGuard } from '@/components/ui/permission-guard'
import api from '@/lib/api/axios'
import { getExchangeRates, CurrencyWebSocketService } from '@/lib/api/currency'

export default function AdminSettingsPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({})
  const [isRatesLoading, setIsRatesLoading] = useState(false)

  // GntenanceMode] = useState(false)
  const [debugMode, setDebugMode] = useState(false)
  const [publicRegistration, setPublicRegistration] = useState(true)

  // Security Settings State
  const [twoFactorAuth, setTwoFactorAuth] = useState(true)
  const [ipWhitelisting, setIpWhitelisting] = useState(false)
  const [auditLogging, setAuditLogging] = useState(true)

  // API Settings State
  const [apiDocumentation, setApiDocumentation] = useState(true)
  const [requestLogging, setRequestLogging] = useState(false)
// General Settings State
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  // Notification Settings State
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [smsNotifications, setSmsNotifications] = useState(false)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [errorAlerts, setErrorAlerts] = useState(true)
  const [transactionAlerts, setTransactionAlerts] = useState(true)

  // Maintenance Settings State
  const [scheduledMaintenance, setScheduledMaintenance] = useState(false)
  const [autoBackups, setAutoBackups] = useState(true)
  const [logRotation, setLogRotation] = useState(true)
  
  // Currencies state
  const [currencies, setCurrencies] = useState<{code: string, name: string, symbol: string, flag_emoji?: string}[]>([])

  // Fetch exchange rates and currencies on component mount
  useEffect(() => {
    fetchExchangeRates()
    fetchCurrencies()
    
    // TODO: Subscribe to real-time updates
    // const wsService = new CurrencyWebSocketService()
    // wsService.connect()
    // const unsubscribe = wsService.subscribe((data) => {
    //   if (data.rates_data) {
    //     setExchangeRates(data.rates_data.rates)
    //   }
    // })
    
    // return () => {
    //   unsubscribe()
    //   wsService.disconnect()
    // }
  }, [])

  const fetchCurrencies = async () => {
    try {
      const response = await api.get('/api/v1/payments/currencies/')
      const data = response.data
      const currencyList = Array.isArray(data) ? data : (data.results || [])
      setCurrencies(currencyList.filter((c: any) => c.is_active))
    } catch (error) {
      console.error('Failed to load currencies:', error)
    }
  }

  const fetchExchangeRates = async () => {
    setIsRatesLoading(true)
    try {
      const data = await getExchangeRates({ base: 'GHS' })
      setExchangeRates((data as any).rates)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch current exchange rates",
        variant: "destructive"
      })
    }
    setIsRatesLoading(false)
  }

  const handleSaveExchangeRates = async () => {
    setIsRatesLoading(true)
    try {
      // Call the backend API to save exchange rates
      await api.post('/api/v1/payments/currencies/set-rates/', {
        rates: exchangeRates
      })
      toast({
        title: "Success",
        description: "Exchange rates updated successfully. Changes are now live throughout the system.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to update exchange rates",
        variant: "destructive"
      })
    }
    setIsRatesLoading(false)
  }

  const handleSaveSettings = async () => {
    setIsLoading(true)
    try {
      // Update general settings
      await api.patch('/api/admin/settings/general/', {
        system_name: 'sikaremit', // Use actual form values
        default_timezone: 'UTC',
        default_currency: 'GHS',
        default_language: 'en',
        maintenance_mode: maintenanceMode,
        debug_mode: debugMode,
        public_registration: publicRegistration
      })

      // Update security settings
      await api.patch('/api/admin/settings/security/', {
        session_timeout: 60,
        max_login_attempts: 5,
        min_password_length: 8,
        password_policy: 'strong',
        two_factor_required: twoFactorAuth,
        ip_whitelisting: ipWhitelisting,
        audit_logging: auditLogging
      })

      // Update API settings
      await api.patch('/api/admin/settings/api/', {
        api_rate_limit: 1000,
        api_timeout: 30,
        webhook_secret: '••••••••',
        api_version: 'v1',
        cors_origins: [],
        api_documentation: apiDocumentation,
        request_logging: requestLogging
      })

      // Update notification settings
      await api.patch('/api/admin/settings/notifications/', {
        admin_email_notifications: emailNotifications,
        admin_sms_notifications: smsNotifications,
        admin_push_notifications: pushNotifications,
        error_alerts: errorAlerts,
        transaction_alerts: transactionAlerts,
        admin_email: 'admin@sikaremit.com',
        transaction_alert_threshold: 10000
      })

      // Update maintenance settings
      await api.patch('/api/admin/settings/maintenance/', {
        scheduled_maintenance: scheduledMaintenance,
        auto_backups: autoBackups,
        log_rotation: logRotation,
        backup_frequency: 'daily',
        log_retention_days: 30
      })

      toast({
        title: "Settings saved",
        description: "Your system settings have been updated successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      })
    }
    setIsLoading(false)
  }

  return (
    <PermissionGuard
      role={['super_admin']}
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">Access Denied</h2>
            <p className="text-muted-foreground">You do not have permission to access system settings.</p>
          </div>
        </div>
      }
    >
      <div className="w-full space-y-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 bg-clip-text text-transparent flex items-center gap-3">
            <Settings className="h-8 w-8 text-blue-600" />
            System Settings
          </h1>
          <p className="text-slate-600 mt-1 text-base">Configure system-wide settings and preferences</p>
        </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="currency">Currency</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="bg-white/40 backdrop-blur-xl border-white/30 shadow-xl shadow-blue-500/5 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Building className="h-5 w-5 text-blue-600" />
                General Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="system-name">System Name</Label>
                  <Input
                    id="system-name"
                    placeholder="sikaremit"
                    defaultValue="sikaremit"
                    className="bg-white/50 backdrop-blur-sm border-white/30 focus:border-blue-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Default Timezone</Label>
                  <Select defaultValue="utc">
                    <SelectTrigger className="bg-white/50 backdrop-blur-sm border-white/30">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utc">UTC</SelectItem>
                      <SelectItem value="est">Eastern Time</SelectItem>
                      <SelectItem value="pst">Pacific Time</SelectItem>
                      <SelectItem value="gmt">GMT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Default Currency</Label>
                  <Select defaultValue="ghs">
                    <SelectTrigger className="bg-white/50 backdrop-blur-sm border-white/30">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      {currencies.length > 0 ? currencies.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code.toLowerCase()} textValue={`${currency.code} ${currency.name}`}>
                          {currency.flag_emoji} {currency.code} ({currency.symbol}) - {currency.name}
                        </SelectItem>
                      )) : (
                        <SelectItem value="loading" disabled>Loading currencies...</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Default Language</Label>
                  <Select defaultValue="en">
                    <SelectTrigger className="bg-white/50 backdrop-blur-sm border-white/30">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator className="bg-white/30" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Maintenance Mode</Label>
                    <p className="text-sm text-slate-600">Temporarily disable the system for maintenance</p>
                  </div>
                  <Switch
                    checked={maintenanceMode}
                    onCheckedChange={setMaintenanceMode}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Debug Mode</Label>
                    <p className="text-sm text-slate-600">Enable detailed error logging</p>
                  </div>
                  <Switch
                    checked={debugMode}
                    onCheckedChange={setDebugMode}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Public Registration</Label>
                    <p className="text-sm text-slate-600">Allow new users to register</p>
                  </div>
                  <Switch
                    checked={publicRegistration}
                    onCheckedChange={setPublicRegistration}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="bg-white/40 backdrop-blur-xl border-white/30 shadow-xl shadow-blue-500/5 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                  <Input
                    id="session-timeout"
                    type="number"
                    placeholder="60"
                    defaultValue="60"
                    className="bg-white/50 backdrop-blur-sm border-white/30 focus:border-blue-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-login-attempts">Max Login Attempts</Label>
                  <Input
                    id="max-login-attempts"
                    type="number"
                    placeholder="5"
                    defaultValue="5"
                    className="bg-white/50 backdrop-blur-sm border-white/30 focus:border-blue-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-min-length">Minimum Password Length</Label>
                  <Input
                    id="password-min-length"
                    type="number"
                    placeholder="8"
                    defaultValue="8"
                    className="bg-white/50 backdrop-blur-sm border-white/30 focus:border-blue-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-policy">Password Policy</Label>
                  <Select defaultValue="strong">
                    <SelectTrigger className="bg-white/50 backdrop-blur-sm border-white/30">
                      <SelectValue placeholder="Select policy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="strong">Strong</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator className="bg-white/30" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Two-Factor Authentication</Label>
                    <p className="text-sm text-slate-600">Require 2FA for all admin accounts</p>
                  </div>
                  <Switch
                    checked={twoFactorAuth}
                    onCheckedChange={setTwoFactorAuth}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">IP Whitelisting</Label>
                    <p className="text-sm text-slate-600">Restrict admin access to specific IP addresses</p>
                  </div>
                  <Switch
                    checked={ipWhitelisting}
                    onCheckedChange={setIpWhitelisting}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Audit Logging</Label>
                    <p className="text-sm text-slate-600">Log all administrative actions</p>
                  </div>
                  <Switch
                    checked={auditLogging}
                    onCheckedChange={setAuditLogging}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <Card className="bg-white/40 backdrop-blur-xl border-white/30 shadow-xl shadow-blue-500/5 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                API Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="api-rate-limit">Rate Limit (requests/minute)</Label>
                  <Input
                    id="api-rate-limit"
                    type="number"
                    placeholder="1000"
                    defaultValue="1000"
                    className="bg-white/50 backdrop-blur-sm border-white/30 focus:border-blue-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api-timeout">API Timeout (seconds)</Label>
                  <Input
                    id="api-timeout"
                    type="number"
                    placeholder="30"
                    defaultValue="30"
                    className="bg-white/50 backdrop-blur-sm border-white/30 focus:border-blue-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhook-secret">Webhook Secret</Label>
                  <Input
                    id="webhook-secret"
                    type="password"
                    placeholder="••••••••"
                    className="bg-white/50 backdrop-blur-sm border-white/30 focus:border-blue-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api-version">API Version</Label>
                  <Select defaultValue="v1">
                    <SelectTrigger className="bg-white/50 backdrop-blur-sm border-white/30">
                      <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="v1">v1.0</SelectItem>
                      <SelectItem value="v2">v2.0 (Beta)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cors-origins">CORS Origins</Label>
                <Textarea
                  id="cors-origins"
                  placeholder="https://yourdomain.com&#10;https://app.yourdomain.com"
                  className="bg-white/50 backdrop-blur-sm border-white/30 focus:border-blue-300 min-h-[100px]"
                />
              </div>

              <Separator className="bg-white/30" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">API Documentation</Label>
                    <p className="text-sm text-slate-600">Enable public API documentation</p>
                  </div>
                  <Switch
                    checked={apiDocumentation}
                    onCheckedChange={setApiDocumentation}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Request Logging</Label>
                    <p className="text-sm text-slate-600">Log all API requests for debugging</p>
                  </div>
                  <Switch
                    checked={requestLogging}
                    onCheckedChange={setRequestLogging}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="bg-white/40 backdrop-blur-xl border-white/30 shadow-xl shadow-blue-500/5 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-600" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Email Notifications</Label>
                    <p className="text-sm text-slate-600">Send email notifications for system events</p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">SMS Notifications</Label>
                    <p className="text-sm text-slate-600">Send SMS alerts for critical events</p>
                  </div>
                  <Switch
                    checked={smsNotifications}
                    onCheckedChange={setSmsNotifications}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Push Notifications</Label>
                    <p className="text-sm text-slate-600">Send push notifications to admin devices</p>
                  </div>
                  <Switch
                    checked={pushNotifications}
                    onCheckedChange={setPushNotifications}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Error Alerts</Label>
                    <p className="text-sm text-slate-600">Notify admins of system errors</p>
                  </div>
                  <Switch
                    checked={errorAlerts}
                    onCheckedChange={setErrorAlerts}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Transaction Alerts</Label>
                    <p className="text-sm text-slate-600">Alert on large or suspicious transactions</p>
                  </div>
                  <Switch
                    checked={transactionAlerts}
                    onCheckedChange={setTransactionAlerts}
                  />
                </div>
              </div>

              <Separator className="bg-white/30" />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Admin Notification Email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@sikaremit.com"
                    defaultValue="admin@sikaremit.com"
                    className="bg-white/50 backdrop-blur-sm border-white/30 focus:border-blue-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alert-threshold">Transaction Alert Threshold</Label>
                  <Input
                    id="alert-threshold"
                    type="number"
                    placeholder="10000"
                    defaultValue="10000"
                    className="bg-white/50 backdrop-blur-sm border-white/30 focus:border-blue-300"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="currency" className="space-y-6">
          <Card className="bg-white/40 backdrop-blur-xl border-white/30 shadow-xl shadow-blue-500/5 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                Exchange Rates (Base: Ghana Cedis)
              </CardTitle>
              <p className="text-sm text-slate-600">Set exchange rates from Ghana Cedis (GHS) to other currencies. Changes will be reflected immediately throughout the system.</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(exchangeRates)
                  .filter(([currency]) => currency !== 'GHS')
                  .map(([currency, rate]) => (
                  <div key={currency} className="space-y-2">
                    <Label htmlFor={`rate-${currency}`}>GHS → {currency}</Label>
                    <Input
                      id={`rate-${currency}`}
                      type="number"
                      step="0.0001"
                      value={rate === 0 ? '' : rate}
                      onChange={(e) => setExchangeRates(prev => ({
                        ...prev,
                        [currency]: e.target.value === '' ? 0 : parseFloat(e.target.value)
                      }))}
                      placeholder="0.0000"
                      className="bg-white/50 backdrop-blur-sm border-white/30 focus:border-blue-300"
                    />
                  </div>
                ))}
              </div>

              <Separator className="bg-white/30" />

              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={fetchExchangeRates}
                  disabled={isRatesLoading}
                  className="bg-white/50 backdrop-blur-sm border-white/30 hover:bg-white/70 hover:border-blue-200/50">
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRatesLoading ? 'animate-spin' : ''}`} />
                  Refresh Rates
                </Button>

                <Button
                  onClick={handleSaveExchangeRates}
                  disabled={isRatesLoading}
                  className="bg-gradient-to-r from-blue-600 to-indigo-500 text-white hover:shadow-xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105 px-8 py-3">
                  {isRatesLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Rates
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          <Card className="bg-white/40 backdrop-blur-xl border-white/30 shadow-xl shadow-blue-500/5 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-blue-600" />
                Maintenance Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Scheduled Maintenance</Label>
                    <p className="text-sm text-slate-600">Enable scheduled system maintenance windows</p>
                  </div>
                  <Switch
                    checked={scheduledMaintenance}
                    onCheckedChange={setScheduledMaintenance}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Auto Backups</Label>
                    <p className="text-sm text-slate-600">Automatically backup system data</p>
                  </div>
                  <Switch
                    checked={autoBackups}
                    onCheckedChange={setAutoBackups}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Log Rotation</Label>
                    <p className="text-sm text-slate-600">Automatically rotate and archive logs</p>
                  </div>
                  <Switch
                    checked={logRotation}
                    onCheckedChange={setLogRotation}
                  />
                </div>
              </div>

              <Separator className="bg-white/30" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="backup-frequency">Backup Frequency</Label>
                  <Select defaultValue="daily">
                    <SelectTrigger className="bg-white/50 backdrop-blur-sm border-white/30">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retention-days">Log Retention (days)</Label>
                  <Input
                    id="retention-days"
                    type="number"
                    placeholder="30"
                    defaultValue="30"
                    className="bg-white/50 backdrop-blur-sm border-white/30 focus:border-blue-300"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Button variant="outline" className="bg-white/50 backdrop-blur-sm border-white/30 hover:bg-white/70 hover:border-blue-200/50">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Run Manual Backup
                </Button>
                <Button variant="outline" className="bg-white/50 backdrop-blur-sm border-white/30 hover:bg-white/70 hover:border-blue-200/50">
                  <Database className="h-4 w-4 mr-2" />
                  Clear System Cache
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button
          onClick={handleSaveSettings}
          disabled={isLoading}
          className="bg-gradient-to-r from-blue-600 to-indigo-500 text-white hover:shadow-xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105 px-8 py-3">
          {isLoading ? (
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
    </PermissionGuard>
  )
}
