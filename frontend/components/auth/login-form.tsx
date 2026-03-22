'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth/context'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

export function LoginForm({ userType = 'customer' }: { userType?: 'customer' | 'merchant' | 'admin' }) {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [isLoggingIn, setIsLoggingIn] = React.useState(false)
  const { login } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async () => {

    if (!email || !password) {
      
      toast({
        title: 'Error',
        description: 'Please enter both email and password',
        variant: 'destructive'
      })
      return
    }

    setIsLoggingIn(true)
    try {

      const role = await login(email, password)

      toast({
        title: 'Login Successful',
        description: 'Redirecting to dashboard...',
      })
      
      // Handle redirect based on role - Support all 6 user types
      const redirectPath = {
        // Admin types (1-4)
        'super_admin': '/admin/overview',
        'business_admin': '/admin/compliance',
        'operations_admin': '/admin/support',
        'verification_admin': '/admin/verification',
        
        // Regular users (5-6)
        'merchant': '/merchant/dashboard',
        'customer': '/customer/dashboard',
        
        // Fallback for backward compatibility
        'admin': '/admin/overview'
      }[role] || '/customer/dashboard'

      // Add delay to ensure auth state is properly set before redirect
      setTimeout(() => {
        
        window.location.href = redirectPath
      }, 1000) // Increased delay to 1000ms to prevent race conditions

    } catch (error: any) {

      const errorMessage = error.response?.data?.error ||
                           error.response?.data?.non_field_errors?.[0] ||
                           error.response?.data?.detail ||
                           error.message ||
                           'Invalid credentials';
      
      toast({
        title: 'Login Failed',
        description: errorMessage,
        variant: 'destructive'
      })
      // IMPORTANT: Do NOT redirect on login failure - stay on current page
      // This ensures admin login failures stay on admin portal, not customer/merchant pages
    } finally {
      
      setIsLoggingIn(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
        />
      </div>

      <Button
        onClick={handleLogin}
        disabled={isLoggingIn || !email || !password}
        className="w-full h-10"
      >
        {isLoggingIn ? 'Logging in...' : 'Login'}
      </Button>

    </div>
  )
}

