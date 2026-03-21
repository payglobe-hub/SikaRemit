'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { register } from '@/lib/api/auth'
import { 
  ArrowLeft, Eye, EyeOff, Shield, Lock, Mail, User, Phone,
  Sparkles, Smartphone, CreditCard, BarChart3, TrendingUp,
  CheckCircle, AlertCircle, Loader2, ArrowRight, Building2,
  Fingerprint, SmartphoneNfc, Wifi, Battery, Signal, Globe
} from 'lucide-react'

export default function ModernRegisterPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      })
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive'
      })
      return
    }

    if (formData.password.length < 8) {
      toast({
        title: 'Error',
        description: 'Password must be at least 8 characters long',
        variant: 'destructive'
      })
      return
    }

    if (!agreedToTerms) {
      toast({
        title: 'Error',
        description: 'Please agree to the terms and conditions',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)
    
    try {
      const response = await register({
        email: formData.email,
        password: formData.password,
        password2: formData.confirmPassword,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone
      })

      // Show user type information if auto-identified
      const userTypeInfo = response?.user_type_info
      if (userTypeInfo) {
        toast({
          title: 'Registration Successful!',
          description: `Account created as ${userTypeInfo.label}. Please check your email for verification instructions.`,
        })
      } else {
        toast({
          title: 'Registration Successful!',
          description: 'Please check your email for verification instructions.',
        })
      }

      // Redirect to login after a delay
      setTimeout(() => {
        router.push('/auth/login')
      }, 2000)

    } catch (error: any) {
      toast({
        title: 'Registration Failed',
        description: error.response?.data?.error || 'Failed to create account. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleRegister = async () => {
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

  const passwordStrength = (password: string) => {
    if (!password) return { strength: 0, text: '', color: '' }
    let strength = 0
    if (password.length >= 8) strength++
    if (password.match(/[a-z]/)) strength++
    if (password.match(/[A-Z]/)) strength++
    if (password.match(/[0-9]/)) strength++
    if (password.match(/[^a-zA-Z0-9]/)) strength++
    
    const levels = [
      { strength: 0, text: 'Very Weak', color: 'bg-red-500' },
      { strength: 1, text: 'Weak', color: 'bg-red-400' },
      { strength: 2, text: 'Fair', color: 'bg-yellow-400' },
      { strength: 3, text: 'Good', color: 'bg-blue-400' },
      { strength: 4, text: 'Strong', color: 'bg-green-400' },
      { strength: 5, text: 'Very Strong', color: 'bg-green-500' }
    ]
    
    return levels[strength]
  }

  const strength = passwordStrength(formData.password)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-cyan-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-emerald-400/20 to-teal-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-indigo-600/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Floating Icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 animate-bounce delay-300">
          <Globe className="w-6 h-6 text-blue-400/30" />
        </div>
        <div className="absolute top-40 right-32 animate-bounce delay-700">
          <Shield className="w-5 h-5 text-purple-400/30" />
        </div>
        <div className="absolute bottom-32 left-32 animate-bounce delay-500">
          <Smartphone className="w-7 h-7 text-emerald-400/30" />
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-4xl mx-auto grid md:grid-cols-2 gap-8 items-center">
          
          {/* Left Side - Registration Form */}
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

            {/* Register Card */}
            <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-xl border-white/20">
              <CardHeader className="text-center pb-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  Create Your Account
                </CardTitle>
                <p className="text-gray-600">Join SikaRemit for secure payments</p>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Registration Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                        First Name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="firstName"
                          placeholder="First name"
                          value={formData.firstName}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                          className="pl-10 h-12 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                        Last Name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="lastName"
                          placeholder="Last name"
                          value={formData.lastName}
                          onChange={(e) => handleInputChange('lastName', e.target.value)}
                          className="pl-10 h-12 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="pl-10 h-12 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Phone Field */}
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                      Phone Number (Optional)
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+233 XXX XXX XXX"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="pl-10 h-12 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  {/* Password Fields */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a strong password"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
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
                    
                    {/* Password Strength Indicator */}
                    {formData.password && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Password strength</span>
                          <span className="text-xs font-medium text-gray-700">{strength.text}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${strength.color}`}
                            style={{ width: `${(strength.strength / 5) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        className="pl-10 pr-10 h-12 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Terms and Conditions */}
                  <div className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-1 rounded border-gray-300"
                      required
                    />
                    <Label htmlFor="terms" className="text-sm text-gray-600">
                      I agree to the{' '}
                      <Link href="/terms" className="text-blue-600 hover:text-blue-700 underline">
                        Terms and Conditions
                      </Link>
                      {' '}and{' '}
                      <Link href="/privacy" className="text-blue-600 hover:text-blue-700 underline">
                        Privacy Policy
                      </Link>
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || !agreedToTerms}
                    className="w-full h-12 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity duration-300"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Create Account
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

                {/* Google Register */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg"
                  onClick={handleGoogleRegister}
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>

                {/* Login Link */}
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium">
                      Sign in
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
                Why Join SikaRemit?
              </h3>
              
              <div className="space-y-4">
                {[
                  { icon: Shield, title: 'Bank-Grade Security', desc: '256-bit encryption and fraud protection' },
                  { icon: Smartphone, title: 'Mobile First', desc: 'Optimized for African mobile users' },
                  { icon: TrendingUp, title: 'Instant Settlement', desc: 'Real-time processing' },
                  { icon: Globe, title: 'Cross-Border', desc: 'Send money across Africa' },
                  { icon: CreditCard, title: 'Multiple Methods', desc: 'Mobile money, cards, banks' },
                  { icon: BarChart3, title: 'Advanced Analytics', desc: 'Detailed insights' }
                ].map((feature, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{feature.title}</h4>
                      <p className="text-sm text-gray-600">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold text-gray-900">Free to Join</h4>
                </div>
                <p className="text-sm text-gray-600">
                  No setup fees, no monthly charges. Pay only for what you use.
                </p>
              </div>

              <div className="mt-6 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-medium">500K+ Happy Users</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
