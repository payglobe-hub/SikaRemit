'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { register } from '@/lib/api/auth'
import { useToast } from '@/hooks/use-toast'

export function RegisterForm({ userType = 'customer' }: { userType?: 'customer' | 'merchant' }) {

  const [formData, setFormData] = React.useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    userType: 6 // Always customer for this form
  })
  const [isLoading, setIsLoading] = React.useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)
    try {
      await register({
        email: formData.email,
        password: formData.password,
        password2: formData.confirmPassword,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        userType: formData.userType
      })
      
      toast({
        title: 'Success',
        description: 'Account created successfully! Please check your email for verification.'
      })
      
      router.push('/auth?verified=check')
    } catch (error: any) {
      let errorMessage = 'Registration failed'
      
      if (error.response?.data) {
        // Handle Django REST framework validation errors
        if (typeof error.response.data === 'object') {
          const errors = error.response.data
          if (errors.email) {
            errorMessage = Array.isArray(errors.email) ? errors.email[0] : errors.email
          } else if (errors.password) {
            errorMessage = Array.isArray(errors.password) ? errors.password[0] : errors.password
          } else if (errors.non_field_errors) {
            errorMessage = Array.isArray(errors.non_field_errors) ? errors.non_field_errors[0] : errors.non_field_errors
          } else {
            // Get first error from any field
            const firstError = Object.values(errors)[0]
            errorMessage = Array.isArray(firstError) ? firstError[0] : firstError
          }
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data
        }
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            name="firstName"
            type="text"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="John"
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            name="lastName"
            type="text"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="Doe"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder=""
          required
        />
      </div>

      <div>
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={handleChange}
          placeholder=""
        />
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="••••••••"
          required
        />
      </div>

      <div>
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="••••••••"
          required
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Creating Account...' : 'Create Account'}
      </Button>
    </form>
  )
}
