'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MerchantApplicationForm } from '@/components/auth/merchant-application-form'
import { Building2 } from 'lucide-react'

export function MerchantApplicationDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
          Apply to Join sikaremit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500" />
            Merchant Application
          </DialogTitle>
          <DialogDescription>
            Tell us about your business. We'll review your application and get back to you within 2-3 business days.
          </DialogDescription>
        </DialogHeader>
        <MerchantApplicationForm />
      </DialogContent>
    </Dialog>
  )
}
