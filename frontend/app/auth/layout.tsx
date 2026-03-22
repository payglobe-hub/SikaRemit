import { ReactNode } from 'react'
import Link from 'next/link'
import { Globe, Shield, CreditCard, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AuthLayoutProps {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-blue-400/20 to-blue-300/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-blue-400/15 to-indigo-400/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-conic from-indigo-500/5 via-transparent to-blue-500/5 rounded-full blur-2xl animate-spin" style={{animationDuration: '20s'}}></div>
      </div>
      {/* Header */}
      <header className="relative z-20 border-b border-white/20 bg-white/10 backdrop-blur-xl supports-[backdrop-filter]:bg-white/5 shadow-lg shadow-blue-500/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-12 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2 group relative">
              <div className="relative">
                <img 
                  src="/logos/SikaRemit.jpeg" 
                  alt="SikaRemit Logo" 
                  className="w-8 h-8 rounded-xl object-cover shadow-xl shadow-blue-500/25 group-hover:shadow-2xl group-hover:shadow-blue-500/40 transition-all duration-500 group-hover:scale-110"
                />
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/30 to-indigo-500/30 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute -inset-2 bg-gradient-to-r from-blue-600/20 to-indigo-500/20 rounded-xl blur-xl opacity-0 group-hover:opacity-75 transition-opacity duration-700"></div>
              </div>
              <div className="relative">
                <span className="text-base font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 bg-clip-text text-transparent drop-shadow-sm">
                  SikaRemit
                </span>
                <div className="text-sm text-slate-600/80 -mt-1 hidden sm:block drop-shadow-sm">
                  Secure Payments
                </div>
              </div>
            </Link>

            {/* Right side - Help & Support */}
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="text-slate-600 hover:text-blue-600 bg-white/50 hover:bg-white/70 backdrop-blur-sm border border-white/20 hover:border-blue-200/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
                Help
              </Button>
              <Button variant="ghost" size="sm" className="text-slate-600 hover:text-blue-600 bg-white/50 hover:bg-white/70 backdrop-blur-sm border border-white/20 hover:border-blue-200/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
                Support
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid lg:grid-cols-[1fr_auto] gap-8 items-center min-h-[calc(100vh-6rem)]">
            {/* Left Panel - Marketing */}
            <div className="hidden lg:block space-y-6 animate-in slide-in-from-left duration-700">
              <div className="space-y-4">
                <h1 className="text-xl lg:text-2xl font-bold text-slate-900 leading-tight">
                  Secure Payments
                  <span className="block text-blue-600">Made Simple</span>
                </h1>
                <p className="text-sm text-slate-600 leading-relaxed max-w-md">
                  Experience seamless, secure payment processing with SikaRemit.
                  Built for businesses that demand reliability, speed, and global reach.
                </p>
              </div>

              {/* Feature Cards */}
              <div className="grid gap-4 max-w-md">
                <div className="group relative overflow-hidden">
                  <div className="flex items-center space-x-4 p-5 rounded-2xl bg-white/40 backdrop-blur-xl border border-white/30 shadow-lg shadow-blue-500/5 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-500 hover:bg-white/50 hover:scale-[1.02] hover:-translate-y-1">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 group-hover:text-blue-900 transition-colors text-sm">Bank-Level Security</h3>
                      <p className="text-xs text-slate-600/90 group-hover:text-slate-700 transition-colors">Advanced encryption and compliance</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </div>

                <div className="group relative overflow-hidden">
                  <div className="flex items-center space-x-3 p-4 rounded-2xl bg-white/40 backdrop-blur-xl border border-white/30 shadow-lg shadow-blue-500/5 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-500 hover:bg-white/50 hover:scale-[1.02] hover:-translate-y-1">
                    <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 group-hover:text-blue-900 transition-colors text-sm">Lightning Fast</h3>
                      <p className="text-xs text-slate-600/90 group-hover:text-slate-700 transition-colors">Instant transactions worldwide</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-orange-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </div>

                <div className="group relative overflow-hidden">
                  <div className="flex items-center space-x-4 p-5 rounded-2xl bg-white/40 backdrop-blur-xl border border-white/30 shadow-lg shadow-blue-500/5 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-500 hover:bg-white/50 hover:scale-[1.02] hover:-translate-y-1">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 group-hover:text-blue-900 transition-colors text-sm">Multiple Payment Methods</h3>
                      <p className="text-xs text-slate-600/90 group-hover:text-slate-700 transition-colors">Cards, mobile money, bank transfers</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex space-x-6 pt-2">
                <div className="text-center">
                  <div className="text-xl font-bold text-slate-900">10M+</div>
                  <div className="text-xs text-slate-600">Transactions</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-slate-900">150+</div>
                  <div className="text-xs text-slate-600">Countries</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-slate-900">99.9%</div>
                  <div className="text-xs text-slate-600">Uptime</div>
                </div>
              </div>
            </div>

            {/* Right Panel - Auth Forms */}
            <div className="w-full lg:w-auto animate-in slide-in-from-right duration-700 delay-200">
              <div className="mx-auto max-w-md lg:max-w-none relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 via-indigo-500/20 to-blue-600/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <div className="relative bg-white/80 backdrop-blur-2xl rounded-2xl shadow-2xl shadow-blue-500/10 border border-white/30 p-6 hover:shadow-blue-500/20 transition-all duration-500">
                  {children}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

    </div>
  )
}