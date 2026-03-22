'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, UserPlus, LogIn, Sparkles, Shield, Building2, Users, Globe, Lock, Zap } from 'lucide-react'

export default function AuthPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null // Prevent hydration mismatch
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl mb-4 overflow-hidden">
            <img src="/logos/SikaRemit.jpeg" alt="SikaRemit" className="w-8 h-8 object-cover rounded-xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to SikaRemit
          </h1>
          <p className="text-base text-gray-600">
            Your gateway to secure, fast, and reliable payment solutions worldwide
          </p>
        </div>

        {/* Main Action Cards */}
        <div className="space-y-3 mb-6">
          <Link href="/auth/login" className="block group">
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all duration-300 group-hover:border-blue-300">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <LogIn className="w-5 h-5 text-blue-600" />
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Sign In</h3>
              <p className="text-gray-600">Access your existing account and manage your payments</p>
            </div>
          </Link>

          <Link href="/auth/register" className="block group">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 border border-transparent rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <UserPlus className="w-6 h-6 text-white" />
                </div>
                <ArrowRight className="w-5 h-5 text-white/80 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Create Account</h3>
              <p className="text-blue-100">Join thousands of businesses using SikaRemit</p>
            </div>
          </Link>
        </div>

        {/* Portal Access */}
        <div className="mb-8">
          <div className="text-center mb-4">
            <span className="text-sm font-medium text-gray-500">SPECIALIZED PORTALS</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/auth/admin" className="group">
              <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-red-300 hover:shadow-md transition-all duration-300">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-red-200 transition-colors">
                  <Shield className="w-5 h-5 text-red-600" />
                </div>
                <h4 className="font-semibold text-gray-900 text-sm mb-1">Admin</h4>
                <p className="text-xs text-gray-600">System administration</p>
              </div>
            </Link>

            <Link href="/auth/merchant" className="group">
              <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-emerald-300 hover:shadow-md transition-all duration-300">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-emerald-200 transition-colors">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                </div>
                <h4 className="font-semibold text-gray-900 text-sm mb-1">Merchant</h4>
                <p className="text-xs text-gray-600">Business dashboard</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Footer Links */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-6 text-sm">
            <Link href="/auth/forgot-password" className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
              Forgot password?
            </Link>
            <span className="text-gray-300">•</span>
            <Link href="/contact" className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
              Need help?
            </Link>
          </div>
          
          <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <Lock className="w-3 h-3" />
              <span>Secure & Encrypted</span>
            </div>
            <span className="text-gray-300">•</span>
            <div className="flex items-center space-x-1">
              <Zap className="w-3 h-3" />
              <span>Lightning Fast</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}