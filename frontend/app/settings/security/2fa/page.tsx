'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Shield, Smartphone, Mail, CheckCircle, QrCode } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

export default function TwoFactorAuthPage() {
  const [method, setMethod] = useState<'sms' | 'app'>('app')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [isEnabled, setIsEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<'setup' | 'verify'>('setup')
  const router = useRouter()
  const { toast } = useToast()

  const handleEnable = async () => {
    if (method === 'sms' && !phoneNumber) {
      toast({
        title: 'Error',
        description: 'Please enter a phone number for SMS verification.',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)

    // Simulate setup
    setTimeout(() => {
      setStep('verify')
      setIsLoading(false)
      toast({
        title: '2FA Setup Started',
        description: method === 'app' ? 'Scan the QR code with your authenticator app.' : 'A verification code has been sent to your phone.',
      })
    }, 1500)
  }

  const handleVerify = async () => {
    if (!verificationCode) {
      toast({
        title: 'Error',
        description: 'Please enter the verification code.',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)

    // Simulate verification
    setTimeout(() => {
      setIsEnabled(true)
      setIsLoading(false)
      toast({
        title: 'Success',
        description: 'Two-factor authentication has been enabled!',
      })
      router.push('/merchant/settings')
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full">
              <Shield className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Two-Factor Authentication</CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEnabled ? (
            <div className="text-center space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                  2FA Enabled
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Your account is now protected with two-factor authentication.
                </p>
              </div>
              <Button onClick={() => router.push('/merchant/settings')} className="w-full">
                Return to Settings
              </Button>
            </div>
          ) : step === 'setup' ? (
            <div className="space-y-6">
              <div>
                <Label className="text-base font-semibold mb-3 block">Choose Authentication Method</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="font-medium">Authenticator App</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Use Google Authenticator or similar</div>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="method"
                      value="app"
                      checked={method === 'app'}
                      onChange={() => setMethod('app')}
                      className="w-4 h-4"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="font-medium">SMS Verification</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Receive codes via SMS</div>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="method"
                      value="sms"
                      checked={method === 'sms'}
                      onChange={() => setMethod('sms')}
                      className="w-4 h-4"
                    />
                  </div>
                </div>
              </div>

              {method === 'sms' && (
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleEnable}
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800"
                >
                  {isLoading ? 'Setting up...' : 'Enable 2FA'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                {method === 'app' ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <QrCode className="h-24 w-24 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Scan this QR code with your authenticator app
                      </p>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Can't scan? Enter this code manually: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">ABCD-EFGH-IJKL</code>
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Mail className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      A verification code has been sent to {phoneNumber}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('setup')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleVerify}
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800"
                >
                  {isLoading ? 'Verifying...' : 'Verify & Enable'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
