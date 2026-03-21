'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Book, MessageCircle, Video, FileText, HelpCircle } from 'lucide-react'

export default function HelpPage() {
  const helpCategories = [
    {
      title: 'Getting Started',
      description: 'Learn the basics of using SikaRemit',
      icon: Book,
      articles: ['Creating an account', 'Setting up payments', 'First transaction']
    },
    {
      title: 'Payments & Transfers',
      description: 'Everything about sending and receiving money',
      icon: FileText,
      articles: ['Domestic transfers', 'International transfers', 'Payment methods']
    },
    {
      title: 'Account Management',
      description: 'Manage your profile and security',
      icon: HelpCircle,
      articles: ['Profile settings', 'Security features', 'Two-factor authentication']
    },
    {
      title: 'Troubleshooting',
      description: 'Common issues and solutions',
      icon: MessageCircle,
      articles: ['Payment failed', 'Account verification', 'Transaction status']
    }
  ]

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Help Center</h1>
          <p className="text-xl text-gray-600 mb-8">
            Find answers to your questions and get the help you need
          </p>

          {/* Search Bar */}
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search for help..."
              className="pl-10 pr-4 py-3 text-base"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-3 mb-12">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <MessageCircle className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Contact Support</h3>
              <p className="text-sm text-gray-600 mb-4">
                Get in touch with our support team for personalized help
              </p>
              <Button>Contact Us</Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <Video className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Video Tutorials</h3>
              <p className="text-sm text-gray-600 mb-4">
                Watch step-by-step guides to master SikaRemit
              </p>
              <Button variant="outline">Watch Videos</Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <FileText className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Documentation</h3>
              <p className="text-sm text-gray-600 mb-4">
                Detailed guides and API documentation
              </p>
              <Button variant="outline">View Docs</Button>
            </CardContent>
          </Card>
        </div>

        {/* Help Categories */}
        <div className="grid gap-8 md:grid-cols-2">
          {helpCategories.map((category, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <category.icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{category.title}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {category.articles.map((article, articleIndex) => (
                    <div key={articleIndex} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                      <span className="text-sm">{article}</span>
                      <Badge variant="secondary" className="text-xs">Guide</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">How do I reset my password?</h3>
                <p className="text-sm text-gray-600">
                  Click "Forgot Password" on the login page and follow the instructions sent to your email.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">What payment methods are supported?</h3>
                <p className="text-sm text-gray-600">
                  We support credit cards, bank transfers, mobile money, and various digital wallets.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">How long do transfers take?</h3>
                <p className="text-sm text-gray-600">
                  Domestic transfers are instant. International transfers take 1-3 business days.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Is my money safe?</h3>
                <p className="text-sm text-gray-600">
                  Yes, we use bank-level security and encryption to protect your funds and data.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
