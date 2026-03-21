'use client'

import { useAuth as useRawAuth } from './context'
import { useSession as useRawSession } from './session-provider'

/**
 * Safe auth hook that prevents SSR issues
 */
export function useSafeAuth() {
  // Only use auth context on client side
  if (typeof window === 'undefined') {
    return {
      user: null,
      loading: true,
      userTypeInfo: null,
      login: async () => {},
      logout: async () => {},
      refreshUser: async () => {},
      isAuthenticated: false,
    }
  }

  try {
    return useRawAuth()
  } catch (error) {
    // Fallback if not in AuthProvider
    return {
      user: null,
      loading: true,
      userTypeInfo: null,
      login: async () => {},
      logout: async () => {},
      refreshUser: async () => {},
      isAuthenticated: false,
    }
  }
}

/**
 * Safe session hook that prevents SSR issues
 */
export function useSafeSession() {
  // Only use session on client side
  if (typeof window === 'undefined') {
    return {
      user: null,
      status: 'loading' as const,
      refresh: async () => {},
    }
  }

  try {
    return useRawSession()
  } catch (error) {
    // Fallback if session provider not available
    return {
      user: null,
      status: 'loading' as const,
      refresh: async () => {},
    }
  }
}
