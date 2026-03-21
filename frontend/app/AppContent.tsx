'use client'

import { TooltipProvider } from '@/components/ui/tooltip'
import { Providers } from './providers'
import { ClientOnly } from '@/components/ClientOnly'
import { EnhancedMainNav } from '@/components/EnhancedMainNav'
import { EnhancedErrorBoundary } from '@/components/EnhancedErrorBoundary'
import { MobileMenu } from '@/components/MobileMenu'
import { Footer } from '@/components/Footer'

interface AppContentProps {
  children: React.ReactNode
}

export function AppContent({ children }: AppContentProps) {
  return (
    <TooltipProvider>
      <Providers>
        <ClientOnly>
          <EnhancedMainNav />
        </ClientOnly>
        <ClientOnly>
          <MobileMenu />
        </ClientOnly>
        <main className="flex-1">
          <EnhancedErrorBoundary>
            {children}
          </EnhancedErrorBoundary>
        </main>
        <Footer />
      </Providers>
    </TooltipProvider>
  )
}
