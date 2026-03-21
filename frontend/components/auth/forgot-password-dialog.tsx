'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { Mail } from 'lucide-react'

interface ForgotPasswordDialogProps {
  userType: 'customer' | 'merchant' | 'admin'
}

export function ForgotPasswordDialog({ userType }: ForgotPasswordDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" className="text-sm text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 p-0 h-auto">
          Forgot your password?
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-emerald-500" />
            Reset Password
          </DialogTitle>
          <DialogDescription>
            Enter your email address and we'll send you a link to reset your password.
          </DialogDescription>
        </DialogHeader>
        <ForgotPasswordForm userType={userType} />
      </DialogContent>
    </Dialog>
  )
}
