import api from './axios'

// Session Management Types
export interface ActiveSession {
  id: number
  session_key: string
  ip_address: string
  user_agent: string
  device_id: string
  created_at: string
  last_activity: string
  expires_at: string
  is_current: boolean
}

export interface LogoutResponse {
  message: string
  sessions_invalidated: number
}

export interface ActiveSessionsResponse {
  sessions: ActiveSession[]
  total_sessions: number
}

// Session Management API Functions

// Logout from all devices
export async function logoutFromAllDevices(refreshToken: string): Promise<LogoutResponse> {
  const response = await api.post('/api/v1/accounts/logout/', { refresh: refreshToken })
  return response.data
}

// Logout from other devices (keep current session active)
export async function logoutFromOtherDevices(currentRefreshToken: string): Promise<LogoutResponse> {
  const response = await api.post('/api/v1/accounts/logout/other-sessions/', {
    current_refresh_token: currentRefreshToken
  })
  return response.data
}

// Get active sessions for the current user
export async function getActiveSessions(): Promise<ActiveSessionsResponse> {
  const response = await api.get('/api/v1/accounts/sessions/active/')
  return response.data
}

// Enhanced logout function that supports logout from all devices
export async function enhancedLogout(refreshToken: string, logoutFromAll: boolean = false): Promise<LogoutResponse> {
  if (logoutFromAll) {
    return await logoutFromAllDevices(refreshToken)
  } else {
    // Standard logout (current device only)
    const response = await api.post('/api/v1/accounts/logout/', { refresh: refreshToken })
    return response.data
  }
}
