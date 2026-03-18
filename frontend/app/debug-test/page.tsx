'use client'

import { useState, useEffect } from 'react'
import { authState, authTokens, cookieUtils } from '@/lib/utils/cookie-auth'

export default function DebugTestPage() {
  const [testResult, setTestResult] = useState<string>('')
  const [isClient, setIsClient] = useState(false)
  const [cookieDebug, setCookieDebug] = useState<any>({})

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    const checkCookies = () => {
      const accessToken = authTokens.getAccessToken()
      const refreshToken = authTokens.getRefreshToken()
      const authStateInfo = authState.getAuthState()
      
      setCookieDebug({
        hasAccessToken: !!accessToken,
        accessTokenLength: accessToken?.length,
        hasRefreshToken: !!refreshToken,
        refreshTokenLength: refreshToken?.length,
        authState: authStateInfo,
        allCookies: document.cookie
      })
    }

    if (isClient) {
      checkCookies()
      const interval = setInterval(checkCookies, 1000)
      return () => clearInterval(interval)
    }
  }, [isClient])

  const testCookieSetting = () => {
    try {
      // Test setting a simple cookie
      cookieUtils.setCookie('test_cookie', 'test_value', { maxAge: 3600 })
      
      // Test reading it back
      const readValue = cookieUtils.getCookie('test_cookie')
      
      setTestResult(`Set: test_cookie=test_value, Read: ${readValue}`)
    } catch (error) {
      setTestResult(`Error: ${error}`)
    }
  }

  const testAuthCookies = () => {
    try {
      // Test setting auth cookies like the login does
      const testUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'customer'
      }

      authState.setAuthState(
        'test_access_token_12345',
        'test_refresh_token_67890',
        testUser,
        { label: 'Customer', color: 'blue' }
      )

      // Verify they were set
      const accessToken = authTokens.getAccessToken()
      const refreshToken = authTokens.getRefreshToken()
      const authStateInfo = authState.getAuthState()

      setTestResult(`Auth cookies set. Access: ${accessToken?.substring(0, 20)}..., Refresh: ${refreshToken?.substring(0, 20)}..., AuthState: ${JSON.stringify(authStateInfo)}`)
    } catch (error) {
      setTestResult(`Error: ${error}`)
    }
  }

  const clearAllAuth = () => {
    // Clear all authentication state
    authState.clearAuthState()
    // Clear all cookies
    cookieUtils.deleteCookie('access_token')
    cookieUtils.deleteCookie('refresh_token')
    cookieUtils.deleteCookie('user_data')
    cookieUtils.deleteCookie('user_type_info')
    cookieUtils.deleteCookie('test_cookie')
    
    // Clear localStorage if any
    if (typeof window !== 'undefined') {
      localStorage.clear()
      sessionStorage.clear()
    }
    
    setTestResult('All authentication cleared. Refresh the page and try logging in again.')
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Cookie Test</h1>
      
      <div className="space-y-4">
        <button 
          onClick={testCookieSetting}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Test Simple Cookie
        </button>

        <button 
          onClick={testAuthCookies}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 ml-2"
        >
          Test Auth Cookies
        </button>

        <button 
          onClick={clearAllAuth}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 ml-2"
        >
          Clear ALL Auth & Refresh
        </button>

        <div className="border p-4 rounded mt-4">
          <h2 className="text-xl font-semibold mb-2">Result</h2>
          <pre className="text-sm bg-gray-100 p-2 rounded whitespace-pre-wrap">
            {testResult}
          </pre>
        </div>

        <div className="border p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Current Cookies</h2>
          <pre className="text-sm bg-gray-100 p-2 rounded">
            {typeof document !== 'undefined' ? document.cookie : 'Not available in SSR'}
          </pre>
        </div>
      </div>
    </div>
  )
}
