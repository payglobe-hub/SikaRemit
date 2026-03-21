import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { authTokens } from '@/lib/utils/cookie-auth'

interface RealtimeReportOptions {
  endpoint: string
  queryKey: string[]
  refetchInterval?: number
  enabled?: boolean
  onError?: (error: any) => void
}

interface WebSocketMessage {
  type: 'report_update' | 'report_completed' | 'report_failed' | 'system_metrics'
  data: any
  timestamp: number
}

export function useRealtimeReports<T = any>(options: RealtimeReportOptions) {
  const { endpoint, queryKey, refetchInterval = 30000, enabled = true, onError } = options
  const queryClient = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const [lastUpdate, setLastUpdate] = useState<number | null>(null)

  // Regular polling as fallback
  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const token = authTokens.getAccessToken()
      if (!token) {
        throw new Error('No access token available')
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      return response.json()
    },
    refetchInterval,
    enabled
  })

  // Handle errors separately
  useEffect(() => {
    if (error && onError) {
      onError(error)
    }
  }, [error, onError])

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const connectWebSocket = () => {
      try {
        const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/ws/reports/`
        const token = authTokens.getAccessToken()
        if (!token) {
          
          return
        }
        
        wsRef.current = new WebSocket(`${wsUrl}?token=${token}`)
        
        wsRef.current.onopen = () => {
          setConnectionStatus('connected')
          
        }
        
        wsRef.current.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data)
            setLastUpdate(message.timestamp)
            
            switch (message.type) {
              case 'report_update':
              case 'report_completed':
              case 'report_failed':
                // Invalidate relevant queries to trigger refetch
                queryClient.invalidateQueries({ queryKey })
                break
                
              case 'system_metrics':
                // Update system metrics cache
                queryClient.setQueryData(['system-metrics'], message.data)
                break
                
              default:
                
            }
          } catch (error) {
            
          }
        }
        
        wsRef.current.onclose = () => {
          setConnectionStatus('disconnected')

          // Attempt to reconnect after 5 seconds
          setTimeout(connectWebSocket, 5000)
        }
        
        wsRef.current.onerror = (error) => {
          setConnectionStatus('error')
          
        }
        
      } catch (error) {
        setConnectionStatus('error')

        // Fallback to polling only
        setTimeout(connectWebSocket, 10000)
      }
    }

    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [enabled, endpoint, queryKey, queryClient])

  // Manual refresh function
  const refresh = () => {
    refetch()
  }

  return {
    data,
    isLoading,
    error,
    connectionStatus,
    lastUpdate,
    refresh,
    isConnected: connectionStatus === 'connected'
  }
}

// Hook for report generation progress tracking
export function useReportProgress(reportId?: number) {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending')
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!reportId) return

    const checkProgress = async () => {
      try {
        const token = authTokens.getAccessToken()
        if (!token) {
          
          return
        }
        
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/reports/${reportId}/progress/`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        )

        if (response.ok) {
          const data = await response.json()
          setProgress(data.progress || 0)
          setStatus(data.status || 'pending')

          // If completed, invalidate the reports cache
          if (data.status === 'completed' || data.status === 'failed') {
            queryClient.invalidateQueries({ queryKey: ['reports'] })
          }
        }
      } catch (error) {
        
      }
    }

    const interval = setInterval(checkProgress, 2000) // Check every 2 seconds
    checkProgress() // Initial check

    return () => clearInterval(interval)
  }, [reportId, queryClient])

  return { progress, status }
}

// Hook for caching report data
export function useReportCache() {
  const queryClient = useQueryClient()

  const cacheReport = (key: string[], data: any, ttl = 300000) => { // 5 minutes default TTL
    queryClient.setQueryData(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  const getCachedReport = (key: string[]) => {
    const cached = queryClient.getQueryData(key) as any
    if (!cached) return null

    const { timestamp, ttl } = cached
    if (Date.now() - timestamp > ttl) {
      queryClient.removeQueries({ queryKey: key })
      return null
    }

    return cached.data
  }

  const invalidateCache = (key?: string[]) => {
    if (key) {
      queryClient.invalidateQueries({ queryKey: key })
    } else {
      queryClient.invalidateQueries()
    }
  }

  return {
    cacheReport,
    getCachedReport,
    invalidateCache
  }
}

