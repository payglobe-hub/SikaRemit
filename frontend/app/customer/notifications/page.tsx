'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Force dynamic rendering to prevent SSR issues with auth
export const dynamic = 'force-dynamic'
export const runtime = 'edge'
import {
  Bell,
  CheckCheck,
  Trash2,
  Settings,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  Shield,
  CreditCard
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { useNotifications } from '@/lib/notifications/provider'
import { deleteNotification, getNotificationPreferences, updateNotificationPreferences } from '@/lib/api/notifications'
import { useToast } from '@/hooks/use-toast'
import { Switch } from '@/components/ui/switch'

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refreshNotifications
  } = useNotifications()

  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState('all')
  const [preferences, setPreferences] = useState({
    email_enabled: true,
    sms_enabled: false,
    push_enabled: true,
    web_enabled: true
  })
  const [savingPreferences, setSavingPreferences] = useState(false)

  const { toast } = useToast()

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      const result = await getNotificationPreferences()
      setPreferences(result)
    } catch (error) {
      
    }
  }

  const savePreferences = async () => {
    setSavingPreferences(true)
    try {
      await updateNotificationPreferences(preferences)
      toast({
        title: 'Preferences saved',
        description: 'Your notification preferences have been updated.'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save preferences. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setSavingPreferences(false)
    }
  }

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id)
      toast({
        title: 'Notification deleted',
        description: 'The notification has been removed.'
      })
      refreshNotifications()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete notification.',
        variant: 'destructive'
      })
    }
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
    toast({
      title: 'All marked as read',
      description: 'All notifications have been marked as read.'
    })
  }

  const filteredNotifications = notifications.filter(notification => {
    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'unread' && !notification.is_read) ||
      (activeTab === 'read' && notification.is_read)

    const matchesSearch =
      searchTerm === '' ||
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesLevel =
      levelFilter === 'all' ||
      notification.level === levelFilter

    return matchesTab && matchesSearch && matchesLevel
  })

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'error': return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'security': return <Shield className="h-4 w-4 text-orange-600" />
      case 'payment': return <CreditCard className="h-4 w-4 text-blue-600" />
      default: return <Info className="h-4 w-4 text-gray-600" />
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'success': return 'border-green-200 bg-green-50'
      case 'warning': return 'border-yellow-200 bg-yellow-50'
      case 'error': return 'border-red-200 bg-red-50'
      case 'security': return 'border-orange-200 bg-orange-50'
      case 'payment': return 'border-blue-200 bg-blue-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with your account activity and important alerts.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshNotifications}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button
              onClick={handleMarkAllAsRead}
              size="sm"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">
              All
              <Badge variant="secondary" className="ml-2">
                {notifications.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="read">Read</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>

            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="security">Security</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <Card
                key={notification.id}
                className={`transition-all hover:shadow-md ${
                  !notification.is_read ? getLevelColor(notification.level) : ''
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="mt-1">
                        {getLevelIcon(notification.level)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">
                            {notification.title}
                          </h3>
                          {!notification.is_read && (
                            <Badge variant="secondary" className="text-xs">New</Badge>
                          )}
                          <Badge
                            variant={
                              notification.level === 'error' ? 'destructive' :
                              notification.level === 'warning' ? 'secondary' :
                              'outline'
                            }
                            className="text-xs"
                          >
                            {notification.level}
                          </Badge>
                        </div>

                        <p className="text-muted-foreground mb-3">
                          {notification.message}
                        </p>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            {format(new Date(notification.created_at), 'MMM dd, yyyy hh:mm a')}
                          </span>
                          <span>
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </span>
                          {notification.notification_type && (
                            <Badge variant="outline" className="text-xs">
                              {notification.notification_type.replace(/_/g, ' ')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {!notification.is_read && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkAsRead(notification.id.toString())}
                        >
                          Mark Read
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(notification.id.toString())}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No notifications found</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  {searchTerm || levelFilter !== 'all'
                    ? 'Try adjusting your search or filter criteria.'
                    : activeTab === 'unread'
                      ? 'You have no unread notifications.'
                      : 'You haven\'t received any notifications yet.'
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Preferences Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose how you want to receive notifications for different events.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="web-notifications" className="text-sm font-medium">
                    Web Notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Show notifications in your browser
                  </p>
                </div>
                <Switch
                  id="web-notifications"
                  checked={preferences.web_enabled}
                  onCheckedChange={(checked) =>
                    setPreferences(prev => ({ ...prev, web_enabled: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-notifications" className="text-sm font-medium">
                    Email Notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={preferences.email_enabled}
                  onCheckedChange={(checked) =>
                    setPreferences(prev => ({ ...prev, email_enabled: checked }))
                  }
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="push-notifications" className="text-sm font-medium">
                    Push Notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Receive push notifications on your device
                  </p>
                </div>
                <Switch
                  id="push-notifications"
                  checked={preferences.push_enabled}
                  onCheckedChange={(checked) =>
                    setPreferences(prev => ({ ...prev, push_enabled: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sms-notifications" className="text-sm font-medium">
                    SMS Notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Receive notifications via SMS
                  </p>
                </div>
                <Switch
                  id="sms-notifications"
                  checked={preferences.sms_enabled}
                  onCheckedChange={(checked) =>
                    setPreferences(prev => ({ ...prev, sms_enabled: checked }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={savePreferences}
              disabled={savingPreferences}
            >
              {savingPreferences ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
