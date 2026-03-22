'use client'

import { Suspense } from 'react'
import NextDynamic from 'next/dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoginForm } from '@/components/auth/login-form'
import { Shield, Lock, ArrowLeft, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

// Force dynamic rendering to prevent SSR issues with auth
export const dynamic = 'force-dynamic'
export const runtime = 'edge'

// Dynamically import dialogs with SSR disabled to prevent hydration mismatch
const ForgotPasswordDialog = NextDynamic(() => import('@/components/auth/forgot-password-dialog').then(mod => ({ default: mod.ForgotPasswordDialog })), { ssr: false })

export default function AdminAuthPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-orange-100 dark:from-slate-900 dark:via-red-900 dark:to-orange-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-red-400/20 to-orange-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-orange-400/20 to-yellow-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-red-400/10 to-orange-600/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Floating Icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 animate-bounce delay-300">
          <Shield className="w-6 h-6 text-red-400/30" />
        </div>
        <div className="absolute top-40 right-32 animate-bounce delay-700">
          <Lock className="w-5 h-5 text-orange-400/30" />
        </div>
        <div className="absolute bottom-32 left-32 animate-bounce delay-500">
          <AlertTriangle className="w-7 h-7 text-yellow-400/30" />
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md xl:max-w-lg mx-auto">
          {/* Security Notice */}
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-red-800 dark:text-red-200">Admin Access</h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  This portal is restricted to authorized administrators only. All access attempts are logged and monitored.
                </p>
              </div>
            </div>
          </div>

          {/* Admin System Information */}
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200">Role-Based Access</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Your admin role and permissions are automatically determined based on your account credentials. 
                  No manual role selection required.
                </p>
              </div>
            </div>
          </div>

          {/* Back to Main Auth */}
          <div className="mb-3">
            <Link href="/auth">
              <Button variant="ghost" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Customer Login
              </Button>
            </Link>
          </div>

          {/* Auth Card */}
          <Card className="border-0 shadow-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-white/20 dark:border-slate-700/20">
            <CardHeader className="text-center pb-2">
              <div className="flex items-center justify-center mb-3">
                <div className="p-3 bg-gradient-to-br from-red-500 to-orange-600 rounded-full shadow-lg">
                  <Shield className="w-6 h-6 text-white" />
                </div>
              </div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                Admin Portal
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Secure administrative access with role-based authentication
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
                <LoginForm userType="admin" />
              </Suspense>
              <div className="text-center mt-4">
                <ForgotPasswordDialog userType="admin" />
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Emergency access? Contact{' '}
              <Link href="/admin/support" className="text-red-600 dark:text-red-400 hover:underline">
                system administrator
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
