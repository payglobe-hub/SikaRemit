'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from '@/lib/auth/context'
import { getPermissionOverview } from '@/lib/api/admin-hierarchy'

// Permission constants matching backend permissions
export const PERMISSIONS = {
  USER_MANAGEMENT: 'user_management',
  ADMIN_MANAGEMENT: 'admin_management',
  KYC_REVIEW: 'kyc_review',
  COMPLIANCE_MONITORING: 'compliance_monitoring',
  TRANSACTION_OVERRIDE: 'transaction_override',
  MERCHANT_APPROVAL: 'merchant_approval',
  SUPPORT_MANAGEMENT: 'support_management',
  REPORTING: 'reporting',
  SYSTEM_SETTINGS: 'system_settings',
  VERIFICATION_ONLY: 'verification_only',
  AUDIT_LOGS: 'audit_logs',
  EMERGENCY_OVERRIDE: 'emergency_override',
} as const

type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]

// Role-based permission mapping - FALLBACK ONLY, should load from backend
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  super_admin: [
    PERMISSIONS.USER_MANAGEMENT,
    PERMISSIONS.ADMIN_MANAGEMENT,
    PERMISSIONS.KYC_REVIEW,
    PERMISSIONS.COMPLIANCE_MONITORING,
    PERMISSIONS.TRANSACTION_OVERRIDE,
    PERMISSIONS.MERCHANT_APPROVAL,
    PERMISSIONS.SUPPORT_MANAGEMENT,
    PERMISSIONS.REPORTING,
    PERMISSIONS.SYSTEM_SETTINGS,
    PERMISSIONS.AUDIT_LOGS,
    PERMISSIONS.EMERGENCY_OVERRIDE,
  ],
  business_admin: [
    PERMISSIONS.KYC_REVIEW,
    PERMISSIONS.COMPLIANCE_MONITORING,
    PERMISSIONS.TRANSACTION_OVERRIDE,
    PERMISSIONS.MERCHANT_APPROVAL,
    PERMISSIONS.REPORTING,
    PERMISSIONS.AUDIT_LOGS,
  ],
  operations_admin: [
    PERMISSIONS.SUPPORT_MANAGEMENT,
    PERMISSIONS.REPORTING,
  ],
  verification_admin: [
    PERMISSIONS.VERIFICATION_ONLY,
  ],
  merchant: [],
  customer: [],
}

interface PermissionsContextType {
  hasPermission: (permission: Permission) => boolean
  hasAnyPermission: (permissions: Permission[]) => boolean
  hasAllPermissions: (permissions: Permission[]) => boolean
  canAccessRoute: (route: string) => boolean
  getUserPermissions: () => Permission[]
  userRole: string
  userLevel: number
  isLoading: boolean
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined)

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [userPermissions, setUserPermissions] = useState<Permission[]>([])
  const [userRole, setUserRole] = useState<string>('')
  const [userLevel, setUserLevel] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null)

  useEffect(() => {
    const loadPermissions = async () => {
      // Don't load if no user or already loaded for this user
      if (!user || loadedUserId === user.id) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)

        // Only try to load permissions from backend for admin users
        const adminRoles = ['super_admin', 'business_admin', 'operations_admin', 'verification_admin']
        const isAdminUser = adminRoles.includes(user.role)

        if (isAdminUser) {
          // Try to load actual permissions from backend for admin users
          try {
            
            const permissionOverview = await getPermissionOverview()
            setUserPermissions(permissionOverview.user_permissions as Permission[])
            setUserRole(permissionOverview.user_role)
            setUserLevel(permissionOverview.user_level)
            setLoadedUserId(user.id) // Mark as loaded for this user
            
          } catch (permissionError: any) {
            
            // If it's a 401, wait a moment for token refresh and retry once
            if (permissionError?.response?.status === 401) {
              
              await new Promise(resolve => setTimeout(resolve, 2000)) // Wait longer for token refresh
              try {
                const permissionOverview = await getPermissionOverview()
                setUserPermissions(permissionOverview.user_permissions as Permission[])
                setUserRole(permissionOverview.user_role)
                setUserLevel(permissionOverview.user_level)
                setLoadedUserId(user.id)
                
              } catch (retryError) {
                
                // Use fallback permissions
                const fallbackPermissions = ROLE_PERMISSIONS[user.role] || []
                setUserPermissions(fallbackPermissions)
                setUserRole(user.role)
                setUserLevel(getUserLevel(user.role))
                setLoadedUserId(user.id)
              }
            } else {
              // Use fallback permissions for other errors
              const fallbackPermissions = ROLE_PERMISSIONS[user.role] || []
              setUserPermissions(fallbackPermissions)
              setUserRole(user.role)
              setUserLevel(getUserLevel(user.role))
              setLoadedUserId(user.id)
            }
          }
        } else {
          // For non-admin users (merchants, customers), use role-based permissions directly
          const fallbackPermissions = ROLE_PERMISSIONS[user.role] || []
          setUserPermissions(fallbackPermissions)
          setUserRole(user.role)
          setUserLevel(getUserLevel(user.role))
          setLoadedUserId(user.id)
        }
      } catch (error) {

        // Fallback to role-based permissions
        const fallbackPermissions = ROLE_PERMISSIONS[user.role] || []
        setUserPermissions(fallbackPermissions)
        setUserRole(user.role)
        setUserLevel(getUserLevel(user.role))
        setLoadedUserId(user.id)
      } finally {
        setIsLoading(false)
      }
    }

    loadPermissions()
  }, [user?.id]) // Only depend on user.id instead of whole user object

  const getUserLevel = (role: string): number => {
    const roleLevels: Record<string, number> = {
      'super_admin': 1,
      'business_admin': 2,
      'operations_admin': 3,
      'verification_admin': 4,
    }
    return roleLevels[role] || 0
  }

  const getUserPermissions = (): Permission[] => {
    return userPermissions
  }

  const hasPermission = (permission: Permission): boolean => {
    if (isLoading) return false
    return userPermissions.includes(permission)
  }

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    const userPermissions = getUserPermissions()
    return permissions.some(permission => userPermissions.includes(permission))
  }

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    const userPermissions = getUserPermissions()
    return permissions.every(permission => userPermissions.includes(permission))
  }

  const canAccessRoute = (route: string): boolean => {
    // Route-based access control
    const routePermissions: Record<string, Permission[]> = {
      '/admin/users': [PERMISSIONS.USER_MANAGEMENT],
      '/admin/admins': [PERMISSIONS.ADMIN_MANAGEMENT],
      '/admin/compliance': [PERMISSIONS.KYC_REVIEW, PERMISSIONS.COMPLIANCE_MONITORING],
      '/admin/verification': [PERMISSIONS.VERIFICATION_ONLY],
      '/admin/settings': [PERMISSIONS.SYSTEM_SETTINGS],
      '/admin/merchants': [PERMISSIONS.MERCHANT_APPROVAL],
      '/admin/transactions': [PERMISSIONS.TRANSACTION_OVERRIDE],
      '/admin/reports': [PERMISSIONS.REPORTING],
      '/admin/disputes': [PERMISSIONS.TRANSACTION_OVERRIDE],
      '/admin/analytics': [PERMISSIONS.REPORTING],
      '/admin/fees': [PERMISSIONS.SYSTEM_SETTINGS],
      '/admin/webhooks': [PERMISSIONS.SYSTEM_SETTINGS],
    }

    const requiredPermissions = routePermissions[route]
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true // No specific permissions required
    }

    return hasAnyPermission(requiredPermissions)
  }

  const value: PermissionsContextType = {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessRoute,
    getUserPermissions,
    userRole,
    userLevel,
    isLoading,
  }

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions() {
  const context = useContext(PermissionsContext)
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider')
  }
  return context
}
