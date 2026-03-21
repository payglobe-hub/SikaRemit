'use client'

import { Button } from '@/components/ui/button'
import { LoginForm } from '@/components/auth/login-form'
import Link from 'next/link'
import { ArrowLeft, Globe, Shield, Lock } from 'lucide-react'

// Force dynamic rendering to prevent SSR issues with auth
export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    try {
      // Direct frontend-initiated Google OAuth
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
      const redirectUri = `${window.location.origin}/auth/callback/google`
      const scope = 'openid email profile'
      
      // Debug: Log the client ID being used

      if (!clientId) {
        alert('Google OAuth Client ID is not configured. Please check your environment variables.')
        return
      }
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(scope)}&` +
        `access_type=offline&` +
        `prompt=consent`

      window.location.href = authUrl
    } catch (error) {
      
      alert('Failed to initiate Google sign-in. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Auth */}
        <div className="mb-8">
          <Link href="/auth" className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to options
          </Link>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-8">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl mb-4 overflow-hidden">
              <img src="/logos/SikaRemit.jpeg" alt="SikaRemit" className="w-9 h-9 object-cover rounded-lg" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h1>
            <p className="text-gray-600">Sign in to access your SikaRemit account</p>
          </div>

          {/* Login Form */}
          <div className="space-y-6">
            <LoginForm />
            
            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-medium">Or continue with</span>
              </div>
            </div>
            
            {/* Google Login */}
            <Button 
              variant="outline" 
              className="w-full h-12 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
              onClick={handleGoogleLogin}
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
          </div>

          {/* Footer Links */}
          <div className="mt-8 text-center space-y-4">
            <div className="flex justify-between text-sm">
              <Link href="/auth/forgot-password" className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
                Forgot your password?
              </Link>
              <Link href="/auth/register" className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
                Create account
              </Link>
            </div>
            
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-500 pt-4 border-t border-gray-100">
              <div className="flex items-center space-x-1">
                <Lock className="w-3 h-3" />
                <span>Secure connection</span>
              </div>
              <span className="text-gray-300">â€¢</span>
              <div className="flex items-center space-x-1">
                <Shield className="w-3 h-3" />
                <span>Bank-level security</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

