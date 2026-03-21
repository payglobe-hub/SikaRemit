'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  ArrowRight, User, Building2, Shield, Lock, Sparkles,
  Globe, Smartphone, CreditCard, BarChart3, TrendingUp,
  CheckCircle, Star, Zap, ShieldCheck, Rocket,
  ArrowUpRight, ArrowDownRight, QrCode, Wifi,
  Bell, Settings, Home, Plus, Menu, X,
  Mail, Phone, MessageSquare, HelpCircle,
  Facebook, Twitter, Linkedin, Instagram, Youtube
} from 'lucide-react'

export default function ModernAuthPage() {
  const [isVisible, setIsVisible] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setIsVisible(true)
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const authOptions = [
    {
      title: 'Customer Portal',
      description: 'Personal banking and payments',
      icon: User,
      href: '/auth/login',
      color: 'from-blue-500 to-cyan-500',
      bgPattern: 'bg-blue-50',
      features: ['Send & receive money', 'Pay bills', 'Mobile wallet', 'Transaction history'],
      stats: '500K+ Active Users',
      gradient: 'bg-gradient-to-br from-blue-500 to-cyan-500'
    },
    {
      title: 'Merchant Portal',
      description: 'Business payment solutions',
      icon: Building2,
      href: '/auth/merchant',
      color: 'from-emerald-500 to-teal-500',
      bgPattern: 'bg-emerald-50',
      features: ['Accept payments', 'Business analytics', 'QR payments', 'Multi-currency'],
      stats: '50K+ Businesses',
      gradient: 'bg-gradient-to-br from-emerald-500 to-teal-500'
    },
    {
      title: 'Admin Portal',
      description: 'System administration',
      icon: Shield,
      href: '/auth/admin',
      color: 'from-purple-500 to-indigo-500',
      bgPattern: 'bg-purple-50',
      features: ['User management', 'Compliance', 'Reporting', 'System monitoring'],
      stats: 'Secure Access',
      gradient: 'bg-gradient-to-br from-purple-500 to-indigo-500'
    }
  ]

  const features = [
    {
      icon: ShieldCheck,
      title: 'Bank-Grade Security',
      description: '256-bit encryption and advanced fraud protection'
    },
    {
      icon: Smartphone,
      title: 'Mobile First',
      description: 'Optimized for African mobile users'
    },
    {
      icon: TrendingUp,
      title: 'Instant Settlement',
      description: 'Real-time processing and instant confirmations'
    },
    {
      icon: Globe,
      title: 'Cross-Border',
      description: 'Send money across Africa and beyond'
    },
    {
      icon: CreditCard,
      title: 'Multiple Payment Methods',
      description: 'Mobile money, cards, bank transfers, and more'
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Detailed insights and reporting'
    }
  ]

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Business Owner',
      content: 'SikaRemit transformed how we handle payments. So fast and reliable!',
      rating: 5,
      avatar: '👩‍💼'
    },
    {
      name: 'Michael Chen',
      role: 'Freelancer',
      content: 'The best payment platform I\'ve used in Africa. Simply amazing!',
      rating: 5,
      avatar: '👨‍💻'
    },
    {
      name: 'Ama Mensah',
      role: 'Shop Owner',
      content: 'Mobile money integration is seamless. My customers love it!',
      rating: 5,
      avatar: '👩‍🏪'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/80 backdrop-blur-md shadow-lg' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">SikaRemit</span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors">
                Home
              </Link>
              <Link href="/about" className="text-gray-600 hover:text-gray-900 transition-colors">
                About
              </Link>
              <Link href="/contact" className="text-gray-600 hover:text-gray-900 transition-colors">
                Contact
              </Link>
              <Button variant="outline" className="border-gray-300">
                Support
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
              <Link href="/" className="block px-3 py-2 text-gray-600 hover:text-gray-900">
                Home
              </Link>
              <Link href="/about" className="block px-3 py-2 text-gray-600 hover:text-gray-900">
                About
              </Link>
              <Link href="/contact" className="block px-3 py-2 text-gray-600 hover:text-gray-900">
                Contact
              </Link>
              <Button variant="outline" className="w-full border-gray-300">
                Support
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className={`transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Welcome to
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
                {' '}SikaRemit
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Choose your portal to access secure, fast, and reliable payment solutions tailored for your needs
            </p>
          </div>

          {/* Auth Options Grid */}
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            {authOptions.map((option, index) => (
              <Card
                key={index}
                className={`group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${index * 200}ms` }}
              >
                <div className={`absolute inset-0 ${option.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`}></div>
                
                <CardContent className="p-8 relative">
                  <div className={`w-16 h-16 ${option.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <option.icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{option.title}</h3>
                  <p className="text-gray-600 mb-6">{option.description}</p>
                  
                  <div className="space-y-3 mb-6">
                    {option.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        {feature}
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-sm font-medium text-gray-500">{option.stats}</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="w-4 h-4 text-yellow-400 fill-current" />
                      ))}
                    </div>
                  </div>
                  
                  <Link href={option.href}>
                    <Button className={`w-full ${option.gradient} hover:opacity-90 transition-opacity duration-300`}>
                      Access Portal
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose SikaRemit?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Experience the future of digital payments with our cutting-edge features
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`group p-6 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Trusted by Thousands
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              See what our users are saying about SikaRemit
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
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-2xl mr-4">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
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
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-cyan-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of users who trust SikaRemit for their payment needs
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
              Create Account
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
              Learn More
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
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold">SikaRemit</span>
              </div>
              <p className="text-gray-400">
                The future of African digital payments
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
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" className="hover:text-white">About</Link></li>
                <li><Link href="/careers" className="hover:text-white">Careers</Link></li>
                <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
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
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 SikaRemit. All rights reserved.
            </p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <Link href="#" className="text-gray-400 hover:text-white">
                <Facebook className="w-5 h-5" />
              </Link>
              <Link href="#" className="text-gray-400 hover:text-white">
                <Twitter className="w-5 h-5" />
              </Link>
              <Link href="#" className="text-gray-400 hover:text-white">
                <Linkedin className="w-5 h-5" />
              </Link>
              <Link href="#" className="text-gray-400 hover:text-white">
                <Instagram className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
