'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Cookie, Settings, Shield, BarChart3 } from 'lucide-react'

export default function CookiesPage() {
  const [analyticsEnabled, setAnalyticsEnabled] = React.useState(true)
  const [functionalEnabled, setFunctionalEnabled] = React.useState(true)
  const [marketingEnabled, setMarketingEnabled] = React.useState(false)
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Cookie className="h-12 w-12 text-orange-600" />
            <h1 className="text-4xl font-bold text-gray-900">Cookie Policy</h1>
          </div>
          <p className="text-xl text-gray-600">
            How we use cookies and similar technologies to improve your experience
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Last updated: January 2025
          </p>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>What Are Cookies?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Cookies are small text files that are stored on your computer or mobile device when you visit our website.
                They allow us to remember your preferences, analyze site usage, and provide personalized content.
                Cookies help us improve our services and your browsing experience.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Types of Cookies We Use</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Essential Cookies</h3>
                  <p className="text-gray-600 mb-2">
                    These cookies are necessary for the website to function properly and cannot be disabled.
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>Authentication and security cookies</li>
                    <li>Session management cookies</li>
                    <li>CSRF protection cookies</li>
                    <li>Load balancing cookies</li>
                  </ul>
                  <p className="text-xs text-gray-500 mt-2">Purpose: Website functionality</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Analytics Cookies</h3>
                  <p className="text-gray-600 mb-2">
                    These cookies help us understand how visitors interact with our website.
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>Page view tracking</li>
                    <li>User journey analysis</li>
                    <li>Performance monitoring</li>
                    <li>Error tracking</li>
                  </ul>
                  <p className="text-xs text-gray-500 mt-2">Purpose: Website improvement</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Settings className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Functional Cookies</h3>
                  <p className="text-gray-600 mb-2">
                    These cookies enable enhanced functionality and personalization.
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>User preference storage</li>
                    <li>Language selection</li>
                    <li>Currency preferences</li>
                    <li>Theme settings</li>
                  </ul>
                  <p className="text-xs text-gray-500 mt-2">Purpose: User experience</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Cookie className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Marketing Cookies</h3>
                  <p className="text-gray-600 mb-2">
                    These cookies are used to deliver relevant advertisements and track campaign effectiveness.
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>Advertising targeting</li>
                    <li>Campaign tracking</li>
                    <li>Social media integration</li>
                    <li>Retargeting cookies</li>
                  </ul>
                  <p className="text-xs text-gray-500 mt-2">Purpose: Marketing and advertising</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cookie Settings</CardTitle>
              <CardDescription>
                You can control which types of cookies you accept. Essential cookies cannot be disabled
                as they are required for the website to function.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label className="font-semibold">Essential Cookies</Label>
                  <p className="text-sm text-gray-600">Required for website functionality</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={true} disabled onCheckedChange={() => {}} />
                  <span className="text-sm text-gray-500">Always On</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label className="font-semibold">Analytics Cookies</Label>
                  <p className="text-sm text-gray-600">Help us improve our services</p>
                </div>
                <Switch
                  checked={analyticsEnabled}
                  onCheckedChange={setAnalyticsEnabled}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label className="font-semibold">Functional Cookies</Label>
                  <p className="text-sm text-gray-600">Enhance your browsing experience</p>
                </div>
                <Switch
                  checked={functionalEnabled}
                  onCheckedChange={setFunctionalEnabled}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label className="font-semibold">Marketing Cookies</Label>
                  <p className="text-sm text-gray-600">Personalized ads and content</p>
                </div>
                <Switch
                  checked={marketingEnabled}
                  onCheckedChange={setMarketingEnabled}
                />
              </div>

              <div className="flex gap-4">
                <Button>Save Preferences</Button>
                <Button variant="outline">Reset to Defaults</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How to Manage Cookies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="font-semibold">Browser Settings</h3>
              <p className="text-gray-600">
                You can control cookies through your browser settings. Most browsers allow you to:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>View what cookies are stored and delete them</li>
                <li>Block third-party cookies</li>
                <li>Block cookies from specific sites</li>
                <li>Clear cookies when you close the browser</li>
                <li>Block all cookies (may affect website functionality)</li>
              </ul>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900">Popular Browsers</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                  <div className="text-center">
                    <p className="font-medium text-blue-800">Chrome</p>
                    <p className="text-xs text-blue-700">chrome://settings/cookies</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-blue-800">Firefox</p>
                    <p className="text-xs text-blue-700">about:preferences#privacy</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-blue-800">Safari</p>
                    <p className="text-xs text-blue-700">Preferences → Privacy</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-blue-800">Edge</p>
                    <p className="text-xs text-blue-700">Settings → Cookies</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Third-Party Cookies</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Some cookies are set by third-party services that appear on our pages. We use the following services:
              </p>

              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold">Google Analytics</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Used to analyze website traffic and user behavior.
                  </p>
                  <p className="text-xs text-gray-500">
                    Privacy Policy: <a href="https://policies.google.com/privacy" className="text-blue-600 hover:underline">Google Privacy Policy</a>
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold">Stripe</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Used for secure payment processing.
                  </p>
                  <p className="text-xs text-gray-500">
                    Privacy Policy: <a href="https://stripe.com/privacy" className="text-blue-600 hover:underline">Stripe Privacy Policy</a>
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold">Cloudflare</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Used for website security and performance optimization.
                  </p>
                  <p className="text-xs text-gray-500">
                    Privacy Policy: <a href="https://www.cloudflare.com/privacypolicy/" className="text-blue-600 hover:underline">Cloudflare Privacy Policy</a>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                If you have questions about our cookie policy or need help managing your cookie preferences,
                please contact us:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium">SikaRemit Support Team</p>
                <p>Email: privacy@sikaremit.com</p>
                <p>Phone: +1 (555) 123-4567</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
