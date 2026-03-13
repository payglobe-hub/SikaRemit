'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Search, HelpCircle, Phone, Mail, MessageCircle, ExternalLink, Shield, CreditCard, Smartphone, Globe, Clock, CheckCircle, AlertCircle, TrendingUp, Users, FileText, Settings, Lock } from 'lucide-react'
import Link from 'next/link'

const faqCategories = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Users,
    color: 'bg-blue-100 text-blue-600',
    questions: [
      {
        q: 'How do I create a SikaRemit account?',
        a: 'You can create an account by clicking "Sign Up" on our website or downloading our mobile app. You\'ll need to provide your email, phone number, and create a secure password. Complete the verification process to start using our services.',
        tags: ['account', 'registration']
      },
      {
        q: 'What documents do I need to get verified?',
        a: 'For basic verification, you\'ll need a valid government-issued ID (passport, driver\'s license, or national ID) and proof of address. For higher transaction limits, additional documents may be required.',
        tags: ['verification', 'kyc']
      },
      {
        q: 'How long does verification take?',
        a: 'Standard verification typically takes 1-3 business days. You\'ll receive email updates as your verification progresses. Some verifications may be completed within minutes if all documents are clear and valid.',
        tags: ['verification', 'timing']
      }
    ]
  },
  {
    id: 'payments',
    title: 'Payments & Transfers',
    icon: CreditCard,
    color: 'bg-green-100 text-green-600',
    questions: [
      {
        q: 'What payment methods are supported?',
        a: 'SikaRemit supports multiple payment methods including bank transfers, mobile money (MTN, Vodafone, AirtelTigo, G-Money), debit/credit cards, and other digital wallets.',
        tags: ['payment-methods', 'transfers']
      },
      {
        q: 'What are the transaction limits?',
        a: 'Transaction limits vary based on your verification level. Unverified users have lower limits, while fully verified users enjoy higher limits. You can check your current limits in your account settings.',
        tags: ['limits', 'verification']
      },
      {
        q: 'How do I send money internationally?',
        a: 'International transfers are available for verified users. Simply select the recipient\'s country, enter their details, and choose your preferred payment method. Exchange rates and fees will be displayed before confirmation.',
        tags: ['international', 'transfers']
      },
      {
        q: 'Are there any fees for transfers?',
        a: 'Fees vary based on transfer amount, destination, and payment method. Domestic transfers typically have lower fees than international ones. All fees are clearly displayed before you confirm your transaction.',
        tags: ['fees', 'pricing']
      }
    ]
  },
  {
    id: 'security',
    title: 'Security & Safety',
    icon: Shield,
    color: 'bg-indigo-100 text-indigo-600',
    questions: [
      {
        q: 'How is my account protected?',
        a: 'Your account is protected with multiple layers of security including encryption, two-factor authentication, transaction monitoring, and fraud detection systems. We also comply with industry security standards.',
        tags: ['security', 'protection']
      },
      {
        q: 'What is two-factor authentication (2FA)?',
        a: '2FA adds an extra layer of security by requiring a second form of verification (like a code from your authenticator app) in addition to your password. We highly recommend enabling 2FA for all accounts.',
        tags: ['2fa', 'security']
      },
      {
        q: 'How do I report suspicious activity?',
        a: 'If you notice any suspicious activity, immediately contact our support team through the app, website, or email support@sikaremit.com. We also recommend changing your password and enabling 2FA if you haven\'t already.',
        tags: ['security', 'support']
      },
      {
        q: 'Is my personal information safe?',
        a: 'Yes, we use industry-standard encryption and security measures to protect your personal information. We never share your data with third parties without your consent, except as required by law.',
        tags: ['privacy', 'data-protection']
      }
    ]
  },
  {
    id: 'mobile-app',
    title: 'Mobile App',
    icon: Smartphone,
    color: 'bg-orange-100 text-orange-600',
    questions: [
      {
        q: 'Where can I download the SikaRemit app?',
        a: 'You can download our app from the Apple App Store for iOS devices or Google Play Store for Android devices. Search for "SikaRemit" to find our official app.',
        tags: ['download', 'mobile']
      },
      {
        q: 'What features are available on the mobile app?',
        a: 'Our mobile app includes all core features: sending money, paying bills, mobile money transfers, transaction history, balance checking, and account management. You can also receive push notifications for transactions.',
        tags: ['features', 'mobile']
      },
      {
        q: 'How do I enable biometric login?',
        a: 'In the mobile app, go to Settings > Security > Biometric Login. You can enable fingerprint or face recognition if your device supports it. This provides a secure and convenient way to access your account.',
        tags: ['biometrics', 'security']
      }
    ]
  },
  {
    id: 'fees',
    title: 'Fees & Pricing',
    icon: TrendingUp,
    color: 'bg-red-100 text-red-600',
    questions: [
      {
        q: 'How are fees calculated?',
        a: 'Fees are calculated based on transaction amount, payment method, destination, and transfer speed. We always show you the complete fee breakdown before you confirm any transaction.',
        tags: ['fees', 'calculation']
      },
      {
        q: 'Are there any hidden fees?',
        a: 'No, we believe in transparent pricing. All fees are clearly displayed before you confirm any transaction. There are no hidden charges or surprise fees.',
        tags: ['fees', 'transparency']
      },
      {
        q: 'Do you offer fee-free transfers?',
        a: 'Yes, we periodically offer promotional fee-free transfers for specific routes or payment methods. Check our promotions page or app notifications for current offers.',
        tags: ['promotions', 'fees']
      }
    ]
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: Settings,
    color: 'bg-gray-100 text-gray-600',
    questions: [
      {
        q: 'Why was my transaction declined?',
        a: 'Transactions may be declined for various reasons including insufficient funds, security concerns, verification requirements, or technical issues. Check your email for specific details or contact support.',
        tags: ['declined', 'transactions']
      },
      {
        q: 'What should I do if I don\'t receive my money?',
        a: 'First, check the transaction status in your account. If it shows as completed but you haven\'t received the funds, contact our support team immediately with your transaction reference number.',
        tags: ['delay', 'support']
      },
      {
        q: 'How do I reset my password?',
        a: 'Click "Forgot Password" on the login page, enter your email or phone number, and follow the instructions sent to you. You\'ll receive a code to reset your password securely.',
        tags: ['password', 'account']
      }
    ]
  }
]

export default function CustomerFAQPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const filteredCategories = faqCategories.map(category => ({
    ...category,
    questions: category.questions.filter(q => 
      q.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.a.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  })).filter(category => category.questions.length > 0)

  const allQuestions = filteredCategories.flatMap(category => 
    category.questions.map(q => ({ ...q, category }))
  )

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Help Center</h1>
        <p className="text-gray-600 text-lg">
          Find answers to common questions about SikaRemit services
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            placeholder="Search for answers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 py-3 text-lg"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <MessageCircle className="h-8 w-8 text-blue-600 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Live Chat</h3>
            <p className="text-sm text-gray-600 mb-3">Chat with our support team</p>
            <Button variant="outline" size="sm">Start Chat</Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <Phone className="h-8 w-8 text-green-600 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Call Support</h3>
            <p className="text-sm text-gray-600 mb-3">+233 30 123 4567</p>
            <Button variant="outline" size="sm">Call Now</Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <Mail className="h-8 w-8 text-indigo-600 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Email Support</h3>
            <p className="text-sm text-gray-600 mb-3">support@sikaremit.com</p>
            <Button variant="outline" size="sm">Send Email</Button>
          </CardContent>
        </Card>
      </div>

      {/* Categories */}
      {!searchTerm && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {faqCategories.map((category) => {
              const Icon = category.icon
              return (
                <Card 
                  key={category.id}
                  className={`cursor-pointer hover:shadow-md transition-all ${
                    selectedCategory === category.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${category.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{category.title}</h3>
                        <p className="text-sm text-gray-600">{category.questions.length} articles</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* FAQ Content */}
      <div className="space-y-6">
        {(selectedCategory ? 
          faqCategories.find(c => c.id === selectedCategory)?.questions || []
          : allQuestions
        ).map((faq, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <HelpCircle className="h-5 w-5 text-blue-600 mt-1" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{faq.q}</CardTitle>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {faq.tags.map((tag, tagIndex) => (
                      <Badge key={tagIndex} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">{faq.a}</p>
            </CardContent>
          </Card>
        ))}

        {allQuestions.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No results found</h3>
              <p className="text-gray-600 mb-4">
                Try searching with different keywords or browse our categories.
              </p>
              <Button onClick={() => setSearchTerm('')} variant="outline">
                Clear Search
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Still Need Help Section */}
      <div className="mt-12 bg-blue-50 rounded-lg p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Still Need Help?</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Our support team is here to help you with any questions or issues you may have. 
            We're available 24/7 to assist you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/customer/support">
              <Button size="lg" className="w-full sm:w-auto">
                <MessageCircle className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
            </Link>
            <Link href="/customer/settings">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                <Settings className="h-4 w-4 mr-2" />
                Account Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
