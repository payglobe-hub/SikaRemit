'use client'

import { useEffect } from 'react'
import { verifyWebhook } from '@/lib/api/merchant'
import type { WebhookEvent } from '@/lib/types/payout'

export function usePayoutWebhooks(
  callback: (event: WebhookEvent | null) => void,
  secret?: string
) {
  useEffect(() => {
    const handler = async (event: MessageEvent<WebhookEvent>) => {
      try {
        if (!event.data.event_type || !event.data.payout_id) {
          
          return
        }
        
        if (!event.data.signature) {
          
          return
        }
        
        const verified = await verifyWebhook(
          event.data.signature,
          event.data
        )
        
        switch (verified.event_type) {
          case 'payout_notification_sent':
            if (verified.metadata?.notification_type === 'sms') {
              // Update SMS metrics
            }
            break;
          case 'payout_notification_failed':
            if (verified.metadata?.notification_type === 'sms') {
              // Update SMS metrics
            }
            break;
          case 'payout_notification_delivered':
            callback({
              ...verified,
              metadata: {
                ...verified.metadata,
                delivery_status: 'delivered'
              }
            })
            break;
          case 'payout_scheduled':
            // Handle scheduled payout notification
            break
          case 'dispute_created':
            if (verified.metadata?.dispute_reason) {
              // Handle dispute reason
            }
            // Handle new disputes
            break
        }
        
        callback(verified)
      } catch (err) {
        
        callback(null)
      }
    }
    
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [callback, secret])
}
