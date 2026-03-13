'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { resetPassword } from '@/lib/api/auth'
import { useToast } from '@/hooks/use-toast'

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const { toast } = useToast()

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Invalid Reset Link</h1>
        <p className="text-sm text-gray-600">
          This password reset link is invalid or has expired.
        </p>
        <Link href="/auth/forgot-password" className="text-blue-600 hover:text-blue-500 font-medium text-sm">
          Request a new reset link
        </Link>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match.',
        variant: 'destructive',
      })
      return
    }

    if (password.length < 8) {
      toast({
        title: 'Error',
        description: 'Password must be at least 8 characters.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      await resetPassword(token, password)
      setIsSuccess(true)
      toast({
        title: 'Password Reset',
        description: 'Your password has been successfully reset.',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to reset password. The link may have expired.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Password Reset Successfully</h1>
        <p className="text-sm text-gray-600">
          Your password has been updated. You can now sign in with your new password.
        </p>
        <div className="pt-4">
          <Link href="/auth/login">
            <Button className="w-full">Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <h1 className="text-xl font-bold text-gray-900 text-center">Set New Password</h1>
      <p className="mt-2 text-sm text-gray-600 text-center">
        Enter your new password below
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="password">New Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading || !password || !confirmPassword}>
          {isLoading ? 'Resetting...' : 'Reset Password'}
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
