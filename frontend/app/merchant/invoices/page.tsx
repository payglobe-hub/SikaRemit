'use client'

import { useState, useEffect } from 'react'

// Force dynamic rendering to prevent SSR issues with auth
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Client-side only wrapper
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false)
  
  useEffect(() => {
    setHasMounted(true)
  }, [])
  
  if (!hasMounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }
  
  return <>{children}</>
}

export default function MerchantInvoicesPage() {
  return (
    <ClientOnly>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Merchant Invoices</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Invoice management functionality is being updated.</p>
          <p className="text-sm text-gray-500 mt-2">This page will be fully functional in the next deployment.</p>
        </div>
      </div>
    </ClientOnly>
  )
}
