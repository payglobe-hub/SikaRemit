'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Phone, CheckCircle2, AlertCircle } from 'lucide-react'
import { sendSMSVerification, verifySMSCode } from '@/lib/api/sms'
import { useToast } from '@/hooks/use-toast'

interface SMSVerificationProps {
  phoneNumber?: string
  onVerified?: () => void
  onCancel?: () => void
}

export function SMSVerification({ phoneNumber: initialPhone, onVerified, onCancel }: SMSVerificationProps) {
  const { toast } = useToast()
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phoneNumber, setPhoneNumber] = useState(initialPhone || '')
  const [verificationCode, setVerificationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [verificationId, setVerificationId] = useState('')
  const [resendCountdown, setResendCountdown] = useState(0)

  const formatPhoneNumber = (value: string) => {
    // Remove all non-numeric characters
    const cleaned = value.replace(/\D/g, '')
    
    // Format as +XXX XXX XXX XXXX
    if (cleaned.length <= 3) return `+${cleaned}`
    if (cleaned.length <= 6) return `+${cleaned.slice(0, 3)} ${cleaned.slice(3)}`
    if (cleaned.length <= 9) return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9, 13)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setPhoneNumber(formatted)
  }

  const handleSendCode = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setError('Please enter a valid phone number')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await sendSMSVerification(phoneNumber)
      setVerificationId(response.verification_id)
      setStep('code')
      toast({ title: 'Success', description: 'Verification code sent to your phone' })
      
      // Start countdown for resend
      setResendCountdown(60)
      const interval = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send verification code')
      toast({ title: 'Error', description: 'Failed to send verification code', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }

    setLoading(true)
    setError('')

    try {
      await verifySMSCode(verificationId, verificationCode)
      toast({ title: 'Success', description: 'Phone number verified successfully!' })
      onVerified?.()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid verification code')
      toast({ title: 'Error', description: 'Invalid verification code', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (resendCountdown > 0) return
    
    setLoading(true)
    setError('')

    try {
      const response = await sendSMSVerification(phoneNumber)
      setVerificationId(response.verification_id)
      toast({ title: 'Success', description: 'New verification code sent' })
      
      // Restart countdown
      setResendCountdown(60)
      const interval = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend code')
      toast({ title: 'Error', description: 'Failed to resend code', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          SMS Verification
        </CardTitle>
        <CardDescription>
          {step === 'phone' 
            ? 'Enter your phone number to receive a verification code'
            : 'Enter the 6-digit code sent to your phone'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 'phone' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+233 XXX XXX XXXX"
                value={phoneNumber}
                onChange={handlePhoneChange}
                disabled={loading}
                maxLength={17}
              />
              <p className="text-sm text-muted-foreground">
                Include country code (e.g., +233 for Ghana)
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSendCode}
                disabled={loading || !phoneNumber}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Verification Code'
                )}
              </Button>
              {onCancel && (
                <Button variant="outline" onClick={onCancel} disabled={loading}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={loading}
                maxLength={6}
                className="text-center text-2xl tracking-widest"
              />
              <p className="text-sm text-muted-foreground">
                Code sent to {phoneNumber}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleVerifyCode}
                disabled={loading || verificationCode.length !== 6}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Verify Code
                  </>
                )}
              </Button>
            </div>

            <div className="text-center space-y-2">
              <Button
                variant="link"
                onClick={handleResendCode}
                disabled={loading || resendCountdown > 0}
                className="text-sm"
              >
                {resendCountdown > 0 
                  ? `Resend code in ${resendCountdown}s`
                  : 'Resend verification code'
                }
              </Button>
              <Button
                variant="link"
                onClick={() => setStep('phone')}
                disabled={loading}
                className="text-sm"
              >
                Change phone number
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
