'use client'

import React from 'react'
import { usePermissions } from '@/lib/permissions/context'
import { useAuth } from '@/lib/auth/context'
import { PERMISSIONS } from '@/lib/permissions/context'

interface PermissionGuardProps {
  children: React.ReactNode
  permission?: typeof PERMISSIONS[keyof typeof PERMISSIONS]
  permissions?: typeof PERMISSIONS[keyof typeof PERMISSIONS][]
  requireAll?: boolean
  fallback?: React.ReactNode
  role?: string | string[]
}

export function PermissionGuard({
  children,
  permission,
  permissions = [],
  requireAll = false,
  fallback = null,
  role,
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions()
  const { user } = useAuth()

  // Check role-based access
  if (role) {
    const userRole = user?.role
    
    if (Array.isArray(role)) {
      if (!userRole || !role.includes(userRole)) {
        return <>{fallback}</>
      }
    } else {
      if (userRole !== role) {
        return <>{fallback}</>
      }
    }
  }

  // Check permission-based access
  if (permission) {
    if (!hasPermission(permission)) {
      return <>{fallback}</>
    }
  }

  if (permissions.length > 0) {
    const hasAccess = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)
    
    if (!hasAccess) {
      return <>{fallback}</>
    }
  }

  return <>{children}</>
}

// Higher-order component for permission-based rendering
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  permission: typeof PERMISSIONS[keyof typeof PERMISSIONS],
  fallback?: React.ReactNode
) {
  return function WithPermissionComponent(props: P) {
    return (
      <PermissionGuard permission={permission} fallback={fallback}>
        <WrappedComponent {...props} />
      </PermissionGuard>
    )
  }
}

// Hook for conditional rendering
export function usePermissionGuard() {
  const { hasPermission, hasAnyPermission, hasAllPermissions, canAccessRoute } = usePermissions()

  const guard = (condition: boolean, fallback?: React.ReactNode) => {
    return condition ? <>{fallback}</> : null
  }

  const permissionGuard = (
    permission: typeof PERMISSIONS[keyof typeof PERMISSIONS],
    fallback?: React.ReactNode
  ) => {
    return guard(hasPermission(permission), fallback)
  }

  const permissionsGuard = (
    permissions: typeof PERMISSIONS[keyof typeof PERMISSIONS][],
    requireAll = false,
    fallback?: React.ReactNode
  ) => {
    const hasAccess = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)
    return guard(hasAccess, fallback)
  }

  const routeGuard = (route: string, fallback?: React.ReactNode) => {
    return guard(canAccessRoute(route), fallback)
  }

  return {
    guard,
    permissionGuard,
    permissionsGuard,
    routeGuard,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessRoute,
  }
}
