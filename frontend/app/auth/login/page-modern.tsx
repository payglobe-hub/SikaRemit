'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { login } from '@/lib/api/auth'
import { 
  ArrowLeft, Eye, EyeOff, Shield, Lock, Mail, User,
  Sparkles, Smartphone, CreditCard, BarChart3,
  CheckCircle, AlertCircle, Loader2, ArrowRight,
  Fingerprint, SmartphoneNfc, Wifi, Battery, Signal
} from 'lucide-react'

export default function ModernLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [userType, setUserType] = useState<'customer' | 'merchant' | 'admin'>('customer')
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  useEffect(() => {
    setIsVisible(true)
    const type = searchParams.get('type') as any
    if (type && ['customer', 'merchant', 'admin'].includes(type)) {
      setUserType(type)
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast({
        title: 'Error',
        description: 'Please enter both email and password',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)
    
    try {
      const response = await login(email, password)
      
      toast({
        title: 'Login Successful!',
        description: 'Redirecting to your dashboard...',
      })
      
      // Redirect based on user role
      const redirectPath = {
        'super_admin': '/admin/overview',
        'business_admin': '/admin/compliance',
        'operations_admin': '/admin/support',
        'verification_admin': '/admin/verification',
        'merchant': '/merchant/dashboard',
        'customer': '/customer/dashboard',
        'admin': '/admin/overview'
      }[response.user.role] || '/customer/dashboard'

      setTimeout(() => {
        window.location.href = redirectPath
      }, 1000)
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.error ||
                           error.response?.data?.non_field_errors?.[0] ||
                           error.response?.data?.detail ||
                           error.message ||
                           'Invalid credentials'
      
      toast({
        title: 'Login Failed',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
      if (!clientId) {
        toast({
          title: 'Google Sign-in Unavailable',
          description: 'Google OAuth is not configured. Please use email and password.',
          variant: 'destructive',
        })
        return
      }

      const redirectUri = `${window.location.origin}/auth/callback/google`
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent('openid email profile')}&` +
        `access_type=offline&` +
        `prompt=consent`
      
      window.location.href = authUrl
    } catch (error) {
      toast({
        title: 'Google Sign-in Failed',
        description: 'Failed to initiate Google sign-in. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const userTypeInfo = {
    customer: {
      title: 'Customer Login',
      description: 'Access your personal account',
      icon: User,
      color: 'from-blue-500 to-cyan-500',
      bgPattern: 'bg-blue-50',
      features: ['Send money', 'Pay bills', 'Mobile wallet', 'Transaction history']
    },
    merchant: {
      title: 'Merchant Login',
      description: 'Access your business dashboard',
      icon: CreditCard,
      color: 'from-emerald-500 to-teal-500',
      bgPattern: 'bg-emerald-50',
      features: ['Accept payments', 'Business analytics', 'QR payments', 'Multi-currency']
    },
    admin: {
      title: 'Admin Login',
      description: 'Access system administration',
      icon: Shield,
      color: 'from-purple-500 to-indigo-500',
      bgPattern: 'bg-purple-50',
      features: ['User management', 'Compliance', 'Reporting', 'System monitoring']
    }
  }

  const currentType = userTypeInfo[userType]

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentType.bgPattern} relative overflow-hidden`}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-cyan-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-emerald-400/20 to-teal-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-indigo-600/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Floating Icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 animate-bounce delay-300">
          <Smartphone className="w-6 h-6 text-blue-400/30" />
        </div>
        <div className="absolute top-40 right-32 animate-bounce delay-700">
          <Shield className="w-5 h-5 text-purple-400/30" />
        </div>
        <div className="absolute bottom-32 left-32 animate-bounce delay-500">
          <CreditCard className="w-7 h-7 text-emerald-400/30" />
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-4xl mx-auto grid md:grid-cols-2 gap-8 items-center">
          
          {/* Left Side - Login Form */}
          <div className={`transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'
          }`}>
            {/* Back Button */}
            <div className="mb-6">
              <Link href="/auth" className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Portal Selection
              </Link>
            </div>

            {/* Login Card */}
            <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-xl border-white/20">
              <CardHeader className="text-center pb-6">
                <div className="flex items-center justify-center mb-4">
                  <div className={`w-16 h-16 bg-gradient-to-br ${currentType.color} rounded-2xl flex items-center justify-center shadow-lg`}>
                    <currentType.icon className="w-8 h-8 text-white" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  {currentType.title}
                </CardTitle>
                <p className="text-gray-600">{currentType.description}</p>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* User Type Tabs */}
                <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                  {Object.entries(userTypeInfo).map(([type, info]) => (
                    <button
                      key={type}
                      onClick={() => setUserType(type as any)}
                      className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                        userType === type
                          ? 'bg-white shadow-sm text-gray-900'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {info.title.split(' ')[0]}
                    </button>
                  ))}
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="pl-10 h-12 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="pl-10 pr-10 h-12 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded border-gray-300" />
                      <span className="text-sm text-gray-600">Remember me</span>
                    </label>
                    <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
                      Forgot password?
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full h-12 bg-gradient-to-r ${currentType.color} text-white font-semibold rounded-lg hover:opacity-90 transition-opacity duration-300`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500 font-medium">Or continue with</span>
                  </div>
                </div>

                {/* Google Login */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg"
                  onClick={handleGoogleLogin}
                  disabled={userType !== 'customer'}
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                  {userType !== 'customer' && (
                    <span className="ml-2 text-xs text-gray-500">(Customers only)</span>
                  )}
                </Button>

                {/* Register Link */}
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Don't have an account?{' '}
                    <Link href="/auth/register" className="text-blue-600 hover:text-blue-700 font-medium">
                      Sign up
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Features */}
          <div className={`hidden md:block transition-all duration-1000 delay-300 ${
            isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
          }`}>
            <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                {currentType.title} Features
              </h3>
              
              <div className="space-y-4">
                {currentType.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className={`w-10 h-10 bg-gradient-to-br ${currentType.color} rounded-lg flex items-center justify-center`}>
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-gray-700 font-medium">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-gray-900">Security First</h4>
                </div>
                <p className="text-sm text-gray-600">
                  Your data is protected with bank-grade encryption and advanced security measures.
                </p>
              </div>

              <div className="mt-6 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Secure & Reliable</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
