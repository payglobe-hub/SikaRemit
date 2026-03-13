from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.conf import settings
import hmac
import hashlib
import json
import logging
import requests
import json
import logging
from django.dispatch import receiver
from django.db.models.signals import post_save
from django.apps import apps
from datetime import datetime
from django.utils import timezone

logger = logging.getLogger('payments.webhooks')

def verify_webhook_signature(payload, signature, secret):
    """Verify webhook using HMAC signature"""
    computed_signature = hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(computed_signature, signature)

@csrf_exempt
def bank_transfer_webhook(request):
    """
    Handle bank transfer webhooks from multiple providers
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        # Get provider from headers or body
        provider = request.META.get('HTTP_X_PROVIDER') or request.POST.get('provider') or 'unknown'
        body = request.body.decode('utf-8')
        data = json.loads(body) if body else {}

        logger.info(f"Bank transfer webhook from {provider}: {data}")

        # Route to appropriate handler
        if provider.lower() == 'direct_bank':
            return _handle_direct_bank_webhook(request, data)
        else:
            # Try to auto-detect provider from payload structure
            return _handle_generic_bank_webhook(request, data)

    except Exception as e:
        logger.error(f"Bank transfer webhook error: {str(e)}")
        return JsonResponse({'error': str(e)}, status=400)

def _handle_direct_bank_webhook(request, data):
    """Handle direct bank API webhook"""
    try:
        # Verify signature for direct bank
        secret = getattr(settings, 'DIRECT_BANK_WEBHOOK_SECRET', '')
        if secret:
            signature = request.META.get('HTTP_X_SIGNATURE')
            if signature:
                expected_signature = hmac.new(
                    secret.encode('utf-8'),
                    request.body,
                    hashlib.sha256
                ).hexdigest()

                if not hmac.compare_digest(expected_signature, signature):
                    logger.warning("Invalid direct bank webhook signature")
                    return JsonResponse({'error': 'Invalid signature'}, status=401)

        # Process direct bank notification
        transaction_id = data.get('transaction_id')
        status = data.get('status')
        amount = data.get('amount')

        if transaction_id and status == 'completed':
            from .models.transaction import Transaction
            try:
                transaction = Transaction.objects.get(external_reference=transaction_id)
                transaction.status = Transaction.COMPLETED
                transaction.save()

                # Send notification
                _send_bank_transfer_notification(transaction, 'completed')

                return JsonResponse({'status': 'success'})

            except Transaction.DoesNotExist:
                logger.warning(f"Transaction not found for direct bank ID: {transaction_id}")
                return JsonResponse({'error': 'Transaction not found'}, status=404)

        return JsonResponse({'status': 'ignored'})

    except Exception as e:
        logger.error(f"Direct bank webhook processing error: {str(e)}")
        return JsonResponse({'error': str(e)}, status=400)

def _handle_generic_bank_webhook(request, data):
    """Handle generic bank transfer webhook when provider not specified"""
    try:
        # Try to identify provider from payload structure
        reference = data.get('reference') or data.get('tx_ref') or data.get('transaction_id')
        status = data.get('status') or data.get('event')

        if reference and status in ['completed', 'success', 'paid']:
            from .models.transaction import Transaction
            try:
                transaction = Transaction.objects.filter(
                    external_reference=reference
                ).first()

                if transaction:
                    transaction.status = Transaction.COMPLETED
                    transaction.save()

                    # Send notification
                    _send_bank_transfer_notification(transaction, 'completed')

                    return JsonResponse({'status': 'success'})
                else:
                    logger.warning(f"Transaction not found for reference: {reference}")
                    return JsonResponse({'error': 'Transaction not found'}, status=404)

            except Exception as e:
                logger.error(f"Generic bank webhook transaction update error: {str(e)}")
                return JsonResponse({'error': str(e)}, status=400)

        return JsonResponse({'status': 'ignored'})

    except Exception as e:
        logger.error(f"Generic bank webhook processing error: {str(e)}")
        return JsonResponse({'error': str(e)}, status=400)

def _send_bank_transfer_notification(transaction, event_type):
    """Send notification for bank transfer events"""
    try:
        from notifications.services import NotificationService

        if event_type == 'completed':
            title = "Bank Transfer Completed"
            message = f"Your bank transfer of {transaction.currency} {transaction.amount} has been completed."
        elif event_type == 'failed':
            title = "Bank Transfer Failed"
            message = f"Your bank transfer of {transaction.currency} {transaction.amount} has failed."
        else:
            return

        NotificationService.create_notification(
            user=transaction.customer,
            title=title,
            message=message,
            level='payment',
            notification_type='bank_transfer',
            metadata={
                'transaction_id': transaction.id,
                'amount': float(transaction.amount),
                'currency': transaction.currency,
                'event_type': event_type
            }
        )

        logger.info(f"Bank transfer notification sent for transaction {transaction.id}")

    except Exception as e:
        logger.error(f"Failed to send bank transfer notification: {str(e)}")

@csrf_exempt
def mobile_money_webhook(request):
    """Securely processes mobile money provider webhooks"""
    logger.info(f"Incoming webhook from {request.META.get('REMOTE_ADDR')}")
    
    if request.method != 'POST':
        logger.warning('Invalid method received')
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        provider = request.META.get('HTTP_X_PROVIDER')
        if not provider or provider not in settings.MOBILE_MONEY_PROVIDERS:
            logger.error(f'Invalid provider: {provider}')
            return JsonResponse({'error': 'Invalid provider'}, status=400)

        webhook_secret = getattr(settings, 'MOBILE_MONEY_WEBHOOK_SECRETS', {}).get(provider)
        if not webhook_secret:
            logger.error(f'No webhook secret configured for provider: {provider}')
            return JsonResponse({'error': 'Webhook configuration error'}, status=500)

        data = json.loads(request.body)
        expected_signature = hmac.new(
            webhook_secret.encode('utf-8'),
            json.dumps(data, sort_keys=True, separators=(',', ':')).encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        signature = request.META.get('HTTP_X_SIGNATURE', '')
        if not signature or not hmac.compare_digest(expected_signature, signature):
            logger.warning(f'Invalid signature from {provider}')
            return JsonResponse({'error': 'Invalid signature'}, status=401)

        logger.info(f'Processing verified webhook from {provider}: event={data.get("event_type", "unknown")}')

        event_type = data.get('event_type', '')
        transaction_ref = data.get('transaction_id') or data.get('reference')
        status_value = data.get('status', '').lower()

        if not transaction_ref:
            logger.error(f'Missing transaction reference in webhook from {provider}')
            return JsonResponse({'error': 'Missing transaction reference'}, status=400)

        Transaction = apps.get_model('payments', 'Payment')
        try:
            transaction = Transaction.objects.get(reference=transaction_ref)
        except Transaction.DoesNotExist:
            logger.error(f'Transaction not found for reference: {transaction_ref}')
            return JsonResponse({'error': 'Transaction not found'}, status=404)

        status_map = {
            'successful': 'completed',
            'success': 'completed',
            'completed': 'completed',
            'failed': 'failed',
            'cancelled': 'cancelled',
            'reversed': 'refunded',
            'pending': 'pending',
        }
        new_status = status_map.get(status_value, 'pending')

        if transaction.status != new_status:
            transaction.status = new_status
            transaction.save(update_fields=['status', 'updated_at'])
            logger.info(f'Transaction {transaction_ref} updated to {new_status}')

            _send_mobile_money_notification(transaction, event_type, provider)

        return JsonResponse({'status': 'success', 'transaction': transaction_ref})
            
    except Exception as e:
        logger.error(f"Webhook processing error: {str(e)}")
        return JsonResponse({'error': str(e)}, status=400)

class RemittanceWebhookService:
    """
    Handles webhook notifications for remittance events
    """
    
    @staticmethod
    def send_remittance_notification(remittance, event_type):
        """
        Send webhook for remittance status changes
        Args:
            remittance: CrossBorderRemittance instance
            event_type: Event type (e.g., 'processing', 'completed')
        """
        if not settings.REMITTANCE_WEBHOOK_URL:
            logger.warning("No remittance webhook URL configured")
            return
            
        payload = {
            'event': event_type,
            'remittance_id': remittance.reference_number,
            'sender_id': remittance.sender.id,
            'recipient': {
                'name': remittance.recipient_name,
                'phone': remittance.recipient_phone,
                'country': remittance.recipient_country
            },
            'amount_sent': str(remittance.amount_sent),
            'amount_received': str(remittance.amount_received),
            'currency': settings.DEFAULT_CURRENCY,
            'timestamp': remittance.created_at.isoformat(),
            'compliance_status': 'verified' if remittance.status == 'completed' else 'pending'
        }
        
        headers = {
            'Content-Type': 'application/json',
            'X-BoG-Signature': generate_bog_signature(payload)
        }
        
        try:
            response = requests.post(
                settings.REMITTANCE_WEBHOOK_URL,
                data=json.dumps(payload),
                headers=headers,
                timeout=5
            )
            response.raise_for_status()
        except Exception as e:
            logger.error(f"Remittance webhook failed: {str(e)}")

    @staticmethod
    def send_exemption_notification(remittance):
        """Notify about exemption status changes"""
        payload = {
            'event': f"exemption_{remittance.exemption_status}",
            'remittance_id': remittance.reference_number,
            'approver': remittance.exemption_approver.email if remittance.exemption_approver else None,
            'notes': remittance.exemption_notes,
            'timestamp': timezone.now().isoformat()
        }
        
        WebhookService.send_to_url(
            settings.EXEMPTION_WEBHOOK_URL,
            payload
        )

    @staticmethod
    def send_verification_request(sender, verification_type):
        """Request external verification"""
        if not settings.VERIFICATION_WEBHOOK_URL:
            logger.warning("No verification webhook URL configured")
            return
            
        payload = {
            "type": verification_type,
            "user_id": str(sender.id),
            "timestamp": datetime.now().isoformat()
        }
        
        try:
            response = requests.post(
                settings.VERIFICATION_WEBHOOK_URL,
                json=payload,
                headers={
                    "Authorization": f"Bearer {settings.VERIFICATION_API_KEY}",
                    "Content-Type": "application/json"
                },
                timeout=5
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Verification request failed: {str(e)}")
            raise

def remittance_status_change(sender, instance, created, **kwargs):
    """
    Signal handler for remittance status changes
    """
    if not created and instance.pk:
        try:
            # Get the old value from the database
            old_instance = sender.objects.get(pk=instance.pk)
            if old_instance.status != instance.status:
                RemittanceWebhookService.send_remittance_notification(
                    instance, 
                    f"status_changed_to_{instance.status}"
                )
        except sender.DoesNotExist:
            # This shouldn't happen for updates, but handle gracefully
            pass
        except Exception as e:
            logger.error(f"Error handling remittance status change: {e}")

# Connect signal after Django is ready
from django.apps import apps
from django.db.models.signals import post_save

def connect_signals():
    """Connect signals after Django apps are ready"""
    CrossBorderRemittance = apps.get_model('payments', 'CrossBorderRemittance')
    post_save.connect(remittance_status_change, sender=CrossBorderRemittance)

# This will be called from AppConfig.ready() or similar
# For now, we'll call it when the module is imported after Django setup

def generate_bog_signature(payload):
    """
    Generate Bank of Ghana compliant signature
    Args:
        payload: Dict with webhook payload
    Returns: HMAC signature string
    """
    import hmac
    import hashlib
    
    secret = settings.BOG_WEBHOOK_SECRET.encode('utf-8')
    message = json.dumps(payload).encode('utf-8')
    
    return hmac.new(
        secret,
        msg=message,
        digestmod=hashlib.sha256
    ).hexdigest()
