'use client'

import * as React from 'react'
import { Toast } from '@/components/ui/toast'

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  variant?: 'default' | 'destructive'
  action?: {
    label: string
    onClick: () => void
  }
  duration?: number
}

const TOAST_LIMIT = 1
const TOAST_DURATION = 5000

export function useToast() {
  const [toasts, setToasts] = React.useState<ToasterToast[]>([])

  const toast = (props: Omit<ToasterToast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    const duration = props.duration ?? TOAST_DURATION
    
    setToasts((prev) => {
      const newToast = { ...props, id }
      const newToasts = [newToast, ...prev]
      return newToasts.slice(0, TOAST_LIMIT)
    })

    // Auto-dismiss after duration
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
  }

  return {
    toast,
    toasts,
    dismiss: (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)),
  }
}
