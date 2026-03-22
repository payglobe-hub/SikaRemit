'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, CreditCard, Users, BarChart3, Smartphone, Globe, 
  Menu, X, ArrowRight, CheckCircle, Star, TrendingUp, Zap, Lock, 
  Sparkles, Globe2, Wallet, Banknote, ArrowUpRight, ArrowDownRight,
  QrCode, Building2, Home, User, Settings, Bell,
  ChevronRight, Play, Download, MessageSquare, Phone, Mail,
  Facebook, Twitter, Linkedin, Instagram, Youtube, Music, Github,
  Clock, ShieldCheck, Rocket, Target, Award, PieChart,
  Activity, DollarSign, Landmark, PiggyBank,
  FileText, Calculator, HelpCircle, Search,
  Filter, DownloadCloud, UploadCloud, RefreshCw, Eye,
  EyeOff, LockKeyhole, Key, Fingerprint, SmartphoneNfc,
  Wifi, Battery, Signal, Volume2, Camera, Video, Plus
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import PhoneMockup from '@/components/ui/PhoneMockup'
import { SikaRemitLogo } from '@/lib/utils/logo'

export default function ModernHome() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeFeature, setActiveFeature] = useState(0)
  const [scrollY, setScrollY] = useState(0)
  const [floatingElements, setFloatingElements] = useState<Array<{id: number, left: number, top: number, delay: number, duration: number}>>([])

  useEffect(() => {
    setIsVisible(true)
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
      setScrollY(window.scrollY)
    }
    window.addEventListener('scroll', handleScroll)
    
    // Generate deterministic floating elements
    const elements = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: (i * 137.5) % 100, // Deterministic position based on index
      top: (i * 89.3) % 100,
      delay: (i * 0.5) % 5,
      duration: 3 + ((i * 0.7) % 4)
    }))
    setFloatingElements(elements)
    
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const renderIcon = (IconComponent: any, className: string) => {
    const Icon = IconComponent as React.ComponentType<{ className?: string }>
    return <Icon className={className} />
  }

  // Enhanced features with African fintech focus
  const features = [
    {
      icon: SmartphoneNfc,
      title: 'Mobile Money Integration',
      description: 'Seamlessly integrate with MTN MoMo, Telecel, G-Money, and AirtelTigo across Africa',
      color: 'from-blue-500 to-cyan-500',
      bgPattern: 'bg-blue-50',
      stats: '50M+ Users',
      highlight: 'Instant Settlement'
    },
    {
      icon: ShieldCheck,
      title: 'Bank-Grade Security',
      description: 'Advanced fraud detection, biometric authentication, and end-to-end encryption',
      color: 'from-emerald-500 to-teal-500',
      bgPattern: 'bg-emerald-50',
      stats: '99.9% Uptime',
      highlight: 'PCI DSS Compliant'
    },
    {
      icon: Globe2,
      title: 'Cross-Border Payments',
      description: 'Send money to 120+ countries with competitive rates and real-time tracking',
      color: 'from-purple-500 to-pink-500',
      bgPattern: 'bg-purple-50',
      stats: '120+ Countries',
      highlight: '<30 Seconds'
    },
    {
      icon: Building2,
      title: 'Business Solutions',
      description: 'Complete payment ecosystem for merchants, from POS to bulk payments',
      color: 'from-orange-500 to-red-500',
      bgPattern: 'bg-orange-50',
      stats: '10K+ Merchants',
      highlight: 'API First'
    },
    {
      icon: QrCode,
      title: 'QR & SoftPOS',
      description: 'Transform smartphones into payment terminals with QR codes and SoftPOS technology',
      color: 'from-indigo-500 to-purple-500',
      bgPattern: 'bg-indigo-50',
      stats: '1M+ Transactions',
      highlight: 'No Hardware'
    },
    {
      icon: PiggyBank,
      title: 'Digital Banking',
      description: 'Complete digital banking experience with savings, investments, and bill payments',
      color: 'from-green-500 to-emerald-500',
      bgPattern: 'bg-green-50',
      stats: 'GHS 2.5B+ AUM',
      highlight: 'High Yield'
    }
  ]

  // Enhanced stats with African context
  const stats = [
    { 
      label: 'Active Users', 
      value: '500K+', 
      icon: Users, 
      description: 'Across Africa',
      growth: '+45%',
      color: 'text-blue-600'
    },
    { 
      label: 'Transaction Volume', 
      value: 'GHS 2.5B+', 
      icon: TrendingUp, 
      description: 'Processed annually',
      growth: '+120%',
      color: 'text-green-600'
    },
    { 
      label: 'Countries', 
      value: '15+', 
      icon: Globe, 
      description: 'African markets',
      growth: '+5',
      color: 'text-purple-600'
    },
    { 
      label: 'Success Rate', 
      value: '99.9%', 
      icon: Zap, 
      description: 'Transaction success',
      growth: '+0.3%',
      color: 'text-orange-600'
    }
  ]

  // Mobile money providers
  const providers = [
    { name: 'MTN MoMo', logo: '/logos/mtn-momo.png', icon: '📱', color: 'bg-orange-500', users: '20M+' },
    { name: 'Telecel', logo: '/logos/telecel-cash.jpg', icon: '📞', color: 'bg-blue-500', users: '5M+' },
    { name: 'G-Money', logo: null, icon: '💰', color: 'bg-green-500', users: '3M+' },
    { name: 'AirtelTigo', logo: '/logos/airteltigo-money.jpg', icon: '📶', color: 'bg-red-500', users: '8M+' }
  ]

  // Testimonials
  const testimonials = [
    {
      name: 'Ama Mensah',
      role: 'CEO, TechHub Ghana',
      content: 'SikaRemit transformed how we handle international payments. The integration with local mobile money is seamless.',
      avatar: '👩‍💼',
      rating: 5
    },
    {
      name: 'Kwame Asante',
      role: 'Freelance Developer',
      content: 'Finally, a payment solution that understands African markets. Fast, secure, and affordable.',
      avatar: '👨‍💻',
      rating: 5
    },
    {
      name: 'Fatou Diallo',
      role: 'Business Owner, Senegal',
      content: 'The bulk payment feature saved us hours of work. Our team loves the mobile app.',
      avatar: '👩‍🏫',
      rating: 5
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-hidden">
      {/* Enhanced Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
        scrolled 
          ? 'bg-white/95 backdrop-blur-xl border-b border-gray-200/50 shadow-lg' 
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 lg:h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative">
                <SikaRemitLogo 
                  size="sm" 
                  style="full"
                  className="shadow-lg group-hover:shadow-xl group-hover:scale-105"
                />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <div>
                <span className="text-base font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  SikaRemit
                </span>
                <div className="text-xs text-gray-500">Powered by PayGlobe</div>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-6">
              <Link href="#features" className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200">
                Features
              </Link>
              <Link href="#solutions" className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200">
                Solutions
              </Link>
              <Link href="#pricing" className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200">
                Pricing
              </Link>
              <Link href="#about" className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200">
                About
              </Link>
              <div className="relative group">
                <button className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200 flex items-center gap-1">
                  Resources
                  <ChevronRight className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
                </button>
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <Link href="/blog" className="block px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="font-medium">Blog</div>
                        <div className="text-sm text-gray-500">Latest fintech insights</div>
                      </div>
                    </div>
                  </Link>
                  <Link href="/help" className="block px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <HelpCircle className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="font-medium">Help Center</div>
                        <div className="text-sm text-gray-500">Get support</div>
                      </div>
                    </div>
                  </Link>
                  <Link href="/api" className="block px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="font-medium">API Docs</div>
                        <div className="text-sm text-gray-500">Developer resources</div>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            {/* Auth Buttons */}
            <div className="hidden lg:flex items-center space-x-3">
              <Link href="/auth/login">
                <Button variant="ghost" className="font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 text-sm px-4 py-2">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth">
                <Button className="font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 group text-sm px-4 py-2">
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 rounded-lg border-none bg-transparent"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-gray-700" /> : <Menu className="w-6 h-6 text-gray-700" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed top-14 left-0 right-0 bg-white border-b border-gray-200 z-[99] p-3 shadow-lg">
          <div className="flex flex-col gap-1">
            <Link href="#features" className="px-3 py-2 text-gray-600 rounded-lg hover:bg-gray-50 text-sm">Features</Link>
            <Link href="#solutions" className="px-3 py-2 text-gray-600 rounded-lg hover:bg-gray-50 text-sm">Solutions</Link>
            <Link href="#pricing" className="px-3 py-2 text-gray-600 rounded-lg hover:bg-gray-50 text-sm">Pricing</Link>
            <Link href="#about" className="px-3 py-2 text-gray-600 rounded-lg hover:bg-gray-50 text-sm">About</Link>
            <div className="border-t border-gray-200 pt-3 mt-2 flex flex-col gap-2">
              <Link href="/auth/login">
                <Button variant="ghost" className="w-full justify-center text-sm">Sign In</Button>
              </Link>
              <Link href="/auth">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-sm">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section - Ultra Modern */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        {/* Floating Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {floatingElements.map((element) => (
            <div
              key={element.id}
              className="absolute w-2 h-2 bg-blue-400/30 rounded-full animate-float"
              style={{
                left: `${element.left}%`,
                top: `${element.top}%`,
                animationDelay: `${element.delay}s`,
                animationDuration: `${element.duration}s`
              }}
            ></div>
          ))}
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left space-y-6">
              {/* Badge */}
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full text-xs font-semibold text-gray-800">
                <Sparkles className="w-4 h-4" />
                <span>Trusted by 500,000+ users across Africa</span>
                <Badge className="bg-green-500 text-white">Live</Badge>
              </div>
              
              {/* Main Heading */}
              <div className="space-y-4">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold leading-tight">
                  <span className="text-gray-900">The Future of</span>
                  <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    African Finance
                  </span>
                </h1>
                
                <p className="text-base lg:text-base text-gray-600 leading-relaxed max-w-2xl">
                  Send money, pay bills, and manage your finances seamlessly across Africa. 
                  Powered by mobile money, built for the continent.
                </p>
              </div>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link href="/auth">
                  <Button size="lg" className="h-10 px-5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium text-sm shadow-xl hover:shadow-2xl transition-all duration-300 group">
                    <Download className="w-5 h-5 mr-2" />
                    Download App
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                  </Button>
                </Link>
                <Link href="#features">
                  <Button variant="outline" size="lg" className="h-10 px-5 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm group">
                    <Play className="w-5 h-5 mr-2" />
                    Watch Demo
                  </Button>
                </Link>
              </div>
              
              {/* Trust Indicators */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-medium">No hidden fees</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-blue-500" />
                  <span className="font-medium">Bank-level security</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-purple-500" />
                  <span className="font-medium">24/7 support</span>
                </div>
              </div>

              {/* App Store Badges */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button className="flex items-center gap-3 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors">
                  <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center">
                    <span className="text-black text-xs">🍎</span>
                  </div>
                  <div className="text-left">
                    <div className="text-xs opacity-80">Download on the</div>
                    <div className="text-sm font-semibold">App Store</div>
                  </div>
                </button>
                <button className="flex items-center gap-3 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors">
                  <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center">
                    <span className="text-black text-xs">▶️</span>
                  </div>
                  <div className="text-left">
                    <div className="text-xs opacity-80">Get it on</div>
                    <div className="text-sm font-semibold">Google Play</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Right Content - Enhanced Phone Mockup */}
            <div className="relative flex justify-center items-center">
              <div className="relative">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-3xl blur-3xl opacity-30 animate-pulse"></div>
                
                {/* Phone Container */}
                <div className="relative transform hover:scale-105 transition-transform duration-300">
                  <EnhancedPhoneMockup />
                </div>

                {/* Floating Cards */}
                <div className="absolute -top-10 -right-10 bg-white rounded-xl shadow-xl p-4 animate-float">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">+45% Growth</div>
                      <div className="text-xs text-gray-500">This month</div>
                    </div>
                  </div>
                </div>

                <div className="absolute -bottom-10 -left-10 bg-white rounded-xl shadow-xl p-4 animate-float-delay">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Globe2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">15+ Countries</div>
                      <div className="text-xs text-gray-500">Across Africa</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section id="features" className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full text-sm font-semibold text-gray-800 mb-6">
              <Sparkles className="w-4 h-4" />
              <span>Powerful Features</span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
              Everything You Need for
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Modern Finance
              </span>
            </h2>
            <p className="text-base text-gray-600 max-w-3xl mx-auto">
              From mobile money to cross-border payments, we've built the complete financial ecosystem for Africa
            </p>
          </div>

          {/* Feature Tabs */}
          <div className="mb-8">
            <div className="flex flex-wrap justify-center gap-4">
              {features.map((feature, index) => (
                <button
                  key={index}
                  onClick={() => setActiveFeature(index)}
                  className={`px-6 py-3 rounded-full font-medium transition-all duration-300 ${
                    activeFeature === index
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {feature.title}
                </button>
              ))}
            </div>
          </div>

          {/* Active Feature Display */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className={`${features[activeFeature].bgPattern} rounded-3xl p-8`}>
              <div className={`w-20 h-20 bg-gradient-to-br ${features[activeFeature].color} rounded-2xl flex items-center justify-center mb-6`}>
                {renderIcon(features[activeFeature].icon, "w-10 h-10 text-white")}
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">{features[activeFeature].title}</h3>
              <p className="text-xl text-gray-600 mb-6">{features[activeFeature].description}</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-4">
                  <div className="text-2xl font-bold text-gray-900">{features[activeFeature].stats}</div>
                  <div className="text-sm text-gray-600">Active users</div>
                </div>
                <div className="bg-white rounded-xl p-4">
                  <div className="text-2xl font-bold text-gray-900">{features[activeFeature].highlight}</div>
                  <div className="text-sm text-gray-600">Key feature</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl p-8">
                <div className="text-center">
                  <div className="text-lg text-gray-600">
                    Real-time transaction processing and monitoring
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Money Providers Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-3">
              Integrated with Africa's Leading
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Mobile Money Providers
              </span>
            </h2>
            <p className="text-base text-gray-600 max-w-3xl mx-auto">
              Connect with all major mobile money networks across the continent
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {providers.map((provider, index) => (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-gray-200">
                <CardContent className="p-3 text-center">
                  <div className="w-10 h-10 mx-auto mb-2 group-hover:scale-110 transition-transform duration-300">
                    {provider.logo ? (
                      <img 
                        src={provider.logo} 
                        alt={`${provider.name} Logo`} 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className={`w-full h-full ${provider.color} rounded-2xl flex items-center justify-center`}>
                        <span className="text-2xl">{provider.icon}</span>
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{provider.name}</h3>
                  <p className="text-sm text-gray-600">{provider.users} users</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership Team Section */}
      <section className="py-12 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full text-sm font-semibold text-gray-800 mb-6">
              <Sparkles className="w-4 h-4" />
              <span>Leadership Team</span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
              Meet the Visionaries
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Behind SikaRemit
              </span>
            </h2>
            <p className="text-base text-gray-600 max-w-3xl mx-auto">
              Led by experienced entrepreneurs and finance experts committed to transforming African finance
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* CEO Card */}
            <Card className="group hover:shadow-xl transition-all duration-300 bg-white">
              <CardContent className="p-6 text-center">
                <div className="w-24 h-24 mx-auto mb-4 relative">
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                    CEO
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Lawyer Sarpong Boateng</h3>
                <p className="text-blue-600 font-semibold mb-3">Chief Executive Officer</p>
                <p className="text-gray-600 text-sm mb-4">
                  Former Goldman Sachs executive with 15+ years in fintech and African markets. 
                  Led multiple successful startups across the continent.
                </p>
                <div className="flex justify-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Linkedin className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Twitter className="w-4 h-4 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CTO Card */}
            <Card className="group hover:shadow-xl transition-all duration-300 bg-white">
              <CardContent className="p-6 text-center">
                <div className="w-24 h-24 mx-auto mb-4 relative">
                  <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                    CTO
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Emmanuel Owusu Addo</h3>
                <p className="text-emerald-600 font-semibold mb-3">Chief Technology Officer</p>
                <p className="text-gray-600 text-sm mb-4">
                  A full stack developer expertise in Software and Hardware Engineering, with major focus on fintech and Ecommerce infrastructure.
                </p>
                <div className="flex justify-center gap-2">
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Linkedin className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Github className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CFO Card */}
            <Card className="group hover:shadow-xl transition-all duration-300 bg-white">
              <CardContent className="p-6 text-center">
                <div className="w-24 h-24 mx-auto mb-4 relative">
                  <div className="w-full h-full bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                    CFO
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Miss Adwoa Sarpong</h3>
                <p className="text-orange-600 font-semibold mb-3">Chief Financial Officer</p>
                <p className="text-gray-600 text-sm mb-4">
                  Chartered accountant with experience at PwC and major African banks. 
                  Expert in regulatory compliance and cross-border financial operations.
                </p>
                <div className="flex justify-center gap-2">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <Linkedin className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <Twitter className="w-4 h-4 text-orange-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Partners Section */}
          <div className="mt-16">
            <div className="text-center mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Strategic Partners</h3>
              <p className="text-gray-600">Working with leading organizations across Africa</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900">Ecobank</h4>
                <p className="text-sm text-gray-600">Banking Partner</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900">MTN Group</h4>
                <p className="text-sm text-gray-600">Telco Partner</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900">Paystack</h4>
                <p className="text-sm text-gray-600">Payment Partner</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900">Flutterwave</h4>
                <p className="text-sm text-gray-600">Fintech Partner</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section id="features" className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full text-sm font-semibold text-gray-800 mb-6">
              <Sparkles className="w-4 h-4" />
              <span>Powerful Features</span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
              Everything You Need for
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Modern Finance
              </span>
            </h2>
            <p className="text-base text-gray-600 max-w-3xl mx-auto">
              From mobile money to cross-border payments, we've built the complete financial ecosystem for Africa
            </p>
          </div>

          {/* Feature Tabs */}
          <div className="mb-8">
            <div className="flex flex-wrap justify-center gap-4">
              {features.map((feature, index) => (
                <button
                  key={index}
                  onClick={() => setActiveFeature(index)}
                  className={`px-6 py-3 rounded-full font-medium transition-all duration-300 ${
                    activeFeature === index
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {feature.title}
                </button>
              ))}
            </div>
          </div>

          {/* Active Feature Display */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className={`${features[activeFeature].bgPattern} rounded-3xl p-8`}>
              <div className={`w-20 h-20 bg-gradient-to-br ${features[activeFeature].color} rounded-2xl flex items-center justify-center mb-6`}>
                {renderIcon(features[activeFeature].icon, "w-10 h-10 text-white")}
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">{features[activeFeature].title}</h3>
              <p className="text-xl text-gray-600 mb-6">{features[activeFeature].description}</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-4">
                  <div className="text-2xl font-bold text-gray-900">{features[activeFeature].stats}</div>
                  <div className="text-sm text-gray-600">Active users</div>
                </div>
                <div className="bg-white rounded-xl p-4">
                  <div className="text-2xl font-bold text-gray-900">{features[activeFeature].highlight}</div>
                  <div className="text-sm text-gray-600">Key feature</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl p-8">
                <div className="text-center">
                  <div className="text-lg text-gray-600">
                    Real-time transaction processing and monitoring
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-12 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
              Loved by Users Across
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Africa
              </span>
            </h2>
            <p className="text-base text-gray-600 max-w-3xl mx-auto">
              See what our customers are saying about their experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-6 italic">"{testimonial.content}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-2xl">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{testimonial.name}</div>
                      <div className="text-sm text-gray-500">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600"></div>
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-6">
            Ready to Transform Your
            <span className="block">Financial Future?</span>
          </h2>
          <p className="text-white/90 text-base mb-10 leading-relaxed">
            Join 500,000+ users already using SikaRemit to send money, pay bills, and manage their finances across Africa.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link href="/auth">
              <Button size="lg" className="h-12 px-6 bg-white text-blue-600 hover:bg-gray-100 font-medium text-base shadow-xl hover:shadow-2xl transition-all duration-300 group">
                <Rocket className="w-5 h-5 mr-2" />
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="h-12 px-6 border-white/30 text-white hover:bg-white/10 font-medium text-base">
                <MessageSquare className="w-5 h-5 mr-2" />
                Contact Sales
              </Button>
            </Link>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center text-white/80 text-sm">
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle className="w-4 h-4" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle className="w-4 h-4" />
              <span>30-day free trial</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle className="w-4 h-4" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <SikaRemitLogo size="md" style="base" />
                <span className="text-xl font-bold">SikaRemit</span>
              </div>
              <p className="text-gray-400 mb-4">
                The future of African finance, powered by mobile money and built for the continent.
              </p>
              <div className="flex gap-3">
                <Facebook className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
                <Twitter className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
                <Linkedin className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
                <Instagram className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/security" className="hover:text-white transition-colors">Security</Link></li>
                <li><Link href="/api" className="hover:text-white transition-colors">API</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="/careers" className="hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/press" className="hover:text-white transition-colors">Press</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/status" className="hover:text-white transition-colors">Status</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 SikaRemit. Powered by PayGlobe. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animate-float-delay {
          animation: float 3s ease-in-out infinite;
          animation-delay: 1.5s;
        }
      `}</style>
    </div>
  )
}

// Enhanced Phone Mockup Component
function EnhancedPhoneMockup() {
  return (
    <div className="relative mx-auto border-gray-800 bg-gray-800 border-[8px] rounded-[3.5rem] h-[600px] w-[300px] shadow-2xl">
      <div className="rounded-[2.5rem] overflow-hidden w-full h-full bg-white">
        {/* Status Bar */}
        <div className="bg-gray-900 px-6 py-2 flex justify-between items-center">
          <span className="text-white text-xs font-medium">9:41</span>
          <div className="flex gap-1">
            <Signal className="w-4 h-3 text-white" />
            <Wifi className="w-4 h-3 text-white" />
            <Battery className="w-4 h-3 text-white" />
          </div>
        </div>
        
        {/* App Content */}
        <div className="flex-1 bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 p-4">
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-white text-2xl font-bold">S</span>
              </div>
              <h3 className="text-gray-900 font-bold text-base">SikaRemit</h3>
              <p className="text-gray-600 text-sm">Your money, your way</p>
            </div>
            
            {/* Balance Card */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-4 text-white shadow-xl">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-blue-100 text-xs mb-1">Total Balance</p>
                  <p className="text-2xl font-bold">GHS 5,420.00</p>
                </div>
                <Eye className="w-5 h-5 text-blue-200" />
              </div>
              <div className="flex gap-2">
                <div className="h-2 bg-white/30 rounded-full flex-1"></div>
                <div className="h-2 bg-white/20 rounded-full w-8"></div>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { icon: ArrowUpRight, label: 'Send', color: 'bg-blue-500' },
                { icon: ArrowDownRight, label: 'Receive', color: 'bg-green-500' },
                { icon: QrCode, label: 'Scan', color: 'bg-purple-500' },
                { icon: CreditCard, label: 'Pay', color: 'bg-orange-500' }
              ].map((action, index) => (
                <div key={index} className="text-center">
                  <div className={`${action.color} rounded-xl p-3 mb-2`}>
                    <action.icon className="w-6 h-6 text-white mx-auto" />
                  </div>
                  <p className="text-xs text-gray-700">{action.label}</p>
                </div>
              ))}
            </div>
            
            {/* Recent Transactions */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-gray-900">Recent Activity</h4>
                <span className="text-xs text-blue-600">See all</span>
              </div>
              
              {[
                { name: 'MTN MoMo', amount: '-GHS 50.00', time: '2 min ago', type: 'Airtime', color: 'bg-orange-100 text-orange-600' },
                { name: 'Telecel', amount: '+GHS 200.00', time: '1 hour ago', type: 'Transfer', color: 'bg-green-100 text-green-600' },
                { name: 'G-Money', amount: '-GHS 150.00', time: '3 hours ago', type: 'Payment', color: 'bg-blue-100 text-blue-600' }
              ].map((transaction, index) => (
                <div key={index} className="bg-white rounded-xl p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${transaction.color} rounded-full flex items-center justify-center text-sm font-medium`}>
                        {transaction.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{transaction.name}</p>
                        <p className="text-xs text-gray-500">{transaction.type} • {transaction.time}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{transaction.amount}</p>
                      <p className="text-xs text-green-600">Success</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Bottom Navigation */}
        <div className="bg-white border-t border-gray-200 px-6 py-3">
          <div className="flex justify-around">
            <Home className="w-6 h-6 text-blue-600" />
            <CreditCard className="w-6 h-6 text-gray-400" />
            <Plus className="w-6 h-6 text-gray-400" />
            <User className="w-6 h-6 text-gray-400" />
          </div>
        </div>
      </div>
      
      {/* Phone Notch */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-7 w-40 bg-gray-800 rounded-b-3xl"></div>
    </div>
  )
}
