'use client'

import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { Store } from 'lucide-react'
import AppLayout from '@/components/shared/AppLayout'
import { MERCHANT_NAVIGATION } from '@/lib/navigation/merchant'
import { useSafeAuth, useSafeSession } from '@/lib/auth/safe-auth'
import { authState } from '@/lib/utils/cookie-auth'

// Force dynamic rendering to prevent SSR issues with auth
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface MerchantLayoutProps {
  children: ReactNode
}

export default function MerchantLayout({ children }: MerchantLayoutProps) {
  const { user, loading } = useSafeAuth()
  const session = useSafeSession()

  if (loading || session.status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-soft mx-auto animate-pulse">
            <Store className="w-8 h-8 text-primary-foreground" />
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-foreground">SikaRemit Merchant</h1>
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

  if (session.status === 'unauthenticated' || !user) {
    redirect('/auth')
    return null
  }

  if (user.role !== 'merchant') {
    const roleRedirects: Record<string, string> = {
      super_admin: '/admin/overview',
      business_admin: '/admin/overview',
      operations_admin: '/admin/overview',
      verification_admin: '/admin/overview',
      admin: '/admin/overview',
      customer: '/customer/dashboard',
    }
    redirect(roleRedirects[user.role] || '/auth')
    return null
  }

  return (
    <AppLayout
      userType="merchant"
      navigation={MERCHANT_NAVIGATION}
    >
      {children}
    </AppLayout>
  )
}
