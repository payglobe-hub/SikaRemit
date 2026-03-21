import requests
import json
import logging
from django.conf import settings
from django.db.models.signals import receiver
from django.dispatch import receiver
from .models import Payment
from django.http import JsonResponse
from typing import Dict, Callable

logger = logging.getLogger(__name__)

class WebhookService:
    """Standardized webhook processing for all payment gateways"""
    
    def __init__(self):
        self.handlers: Dict[str, Callable] = {
            'payment_success': self._handle_payment_success,
            'payment_failed': self._handle_payment_failure,
            'refund_processed': self._handle_refund,
            'dispute_opened': self._handle_dispute
        }
    
    def process(self, gateway: str, event_type: str, payload: dict):
        """Process webhook event with appropriate handler"""
        handler = self.handlers.get(event_type)
        if not handler:
            logger.warning(f"No handler for {event_type} from {gateway}")
            return JsonResponse({'status': 'unhandled_event_type'}, status=200)
            
        try:
            # Standardized response format
            result = handler(gateway, payload)
            return {
                'success': True,
                'gateway': gateway,
                'event_type': event_type,
                'data': result
            }
        except Exception as e:
            logger.error(f"Webhook processing failed: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _handle_payment_success(self, gateway: str, payload: dict):
        """Standardized success handler"""
        return {
            'transaction_id': payload.get('reference') or payload.get('id'),
            'amount': payload.get('amount'),
            'currency': payload.get('currency'),
            'metadata': payload.get('metadata', {})
        }
    
    def _handle_payment_failure(self, gateway: str, payload: dict):
        """Standardized failure handler"""
        return {
            'transaction_id': payload.get('reference') or payload.get('id'),
            'reason': payload.get('failure_reason') or payload.get('message'),
            'metadata': payload.get('metadata', {})
        }
    
    def _handle_refund(self, gateway: str, payload: dict):
        """Standardized refund handler"""
        return {
            'original_transaction': payload.get('original_transaction'),
            'refund_id': payload.get('refund_id'),
            'amount': payload.get('amount'),
            'metadata': payload.get('metadata', {})
        }
    
    def _handle_dispute(self, gateway: str, payload: dict):
        """Standardized dispute handler"""
        return {
            'dispute_id': payload.get('dispute_id'),
            'transaction_id': payload.get('transaction_id'),
            'reason': payload.get('reason'),
            'status': payload.get('status')
        }
    
    @staticmethod
    def send_webhook(payment, event_type):
        """
        Send webhook notification for payment status changes
        Args:
            payment: Payment instance
            event_type: Event type (e.g., 'payment_processed', 'status_changed')
        """
        if not settings.WEBHOOK_URL:
            logger.warning("No webhook URL configured")
            return
            
        payload = {
            'event': event_type,
            'payment_id': payment.id,
            'bill_reference': payment.bill_reference,
            'amount': str(payment.amount),
            'status': payment.status,
            'timestamp': payment.updated_at.isoformat()
        }
        
        try:
            response = requests.post(
                settings.WEBHOOK_URL,
                data=json.dumps(payload),
                headers={'Content-Type': 'application/json'},
                timeout=5
            )
            response.raise_for_status()
        except Exception as e:
            logger.error(f"Webhook failed: {str(e)}")

@receiver(post_save, sender=Payment)
def payment_status_change(sender, instance, created, **kwargs):
    """
    Signal handler for payment status changes
    """
    if not created and 'status' in instance.get_dirty_fields():
        WebhookService.send_webhook(
            instance, 
            f"status_changed_to_{instance.status}"
        )
