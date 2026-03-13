import { useState, useEffect } from 'react'
import { getActiveSessions, logoutFromAllDevices, logoutFromOtherDevices, ActiveSession, ActiveSessionsResponse } from '../lib/api/sessions'

export function useSessionManagement() {
  const [sessions, setSessions] = useState<ActiveSession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch active sessions
  const fetchSessions = async () => {
    setLoading(true)
    setError(null)
    try {
      const response: ActiveSessionsResponse = await getActiveSessions()
      setSessions(response.sessions)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sessions')
    } finally {
      setLoading(false)
    }
  }

  // Logout from all devices
  const logoutAllDevices = async (refreshToken: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await logoutFromAllDevices(refreshToken)
      // Refresh sessions list after logout
      await fetchSessions()
      return response
    } catch (err: any) {
      setError(err.message || 'Failed to logout from all devices')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Logout from other devices (keep current session)
  const logoutOtherDevices = async (currentRefreshToken: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await logoutFromOtherDevices(currentRefreshToken)
      // Refresh sessions list after logout
      await fetchSessions()
      return response
    } catch (err: any) {
      setError(err.message || 'Failed to logout from other devices')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Auto-fetch sessions on mount
  useEffect(() => {
    fetchSessions()
  }, [])

  return {
    sessions,
    loading,
    error,
    fetchSessions,
    logoutAllDevices,
    logoutOtherDevices,
    totalSessions: sessions.length
  }
}
