'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSafeAuth, useSafeSession } from '@/lib/auth/safe-auth'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AlertCircle, CheckCircle, Bell, Shield, Globe, HelpCircle, Save, RefreshCw, Settings as SettingsIcon, User, Mail, Phone, Edit } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useTheme } from '@/hooks/useTheme'
import { getCustomerNotificationPreferences, updateCustomerNotificationPreferences } from '@/lib/api/notifications'
import { NotificationPreferences } from '@/types/notifications'
import { PasswordChangeDialog } from '@/components/auth/password-change-dialog'
import { TwoFactorSetupDialog } from '@/components/auth/two-factor-setup-dialog'
import { useSession } from '@/lib/auth/session-provider'

// Force dynamic rendering to prevent SSR issues with auth
export const dynamic = 'force-dynamic'
export const runtime = 'edge'
import api from '@/lib/api/axios'

function CustomerSettingsContent() {
  const searchParams = useSearchParams()
  const session = useSafeSession()
  const { theme, setTheme } = useTheme()
  const [settings, setSettings] = useState({
    language: 'en',
    timezone: 'UTC'
  })
  const [profileData, setProfileData] = useState({
    first_name: (session?.user as any)?.first_name || '',
    last_name: (session?.user as any)?.last_name || '',
    phone: (session?.user as any)?.phone || '',
    country: (session?.user as any)?.country || ''
  })
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    transactionAlerts: true,
    securityAlerts: true,
    marketingEmails: false,
    lowBalanceAlert: true,
    balanceThreshold: 100
  })
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const { toast } = useToast()

  // Get the default tab from URL parameters
  const defaultTab = searchParams.get('tab') || 'notifications'

  useEffect(() => {
    const loadNotificationPreferences = async () => {
      try {
        const prefs = await getCustomerNotificationPreferences()
        setNotifications({
          emailNotifications: prefs.email_enabled,
          smsNotifications: prefs.sms_enabled,
          pushNotifications: prefs.push_enabled,
          transactionAlerts: prefs.web_enabled,
          securityAlerts: true,
          lowBalanceAlert: false,
          balanceThreshold: 100,
          marketingEmails: false
        })
      } catch (error) {
        
      }
    }
    loadNotificationPreferences()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)

    try {
      // Map component type to API type
      const apiPrefs = {
        email_enabled: notifications.emailNotifications,
        sms_enabled: notifications.smsNotifications,
        push_enabled: notifications.pushNotifications,
        web_enabled: notifications.transactionAlerts
      }
      await updateCustomerNotificationPreferences(apiPrefs)

      setMessage({ type: 'success', text: 'Settings saved successfully!' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' })
    } finally {
      setIsSaving(false)
    }
  }

  const updateNotification = (key: string, value: any) => {
    setNotifications(prev => ({ ...prev, [key]: value }))
  }

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen space-y-6 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-sikaremit-foreground">Account Settings</h1>
              <p className="text-sikaremit-muted mt-2">Manage your account preferences and security</p>
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-lg border ${
              message.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="h-4 w-4 inline mr-2" />
              ) : (
                <AlertCircle className="h-4 w-4 inline mr-2" />
              )}
              {message.text}
            </div>
          )}

          <Tabs defaultValue={defaultTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center gap-2">
                <SettingsIcon className="h-4 w-4" />
                Appearance
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Preferences
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile Information
                  </CardTitle>
                  <CardDescription>
                    Update your personal information and contact details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name</Label>
                      <Input
                        id="first_name"
                        value={profileData.first_name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, first_name: e.target.value }))}
                        disabled={!isEditingProfile}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name</Label>
                      <Input
                        id="last_name"
                        value={profileData.last_name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, last_name: e.target.value }))}
                        disabled={!isEditingProfile}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        value={session?.user?.email || ''}
                        disabled
                        className="bg-gray-50"
                      />
                      <p className="text-xs text-muted-foreground">Email cannot be changed here</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={profileData.phone}
                        onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                        disabled={!isEditingProfile}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 pt-4">
                    {isEditingProfile ? (
                      <>
                        <Button
                          onClick={async () => {
                            setIsSavingProfile(true)
                            try {
                              // Use API directly - auth headers will be added by axios interceptor
                              await api.patch('/api/v1/accounts/customers/profile/', profileData)
                              toast({
                                title: "Profile Updated",
                                description: "Your profile has been updated successfully",
                              })
                              setIsEditingProfile(false)
                            } catch (error) {
                              toast({
                                title: "Update Failed",
                                description: "Failed to update profile. Please try again.",
                                variant: "destructive"
                              })
                            } finally {
                              setIsSavingProfile(false)
                            }
                          }}
                          disabled={isSavingProfile}
                        >
                          {isSavingProfile ? "Saving..." : "Save Changes"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setProfileData({
                              first_name: (session?.user as any)?.first_name || '',
                              last_name: (session?.user as any)?.last_name || '',
                              phone: (session?.user as any)?.phone || '',
                              country: (session?.user as any)?.country || ''
                            })
                            setIsEditingProfile(false)
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={() => setIsEditingProfile(true)}
                        variant="outline"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>
                    Choose how you want to be notified about your account activity and transactions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Label>Email Notifications</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Receive important updates about transactions and account changes via email</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Receive email updates about your transactions and account activity
                        </p>
                      </div>
                      <Switch
                        checked={notifications.emailNotifications}
                        onCheckedChange={(checked) => updateNotification('emailNotifications', checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Label>SMS Notifications</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Get instant SMS alerts for critical account activities and security events</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Receive SMS alerts for important account activities and security
                        </p>
                      </div>
                      <Switch
                        checked={notifications.smsNotifications}
                        onCheckedChange={(checked) => updateNotification('smsNotifications', checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Label>Push Notifications</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Receive in-app notifications for real-time updates and transaction confirmations</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Receive in-app notifications for transactions and updates
                        </p>
                      </div>
                      <Switch
                        checked={notifications.pushNotifications}
                        onCheckedChange={(checked) => updateNotification('pushNotifications', checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Label>Transaction Alerts</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Get notified immediately when money is sent or received in your account</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Get notified when money is sent or received
                        </p>
                      </div>
                      <Switch
                        checked={notifications.transactionAlerts}
                        onCheckedChange={(checked) => updateNotification('transactionAlerts', checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Label>Low Balance Alerts</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Receive warnings when your account balance falls below a specified threshold</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Notify when balance falls below threshold
                        </p>
                      </div>
                      <Switch
                        checked={notifications.lowBalanceAlert}
                        onCheckedChange={(checked) => updateNotification('lowBalanceAlert', checked)}
                      />
                    </div>

                    {notifications.lowBalanceAlert && (
                      <div className="space-y-2 ml-6">
                        <Label htmlFor="balanceThreshold">Balance Alert Threshold (₵)</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Input
                                id="balanceThreshold"
                                type="number"
                                value={notifications.balanceThreshold}
                                onChange={(e) => updateNotification('balanceThreshold', parseFloat(e.target.value) || 100)}
                                min="0"
                                step="10"
                                className="max-w-xs"
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Set the minimum balance threshold for alerts. You'll be notified when your balance drops below this amount.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    )}

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Label>Marketing Emails</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Receive promotional emails about new features, offers, and sikaremit updates</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Receive promotional emails and special offers
                        </p>
                      </div>
                      <Switch
                        checked={notifications.marketingEmails}
                        onCheckedChange={(checked) => updateNotification('marketingEmails', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SettingsIcon className="h-5 w-5" />
                    Appearance Settings
                  </CardTitle>
                  <CardDescription>
                    Customize how the application looks and feels
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Label>Dark Mode</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Switch to dark theme for better visibility in low light conditions</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Switch to dark theme for better visibility in low light
                      </p>
                    </div>
                    <Switch
                      checked={theme === 'dark'}
                      onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Regional Preferences
                  </CardTitle>
                  <CardDescription>
                    Set your regional and language preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="language" className="flex items-center gap-2">
                        Language
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Choose your preferred language for the application interface</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <select
                        id="language"
                        className="w-full p-3 border border-input bg-background rounded-md"
                        value={settings.language}
                        onChange={(e) => updateSetting('language', e.target.value)}
                      >
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="fr">Français</option>
                        <option value="de">Deutsch</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="timezone" className="flex items-center gap-2">
                        Timezone
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Set your timezone for accurate date and time display</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <select
                        id="timezone"
                        className="w-full p-3 border border-input bg-background rounded-md"
                        value={settings.timezone}
                        onChange={(e) => updateSetting('timezone', e.target.value)}
                      >
                        <option value="UTC">UTC</option>
                        <option value="EST">Eastern Time</option>
                        <option value="PST">Pacific Time</option>
                        <option value="GMT">GMT</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Security Settings
                  </CardTitle>
                  <CardDescription>
                    Manage your account security and authentication preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Password Management</Label>
                      <p className="text-sm text-muted-foreground">
                        Keep your account secure by regularly updating your password
                      </p>
                      <PasswordChangeDialog>
                        <Button variant="outline" className="w-full justify-start">
                          Change Password
                        </Button>
                      </PasswordChangeDialog>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <Label className="text-base font-medium">Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                      <TwoFactorSetupDialog>
                        <Button variant="outline" className="w-full justify-start">
                          Two-Factor Authentication
                        </Button>
                      </TwoFactorSetupDialog>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <Label className="text-base font-medium">Account Activity</Label>
                      <p className="text-sm text-muted-foreground">
                        Monitor and manage your account access
                      </p>
                      <div className="space-y-2">
                        <Button variant="outline" className="w-full justify-start">
                          Login History
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          Active Sessions
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Save Button */}
          <div className="flex justify-end pt-8">
            <Button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2">
              {isSaving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
    </TooltipProvider>
  )
}

export default function CustomerSettings() {
  return (
    <Suspense fallback={<div>Loading settings...</div>}>
      <CustomerSettingsContent />
    </Suspense>
  )
}
