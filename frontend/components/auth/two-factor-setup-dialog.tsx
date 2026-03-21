'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/lib/auth/session-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Shield, Smartphone, Key, CheckCircle, AlertCircle, RefreshCw, QrCode } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { requestTwoFactor, verifyTwoFactor, getBackupCodes, generateBackupCodes } from '@/lib/api/auth'

interface TwoFactorSetupDialogProps {
  children: React.ReactNode
  onStatusChange?: (enabled: boolean) => void
}

export function TwoFactorSetupDialog({ children, onStatusChange }: TwoFactorSetupDialogProps) {
  const session = useSession()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<'setup' | 'verify' | 'manage'>('setup')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const { toast } = useToast()

  const isEnabled = (session?.user as any)?.mfaEnabled || false

  useEffect(() => {
    if (open && !isEnabled) {
      setStep('setup')
      handleSetup()
    } else if (open && isEnabled) {
      setStep('manage')
    }
  }, [open, isEnabled])

  const handleSetup = async () => {
    setIsLoading(true)
    try {
      const response = await requestTwoFactor()
      setSecret(response.secret)
      setQrCode(response.qr_code_url)

      toast({
        title: 'Setup Started',
        description: 'Scan the QR code with your authenticator app',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start 2FA setup',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
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

      // Generate backup codes
      const response = await generateBackupCodes()
      setBackupCodes(response.codes)

      toast({
        title: '2FA Enabled',
        description: 'Two-factor authentication has been enabled successfully',
      })

      // Session will be updated automatically
      onStatusChange?.(true)
      setStep('manage')
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

  const handleDisable = async () => {
    // In a real implementation, this would make an API call to disable 2FA
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      toast({
        title: '2FA Disabled',
        description: 'Two-factor authentication has been disabled',
      })

      // Session will be updated automatically
      onStatusChange?.(false)
      setStep('setup')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to disable 2FA',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const regenerateBackupCodes = async () => {
    setIsLoading(true)
    try {
      const response = await generateBackupCodes()
      setBackupCodes(response.codes)
      setShowBackupCodes(true)

      toast({
        title: 'Backup Codes Regenerated',
        description: 'New backup codes have been generated',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to regenerate backup codes',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'))
    toast({
      title: 'Copied',
      description: 'Backup codes copied to clipboard',
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            {isEnabled
              ? 'Manage your two-factor authentication settings'
              : 'Add an extra layer of security to your account'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status:</span>
            <Badge variant={isEnabled ? 'default' : 'secondary'}>
              {isEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>

          {step === 'setup' && (
            <div className="space-y-4">
              <Alert>
                <Smartphone className="h-4 w-4" />
                <AlertDescription>
                  <strong>Step 1:</strong> Install an authenticator app like Google Authenticator, Authy, or Microsoft Authenticator on your phone.
                </AlertDescription>
              </Alert>

              <Alert>
                <QrCode className="h-4 w-4" />
                <AlertDescription>
                  <strong>Step 2:</strong> Scan the QR code below with your authenticator app.
                </AlertDescription>
              </Alert>

              {qrCode && (
                <div className="text-center p-4 border rounded-lg bg-gray-50">
                  {/* In a real implementation, you'd render the actual QR code */}
                  <div className="w-48 h-48 bg-gray-200 mx-auto mb-4 flex items-center justify-center">
                    <QrCode className="h-16 w-16 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600 mb-2">Or enter this code manually:</p>
                  <code className="text-xs bg-white px-2 py-1 rounded border">
                    {secret}
                  </code>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="verification-code">Verification Code</Label>
                <Input
                  id="verification-code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              <Button onClick={handleVerify} disabled={isLoading || verificationCode.length !== 6} className="w-full">
                {isLoading ? 'Verifying...' : 'Enable 2FA'}
              </Button>
            </div>
          )}

          {step === 'verify' && backupCodes.length > 0 && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Success!</strong> Two-factor authentication has been enabled. Save your backup codes in a safe place.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Backup Codes</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyBackupCodes}
                  >
                    Copy All
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded border text-sm font-mono">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="text-center">
                      {code}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Each code can only be used once. Store them securely.
                </p>
              </div>

              <Button onClick={() => setOpen(false)} className="w-full">
                Done
              </Button>
            </div>
          )}

          {step === 'manage' && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Two-factor authentication is enabled for your account.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Backup Codes</Label>
                    <p className="text-sm text-muted-foreground">
                      Generate new backup codes if you've used them all
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={regenerateBackupCodes}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Regenerate
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <Button
                    variant="destructive"
                    onClick={handleDisable}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? 'Disabling...' : 'Disable 2FA'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    This will make your account less secure
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
