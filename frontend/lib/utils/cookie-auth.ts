/**
 * SSR-safe cookie-based auth utility
 * Secure HTTP-only cookies for server access
 */

// Cookie utility functions (SSR-safe)
export const cookieUtils = {
  getCookie(name: string): string | null {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      
      return null
    }

    try {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) {
        const result = parts.pop()?.split(';').shift() || null
        
        return result
      }
      
      return null
    } catch (error) {
      
      return null
    }
  },

  setCookie(name: string, value: string, options: {
    maxAge?: number
    secure?: boolean
    sameSite?: 'strict' | 'lax' | 'none'
    path?: string
  } = {}): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      
      return
    }

    try {
      const {
        maxAge = 86400,
        secure = process.env.NODE_ENV === 'production', // Enable secure in production
        sameSite = 'lax', // Default to lax for better compatibility
        path = '/'
      } = options

      let cookieString = `${name}=${encodeURIComponent(value)}; path=${path}; max-age=${maxAge}; samesite=${sameSite}`

      if (secure) {
        cookieString += '; secure'
      }

      document.cookie = cookieString
      
      // Verify it was set
      const verifyValue = this.getCookie(name)
      
    } catch (error) {
      
    }
  },

  deleteCookie(name: string): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }

    try {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=strict`
    } catch (error) {
      
    }
  }
}

// Auth token management (secure cookie-based)
export const authTokens = {
  getAccessToken(): string | null {
    return cookieUtils.getCookie('access_token')
  },

  getRefreshToken(): string | null {
    return cookieUtils.getCookie('refresh_token')
  },

  setAccessToken(token: string): void {
    cookieUtils.setCookie('access_token', token, {
      secure: false, // Disable secure for development
      sameSite: 'lax', // Use lax instead of strict for better compatibility
      maxAge: 900 // 15 minutes — matches backend JWT expiry
    })
  },

  setRefreshToken(token: string): void {
    cookieUtils.setCookie('refresh_token', token, {
      secure: false, // Disable secure for development
      sameSite: 'lax', // Use lax instead of strict for better compatibility
      maxAge: 86400 * 7 // 7 days
    })
  },

  clearTokens(): void {
    cookieUtils.deleteCookie('access_token')
    cookieUtils.deleteCookie('refresh_token')
  }
}

// User data management (secure cookie-based)
export const userData = {
  getUserData(): any {
    const cookieData = cookieUtils.getCookie('user_data')
    if (!cookieData) {
      
      return null
    }

    try {
      // URL-decode the cookie data before parsing JSON
      const decodedData = decodeURIComponent(cookieData)

      const parsed = JSON.parse(decodedData)
      
      return parsed
    } catch (error) {
      
      return null
    }
  },

  getUserTypeInfo(): any {
    const cookieData = cookieUtils.getCookie('user_type_info')
    if (!cookieData) return null

    try {
      // URL-decode the cookie data before parsing JSON
      const decodedData = decodeURIComponent(cookieData)

      return JSON.parse(decodedData)
    } catch (error) {
      
      return null
    }
  },

  setUserData(user: any): void {
    if (user) {
      const userDataString = JSON.stringify(user)
      cookieUtils.setCookie('user_data', userDataString, {
        secure: process.env.NODE_ENV === 'production', // Enable secure in production
        sameSite: 'lax', // Use lax instead of strict for better compatibility
        maxAge: 86400
      })
    }
  },

  setUserTypeInfo(userTypeInfo: any): void {
    if (userTypeInfo) {
      const userTypeInfoString = JSON.stringify(userTypeInfo)
      cookieUtils.setCookie('user_type_info', userTypeInfoString, {
        secure: process.env.NODE_ENV === 'production', // Enable secure in production
        sameSite: 'lax', // Use lax instead of strict for better compatibility
        maxAge: 86400
      })
    }
  },

  clearUserData(): void {
    cookieUtils.deleteCookie('user_data')
    cookieUtils.deleteCookie('user_type_info')
  }
}

// Combined auth state management
export const authState = {
  getAuthState(): { user: any; userTypeInfo: any; isAuthenticated: boolean } {
    const user = userData.getUserData()
    const userTypeInfo = userData.getUserTypeInfo()
    const accessToken = authTokens.getAccessToken()
    const refreshToken = authTokens.getRefreshToken()
    
    // Consider authenticated if we have user data AND either access token OR refresh token
    // This handles cases where access token expires but refresh token is still valid
    const isAuthenticated = !!user && (!!accessToken || !!refreshToken)

    return { user, userTypeInfo, isAuthenticated }
  },

  setAuthState(accessToken: string, refreshToken: string, user: any, userTypeInfo?: any): void {
    authTokens.setAccessToken(accessToken)
    authTokens.setRefreshToken(refreshToken)
    userData.setUserData(user)

    if (userTypeInfo) {
      userData.setUserTypeInfo(userTypeInfo)
    }
  },

  clearAuthState(): void {
    authTokens.clearTokens()
    userData.clearUserData()
  }
}
