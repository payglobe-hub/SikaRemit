import logging
from datetime import datetime
import requests
import json
from django.conf import settings

logger = logging.getLogger(__name__)

class PaymentMonitor:
    """Automated credential and payment monitoring"""
    
    @staticmethod
    def _send_slack_alert(message):
        """Send alert to Slack webhook"""
        if not hasattr(settings, 'SLACK_WEBHOOK_URL'):
            return
            
        requests.post(
            settings.SLACK_WEBHOOK_URL,
            json={
                'text': f"🚨 Payment System Alert: {message}",
                'username': 'Payment Monitor',
                'icon_emoji': ':credit_card:'
            },
            timeout=5
        )

    @classmethod
    def check_mobile_money_health(cls):
        """Verify mobile money gateway connectivity"""
        try:
            # For now, return True as mobile money gateways are direct integrations
            # In production, implement actual health checks for each provider
            return True
                
        except Exception as e:
            cls._send_slack_alert(f"Mobile money monitoring failed: {str(e)}")
            logger.critical(f"Mobile money monitoring failed: {str(e)}")
            raise
    
    @classmethod
    def audit_credentials(cls):
        """Log credential details without exposing secrets"""
        return {
            'timestamp': datetime.now().isoformat(),
            'stripe_key_active': settings.STRIPE_SECRET_KEY[-6:] != 'xxxxxx',
            'last_rotation': settings.LAST_KEY_ROTATION if hasattr(settings, 'LAST_KEY_ROTATION') else 'Never'
        }
