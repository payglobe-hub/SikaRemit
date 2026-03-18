'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { authState, authTokens } from '@/lib/utils/cookie-auth'
import api from '@/lib/api/axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Helper function to get cookie value (SSR-safe)
function getCookie(name: string): string | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null
  }

  try {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null
    return null
  } catch (error) {
    
    return null
  }
}

interface User {
  id: string
  email: string
  name: string
  role: string
  firstName?: string
  lastName?: string
  is_verified?: boolean
}

interface UserTypeInfo {
  label: string
  color: string
  bgColor: string
  icon: string
  description: string
}

interface AuthContextType {
  user: User | null
  userTypeInfo: UserTypeInfo | null
  loading: boolean
  login: (email: string, password: string) => Promise<string>  // Return role
  logout: () => Promise<void>
  register: (data: RegisterData) => Promise<void>
  isAuthenticated: boolean
}

interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  userType?: number
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userTypeInfo, setUserTypeInfo] = useState<UserTypeInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get auth state from cookies
        const { user: storedUser, userTypeInfo: storedUserTypeInfo, isAuthenticated } = authState.getAuthState()

        // More robust authentication check
        if (!isAuthenticated || !storedUser || !storedUser.id) {
          setUser(null)
          setUserTypeInfo(null)
          setLoading(false)
          return
        }

        // Verify token with backend if needed
        const token = authTokens.getAccessToken()
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        }

        setUser(storedUser)
        setUserTypeInfo(storedUserTypeInfo || null)

      } catch (error) {
        
        authState.clearAuthState()
        setUser(null)
        setUserTypeInfo(null)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Listen for cookie changes (cross-tab sync)
    const handleCookieChange = () => {
      const { user: currentUser, userTypeInfo: currentUserTypeInfo } = authState.getAuthState()
      setUser(currentUser)
      setUserTypeInfo(currentUserTypeInfo)
    }

    // Check for changes every 1 second (simple polling for cookie changes)
    const interval = setInterval(handleCookieChange, 1000)

    return () => clearInterval(interval)
  }, [])

  const login = async (email: string, password: string) => {
    setLoading(true)

    try {
      
      const response = await api.post('/api/v1/accounts/login/', {
        email,
        password
      })

      const { access, refresh, user, user_type_info } = response.data

      // Create user object
      const userObj = {
        id: user.id,
        email: user.email,
        name: user.first_name && user.last_name
          ? `${user.first_name} ${user.last_name}`
          : user.first_name || user.last_name || 'User',
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        is_verified: user.is_verified || false,
        role: user.role
      }

      // Store auth state in cookies first
      console.log('Auth state set:', { access: access?.substring(0, 20) + '...', refresh: refresh?.substring(0, 20) + '...', user: userObj })
      authState.setAuthState(access, refresh, userObj, user_type_info)

      // Update context state immediately after cookies are set
      setUser(userObj)
      setUserTypeInfo(user_type_info || null)
      
      // Verify cookies were set correctly
      setTimeout(() => {
        const { user: currentUser, isAuthenticated } = authState.getAuthState()

        // Also check individual cookies
        const accessToken = authTokens.getAccessToken()
        const refreshToken = authTokens.getRefreshToken()
        
        console.log('Auth verification:', { currentUser, isAuthenticated, hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken })
      }, 50)

      // Return the role for redirect logic
      return userObj.role

    } catch (error: any) {

      setLoading(false)

      if (error.code === 'ECONNABORTED' || error.message === 'Network Error') {
        throw new Error('Connection timeout. Please check your network and try again.')
      }

      throw error.response?.data || error
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      const refreshToken = authTokens.getRefreshToken()
      if (refreshToken) {
        await api.post('/api/v1/accounts/logout/', { refresh: refreshToken })
      }
    } catch (error) {
      
    } finally {
      // Clear all auth data
      authState.clearAuthState()

      // Clear API client auth header
      delete api.defaults.headers.common['Authorization']

      // Clear state
      setUser(null)
      setUserTypeInfo(null)

      // Use window.location for hard redirect to avoid hook issues
      if (typeof window !== 'undefined') {
        window.location.href = '/auth'
      }
    }
  }

  const register = async (data: RegisterData) => {
    setLoading(true)
    try {
      await api.post('/api/v1/accounts/register/', {
        email: data.email,
        password: data.password,
        password2: data.password,
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone,
        user_type: data.userType || 6
      })
      setLoading(false)
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const value: AuthContextType = {
    user,
    userTypeInfo,
    loading,
    login,
    logout,
    register,
    isAuthenticated: !!user
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

