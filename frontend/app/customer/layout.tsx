'use client'

import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { DollarSign } from 'lucide-react'
import AppLayout from '@/components/shared/AppLayout'
import { CUSTOMER_NAVIGATION } from '@/lib/navigation/customer'
import { useAuth } from '@/lib/auth/context'
import { useSession } from '@/lib/auth/session-provider'
import { authState } from '@/lib/utils/cookie-auth'

interface CustomerLayoutProps {
  children: ReactNode
}

export default function CustomerLayout({ children }: CustomerLayoutProps) {
  const { user, loading } = useAuth()
  const session = useSession()

  // Show loading state while checking authentication
  if (loading || session.status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-soft mx-auto animate-pulse">
            <DollarSign className="w-8 h-8 text-primary-foreground" />
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-foreground">SikaRemit Customer</h1>
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
          <div className="w-48 mx-auto">
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Check if user is authenticated
  if (session.status === 'unauthenticated' || !user) {
    redirect('/auth')
    return null
  }

  // Check if user has customer role
  if (user.role !== 'customer') {
    const roleRedirects = {
      // Admin types - redirect to admin overview
      super_admin: '/admin/overview',
      business_admin: '/admin/overview',
      operations_admin: '/admin/overview',
      verification_admin: '/admin/overview',
      admin: '/admin/overview',
      // Other user types
      merchant: '/merchant/dashboard',
      customer: '/customer/dashboard'
    }
    const redirectPath = roleRedirects[user.role as keyof typeof roleRedirects] || '/customer/dashboard'
    redirect(redirectPath)
    return null
  }

  return (
    <AppLayout
      userType="customer"
      navigation={CUSTOMER_NAVIGATION}
    >
      {children}
    </AppLayout>
  )
}
