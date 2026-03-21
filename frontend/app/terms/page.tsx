'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TermsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-xl text-gray-600">
            Please read these terms carefully before using our services
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Last updated: January 2025
          </p>
          <p className="text-sm text-gray-500 mt-2">
            SikaRemit is regulated by the Bank of Ghana
          </p>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>1. Acceptance of Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                By accessing and using SikaRemit's services, you accept and agree to be bound by the terms
                and provision of this agreement. If you do not agree to abide by the above, please do not use
                this service.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Service Description</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                SikaRemit provides payment processing and money transfer services that allow users to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>Send and receive domestic money transfers</li>
                <li>Process international remittances</li>
                <li>Make bill payments and utility payments</li>
                <li>Purchase airtime and data bundles</li>
                <li>Manage payment methods and accounts</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. User Eligibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                To use our services, you must:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>Be at least 18 years old or the age of majority in your jurisdiction</li>
                <li>Have the legal capacity to enter into binding agreements</li>
                <li>Provide accurate and complete information during registration</li>
                <li>Maintain the security of your account credentials</li>
                <li>Comply with all applicable laws and regulations</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Account Responsibilities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                You are responsible for:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>Maintaining the confidentiality of your account information</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use</li>
                <li>Ensuring your contact information is current and accurate</li>
                <li>Complying with transaction limits and our risk policies</li>
              </ul>

              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h3 className="font-semibold text-red-900">Important Notice</h3>
                <p className="text-red-800 text-sm mt-1">
                  You are solely responsible for all transactions initiated through your account.
                  Any unauthorized transactions must be reported within 60 days.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Payment Processing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="font-semibold">Fees and Charges</h3>
              <p className="text-gray-600">
                Transaction fees vary by service type, amount, and destination. All applicable fees
                will be displayed before you complete a transaction. Fees are non-refundable once
                a transaction has been processed.
              </p>

              <h3 className="font-semibold">Transaction Limits</h3>
              <p className="text-gray-600">
                We may impose daily, monthly, or per-transaction limits based on your account
                verification status, transaction history, and risk assessment.
              </p>

              <h3 className="font-semibold">Processing Times</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>Domestic transfers: Instant to same-day</li>
                <li>International transfers: 1-5 business days</li>
                <li>Bill payments: Instant to 2 business days</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Prohibited Activities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                You agree not to use our services for:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600">
                <li>Illegal activities or transactions</li>
                <li>Money laundering or terrorist financing</li>
                <li>Fraudulent or deceptive practices</li>
                <li>Violation of economic sanctions</li>
                <li>Gambling or high-risk merchant categories</li>
                <li>Transactions involving prohibited goods or services</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Termination</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                We reserve the right to terminate or suspend your account at any time for violations
                of these terms, illegal activity, or at our sole discretion. You may also terminate
                your account at any time by contacting our support team.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Disclaimers and Limitations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Our services are provided "as is" without warranties of any kind. We do not guarantee
                uninterrupted service or error-free operation.
              </p>

              <p className="text-gray-600">
                We are not liable for indirect, incidental, or consequential damages arising from
                your use of our services, to the maximum extent permitted by law.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>9. Governing Law</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                These terms are governed by the laws of [Jurisdiction]. Any disputes will be
                resolved in the courts of [Jurisdiction].
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>10. Changes to Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                We may modify these terms at any time. Continued use of our services after changes
                constitutes acceptance of the new terms. We will notify users of material changes
                via email or through our platform.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>11. Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                If you have questions about these Terms of Service, please contact us:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="font-medium">SikaRemit Legal Team</p>
                <p>Email: legal@sikaremit.com</p>
                <p>Phone: +233 30 123 4567</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>12. Regulatory Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                SikaRemit operates under the supervision of the Bank of Ghana. For complaints 
                that cannot be resolved through our customer service, you may contact:
              </p>
              <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                <div>
                  <p className="font-medium">Bank of Ghana - Payment Systems Department</p>
                  <p>Address: 1 Thorpe Road, Accra, Ghana</p>
                  <p>Phone: +233 302 666 174</p>
                  <p>Email: secretary@bog.gov.gh</p>
                  <p>Website: <a href="https://www.bog.gov.gh" className="text-blue-600 hover:underline">www.bog.gov.gh</a></p>
                </div>
                <div>
                  <p className="font-medium">Financial Intelligence Centre (FIC)</p>
                  <p>Phone: +233 302 662 028</p>
                  <p>Email: info@fic.gov.gh</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
