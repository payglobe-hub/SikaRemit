import * as React from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

const ToastProvider = ToastPrimitive.Provider

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> & {
    title?: React.ReactNode
    description?: React.ReactNode
    variant?: 'default' | 'destructive'
    action?: {
      label: string
      onClick: () => void
    }
    duration?: number
  }
>(({ className, title, description, variant = 'default', action, children, duration = 5000, ...props }, ref) => (
  <ToastPrimitive.Root
    ref={ref}
    duration={duration}
    className={cn(
      'w-auto max-w-sm rounded-lg p-4 shadow-lg',
      variant === 'destructive' 
        ? 'bg-red-600 text-white border border-red-700' 
        : 'bg-gray-900 text-white',
      className
    )}
    {...props}
  >
    <div className="grid gap-1">
      {title && <ToastPrimitive.Title className="text-sm font-semibold">{title}</ToastPrimitive.Title>}
      {description && <ToastPrimitive.Description className="text-sm opacity-90">{description}</ToastPrimitive.Description>}
      {children}
    </div>
    <div className="flex items-center justify-between mt-2">
      {action && (
        <ToastPrimitive.Action asChild altText={action.label}>
          <Button
            variant="outline"
            size="sm"
            onClick={action.onClick}
            className="mr-2"
          >
            {action.label}
          </Button>
        </ToastPrimitive.Action>
      )}
      <ToastPrimitive.Close asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-white hover:bg-white/20"
        >
          <X className="h-4 w-4" />
        </Button>
      </ToastPrimitive.Close>
    </div>
  </ToastPrimitive.Root>
))
Toast.displayName = ToastPrimitive.Root.displayName

export { ToastProvider, Toast }
