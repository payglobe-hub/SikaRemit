import { useEffect, useRef, useState } from 'react'
import { authTokens } from '@/lib/utils/cookie-auth'

interface RealtimeUpdate {
  type: string
  data: any
  timestamp: string
}

export function useRealtimeUpdates(channel: string, onUpdate?: (update: RealtimeUpdate) => void) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<RealtimeUpdate | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    // Skip on server-side rendering
    if (typeof window === 'undefined') return

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'
    const token = authTokens.getAccessToken()
    
    if (!token) {
      
      return
    }

    // Connect to WebSocket
    const ws = new WebSocket(`${wsUrl}/ws/${channel}/?token=${token}`)
    wsRef.current = ws

    ws.onopen = () => {
      
      setIsConnected(true)
    }

    ws.onmessage = (event) => {
      try {
        const update: RealtimeUpdate = JSON.parse(event.data)
        setLastUpdate(update)
        if (onUpdate) {
          onUpdate(update)
        }
      } catch (error) {
        
      }
    }

    ws.onerror = (error) => {
      
      setIsConnected(false)
    }

    ws.onclose = () => {
      
      setIsConnected(false)
    }

    // Cleanup on unmount
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [channel, onUpdate])

  const send = (data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    } else {
      
    }
  }

  return {
    isConnected,
    lastUpdate,
    send
  }
}

