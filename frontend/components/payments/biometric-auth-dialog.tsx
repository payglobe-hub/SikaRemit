'use client'

import * as React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Fingerprint, Scan, Shield, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useBiometricAuth } from '@/hooks/useBiometricAuth'
import { useToast } from '@/hooks/use-toast'

interface BiometricAuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  paymentMethodId: string
  userId: string
  mode: 'register' | 'authenticate'
  onSuccess?: () => void
  onError?: (error: string) => void
}

export function BiometricAuthDialog({
  open,
  onOpenChange,
  paymentMethodId,
  userId,
  mode,
  onSuccess,
  onError
}: BiometricAuthDialogProps) {
  const { 
    capabilities, 
    isAuthenticating, 
    registerBiometric, 
    authenticateBiometric,
    isBiometricRegistered
  } = useBiometricAuth()
  const { toast } = useToast()
  const [status, setStatus] = React.useState<'idle' | 'processing' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = React.useState('')

  const handleBiometric = async () => {
    setStatus('processing')
    setErrorMessage('')

    try {
      let result
      if (mode === 'register') {
        result = await registerBiometric(paymentMethodId, userId)
      } else {
        result = await authenticateBiometric(paymentMethodId)
      }

      if (result.success) {
        setStatus('success')
        toast({
          title: 'Success',
          description: mode === 'register' 
            ? 'Biometric authentication registered successfully'
            : 'Authentication successful'
        })
        onSuccess?.()
        setTimeout(() => {
          onOpenChange(false)
          setStatus('idle')
        }, 1500)
      } else {
        setStatus('error')
        setErrorMessage(result.error || 'Authentication failed')
        onError?.(result.error || 'Authentication failed')
      }
    } catch (error: any) {
      setStatus('error')
      setErrorMessage(error.message || 'An unexpected error occurred')
      onError?.(error.message)
    }
  }

  const getBiometricIcon = () => {
    if (capabilities.methods.includes('face')) {
      return <Scan className="h-16 w-16 text-primary" />
    }
    return <Fingerprint className="h-16 w-16 text-primary" />
  }

  const getBiometricLabel = () => {
    if (capabilities.methods.includes('face')) {
      return 'Face Recognition'
    }
    return 'Fingerprint'
  }

  if (!capabilities.available) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Biometric Authentication Unavailable</DialogTitle>
            <DialogDescription>
              Biometric authentication is not available on this device
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Your device doesn't support biometric authentication, or it hasn't been set up.
              Please use a device with fingerprint or face recognition capabilities.
            </AlertDescription>
          </Alert>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'register' ? 'Register' : 'Authenticate with'} {getBiometricLabel()}
          </DialogTitle>
          <DialogDescription>
            {mode === 'register'
              ? 'Set up biometric authentication for quick and secure payments'
              : 'Verify your identity to proceed with this payment'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-8 space-y-6">
          {status === 'idle' && (
            <>
              <div className="relative">
                {getBiometricIcon()}
                {mode === 'register' && (
                  <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1">
                    <Shield className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
              <div className="text-center space-y-2">
                <h3 className="font-semibold">
                  {mode === 'register' ? 'Register Your Biometric' : 'Authenticate'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {mode === 'register'
                    ? `Use your ${getBiometricLabel().toLowerCase()} to secure this payment method`
                    : `Use your ${getBiometricLabel().toLowerCase()} to confirm`}
                </p>
              </div>
            </>
          )}

          {status === 'processing' && (
            <>
              <div className="relative">
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="font-semibold">Processing...</h3>
                <p className="text-sm text-muted-foreground">
                  Please complete the biometric scan on your device
                </p>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-16 w-16 text-green-600" />
              <div className="text-center space-y-2">
                <h3 className="font-semibold text-green-600">Success!</h3>
                <p className="text-sm text-muted-foreground">
                  {mode === 'register'
                    ? 'Biometric authentication has been registered'
                    : 'Authentication successful'}
                </p>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-16 w-16 text-red-600" />
              <div className="text-center space-y-2">
                <h3 className="font-semibold text-red-600">Authentication Failed</h3>
                <p className="text-sm text-muted-foreground">{errorMessage}</p>
              </div>
            </>
          )}
        </div>

        {errorMessage && status === 'error' && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          {status === 'idle' && (
            <>
              <Button
                onClick={handleBiometric}
                disabled={isAuthenticating}
                className="flex-1"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {getBiometricIcon()}
                    {mode === 'register' ? 'Register' : 'Authenticate'}
                  </>
                )}
              </Button>
              <Button
                onClick={() => onOpenChange(false)}
                variant="outline"
                disabled={isAuthenticating}
              >
                Cancel
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <Button onClick={handleBiometric} className="flex-1">
                Try Again
              </Button>
              <Button onClick={() => onOpenChange(false)} variant="outline">
                Cancel
              </Button>
            </>
          )}
        </div>

        {mode === 'register' && status === 'idle' && (
          <div className="text-xs text-muted-foreground text-center">
            Your biometric data is stored securely on your device and never shared with sikaremit
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
