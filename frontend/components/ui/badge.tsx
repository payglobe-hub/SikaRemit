import * as React from 'react'
import { cn } from '@/lib/utils'

type BadgeProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div 
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        {
          'border-transparent bg-primary/10 text-primary': variant === 'default',
          'border-transparent bg-secondary text-secondary-foreground': variant === 'secondary',
          'border-transparent bg-destructive/10 text-destructive': variant === 'destructive',
          'border-transparent bg-green-500/10 text-green-600 dark:text-green-400': variant === 'success',
          'border-transparent bg-yellow-500/10 text-yellow-600 dark:text-yellow-400': variant === 'warning',
          'border-border text-foreground': variant === 'outline'
        },
        className
      )}
      {...props}
    />
  )
}
