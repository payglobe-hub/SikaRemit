'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Building2, User, Phone, Mail, MapPin, CreditCard, FileText } from 'lucide-react'
import { merchantApi } from '@/lib/api/axios'

export function MerchantApplicationForm() {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    // Business Information
    businessName: '',
    businessType: '',
    businessDescription: '',
    businessAddress: '',
    businessPhone: '',
    businessEmail: '',
    website: '',
    taxId: '',
    registrationNumber: '',

    // Contact Person
    contactFirstName: '',
    contactLastName: '',
    contactEmail: '',
    contactPhone: '',
    contactPosition: '',

    // Business Details
    employeeCount: '',
    monthlyRevenue: '',
    paymentMethods: [] as string[],
    industry: '',

    // Additional Information
    hearAboutUs: '',
    specialRequirements: '',
    acceptTerms: false
  })

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handlePaymentMethodChange = (method: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      paymentMethods: checked
        ? [...prev.paymentMethods, method]
        : prev.paymentMethods.filter(m => m !== method)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    const requiredFields = [
      'businessName', 'businessType', 'businessDescription', 'businessAddress',
      'businessPhone', 'businessEmail', 'contactFirstName', 'contactLastName',
      'contactEmail', 'contactPhone', 'industry'
    ]

    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData])

    if (missingFields.length > 0) {
      toast({
        title: 'Required Fields Missing',
        description: 'Please fill in all required fields marked with *',
        variant: 'destructive'
      })
      return
    }

    if (!formData.acceptTerms) {
      toast({
        title: 'Terms Required',
        description: 'Please accept the terms and conditions',
        variant: 'destructive'
      })
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.businessEmail) || !emailRegex.test(formData.contactEmail)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter valid email addresses',
        variant: 'destructive'
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Submit to API using the client
      const response = await merchantApi.submitApplication(formData)

      if (response.status >= 200 && response.status < 300) {
        toast({
          title: 'Application Submitted!',
          description: 'Your merchant application has been submitted successfully. We\'ll review it within 2-3 business days.',
        })

        // Reset form
        setFormData({
          businessName: '',
          businessType: '',
          businessDescription: '',
          businessAddress: '',
          businessPhone: '',
          businessEmail: '',
          website: '',
          taxId: '',
          registrationNumber: '',
          contactFirstName: '',
          contactLastName: '',
          contactEmail: '',
          contactPhone: '',
          contactPosition: '',
          employeeCount: '',
          monthlyRevenue: '',
          paymentMethods: [],
          industry: '',
          hearAboutUs: '',
          specialRequirements: '',
          acceptTerms: false
        })
      } else {
        throw new Error(response.data?.detail || response.data?.error || 'Failed to submit application')
      }

    } catch (error: any) {
      toast({
        title: 'Submission Failed',
        description: 'Failed to submit application. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Business Information
          </CardTitle>
          <CardDescription>
            Tell us about your business
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) => handleInputChange('businessName', e.target.value)}
                placeholder="Your Business Name Ltd"
                required
              />
            </div>

            <div>
              <Label htmlFor="businessType">Business Type *</Label>
              <Select value={formData.businessType} onValueChange={(value) => handleInputChange('businessType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sole-proprietorship">Sole Proprietorship</SelectItem>
                  <SelectItem value="partnership">Partnership</SelectItem>
                  <SelectItem value="corporation">Corporation</SelectItem>
                  <SelectItem value="llc">LLC</SelectItem>
                  <SelectItem value="non-profit">Non-Profit</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="industry">Industry *</Label>
              <Select value={formData.industry} onValueChange={(value) => handleInputChange('industry', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">Retail/E-commerce</SelectItem>
                  <SelectItem value="restaurant">Restaurant/Food Service</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="professional">Professional Services</SelectItem>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="businessDescription">Business Description *</Label>
              <Textarea
                id="businessDescription"
                value={formData.businessDescription}
                onChange={(e) => handleInputChange('businessDescription', e.target.value)}
                placeholder="Describe your business, products/services, and target market..."
                rows={3}
                required
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="businessAddress">Business Address *</Label>
              <Input
                id="businessAddress"
                value={formData.businessAddress}
                onChange={(e) => handleInputChange('businessAddress', e.target.value)}
                placeholder="Street address, city, state, postal code, country"
                required
              />
            </div>

            <div>
              <Label htmlFor="businessPhone">Business Phone *</Label>
              <Input
                id="businessPhone"
                type="tel"
                value={formData.businessPhone}
                onChange={(e) => handleInputChange('businessPhone', e.target.value)}
                placeholder="+1 (555) 123-4567"
                required
              />
            </div>

            <div>
              <Label htmlFor="businessEmail">Business Email *</Label>
              <Input
                id="businessEmail"
                type="email"
                value={formData.businessEmail}
                onChange={(e) => handleInputChange('businessEmail', e.target.value)}
                placeholder="business@company.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="website">Website (Optional)</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://www.yourwebsite.com"
              />
            </div>

            <div>
              <Label htmlFor="taxId">Tax ID / EIN (Optional)</Label>
              <Input
                id="taxId"
                value={formData.taxId}
                onChange={(e) => handleInputChange('taxId', e.target.value)}
                placeholder="Your tax identification number"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Person */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Primary Contact Person
          </CardTitle>
          <CardDescription>
            Information about the main point of contact
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contactFirstName">First Name *</Label>
              <Input
                id="contactFirstName"
                value={formData.contactFirstName}
                onChange={(e) => handleInputChange('contactFirstName', e.target.value)}
                placeholder="John"
                required
              />
            </div>

            <div>
              <Label htmlFor="contactLastName">Last Name *</Label>
              <Input
                id="contactLastName"
                value={formData.contactLastName}
                onChange={(e) => handleInputChange('contactLastName', e.target.value)}
                placeholder="Doe"
                required
              />
            </div>

            <div>
              <Label htmlFor="contactEmail">Email Address *</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                placeholder="john@company.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="contactPhone">Phone Number *</Label>
              <Input
                id="contactPhone"
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                placeholder="+1 (555) 123-4567"
                required
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="contactPosition">Position/Title</Label>
              <Input
                id="contactPosition"
                value={formData.contactPosition}
                onChange={(e) => handleInputChange('contactPosition', e.target.value)}
                placeholder="CEO, Manager, Owner, etc."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Business Details
          </CardTitle>
          <CardDescription>
            Help us understand your payment processing needs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="employeeCount">Number of Employees</Label>
              <Select value={formData.employeeCount} onValueChange={(value) => handleInputChange('employeeCount', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-5">1-5 employees</SelectItem>
                  <SelectItem value="6-20">6-20 employees</SelectItem>
                  <SelectItem value="21-50">21-50 employees</SelectItem>
                  <SelectItem value="51-100">51-100 employees</SelectItem>
                  <SelectItem value="100+">100+ employees</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="monthlyRevenue">Monthly Revenue</Label>
              <Select value={formData.monthlyRevenue} onValueChange={(value) => handleInputChange('monthlyRevenue', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="under-10k">Under $10,000</SelectItem>
                  <SelectItem value="10k-50k">$10,000 - $50,000</SelectItem>
                  <SelectItem value="50k-100k">$50,000 - $100,000</SelectItem>
                  <SelectItem value="100k-500k">$100,000 - $500,000</SelectItem>
                  <SelectItem value="over-500k">Over $500,000</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Current/Planned Payment Methods</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                { id: 'credit-card', label: 'Credit/Debit Cards' },
                { id: 'mobile-money', label: 'Mobile Money' },
                { id: 'bank-transfer', label: 'Bank Transfer' },
                { id: 'digital-wallet', label: 'Digital Wallets' },
                { id: 'crypto', label: 'Cryptocurrency' },
                { id: 'qr-code', label: 'QR Code Payments' }
              ].map((method) => (
                <div key={method.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={method.id}
                    checked={formData.paymentMethods.includes(method.id)}
                    onCheckedChange={(checked) => handlePaymentMethodChange(method.id, checked as boolean)}
                  />
                  <Label htmlFor={method.id} className="text-sm">{method.label}</Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="hearAboutUs">How did you hear about sikaremit?</Label>
            <Select value={formData.hearAboutUs} onValueChange={(value) => handleInputChange('hearAboutUs', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="search">Search Engine</SelectItem>
                <SelectItem value="social-media">Social Media</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="advertisement">Advertisement</SelectItem>
                <SelectItem value="conference">Conference/Event</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="specialRequirements">Special Requirements or Notes</Label>
            <Textarea
              id="specialRequirements"
              value={formData.specialRequirements}
              onChange={(e) => handleInputChange('specialRequirements', e.target.value)}
              placeholder="Any special requirements, integrations, or additional information..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Terms and Submission */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="acceptTerms"
                checked={formData.acceptTerms}
                onCheckedChange={(checked) => handleInputChange('acceptTerms', checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="acceptTerms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  I accept the Terms and Conditions *
                </Label>
                <p className="text-xs text-muted-foreground">
                  By submitting this application, I agree to sikaremit's{' '}
                  <a href="/terms" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                    Terms of Service
                  </a>
                  {' '}and{' '}
                  <a href="/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                    Privacy Policy
                  </a>
                  . I understand that sikaremit will verify the information provided.
                </p>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
