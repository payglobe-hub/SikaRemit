'use client'

import { useState, useEffect, Suspense } from 'react'
import api from '@/lib/api/axios'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, AlertCircle, Mail, Loader2 } from 'lucide-react'
import Link from 'next/link'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'invalid'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('invalid')
      setMessage('Verification token is missing. Please check your email link.')
      return
    }

    const verifyEmail = async () => {
      try {
        await api.post('/api/v1/accounts/verify-email/', { token })
        setStatus('success')
        setMessage('Your email has been successfully verified! You can now sign in to your account.')
      } catch (error: any) {
        setStatus('error')
        setMessage(error.response?.data?.message || 'Email verification failed. The link may have expired.')
      }
    }

    // Add small delay to show loading state
    setTimeout(verifyEmail, 1000)
  }, [token])

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Verifying your email</h2>
              <p className="text-sm text-gray-600 mt-2">Please wait while we verify your email address...</p>
            </div>
          </div>
        )

      case 'success':
        return (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <div>
              <h2 className="text-md font-semibold text-gray-900">Email Verified!</h2>
              <p className="text-sm text-gray-600 mt-1">{message}</p>
            </div>
            <div className="space-y-3">
              <Link href="/auth/login">
                <Button className="w-full bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 hover:from-blue-700 hover:via-blue-600 hover:to-indigo-600">
                  Sign In to Your Account
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full">
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        )

      case 'error':
        return (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Verification Failed</h2>
              <p className="text-sm text-gray-600 mt-2">{message}</p>
            </div>
            <div className="space-y-2">
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="w-full"
              >
                Try Again
              </Button>
              <Link href="/auth/login">
                <Button variant="outline" className="w-full">
                  Back to Login
                </Button>
              </Link>
            </div>
          </div>
        )

      case 'invalid':
        return (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Mail className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Invalid Verification Link</h2>
              <p className="text-sm text-gray-600 mt-2">{message}</p>
            </div>
            <div className="space-y-2">
              <Link href="/auth/register">
                <Button className="w-full bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 hover:from-blue-700 hover:via-blue-600 hover:to-indigo-600">
                  Create New Account
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="outline" className="w-full">
                  Back to Login
                </Button>
              </Link>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-xl font-medium text-center">Email Verification</h1>
        <p className="text-sm text-gray-600 text-center mt-2">
          Please verify your email address to complete your registration
        </p>
      </div>

      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6">
          {renderContent()}
        </CardContent>
      </Card>

      <div className="text-center text-sm text-gray-500">
        <p>Didn't receive the email? Check your spam folder or</p>
        <Link href="/auth/forgot-password" className="text-blue-600 hover:text-blue-700 font-medium">
          contact support
        </Link>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-medium text-center">Email Verification</h1>
          <p className="text-sm text-gray-600 text-center mt-2">
            Please verify your email address to complete your registration
          </p>
        </div>
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Loading...</h2>
                <p className="text-sm text-gray-600 mt-2">Please wait...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
