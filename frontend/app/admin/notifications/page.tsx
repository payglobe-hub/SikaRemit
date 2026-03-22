'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Bell, Search, Check, CheckCheck, Trash2, AlertTriangle, Info, CreditCard, Shield, Users, FileCheck, Filter } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { formatDistanceToNow, format } from 'date-fns'
import { toast } from 'sonner'
import api from '@/lib/api/axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface AdminNotification {
  id: number
  title: string
  message: string
  level: 'info' | 'warning' | 'success' | 'error' | 'payment' | 'security'
  notification_type: string
  is_read: boolean
  created_at: string
  metadata: Record<string, any>
}

async function fetchAllNotifications(filters: { level?: string; is_read?: string }): Promise<AdminNotification[]> {
  // Use API directly - auth headers will be added by axios interceptor
  const params: Record<string, any> = {}
  if (filters.level && filters.level !== 'all') params.level = filters.level
  if (filters.is_read && filters.is_read !== 'all') params.is_read = filters.is_read === 'unread' ? 'false' : 'true'
  
  const response = await api.get('/api/v1/notifications/', { params })
  return response.data.results || response.data || []
}

async function markAsRead(notificationId: number): Promise<void> {
  // Use API directly - auth headers will be added by axios interceptor
  await api.patch(`/api/v1/notifications/${notificationId}/read/`, {})
}

async function markAllAsRead(): Promise<void> {
  // Use API directly - auth headers will be added by axios interceptor
  await api.patch('/api/v1/notifications/mark_all_read/', {})
}

async function deleteNotification(notificationId: number): Promise<void> {
  // Use API directly - auth headers will be added by axios interceptor
  await api.delete(`/api/v1/notifications/${notificationId}/`)
}

function getNotificationIcon(type: string, level: string) {
  if (type?.includes('kyc') || type?.includes('verification')) {
    return <FileCheck className="h-5 w-5 text-blue-500" />
  }
  if (type?.includes('user') || type?.includes('account') || type?.includes('merchant')) {
    return <Users className="h-5 w-5 text-indigo-500" />
  }
  if (type?.includes('payment') || type?.includes('transaction') || type?.includes('withdrawal')) {
    return <CreditCard className="h-5 w-5 text-green-500" />
  }
  if (type?.includes('security') || level === 'security') {
    return <Shield className="h-5 w-5 text-red-500" />
  }
  if (level === 'warning' || level === 'error') {
    return <AlertTriangle className="h-5 w-5 text-yellow-500" />
  }
  return <Info className="h-5 w-5 text-gray-500" />
}

function getLevelBadge(level: string) {
  const badges: Record<string, { bg: string; text: string; label: string }> = {
    error: { bg: 'bg-red-100', text: 'text-red-700', label: 'Error' },
    warning: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Warning' },
    success: { bg: 'bg-green-100', text: 'text-green-700', label: 'Success' },
    security: { bg: 'bg-red-100', text: 'text-red-700', label: 'Security' },
    payment: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Payment' },
    info: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Info' },
  }
  const badge = badges[level] || badges.info
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
      {badge.label}
    </span>
  )
}

export default function AdminNotificationsPage() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState('all')
  const [readFilter, setReadFilter] = useState('all')

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['admin-all-notifications', levelFilter, readFilter],
    queryFn: () => fetchAllNotifications({ level: levelFilter, is_read: readFilter }),
    retry: false
  })

  // Ensure notifications is always an array
  const notifications = Array.isArray(notificationsData) ? notificationsData : []

  const markReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-notifications'] })
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] })
      toast.success('Notification marked as read')
    }
  })

  const markAllReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-notifications'] })
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] })
      toast.success('All notifications marked as read')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-notifications'] })
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] })
      toast.success('Notification deleted')
    },
    onError: () => {
      toast.error('Failed to delete notification')
    }
  })

  const filteredNotifications = notifications.filter(n => 
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.message.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 bg-clip-text text-transparent flex items-center gap-3">
            <Bell className="h-6 w-6 text-blue-600" />
            Notifications
          </h1>
          <p className="text-slate-600 mt-1 text-base">
            System alerts, KYC verifications, transactions, and more
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="bg-gradient-to-r from-blue-600 to-indigo-500 text-white">
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all as read ({unreadCount})
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="bg-white/40 backdrop-blur-xl border-white/30 shadow-xl">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/50 border-white/30"
              />
            </div>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[150px] bg-white/50">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
              </SelectContent>
            </Select>
            <Select value={readFilter} onValueChange={setReadFilter}>
              <SelectTrigger className="w-[150px] bg-white/50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card className="bg-white/40 backdrop-blur-xl border-white/30 shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg">
            {filteredNotifications.length} Notification{filteredNotifications.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading notifications...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-lg">No notifications found</p>
              <p className="text-muted-foreground/70 text-sm mt-1">
                You'll receive alerts about KYC verifications, transactions, and system events
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border transition-all hover:shadow-md ${
                    !notification.is_read 
                      ? 'bg-white border-blue-200 shadow-sm' 
                      : 'bg-gray-50/50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.notification_type, notification.level)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`font-medium ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {notification.title}
                        </p>
                        {getLevelBadge(notification.level)}
                        {!notification.is_read && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground/70">
                        <span>{format(new Date(notification.created_at), 'MMM d, yyyy h:mm a')}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markReadMutation.mutate(notification.id)}
                          disabled={markReadMutation.isPending}
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (window.confirm('Delete this notification?')) {
                            deleteMutation.mutate(notification.id)
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
