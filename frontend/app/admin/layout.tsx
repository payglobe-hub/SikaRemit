'use client'

import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/shared/AppLayout'
import { ADMIN_NAVIGATION } from '@/lib/navigation/admin'
import { useSession } from '@/lib/auth/session-provider'
import { PermissionsProvider } from '@/lib/permissions/context'
import { ADMIN_ROLES, isAdminRole as checkIsAdminRole } from '@/lib/constants/admin-roles'
import { authState } from '@/lib/utils/cookie-auth'

interface AdminLayoutProps {
  children: ReactNode
}

// Check if user has any admin role using centralized definition
const isAdminRole = checkIsAdminRole

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, status } = useSession()

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto animate-pulse">
            <div className="w-8 h-8 bg-primary-foreground rounded-lg animate-pulse" />
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-foreground">SikaRemit Admin</h1>
            <p className="text-muted-foreground">Verifying admin access...</p>
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

  // Authentication check
  if (status === 'unauthenticated' || !user) {

    redirect('/auth')
    return null
  }

  // Admin role check
  if (!isAdminRole(user.role)) {

    // Redirect based on user role
    const roleRedirects = {
      customer: '/customer/dashboard',
      merchant: '/merchant/dashboard',
      admin: '/admin/overview'
    }
    const redirectPath = roleRedirects[user.role as keyof typeof roleRedirects] || '/auth'
    redirect(redirectPath)
    return null
  }

  return (
    <PermissionsProvider>
      <AppLayout
        userType="admin"
        navigation={ADMIN_NAVIGATION}
      >
        {children}
      </AppLayout>
    </PermissionsProvider>
  )
}
