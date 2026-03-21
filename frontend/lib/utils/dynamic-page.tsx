/**
 * Utility exports for making pages dynamic and preventing SSR issues
 */

// Force dynamic rendering to prevent SSR issues with auth
export const dynamic = 'force-dynamic'

// Use Node.js runtime by default for better compatibility
export const runtime = 'nodejs'

// Prevent static generation
export const revalidate = 0

// Force no caching
export const fetchCache = 'force-no-store'
