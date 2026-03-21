'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, Lock, FileCheck, Globe, Users, AlertTriangle } from 'lucide-react'

export default function CompliancePage() {
  const complianceStandards = [
    {
      name: 'PCI DSS Level 1',
      description: 'Payment Card Industry Data Security Standard - highest level of compliance',
      status: 'Compliant',
      lastAudit: 'December 2024'
    },
    {
      name: 'SOX Compliance',
      description: 'Sarbanes-Oxley Act compliance for financial reporting',
      status: 'Compliant',
      lastAudit: 'Q4 2024'
    },
    {
      name: 'GDPR',
      description: 'General Data Protection Regulation for EU data protection',
      status: 'Compliant',
      lastAudit: 'November 2024'
    },
    {
      name: 'AML/KYC',
      description: 'Anti-Money Laundering and Know Your Customer regulations',
      status: 'Compliant',
      lastAudit: 'Ongoing'
    },
    {
      name: 'OFAC Sanctions',
      description: 'Office of Foreign Assets Control compliance',
      status: 'Compliant',
      lastAudit: 'Daily Updates'
    },
    {
      name: 'ISO 27001',
      description: 'Information Security Management Systems certification',
      status: 'Certified',
      lastAudit: 'October 2024'
    }
  ]

  const regulatoryBodies = [
    {
      name: 'Financial Services Authority',
      country: 'Global',
      requirements: 'Financial services licensing and oversight'
    },
    {
      name: 'European Banking Authority',
      country: 'EU',
      requirements: 'PSD2 and financial services regulation'
    },
    {
      name: 'Financial Conduct Authority',
      country: 'UK',
      requirements: 'Financial services conduct and consumer protection'
    },
    {
      name: 'Central Bank of Ghana',
      country: 'Ghana',
      requirements: 'Banking and payment services regulation'
    }
  ]

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="h-12 w-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Compliance & Security</h1>
          </div>
          <p className="text-xl text-gray-600">
            Our commitment to regulatory compliance and data security
          </p>
        </div>

        {/* Overview */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Regulatory Compliance Framework</h2>
              <p className="text-gray-600 mb-6">
                SikaRemit maintains the highest standards of compliance across all jurisdictions
                where we operate. Our compliance program ensures that we meet or exceed all
                applicable regulatory requirements.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">50+</div>
                  <div className="text-sm text-gray-600">Countries Served</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">99.9%</div>
                  <div className="text-sm text-gray-600">Uptime SLA</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">24/7</div>
                  <div className="text-sm text-gray-600">Security Monitoring</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">0</div>
                  <div className="text-sm text-gray-600">Security Breaches</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Standards */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Compliance Standards</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {complianceStandards.map((standard, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <FileCheck className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{standard.name}</h3>
                        <Badge className="bg-green-100 text-green-800 mt-1">
                          {standard.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-3">{standard.description}</p>
                  <p className="text-sm text-gray-500">
                    Last audit: {standard.lastAudit}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Regulatory Oversight */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Regulatory Oversight</h2>
          <Card>
            <CardContent className="p-6">
              <div className="grid gap-6 md:grid-cols-2">
                {regulatoryBodies.map((body, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Globe className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold">{body.name}</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{body.country}</p>
                    <p className="text-sm text-gray-600">{body.requirements}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Security Measures */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Security Measures</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardContent className="p-6 text-center">
                <Lock className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Data Encryption</h3>
                <p className="text-sm text-gray-600">
                  End-to-end encryption for all data transmission and storage
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Access Controls</h3>
                <p className="text-sm text-gray-600">
                  Role-based access control and multi-factor authentication
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <AlertTriangle className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Fraud Prevention</h3>
                <p className="text-sm text-gray-600">
                  Advanced fraud detection and prevention systems
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Risk Management */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Risk Management Framework</CardTitle>
            <CardDescription>
              Our comprehensive approach to identifying, assessing, and mitigating risks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Transaction Monitoring</h3>
                <p className="text-gray-600">
                  Real-time monitoring of all transactions for suspicious activity using AI-powered
                  risk assessment algorithms.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Customer Due Diligence</h3>
                <p className="text-gray-600">
                  Enhanced due diligence procedures for high-risk customers and transactions,
                  including identity verification and source of funds assessment.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Regular Audits</h3>
                <p className="text-gray-600">
                  Independent third-party audits conducted quarterly to ensure ongoing compliance
                  with all regulatory requirements.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Compliance Inquiries</CardTitle>
            <CardDescription>
              Questions about our compliance program or regulatory requirements?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Contact Our Compliance Team</h3>
              <div className="space-y-2 text-blue-800">
                <p>Email: compliance@sikaremit.com</p>
                <p>Phone: +1 (555) 123-4567</p>
                <p>Address: 123 Compliance Street, Secure City, SC 12345</p>
              </div>
              <p className="text-blue-700 text-sm mt-4">
                Our compliance team is available 24/7 to address any regulatory concerns or questions.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
