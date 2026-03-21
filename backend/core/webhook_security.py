"""
Webhook signature verification utilities
Implements HMAC-SHA256 signature verification for webhook security
"""
import hmac
import hashlib
import time
from typing import Optional, Dict, Any
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class WebhookSignatureVerifier:
    """
    Verifies webhook signatures to ensure authenticity and prevent tampering
    """
    
    @staticmethod
    def verify_stripe_signature(payload: bytes, signature_header: str, secret: str) -> bool:
        """
        Verify Stripe webhook signature
        
        Args:
            payload: Raw request body bytes
            signature_header: Stripe-Signature header value
            secret: Webhook signing secret from Stripe
            
        Returns:
            bool: True if signature is valid
        """
        try:
            # Parse signature header
            signatures = {}
            for item in signature_header.split(','):
                key, value = item.split('=')
                signatures[key] = value
            
            timestamp = signatures.get('t')
            signature = signatures.get('v1')
            
            if not timestamp or not signature:
                logger.warning("Missing timestamp or signature in Stripe webhook")
                return False
            
            # Check timestamp to prevent replay attacks (5 minute tolerance)
            current_time = int(time.time())
            if abs(current_time - int(timestamp)) > 300:
                logger.warning("Stripe webhook timestamp too old")
                return False
            
            # Compute expected signature
            signed_payload = f"{timestamp}.{payload.decode('utf-8')}"
            expected_signature = hmac.new(
                secret.encode('utf-8'),
                signed_payload.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            
            # Compare signatures (constant-time comparison)
            return hmac.compare_digest(signature, expected_signature)
            
        except Exception as e:
            logger.error(f"Stripe signature verification failed: {str(e)}")
            return False
    
    @staticmethod
    def verify_generic_hmac_signature(
        payload: bytes,
        signature: str,
        secret: str,
        algorithm: str = 'sha256'
    ) -> bool:
        """
        Verify generic HMAC signature (for mobile money providers, etc.)
        
        Args:
            payload: Raw request body bytes
            signature: Signature from header
            secret: Shared secret key
            algorithm: Hash algorithm (sha256, sha512, etc.)
            
        Returns:
            bool: True if signature is valid
        """
        try:
            # Get hash function
            hash_func = getattr(hashlib, algorithm)
            
            # Compute expected signature
            expected_signature = hmac.new(
                secret.encode('utf-8'),
                payload,
                hash_func
            ).hexdigest()
            
            # Compare signatures (constant-time comparison)
            return hmac.compare_digest(signature.lower(), expected_signature.lower())
            
        except Exception as e:
            logger.error(f"Generic HMAC verification failed: {str(e)}")
            return False
    
    @staticmethod
    def verify_mtn_mobile_money_signature(
        payload: bytes,
        signature: str,
        api_key: str
    ) -> bool:
        """
        Verify MTN Mobile Money webhook signature
        
        Args:
            payload: Raw request body bytes
            signature: X-Signature header value
            api_key: MTN API key
            
        Returns:
            bool: True if signature is valid
        """
        return WebhookSignatureVerifier.verify_generic_hmac_signature(
            payload=payload,
            signature=signature,
            secret=api_key,
            algorithm='sha256'
        )
    
    @staticmethod
    def generate_webhook_signature(payload: str, secret: str) -> Dict[str, str]:
        """
        Generate webhook signature for outgoing webhooks
        
        Args:
            payload: JSON payload as string
            secret: Shared secret key
            
        Returns:
            dict: Headers to include in webhook request
        """
        timestamp = str(int(time.time()))
        signed_payload = f"{timestamp}.{payload}"
        
        signature = hmac.new(
            secret.encode('utf-8'),
            signed_payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        return {
            'X-SikaRemit-Signature': f"t={timestamp},v1={signature}",
            'X-SikaRemit-Timestamp': timestamp
        }
    
    @staticmethod
    def verify_SikaRemit_signature(
        payload: bytes,
        signature_header: str,
        secret: str,
        tolerance: int = 300
    ) -> bool:
        """
        Verify SikaRemit webhook signature (for our own webhooks)
        
        Args:
            payload: Raw request body bytes
            signature_header: X-SikaRemit-Signature header value
            secret: Shared secret key
            tolerance: Time tolerance in seconds (default 5 minutes)
            
        Returns:
            bool: True if signature is valid
        """
        try:
            # Parse signature header
            parts = {}
            for item in signature_header.split(','):
                key, value = item.split('=')
                parts[key] = value
            
            timestamp = parts.get('t')
            signature = parts.get('v1')
            
            if not timestamp or not signature:
                logger.warning("Missing timestamp or signature in SikaRemit webhook")
                return False
            
            # Check timestamp to prevent replay attacks
            current_time = int(time.time())
            if abs(current_time - int(timestamp)) > tolerance:
                logger.warning("SikaRemit webhook timestamp too old")
                return False
            
            # Compute expected signature
            signed_payload = f"{timestamp}.{payload.decode('utf-8')}"
            expected_signature = hmac.new(
                secret.encode('utf-8'),
                signed_payload.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            
            # Compare signatures
            return hmac.compare_digest(signature, expected_signature)
            
        except Exception as e:
            logger.error(f"SikaRemit signature verification failed: {str(e)}")
            return False

class WebhookRateLimiter:
    """
    Rate limiting for webhook endpoints to prevent abuse
    """
    
    def __init__(self, max_requests: int = 100, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, list] = {}
    
    def is_allowed(self, identifier: str) -> bool:
        """
        Check if request is allowed based on rate limit
        
        Args:
            identifier: Unique identifier (IP address, API key, etc.)
            
        Returns:
            bool: True if request is allowed
        """
        current_time = time.time()
        
        # Initialize if first request
        if identifier not in self.requests:
            self.requests[identifier] = []
        
        # Remove old requests outside window
        self.requests[identifier] = [
            req_time for req_time in self.requests[identifier]
            if current_time - req_time < self.window_seconds
        ]
        
        # Check if under limit
        if len(self.requests[identifier]) >= self.max_requests:
            return False
        
        # Add current request
        self.requests[identifier].append(current_time)
        return True

# Decorator for webhook views
def verify_webhook_signature(provider: str):
    """
    Decorator to verify webhook signatures
    
    Usage:
        @verify_webhook_signature('stripe')
        def stripe_webhook(request):
            # Handle webhook
            pass
    """
    def decorator(view_func):
        def wrapper(request, *args, **kwargs):
            # Get raw body
            payload = request.body
            
            # Verify based on provider
            if provider == 'stripe':
                signature = request.headers.get('Stripe-Signature', '')
                secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', '')
                
                if not WebhookSignatureVerifier.verify_stripe_signature(
                    payload, signature, secret
                ):
                    logger.warning("Invalid Stripe webhook signature")
                    from django.http import HttpResponseForbidden
                    return HttpResponseForbidden("Invalid signature")
            
            elif provider == 'mtn':
                signature = request.headers.get('X-Signature', '')
                api_key = getattr(settings, 'MTN_API_KEY', '')
                
                if not WebhookSignatureVerifier.verify_mtn_mobile_money_signature(
                    payload, signature, api_key
                ):
                    logger.warning("Invalid MTN webhook signature")
                    from django.http import HttpResponseForbidden
                    return HttpResponseForbidden("Invalid signature")
            
            # Call original view
            return view_func(request, *args, **kwargs)
        
        return wrapper
    return decorator
