'use client'

import { ReactNode } from 'react'

interface AuthGuardProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * AuthGuard component to protect routes that require authentication
 * This prevents server-side rendering of authenticated content
 */
export function AuthGuard({ children, fallback = null }: AuthGuardProps) {
  // Only render children on client side
  if (typeof window === 'undefined') {
    return fallback
  }

  return <>{children}</>
}

/**
 * Higher-order component to wrap pages with auth protection
 */
export function withAuthGuard<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    return (
      <AuthGuard>
        <Component {...props} />
      </AuthGuard>
    )
  }
}
