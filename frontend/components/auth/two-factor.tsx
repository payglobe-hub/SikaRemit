'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Smartphone, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { requestTwoFactor, verifyTwoFactor } from '@/lib/api/auth'

interface TwoFactorAuthProps {
  userId: string
  phone: string
  onSuccess: () => void
}

export function TwoFactorAuth({ userId, phone, onSuccess }: TwoFactorAuthProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [requestId, setRequestId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const requestCode = async () => {
      if (!phone) return

      setIsLoading(true)
      try {
        const result = await requestTwoFactor()
        setRequestId(result.requestId)
        toast({
          title: 'Verification Code Sent',
          description: 'Please check your phone for the verification code',
        })
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to send verification code',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    requestCode()
  }, [phone, toast])

  const handleVerify = async () => {
    if (!requestId || !verificationCode || verificationCode.length !== 6) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter a valid 6-digit code',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      await verifyTwoFactor(verificationCode)

      toast({
        title: 'Verification Successful',
        description: 'You have been logged in successfully',
      })

      onSuccess()
    } catch (error) {
      toast({
        title: 'Verification Failed',
        description: 'Invalid verification code. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resendCode = async () => {
    if (!phone) return

    setIsLoading(true)
    try {
      const result = await requestTwoFactor()
      setRequestId(result.requestId)
      toast({
        title: 'Code Resent',
        description: 'A new verification code has been sent',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to resend verification code',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="text-center">
        <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold">Two-Factor Authentication</h2>
        <p className="text-muted-foreground">
          Enter the verification code sent to your phone
        </p>
      </div>

      <Alert>
        <Smartphone className="h-4 w-4" />
        <AlertDescription>
          A verification code has been sent to {phone}
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code">Verification Code</Label>
          <Input
            id="code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            className="text-center text-lg tracking-widest"
          />
          <p className="text-xs text-muted-foreground text-center">
            Enter the 6-digit code
          </p>
        </div>

        <Button
          onClick={handleVerify}
          disabled={isLoading || verificationCode.length !== 6}
          className="w-full"
        >
          {isLoading ? 'Verifying...' : 'Verify'}
        </Button>

        <Button
          variant="outline"
          onClick={resendCode}
          disabled={isLoading}
          className="w-full"
        >
          Resend Code
        </Button>
      </div>
    </div>
  )
}
