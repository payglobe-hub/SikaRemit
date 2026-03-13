'use client'

import { ReactNode, useState } from 'react'
import { useAuth } from '@/lib/auth/context'
import { useSession } from '@/lib/auth/session-provider'
import { redirect } from 'next/navigation'
import AppSidebar from './AppSidebar'
import AppHeader from './AppHeader'
import AppContainer from './AppContainer'

export interface UserTypeConfig {
  label: string
  icon: string
  bgColor: string
  color: string
}

interface AppLayoutProps {
  children: ReactNode
  userType: 'customer' | 'merchant' | 'admin'
  navigation?: NavigationItem[]
}

export interface NavigationItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description?: string
  badge?: string
  roles?: string[]
  children?: NavigationItem[]
}

export default function AppLayout({ children, userType, navigation }: AppLayoutProps) {
  const { user, loading } = useAuth()
  const session = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Loading state
  if (loading || session.status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto animate-pulse">
            <div className="w-8 h-8 bg-primary-foreground rounded-lg animate-pulse" />
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-foreground">SikaRemit</h1>
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

  // Authentication check
  if (session.status === 'unauthenticated' || !user) {
    redirect('/auth')
    return null
  }

  // User role validation - admin sub-roles map to 'admin' userType
  const adminRoles = ['super_admin', 'business_admin', 'operations_admin', 'verification_admin']
  const effectiveType = adminRoles.includes(user.role) ? 'admin' : user.role
  if (effectiveType !== userType) {
    const roleRedirects: Record<string, string> = {
      admin: '/admin/overview',
      super_admin: '/admin/overview',
      business_admin: '/admin/overview',
      operations_admin: '/admin/overview',
      verification_admin: '/admin/overview',
      merchant: '/merchant/dashboard',
      customer: '/customer/dashboard'
    }
    const redirectPath = roleRedirects[user.role] || '/auth'
    redirect(redirectPath)
    return null
  }

  const showSidebar = userType !== 'customer'

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay - only for merchant/admin */}
      {showSidebar && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - only for merchant/admin */}
      {showSidebar && (
        <AppSidebar
          userType={userType}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onToggleCollapsed={setSidebarCollapsed}
          collapsed={sidebarCollapsed}
          navigation={navigation}
        />
      )}

      {/* Header */}
      <AppHeader
        userType={userType}
        onMenuClick={showSidebar ? () => setSidebarOpen(!sidebarOpen) : undefined}
        sidebarOpen={sidebarOpen}
        sidebarCollapsed={showSidebar ? sidebarCollapsed : false}
        showSidebar={showSidebar}
        navigation={navigation}
      />

      {/* Main content */}
      <div className={`transition-all duration-300 ${
        showSidebar
          ? (sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64')
          : ''
      }`}>
        <main className="min-h-screen pt-16 bg-neutral-50/30 dark:bg-neutral-900/30 overflow-y-auto">
          <AppContainer>
            {children}
          </AppContainer>
        </main>
      </div>
    </div>
  )
}
