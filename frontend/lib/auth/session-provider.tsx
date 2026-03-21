'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authState } from '@/lib/utils/cookie-auth'

export interface Session {
  user: {
    id: string
    email: string
    name: string
    role: string
  } | null
  status: 'authenticated' | 'unauthenticated' | 'loading'
}

const SessionContext = createContext<Session | undefined>(undefined)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({
    user: null,
    status: 'loading'
  })

  useEffect(() => {
    // Immediate check on mount
    const checkAuth = () => {
      try {
        const { user, isAuthenticated } = authState.getAuthState()

        setSession({
          user,
          status: isAuthenticated ? 'authenticated' : 'unauthenticated'
        })
      } catch (error) {
        
        setSession({
          user: null,
          status: 'unauthenticated'
        })
      }
    }

    // Check immediately
    checkAuth()

    // Set up multiple checks to ensure we catch the auth state
    const timeout1 = setTimeout(() => {
      console.log('Auth check 1')
      checkAuth()
    }, 100)

    const timeout2 = setTimeout(() => {
      console.log('Auth check 2')
      checkAuth()
    }, 500)

    const timeout3 = setTimeout(() => {
      console.log('Auth check 3')
      checkAuth()
    }, 1000)

    return () => {
      clearTimeout(timeout1)
      clearTimeout(timeout2)
      clearTimeout(timeout3)
    }
  }, [])

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
}

export function useSession() {
  const context = useContext(SessionContext)
  if (context === undefined) {
    // Return default session if used outside provider
    return {
      user: null,
      status: 'unauthenticated' as const
    }
  }
  return context
}
