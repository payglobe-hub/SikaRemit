from abc import ABC, abstractmethod
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type
)
import logging
import requests
import hmac
import hashlib
from django.http import JsonResponse

logger = logging.getLogger(__name__)

class CircuitBreakerMixin:
    """
    Circuit breaker pattern implementation for payment gateways
    """
    MAX_RETRIES = 3
    
    @retry(
        stop=stop_after_attempt(MAX_RETRIES),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((
            requests.exceptions.Timeout,
            requests.exceptions.ConnectionError
        ))
    )
    def _make_request_with_retry(self, endpoint, payload):
        try:
            return self._make_request(endpoint, payload)
        except Exception as e:
            logger.error(f"Gateway request failed: {str(e)}")
            raise

class PaymentGateway(CircuitBreakerMixin, ABC):
    """Base interface for all payment gateways"""
    
    @abstractmethod
    def process_payment(self, amount, currency, payment_method, customer, merchant, metadata=None):
        """
        Process payment with gateway
        Returns: {
            'success': bool,
            'transaction_id': str,
            'error': str (optional),
            'raw_response': dict (optional)
        }
        """
        pass
    
    @abstractmethod
    def refund_payment(self, transaction_id, amount=None):
        """
        Process refund with gateway
        Returns: same format as process_payment
        """
        pass
    
    @method_decorator(csrf_exempt)
    def webhook(self, request):
        """Handle payment gateway webhooks with verification"""
        if not self.verify_webhook(request):
            return JsonResponse({'error': 'Invalid signature'}, status=403)
            
        try:
            event = self.parse_webhook(request)
            return self.process_webhook(event)
        except Exception as e:
            logger.error(f"Webhook processing failed: {str(e)}")
            return JsonResponse({'error': str(e)}, status=400)
    
    def verify_webhook(self, request):
        """Verify webhook signature"""
        secret = self.get_webhook_secret()
        signature = request.headers.get(self.signature_header)
        
        if not secret or not signature:
            return False
            
        expected_sig = hmac.new(
            secret.encode(),
            request.body,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected_sig)
    
    @abstractmethod
    def get_webhook_secret(self):
        """Get webhook verification secret"""
        pass
    
    @abstractmethod
    def parse_webhook(self, request):
        """Parse webhook payload into standardized format"""
        pass
    
    @abstractmethod
    def process_webhook(self, event):
        """Process webhook event"""
        pass
