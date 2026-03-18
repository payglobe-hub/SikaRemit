'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  loading?: boolean
  loadingText?: string
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  description?: string
  pressed?: boolean
  expanded?: boolean
  controls?: string
}

const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({ 
    children, 
    className,
    loading = false,
    loadingText = 'Loading...',
    icon,
    iconPosition = 'left',
    description,
    pressed,
    expanded,
    controls,
    disabled,
    ...props 
  }, ref) => {
    return (
      <Button
        ref={ref}
        className={cn('relative', className)}
        disabled={disabled || loading}
        aria-busy={loading}
        aria-describedby={description ? `btn-desc-${Math.random().toString(36).substr(2, 9)}` : undefined}
        aria-pressed={pressed}
        aria-expanded={expanded}
        aria-controls={controls}
        {...props}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-inherit">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span className="sr-only">{loadingText}</span>
          </div>
        )}
        
        <span className={cn('flex items-center gap-2', loading && 'opacity-0')}>
          {icon && iconPosition === 'left' && icon}
          {children}
          {icon && iconPosition === 'right' && icon}
        </span>
        
        {description && (
          <span 
            id={`btn-desc-${Math.random().toString(36).substr(2, 9)}`}
            className="sr-only"
          >
            {description}
          </span>
        )}
      </Button>
    )
  }
)

AccessibleButton.displayName = 'AccessibleButton'

export { AccessibleButton }
