'use client'

import { useEffect, useState } from 'react'
import { useSafeAuth, useSafeSession } from '@/lib/auth/safe-auth'
import { authState, authTokens } from '@/lib/utils/cookie-auth'
import { useSession } from '@/lib/auth/session-provider'
import { useAuth } from '@/lib/auth/context'

// Force dynamic rendering to prevent SSR issues with auth
export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export default function DebugPage() {
  const { user, status } = useSafeSession()
  const { user: authUser, loading } = useSafeAuth()
  const [cookieDebug, setCookieDebug] = useState<any>({})

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

    checkCookies()
    const interval = setInterval(checkCookies, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Authentication Debug</h1>
      
      <div className="space-y-6">
        <div className="border p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Session Provider</h2>
          <pre className="text-sm bg-gray-100 p-2 rounded">
            {JSON.stringify({ status, user }, null, 2)}
          </pre>
        </div>

        <div className="border p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Auth Provider</h2>
          <pre className="text-sm bg-gray-100 p-2 rounded">
            {JSON.stringify({ loading, user: authUser }, null, 2)}
          </pre>
        </div>

        <div className="border p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Cookie Debug</h2>
          <pre className="text-sm bg-gray-100 p-2 rounded">
            {JSON.stringify(cookieDebug, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}
