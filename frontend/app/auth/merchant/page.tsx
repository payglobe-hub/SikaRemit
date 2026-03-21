'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, Shield, Lock, ArrowLeft, FileText } from 'lucide-react'
import Link from 'next/link'

// Dynamically import dialogs with SSR disabled to prevent hydration mismatch
const ForgotPasswordDialog = dynamic(() => import('@/components/auth/forgot-password-dialog').then(mod => ({ default: mod.ForgotPasswordDialog })), { ssr: false })
const MerchantApplicationDialog = dynamic(() => import('@/components/auth/merchant-application-dialog').then(mod => ({ default: mod.MerchantApplicationDialog })), { ssr: false })
const LoginForm = dynamic(() => import('@/components/auth/login-form').then(mod => ({ default: mod.LoginForm })), { ssr: false })

export default function MerchantAuthPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-emerald-400/20 to-teal-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-cyan-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-emerald-400/10 to-blue-600/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Floating Icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 animate-bounce delay-300">
          <Building2 className="w-6 h-6 text-emerald-400/30" />
        </div>
        <div className="absolute top-40 right-32 animate-bounce delay-700">
          <Shield className="w-5 h-5 text-blue-400/30" />
        </div>
        <div className="absolute bottom-32 left-32 animate-bounce delay-500">
          <Lock className="w-7 h-7 text-cyan-400/30" />
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md xl:max-w-lg mx-auto">
          {/* Back to Main Auth */}
          <div className="mb-8">
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
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full shadow-lg">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
              </div>
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                Merchant Portal
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Access your business dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
                <LoginForm userType="merchant" />
              </Suspense>
              <div className="text-center mt-4">
                <ForgotPasswordDialog userType="merchant" />
              </div>
            </CardContent>
          </Card>

          {/* Merchant Application Section */}
          <Card className="border-0 shadow-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-white/20 dark:border-slate-700/20 mt-6">
            <CardHeader className="text-center pb-2">
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
              </div>
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                Not Invited Yet?
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Apply to become a sikaremit merchant partner
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Join thousands of businesses accepting payments through sikaremit.
                  Submit your application and we'll review it within 2-3 business days.
                </p>
                <MerchantApplicationDialog />
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Need help? Contact our{' '}
              <Link href="/support" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                support team
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
