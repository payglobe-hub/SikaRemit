'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { forgotPassword } from '@/lib/api/auth'
import { useToast } from '@/hooks/use-toast'

export function ForgotPasswordForm({ userType = 'customer' }: { userType?: 'customer' | 'merchant' | 'admin' }) {
  const [email, setEmail] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSubmitted, setIsSubmitted] = React.useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
        description: error.message || 'Failed to send reset email',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Check Your Email</h3>
        <p className="text-muted-foreground mb-4">
          We've sent password reset instructions to <strong>{email}</strong>
        </p>
        <p className="text-sm text-muted-foreground">
          Didn't receive the email? Check your spam folder or{' '}
          <button
            onClick={() => setIsSubmitted(false)}
            className="text-primary hover:underline"
          >
            try again
          </button>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email address"
          required
        />
      </div>

      <Button type="submit" disabled={isLoading || !email} className="w-full">
        {isLoading ? 'Sending...' : 'Send Reset Instructions'}
      </Button>
    </form>
  )
}
