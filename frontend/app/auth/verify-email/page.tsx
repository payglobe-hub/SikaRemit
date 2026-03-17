'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { verifyEmail } from '@/lib/api/auth'
import { useToast } from '@/hooks/use-toast'

function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'invalid'>('loading')
  const { toast } = useToast()

  useEffect(() => {
    if (!token) {
      setStatus('invalid')
      return
    }

    const verify = async () => {
      try {
        await verifyEmail(token)
        setStatus('success')
        toast({
          title: 'Email Verified',
          description: 'Your email has been successfully verified.',
        })
      } catch (error: any) {
        setStatus('error')
        toast({
          title: 'Verification Failed',
          description: error.response?.data?.error || 'The verification link is invalid or has expired.',
          variant: 'destructive',
        })
      }
    }

    verify()
  }, [token])

  if (status === 'loading') {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Verifying Email...</h1>
        <p className="text-sm text-gray-600">Please wait while we verify your email address.</p>
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Invalid Verification Link</h1>
        <p className="text-sm text-gray-600">
          This email verification link is invalid.
        </p>
        <div className="pt-4">
          <Link href="/auth/login" className="text-blue-600 hover:text-blue-500 font-medium text-sm">
            Go to login
          </Link>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Verification Failed</h1>
        <p className="text-sm text-gray-600">
          The verification link is invalid or has expired.
        </p>
        <div className="pt-4">
          <Link href="/auth/login" className="text-blue-600 hover:text-blue-500 font-medium text-sm">
            Go to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="text-center space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Email Verified!</h1>
      <p className="text-sm text-gray-600">
        Your email has been successfully verified. You can now sign in.
      </p>
      <div className="pt-4">
        <Link href="/auth/login">
          <Button className="w-full">Sign In</Button>
        </Link>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<div className="text-center space-y-4"><p>Loading...</p></div>}>
      <VerifyEmailPage />
    </Suspense>
  )
}
