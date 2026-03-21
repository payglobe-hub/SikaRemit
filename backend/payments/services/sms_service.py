import os
import requests
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

class SMSVerificationService:
    """
    SMS verification service supporting multiple providers
    Uses NotificationService for SMS sending to avoid duplication
    """

    def __init__(self):
        # Import here to avoid circular imports
        from .notification_service import NotificationService
        self.notification_service = NotificationService()
        self.default_provider = getattr(settings, 'SMS_PROVIDER', 'africastalking')

    def send_verification_code(self, phone_number: str, message: str = None) -> dict:
        """
        Send verification code to phone number
        Returns: {'success': bool, 'message_id': str, 'error': str}
        """
        try:
            # Generate 6-digit code
            code = self._generate_verification_code()

            # Cache the code with expiration (5 minutes)
            cache_key = f"sms_code_{phone_number}"
            cache.set(cache_key, {
                'code': code,
                'created_at': timezone.now(),
                'attempts': 0
            }, 300)  # 5 minutes

            # Send SMS
            message = message or f"Your SikaRemit verification code is: {code}"
            result = self._send_sms(phone_number, message)

            return {
                'success': result['success'],
                'message_id': result.get('message_id'),
                'error': result.get('error')
            }

        except Exception as e:
            logger.error(f"SMS verification error: {str(e)}")
            return {
                'success': False,
                'error': 'Failed to send verification code'
            }

    def verify_code(self, phone_number: str, code: str) -> dict:
        """
        Verify the SMS code
        Returns: {'valid': bool, 'error': str}
        """
        try:
            cache_key = f"sms_code_{phone_number}"
            cached_data = cache.get(cache_key)

            if not cached_data:
                return {'valid': False, 'error': 'Code expired or not found'}

            # Check attempts
            if cached_data['attempts'] >= 3:
                return {'valid': False, 'error': 'Too many attempts'}

            # Increment attempts
            cached_data['attempts'] += 1
            cache.set(cache_key, cached_data, 300)

            # Check if code matches
            if cached_data['code'] == code:
                # Clear the cache on successful verification
                cache.delete(cache_key)
                return {'valid': True}

            return {'valid': False, 'error': 'Invalid code'}

        except Exception as e:
            logger.error(f"SMS verification check error: {str(e)}")
            return {'valid': False, 'error': 'Verification failed'}

    def _send_sms(self, phone_number: str, message: str) -> dict:
        """Send SMS using NotificationService to avoid duplication"""
        try:
            success = self.notification_service.send_raw_sms(phone_number, message)
            return {
                'success': success,
                'message_id': None,  # NotificationService doesn't return IDs
                'error': None if success else 'SMS sending failed'
            }
        except Exception as e:
            logger.error(f"SMS sending error: {str(e)}")
            return {'success': False, 'error': str(e)}

    def _generate_verification_code(self) -> str:
        """Generate a random 6-digit verification code"""
        import random
        return ''.join([str(random.randint(0, 9)) for _ in range(6)])

    def get_provider_status(self) -> dict:
        """Get status of SMS providers"""
        return {
            'twilio': bool(getattr(settings, 'TWILIO_ACCOUNT_SID', None)),
            'africastalking': bool(getattr(settings, 'AFRICASTALKING_API_KEY', None)),
            'nexmo': bool(getattr(settings, 'NEXMO_API_KEY', None)),
            'default_provider': self.default_provider
        }

# Singleton instance
sms_service = SMSVerificationService()
