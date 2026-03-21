'use client'

import { useRouter } from 'next/navigation'
import { authState, cookieUtils } from '@/lib/utils/cookie-auth'

export default function LogoutTestPage() {
  const router = useRouter()

  const logout = () => {
    // Clear all authentication state
    authState.clearAuthState()
    // Clear all cookies
    cookieUtils.deleteCookie('access_token')
    cookieUtils.deleteCookie('refresh_token')
    cookieUtils.deleteCookie('user_data')
    cookieUtils.deleteCookie('user_type_info')
    
    // Clear localStorage if any
    if (typeof window !== 'undefined') {
      localStorage.clear()
      sessionStorage.clear()
    }
    
    // Redirect to login
    router.push('/auth/login')
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Logout Test</h1>
      <p className="mb-4">Click the button below to logout and clear all authentication state.</p>
      <button 
        onClick={logout}
        className="px-6 py-3 bg-red-500 text-white rounded hover:bg-red-600 font-semibold"
      >
        Logout & Clear All Auth
      </button>
    </div>
  )
}
