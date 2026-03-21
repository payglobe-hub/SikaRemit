import api from './axios'

export type Notification = {
  id: number
  title: string
  message: string
  level: 'info' | 'warning' | 'success' | 'error' | 'payment' | 'security'
  notification_type?: string
  is_read: boolean
  read_at?: string
  created_at: string
  channel: string
  category?: string
  metadata?: Record<string, any>
  actions?: any[]
}

export type NotificationPreferences = {
  email_enabled: boolean
  sms_enabled: boolean
  push_enabled: boolean
  web_enabled: boolean
}

export type NotificationAnalytics = {
  total_notifications: number
  unread_count: number
  by_level: Record<string, number>
  by_type: Record<string, number>
}

// Updated API functions to match backend endpoints
export async function getNotifications(params?: {
  page?: number
  limit?: number
  is_read?: boolean
  level?: string
  notification_type?: string
}): Promise<{ data: Notification[], count?: number }> {
  try {
    const response = await api.get('/api/v1/notifications/', { params })
    return {
      data: response.data.data || response.data.results || response.data,
      count: response.data.count
    }
  } catch (error: any) {

    // If 401, try to refresh the page to re-authenticate
    if (error.response?.status === 401) {
      
      // Token refresh is handled by the api interceptor
    }
    
    throw error
  }
}

export async function getNotificationById(id: number): Promise<Notification> {
  const response = await api.get(`/api/v1/notifications/${id}/`)
  return response.data
}

export async function markNotificationAsRead(id: number) {
  const response = await api.patch(`/api/v1/notifications/${id}/read/`, {})
  return response.data
}

export async function markAsRead(notificationId: string) {
  return markNotificationAsRead(parseInt(notificationId))
}

export async function markAllNotificationsAsRead() {
  const response = await api.post('/api/v1/notifications/mark_all_read/')
  return response.data
}

export async function markAllAsRead() {
  return markAllNotificationsAsRead()
}

export async function deleteNotification(notificationId: string) {
  const response = await api.delete(`/api/v1/notifications/${notificationId}/`)
  return response.data
}

// Preferences functions
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const response = await api.get('/api/v1/notifications/preferences/')
  return response.data
}

export async function updateNotificationPreferences(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
  const response = await api.patch('/api/v1/notifications/preferences/', preferences)
  return response.data
}

export async function getCustomerNotificationPreferences() {
  return getNotificationPreferences()
}

export async function updateCustomerNotificationPreferences(preferences: NotificationPreferences) {
  return updateNotificationPreferences(preferences)
}

// Analytics function
export async function getNotificationAnalytics(): Promise<NotificationAnalytics> {
  const response = await api.get('/api/v1/notifications/analytics/')
  return response.data
}

// Customer notification functions (backward compatibility)
export async function getCustomerNotifications(): Promise<Notification[]> {
  const result = await getNotifications()
  return result.data
}

export async function markCustomerNotificationAsRead(notificationId: string) {
  return markAsRead(notificationId)
}

export async function markAllCustomerNotificationsAsRead() {
  return markAllAsRead()
}

export async function deleteCustomerNotification(notificationId: string) {
  return deleteNotification(notificationId)
}
