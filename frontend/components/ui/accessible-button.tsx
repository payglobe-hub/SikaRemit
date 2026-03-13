'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  loading?: boolean
  icon?: React.ReactNode
  ariaLabel?: string
}

export function AccessibleButton({
  children,
  className,
  variant = 'default',
  size = 'default',
  loading = false,
  icon,
  ariaLabel,
  disabled,
  ...props
}: AccessibleButtonProps) {
  return (
    <Button
      className={cn(
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        loading && 'cursor-not-allowed',
        className
      )}
      variant={variant}
      size={size}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-busy={loading}
      aria-disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
      )}
      {!loading && icon && <span className="mr-2">{icon}</span>}
      {children}
    </Button>
  )
}
