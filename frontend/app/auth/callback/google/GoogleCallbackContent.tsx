'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { googleOAuthCallback } from '@/lib/api/auth'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import { authTokens, authState } from '@/lib/utils/cookie-auth'

export function GoogleCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(true)
  const [status, setStatus] = useState(null)
  const [message, setMessage] = useState(null)
  const hasProcessed = useRef(false)

  useEffect(() => {
    const handleCallback = async () => {
      // Prevent multiple calls (React Strict Mode, etc.)
      if (hasProcessed.current) return
      hasProcessed.current = true
      
      try {
        const code = searchParams.get('code')
        const error = searchParams.get('error')

        if (error) {
          throw new Error(`OAuth error: ${error}`)
        }

        if (!code) {
          throw new Error('No authorization code received')
        }

        
        
        // Exchange the code for tokens using the API function
        const tokens = await googleOAuthCallback(code)
        
        // Store tokens using cookie-based auth system (SSR-safe)
        authTokens.setAccessToken(tokens.access)
        authTokens.setRefreshToken(tokens.refresh)
        
        // Store user data using cookie utilities
        const userData = {
          id: tokens.user.id,
          email: tokens.user.email,
          first_name: tokens.user.first_name,
          last_name: tokens.user.last_name,
          role: tokens.user.role,
        }
        
        const userTypeInfo = {
          user_type: tokens.user.role === 'customer' ? 6 : tokens.user.role === 'merchant' ? 5 : 1,
          role: tokens.user.role,
        }
        
        authState.setAuthState(tokens.access, tokens.refresh, userData, userTypeInfo)

        // Trigger login in auth context (this will update the user state)
        // Note: We'll refresh the page to trigger auth context update
        toast({
          title: 'Success',
          description: 'Successfully signed in with Google!',
        })

        // Redirect based on user role - SOCIAL LOGIN IS FOR CUSTOMERS ONLY
        if (tokens.user.role === 'customer') {
          router.push('/customer')
        } else {
          // Non-customers cannot use social login for security reasons
          toast({
            title: 'Access Denied',
            description: 'Social login is available for customers only. Please contact support for other account types.',
            variant: 'destructive',
          })
          router.push('/auth')
          return
        }
      } catch (error: any) {
        console.error('Google OAuth callback error:', error)

        // Check if it's a configuration error
        if (error.message && error.message.includes('not configured')) {
          toast({
            title: 'Google Sign-in Unavailable',
            description: 'Google OAuth is not configured on this server. Please use email and password to sign in.',
            variant: 'destructive',
          })
        } else {
          toast({
            title: 'Authentication Failed',
            description: error.message || 'Failed to complete Google sign-in',
            variant: 'destructive',
          })
        }
        router.push('/auth')
      } finally {
        setIsProcessing(false)
      }
    }

    handleCallback()
  }, [searchParams, router, toast])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="text-muted-foreground">
          {isProcessing ? 'Completing sign-in...' : 'Redirecting...'}
        </p>
      </div>
    </div>
  )
}

