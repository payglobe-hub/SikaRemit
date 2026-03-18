'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useSession } from '@/lib/auth/session-provider'
import { getNotifications, markAsRead, markAllAsRead, Notification } from '@/lib/api/notifications'

type NotificationContextType = {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  socket: WebSocket | null
  markAsRead: (id: string) => void
  refreshNotifications: () => Promise<void>
  markAllAsRead: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, status } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [socket, setSocket] = useState<WebSocket | null>(null)

  // Initialize WebSocket connection (disabled for now)
  useEffect(() => {
    if (!user?.id || typeof window === 'undefined') return

    // TEMPORARILY DISABLE WEBSOCKET CONNECTION
    
    return

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/notifications/`
    const newSocket = new WebSocket(wsUrl)

    newSocket.onopen = () => {
      
    }

    newSocket.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === 'notification_message') {
        if (data.notification) {
          // New notification
          setNotifications(prev => [data.notification, ...prev])
          setUnreadCount(data.unread_count)

          // Toast notification can be handled by parent components if needed
          
        } else if (data.notification_id) {
          // Notification read update
          setNotifications(prev =>
            prev.map(n =>
              n.id === data.notification_id
                ? { ...n, is_read: data.is_read }
                : n
            )
          )
          setUnreadCount(prev => data.is_read ? prev - 1 : prev + 1)
        }
      }
    }

    newSocket.onclose = () => {
      
    }

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [user?.id])

  const refreshNotifications = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      const result = await getNotifications()
      setNotifications(result.data)
      setUnreadCount(result.data.filter((n: Notification) => !n.is_read).length)
    } catch (error) {
      
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id)
      setNotifications(prev =>
        prev.map(n =>
          n.id.toString() === id
            ? { ...n, is_read: true }
            : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      )
      setUnreadCount(0)
    } catch (error) {
      
    }
  }

  useEffect(() => {
    // Only fetch notifications if user is authenticated (not loading and has user)
    if (status === 'loading' || status === 'unauthenticated' || !user?.id) {
      setLoading(false)
      return
    }

    refreshNotifications()

    // Set up polling for new notifications every 30 seconds
    const interval = setInterval(refreshNotifications, 30000)

    return () => clearInterval(interval)
  }, [user?.id, status])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        socket,
        markAsRead: handleMarkAsRead,
        refreshNotifications,
        markAllAsRead: handleMarkAllAsRead
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

