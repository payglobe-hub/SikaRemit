'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, Building2, Shield, Lock, FileText, Users, TrendingUp,
  Sparkles, CreditCard, BarChart3, Globe, Smartphone, QrCode,
  CheckCircle, AlertCircle, Loader2, ArrowRight, Star,
  Award, Zap, Target, Rocket, PieChart, Activity,
  Menu, X, Search, Bell, Settings, Home, Plus
} from 'lucide-react'

export default function ModernMerchantAuthPage() {
  const [isVisible, setIsVisible] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'login' | 'apply'>('login')

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const merchantStats = [
    { label: 'Active Merchants', value: '50K+', change: '+12%' },
    { label: 'Monthly Volume', value: 'GHS 2.5B+', change: '+18%' },
    { label: 'Transaction Success', value: '99.8%', change: '+0.2%' },
    { label: 'Average Settlement', value: '< 2 mins', change: '-15%' }
  ]

  const features = [
    {
      icon: CreditCard,
      title: 'Multiple Payment Methods',
      description: 'Accept mobile money, cards, bank transfers, and more',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: QrCode,
      title: 'QR & SoftPOS',
      description: 'Transform smartphones into payment terminals',
      color: 'from-emerald-500 to-teal-500'
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Real-time insights and detailed reporting',
      color: 'from-purple-500 to-indigo-500'
    },
    {
      icon: Globe,
      title: 'Cross-Border Payments',
      description: 'Accept international payments easily',
      color: 'from-orange-500 to-red-500'
    },
    {
      icon: Shield,
      title: 'Fraud Protection',
      description: 'AI-powered fraud detection and prevention',
      color: 'from-pink-500 to-rose-500'
    },
    {
      icon: TrendingUp,
      title: 'Business Growth Tools',
      description: 'Customer insights and growth analytics',
      color: 'from-green-500 to-emerald-500'
    }
  ]

  const testimonials = [
    {
      name: 'Kwame Electronics',
      role: 'Retail Store',
      content: 'SikaRemit transformed our payment processing. 40% increase in sales!',
      rating: 5,
      avatar: '🏪',
      growth: '+40%'
    },
    {
      name: 'Ama Restaurant',
      role: 'Food & Beverage',
      content: 'The SoftPOS feature is amazing. Our customers love the convenience!',
      rating: 5,
      avatar: '🍽️',
      growth: '+25%'
    },
    {
      name: 'TechHub Ghana',
      role: 'Technology Services',
      content: 'Best payment platform for businesses in Ghana. Highly recommended!',
      rating: 5,
      avatar: '💻',
      growth: '+60%'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">SikaRemit</span>
                <Badge className="bg-emerald-100 text-emerald-800">Merchant</Badge>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <Link href="/auth" className="text-gray-600 hover:text-gray-900 transition-colors">
                Portal Selection
              </Link>
              <Link href="/features" className="text-gray-600 hover:text-gray-900 transition-colors">
                Features
              </Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
                Pricing
              </Link>
              <Button variant="outline" className="border-emerald-300 text-emerald-600 hover:bg-emerald-50">
                Contact Sales
              </Button>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="px-4 py-2 space-y-1">
              <Link href="/auth" className="block px-3 py-2 text-gray-600 hover:text-gray-900">
                Portal Selection
              </Link>
              <Link href="/features" className="block px-3 py-2 text-gray-600 hover:text-gray-900">
                Features
              </Link>
              <Link href="/pricing" className="block px-3 py-2 text-gray-600 hover:text-gray-900">
                Pricing
              </Link>
              <Button variant="outline" className="w-full border-emerald-300 text-emerald-600">
                Contact Sales
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className={`transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'
            }`}>
              <div className="flex items-center gap-3 mb-6">
                <Badge className="bg-emerald-100 text-emerald-800 px-3 py-1">
                  For Businesses
                </Badge>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-4 h-4 text-yellow-400 fill-current" />
                  ))}
                </div>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                Merchant Portal
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
                  {' '}for Business
                </span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-8">
                Transform your business with powerful payment solutions, advanced analytics, and seamless integration.
              </p>

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {merchantStats.map((stat, index) => (
                  <div key={index} className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
                    <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                    <div className="text-xs text-emerald-600 font-medium">{stat.change}</div>
                  </div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/auth/login?type=merchant">
                  <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 text-white">
                    Sign In to Merchant Portal
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="border-emerald-300 text-emerald-600 hover:bg-emerald-50">
                  Apply for Merchant Account
                </Button>
              </div>
            </div>

            {/* Right Content - Login Card */}
            <div className={`transition-all duration-1000 delay-300 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
            }`}>
              <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-xl border-white/20">
                <CardHeader className="text-center pb-6">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <Building2 className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    Merchant Access
                  </CardTitle>
                  <p className="text-gray-600">Sign in to your business dashboard</p>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {/* Tab Navigation */}
                  <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                    <button
                      onClick={() => setActiveTab('login')}
                      className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                        activeTab === 'login'
                          ? 'bg-white shadow-sm text-gray-900'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => setActiveTab('apply')}
                      className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                        activeTab === 'apply'
                          ? 'bg-white shadow-sm text-gray-900'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Apply
                    </button>
                  </div>

                  {activeTab === 'login' ? (
                    <div className="space-y-4">
                      <Link href="/auth/login?type=merchant">
                        <Button className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 text-white font-semibold rounded-lg">
                          Sign In with Email
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                      
                      <div className="text-center">
                        <Link href="/auth/forgot-password" className="text-sm text-emerald-600 hover:text-emerald-700">
                          Forgot password?
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-emerald-50 rounded-xl">
                        <h4 className="font-semibold text-gray-900 mb-2">Join 50K+ Businesses</h4>
                        <p className="text-sm text-gray-600 mb-4">
                          Get approved in 2-3 business days and start accepting payments immediately.
                        </p>
                        <ul className="space-y-2 text-sm text-gray-600">
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            No setup fees
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            Instant onboarding
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            24/7 support
                          </li>
                        </ul>
                      </div>
                      
                      <Button className="w-full h-12 bg-gradient-to-r from-blue-500 to-indigo-500 hover:opacity-90 text-white font-semibold rounded-lg">
                        Apply Now
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  )}

                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      Not a business?{' '}
                      <Link href="/auth/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
                        Customer Portal
                      </Link>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Powerful Features for Your Business
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to manage payments, grow your business, and delight customers
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className={`group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-5 group-hover:opacity-10 transition-opacity duration-300`}></div>
                
                <CardContent className="p-6 relative">
                  <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-emerald-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Loved by Businesses Across Africa
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              See how SikaRemit is helping businesses grow and thrive
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card
                key={index}
                className={`p-6 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-2xl">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                      <p className="text-sm text-gray-600">{testimonial.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-emerald-600">{testimonial.growth}</div>
                    <div className="text-xs text-gray-500">Growth</div>
                  </div>
                </div>
                
                <div className="flex gap-1 mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                  ))}
                </div>
                
                <p className="text-gray-700 italic">"{testimonial.content}"</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-emerald-600 to-teal-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Grow Your Business?
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Join thousands of businesses that trust SikaRemit for their payment needs
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/login?type=merchant">
              <Button size="lg" className="bg-white text-emerald-600 hover:bg-gray-100">
                Sign In to Merchant Portal
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-emerald-600">
              Apply for Account
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold">SikaRemit</span>
              </div>
              <p className="text-gray-400">
                Empowering businesses across Africa
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/features" className="hover:text-white">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="/security" className="hover:text-white">Security</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/help" className="hover:text-white">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
                <li><Link href="/status" className="hover:text-white">Status</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/terms" className="hover:text-white">Terms</Link></li>
                <li><Link href="/privacy" className="hover:text-white">Privacy</Link></li>
                <li><Link href="/compliance" className="hover:text-white">Compliance</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 SikaRemit. All rights reserved.
            </p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <Link href="#" className="text-gray-400 hover:text-white">
                <Building2 className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
