'use client'

import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sikaremit-card px-4">
      <div className="text-center space-y-4 max-w-md">
        <h2 className="text-2xl font-bold text-sikaremit-foreground">Something went wrong!</h2>
        <p className="text-sikaremit-muted text-sm">
          {error.message || 'An unexpected error occurred'}
        </p>
        <Button onClick={() => reset()}>
          Try again
        </Button>
      </div>
    </div>
  )
}
