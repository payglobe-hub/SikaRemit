'use client'

import { useToast } from '@/hooks/use-toast'
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export function AuthErrorHandler() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  useEffect(() => {
    if (error) {
      toast({
        title: 'Authentication Error',
        description: getErrorMessage(error),
        variant: 'destructive'
      })
    }
  }, [error, toast])

  return null
}

function getErrorMessage(error: string): string {
  switch (error) {
    case 'OAuthAccountNotLinked':
      return 'This email is already registered with a different provider'
    case 'EmailSignin':
      return 'Failed to send verification email'
    case 'CredentialsSignin':
      return 'Invalid credentials'
    case 'SessionRequired':
      return 'Please sign in to access this page'
    case 'OAuthCallback':
      return 'Error during OAuth callback'
    default:
      return 'An authentication error occurred'
  }
}
