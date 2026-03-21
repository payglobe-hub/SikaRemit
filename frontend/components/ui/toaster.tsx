import * as React from 'react'
import { ToastProvider, Toast } from '@/components/ui/toast'
import { useToast } from '@/hooks/use-toast'
import * as ToastPrimitive from '@radix-ui/react-toast'

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, variant, action, duration, ...props }) => (
        <Toast 
          key={id} 
          title={title}
          description={description}
          variant={variant}
          action={action}
          duration={duration}
          {...props}
        />
      ))}
      <ToastPrimitive.Viewport className="fixed top-0 right-0 z-50 w-full max-w-sm p-4" />
    </ToastProvider>
  )
}
