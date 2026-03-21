import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sikaremit-card px-4">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-sikaremit-foreground">Page Not Found</h2>
        <p className="text-sikaremit-muted">Could not find the requested resource</p>
        <Link href="/">
          <Button>
            Go Home
          </Button>
        </Link>
      </div>
    </div>
  )
}
