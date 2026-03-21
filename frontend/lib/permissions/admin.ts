import { getPermissionOverview } from '@/lib/api/admin-hierarchy'
import React from 'react'

// Permission checking utilities for frontend
export class AdminPermissionChecker {
  private permissions: string[] = []
  private userLevel: number = 0
  private loading: boolean = true

  constructor() {
    this.loadPermissions()
  }

  private async loadPermissions() {
    try {
      const overview = await getPermissionOverview()
      this.permissions = overview.user_permissions
      this.userLevel = overview.user_level
    } catch (error) {
      
    } finally {
      this.loading = false
    }
  }

  hasPermission(permission: string): boolean {
    if (this.loading) return false
    return this.permissions.includes(permission)
  }

  hasAnyPermission(permissions: string[]): boolean {
    if (this.loading) return false
    return permissions.some(permission => this.permissions.includes(permission))
  }

  hasAllPermissions(permissions: string[]): boolean {
    if (this.loading) return false
    return permissions.every(permission => this.permissions.includes(permission))
  }

  isAtLeastLevel(minLevel: number): boolean {
    if (this.loading) return false
    return this.userLevel <= minLevel
  }

  isExactlyLevel(level: number): boolean {
    if (this.loading) return false
    return this.userLevel === level
  }

  canManageAdmins(): boolean {
    return this.hasPermission('admin_management') && this.isAtLeastLevel(1)
  }

  canManageUsers(): boolean {
    return this.hasPermission('user_management')
  }

  canReviewKYC(): boolean {
    return this.hasPermission('kyc_review')
  }

  canApproveMerchants(): boolean {
    return this.hasPermission('merchant_approval')
  }

  canOverrideTransactions(): boolean {
    return this.hasPermission('transaction_override')
  }

  canAccessAuditLogs(): boolean {
    return this.hasPermission('audit_logs')
  }

  canAccessSystemSettings(): boolean {
    return this.hasPermission('system_settings')
  }

  canAccessReporting(): boolean {
    return this.hasPermission('reporting')
  }

  canManageSupport(): boolean {
    return this.hasPermission('support_management')
  }

  canVerifyDocuments(): boolean {
    return this.hasPermission('verification_only')
  }

  canUseEmergencyOverride(): boolean {
    return this.hasPermission('emergency_override')
  }

  isLoading(): boolean {
    return this.loading
  }

  getPermissions(): string[] {
    return [...this.permissions]
  }

  getUserLevel(): number {
    return this.userLevel
  }
}

// Create a singleton instance
export const adminPermissions = new AdminPermissionChecker()

// React hook for admin permissions
export function useAdminPermissions() {
  return adminPermissions
}

// Permission-based component wrapper
export function withAdminPermission<T extends object>(
  Component: React.ComponentType<T>,
  requiredPermission: string,
  fallback?: React.ComponentType<any>
) {
  return function PermissionWrapper(props: T) {
    if (adminPermissions.hasPermission(requiredPermission)) {
      return React.createElement(Component, props)
    }
    if (fallback) {
      return React.createElement(fallback)
    }
    return null
  }
}

// Multiple permission wrapper
export function withAdminPermissions<T extends object>(
  Component: React.ComponentType<T>,
  requiredPermissions: string[],
  requireAll: boolean = false,
  fallback?: React.ComponentType<any>
) {
  return function PermissionsWrapper(props: T) {
    const hasPermission = requireAll 
      ? adminPermissions.hasAllPermissions(requiredPermissions)
      : adminPermissions.hasAnyPermission(requiredPermissions)
    
    if (hasPermission) {
      return React.createElement(Component, props)
    }
    if (fallback) {
      return React.createElement(fallback)
    }
    return null
  }
}

// Level-based wrapper
export function withAdminLevel<T extends object>(
  Component: React.ComponentType<T>,
  minLevel: number,
  fallback?: React.ComponentType<any>
) {
  return function LevelWrapper(props: T) {
    if (adminPermissions.isAtLeastLevel(minLevel)) {
      return React.createElement(Component, props)
    }
    if (fallback) {
      return React.createElement(fallback)
    }
    return null
  }
}
