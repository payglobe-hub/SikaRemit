'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Separator } from '../../components/ui/separator'

export default function PrivacyPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-xl text-gray-600">
            How we collect, use, and protect your personal information
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Last updated: January 2025
          </p>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>1. Information We Collect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="font-semibold">Personal Information</h3>
              <p className="text-gray-600">
                We collect information you provide directly to us, such as when you create an account,
                make a transaction, or contact our support team. This includes your name, email address,
                phone number, and payment information.
              </p>

              <h3 className="font-semibold">Usage Information</h3>
              <p className="text-gray-600">
                We automatically collect certain information about your use of our services, including
                transaction history, IP addresses, browser type, and device information.
              </p>

              <h3 className="font-semibold">Financial Information</h3>
              <p className="text-gray-600">
                For payment processing, we collect bank account details, credit card information,
                and other financial data necessary to complete transactions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>To provide and maintain our payment services</li>
                <li>To process transactions and send confirmations</li>
                <li>To communicate with you about your account and transactions</li>
                <li>To improve our services and develop new features</li>
                <li>To comply with legal obligations and prevent fraud</li>
                <li>To send marketing communications (with your consent)</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Information Sharing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                We do not sell, trade, or otherwise transfer your personal information to third parties
                without your consent, except as described in this policy.
              </p>

              <h3 className="font-semibold">We may share your information with:</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>Payment processors and financial institutions necessary for transaction processing</li>
                <li>Service providers who assist us in operating our platform</li>
                <li>Law enforcement when required by law or to protect our rights</li>
                <li>Business partners for joint marketing activities (with your consent)</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Data Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                We implement industry-standard security measures to protect your personal information,
                including encryption, secure servers, and regular security audits.
              </p>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900">Security Measures</h3>
                <ul className="list-disc list-inside space-y-1 text-blue-800 mt-2">
                  <li>256-bit SSL/TLS encryption for all data transmission</li>
                  <li>Bank-level security protocols</li>
                  <li>Regular security audits and penetration testing</li>
                  <li>Multi-factor authentication for account access</li>
                  <li>Secure data centers with physical access controls</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Your Rights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                You have the following rights regarding your personal information:
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="font-semibold">Access</h3>
                  <p className="text-sm text-gray-600">Request a copy of the personal information we hold about you</p>
                </div>
                <div>
                  <h3 className="font-semibold">Correction</h3>
                  <p className="text-sm text-gray-600">Request correction of inaccurate or incomplete information</p>
                </div>
                <div>
                  <h3 className="font-semibold">Deletion</h3>
                  <p className="text-sm text-gray-600">Request deletion of your personal information</p>
                </div>
                <div>
                  <h3 className="font-semibold">Portability</h3>
                  <p className="text-sm text-gray-600">Request transfer of your data to another service</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Cookies and Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                We use cookies and similar technologies to enhance your experience, analyze usage,
                and provide personalized content. You can control cookie settings through your browser.
              </p>

              <h3 className="font-semibold">Types of Cookies We Use:</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li><strong>Essential Cookies:</strong> Required for basic website functionality</li>
                <li><strong>Analytics Cookies:</strong> Help us understand how you use our services</li>
                <li><strong>Marketing Cookies:</strong> Used to deliver relevant advertisements</li>
                <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Contact Us</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                If you have any questions about this Privacy Policy or our data practices,
                please contact us:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium">SikaRemit Privacy Team</p>
                <p>Email: privacy@sikaremit.com</p>
                <p>Phone: +1 (555) 123-4567</p>
                <p>Address: 123 Privacy Street, Secure City, SC 12345</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Changes to This Policy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                We may update this Privacy Policy from time to time. We will notify you of any
                material changes by email or through a prominent notice on our website.
                Your continued use of our services after such changes constitutes acceptance
                of the updated policy.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
