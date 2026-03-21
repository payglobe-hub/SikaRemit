import logging
import requests
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

logger = logging.getLogger(__name__)

class AlertService:
    """Handles all alert delivery methods"""
    
    ALERT_HISTORY = []
    
    @classmethod
    def get_recent_alerts(cls, limit=10):
        """Get recent alerts for dashboard"""
        return cls.ALERT_HISTORY[:limit]
    
    @staticmethod
    def send_alert(provider, status, region=None):
        """Route alerts appropriately"""
        message = f"{provider} verification {'UP' if status else 'DOWN'}"
        
        # Record alert
        alert = {
            'timestamp': timezone.now(),
            'provider': provider,
            'status': status,
            'region': region,
            'message': message
        }
        AlertService.ALERT_HISTORY.insert(0, alert)
        
        # Trim history
        if len(AlertService.ALERT_HISTORY) > 100:
            AlertService.ALERT_HISTORY = AlertService.ALERT_HISTORY[:100]
        
        # Global alerts
        AlertService._send_global_alerts(message, provider, status)
        
        # Regional alerts
        if region:
            AlertService._send_regional_alerts(message, provider, status, region)
    
    @staticmethod
    def _send_global_alerts(message, provider, status):
        """Send to main admin channels"""
        # Email
        send_mail(
            f"Provider {'Recovery' if status else 'Outage'}",
            message,
            settings.DEFAULT_FROM_EMAIL,
            getattr(settings, 'ADMIN_EMAILS', []),
            fail_silently=True
        )
        
        # SMS if configured
        if all([
            getattr(settings, 'TWILIO_ACCOUNT_SID', None),
            getattr(settings, 'TWILIO_AUTH_TOKEN', None),
            getattr(settings, 'TWILIO_PHONE_NUMBER', None)
        ]):
            try:
                from twilio.rest import Client
                client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
                client.messages.create(
                    body=message,
                    from_=settings.TWILIO_PHONE_NUMBER,
                    to=settings.ADMIN_PHONES
                )
            except Exception as e:
                logger.error(f"SMS alert failed: {str(e)}")
    
    @staticmethod
    def _send_regional_alerts(message, provider, status, region):
        """Send to region-specific channels"""
        region_config = getattr(settings, 'REGIONAL_ALERTS', {}).get(region, {})
        
        # Regional emails
        if 'emails' in region_config:
            send_mail(
                f"Regional Alert: {provider} {'Up' if status else 'Down'}",
                f"{message} in {region}",
                settings.DEFAULT_FROM_EMAIL,
                region_config['emails'],
                fail_silently=True
            )
        
        # Slack webhook
        if 'slack' in region_config:
            try:
                requests.post(
                    region_config['slack'],
                    json={
                        "text": message,
                        "attachments": [{
                            "color": "#36a64f" if status else "#ff0000",
                            "fields": [{
                                "title": f"Region: {region}",
                                "value": f"*{provider}* is now {'operational' if status else 'down'}"
                            }]
                        }]
                    }
                )
            except Exception as e:
                logger.error(f"Regional Slack alert failed: {str(e)}")
        
        # Teams webhook
        if 'teams' in region_config:
            try:
                requests.post(
                    region_config['teams'],
                    json={
                        "@type": "MessageCard",
                        "themeColor": "00FF00" if status else "FF0000",
                        "title": f"Regional Alert - {region}",
                        "text": message
                    }
                )
            except Exception as e:
                logger.error(f"Regional Teams alert failed: {str(e)}")
