'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { forgotPassword } from '@/lib/api/auth'
import { useToast } from '@/hooks/use-toast'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)
    try {
      await forgotPassword(email)
      setIsSubmitted(true)
      toast({
        title: 'Reset email sent',
        description: 'Check your email for password reset instructions.',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to send reset email. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Check Your Email</h1>
        <p className="text-sm text-gray-600">
          We&apos;ve sent password reset instructions to <strong>{email}</strong>
        </p>
        <p className="text-sm text-gray-500">
          Didn&apos;t receive the email? Check your spam folder or{' '}
          <button
            onClick={() => setIsSubmitted(false)}
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            try again
          </button>
        </p>
        <div className="pt-4">
          <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500 text-sm">
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <h1 className="text-xl font-bold text-gray-900 text-center">Reset your password</h1>
      <p className="mt-2 text-sm text-gray-600 text-center">
        Enter your email and we&apos;ll send you a link to reset your password
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading || !email}>
          {isLoading ? 'Sending...' : 'Send Reset Link'}
        </Button>

        <div className="text-center text-sm">
          <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
            Back to login
          </Link>
        </div>
      </form>
    </>
  )
}
