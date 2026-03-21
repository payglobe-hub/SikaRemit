from .base import PaymentGateway
import stripe
from django.conf import settings
import logging
logger = logging.getLogger(__name__)
from django.http import JsonResponse

class StripeGateway(PaymentGateway):
    """Stripe payment gateway implementation for card payments"""
    
    signature_header = 'stripe-signature'
    
    def __init__(self):
        if not settings.STRIPE_SECRET_KEY:
            raise ValueError("Stripe secret key not configured")
            
        stripe.api_key = settings.STRIPE_SECRET_KEY
        
        # Test connection
        try:
            stripe.Account.retrieve()
        except stripe.error.AuthenticationError:
            logger.error("Invalid Stripe API key configuration")
            raise
    
    def get_webhook_secret(self):
        return settings.STRIPE_WEBHOOK_SECRET
        
    def parse_webhook(self, request):
        payload = request.body
        sig_header = request.headers.get(self.signature_header)
        return stripe.Webhook.construct_event(
            payload, 
            sig_header, 
            self.get_webhook_secret()
        )
        
    def process_webhook(self, event):
        event_type = event['type']
        
        if event_type == 'payment_intent.succeeded':
            return self._handle_payment_success(event)
        elif event_type == 'charge.refunded':
            return self._handle_refund(event)
        else:
            return JsonResponse({'status': 'ignored'})
    
    def process_payment(self, amount, currency, payment_method, customer, merchant, metadata=None):
        try:
            # Convert amount to cents/stripe's smallest currency unit
            amount_in_cents = int(amount * 100)
            
            # Create payment intent
            intent = stripe.PaymentIntent.create(
                amount=amount_in_cents,
                currency=currency.lower(),
                payment_method=payment_method.details.get('payment_method_id'),
                customer=customer.stripe_customer_id,
                confirm=True,
                metadata=metadata or {}
            )
            
            return {
                'success': intent.status == 'succeeded',
                'transaction_id': intent.id,
                'raw_response': intent
            }
            
        except stripe.error.StripeError as e:
            return {
                'success': False,
                'error': str(e),
                'raw_response': e.json_body if hasattr(e, 'json_body') else None
            }
    
    def refund_payment(self, transaction_id, amount=None):
        try:
            refund = stripe.Refund.create(
                payment_intent=transaction_id,
                amount=int(amount * 100) if amount else None
            )
            
            return {
                'success': refund.status == 'succeeded',
                'transaction_id': refund.id,
                'raw_response': refund
            }
            
        except stripe.error.StripeError as e:
            return {
                'success': False,
                'error': str(e),
                'raw_response': e.json_body if hasattr(e, 'json_body') else None
            }
