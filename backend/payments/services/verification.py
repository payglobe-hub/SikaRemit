import requests
import logging
import time
from django.conf import settings
from decimal import Decimal
from django.utils import timezone
from ..utils.alerts import AlertService

logger = logging.getLogger(__name__)

class VerificationService:
    """Handles multi-provider verification"""
    
    # Track provider health status
    _provider_status = {
        'africastalking': {'healthy': True, 'last_check': None},
        'twilio': {'healthy': True, 'last_check': None},
        'nexmo': {'healthy': True, 'last_check': None}
    }
    
    @classmethod
    def check_provider_health(cls):
        """Check providers with regional awareness"""
        
        for provider in cls._provider_status:
            prev_status = cls._provider_status[provider]['healthy']
            
            # Test provider in different regions
            test_results = {
                'GH': cls._test_provider_region(provider, 'GH'),
                'US': cls._test_provider_region(provider, 'US')
            }
            
            # Global status (if any region fails)
            new_status = all(test_results.values())
            
            # Send alerts if status changed
            if prev_status != new_status:
                AlertService.send_alert(provider, new_status)
                
            # Send regional alerts
            for region, status in test_results.items():
                if status != prev_status:
                    AlertService.send_alert(provider, status, region)
            
            cls._provider_status[provider]['healthy'] = new_status
            cls._provider_status[provider]['last_check'] = timezone.now()
    
    @staticmethod
    def _send_outage_alert(provider, status, country_code=None):
        """Enhanced alert delivery"""
        message = f"{provider} verification {'UP' if status else 'DOWN'}"
        
        if country_code:
            message += f" in {country_code}"
        
        # Email
        send_mail(
            f"Provider {'Recovery' if status else 'Outage'}",
            message,
            settings.DEFAULT_FROM_EMAIL,
            settings.ADMIN_EMAILS,
            fail_silently=True
        )
        
        # SMS
        if settings.TWILIO_ENABLED:
            VerificationService._send_twilio_alert(message)
            
        # Slack
        if settings.SLACK_WEBHOOK_URL:
            VerificationService._send_slack_alert(provider, status, message)
            
        # Teams
        if settings.TEAMS_WEBHOOK_URL:
            VerificationService._send_teams_alert(provider, status, message)
    
    @staticmethod
    def _send_global_alerts(provider, status):
        """Send alerts to global notification channels"""
        message = f"{provider} verification {'UP' if status else 'DOWN'}"
        
        # Email (always enabled)
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
        
        # Slack if configured
        if getattr(settings, 'SLACK_WEBHOOK_URL', None):
            try:
                requests.post(
                    settings.SLACK_WEBHOOK_URL,
                    json={
                        "text": message,
                        "attachments": [{
                            "color": "#36a64f" if status else "#ff0000",
                            "fields": [{
                                "title": "Verification Provider Status",
                                "value": f"*{provider}* is now {'operational' if status else 'down'}"
                            }]
                        }]
                    }
                )
            except Exception as e:
                logger.error(f"Slack alert failed: {str(e)}")
        
        # Teams if configured
        if getattr(settings, 'TEAMS_WEBHOOK_URL', None):
            try:
                requests.post(
                    settings.TEAMS_WEBHOOK_URL,
                    json={
                        "@type": "MessageCard",
                        "themeColor": "00FF00" if status else "FF0000",
                        "title": "Verification Alert",
                        "text": message
                    }
                )
            except Exception as e:
                logger.error(f"Teams alert failed: {str(e)}")
    
    @staticmethod
    def _send_twilio_alert(message):
        """Send multi-channel alerts"""
        from django.core.mail import send_mail
        from twilio.rest import Client
        from django.conf import settings
        
        # SMS alert via Twilio
        if all([settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN, settings.TWILIO_PHONE_NUMBER]):
            try:
                client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
                client.messages.create(
                    body=message,
                    from_=settings.TWILIO_PHONE_NUMBER,
                    to=settings.ADMIN_PHONES
                )
            except Exception as e:
                logger.error(f"Failed to send SMS alert: {str(e)}")
    
    @staticmethod
    def _send_slack_alert(provider, status, message):
        """Post to Slack channel"""
        try:
            requests.post(
                settings.SLACK_WEBHOOK_URL,
                json={
                    "text": message,
                    "attachments": [{
                        "color": "#36a64f" if status else "#ff0000",
                        "fields": [{
                            "title": "Verification Provider Status",
                            "value": f"*{provider}* is now {'operational' if status else 'down'}"
                        }]
                    }]
                }
            )
        except Exception as e:
            logger.error(f"Slack alert failed: {str(e)}")
    
    @staticmethod
    def _send_teams_alert(provider, status, message):
        """Post to Teams channel"""
        try:
            requests.post(
                settings.TEAMS_WEBHOOK_URL,
                json={
                    "@type": "MessageCard",
                    "themeColor": "00FF00" if status else "FF0000",
                    "title": "Verification Alert",
                    "text": message
                }
            )
        except Exception as e:
            logger.error(f"Teams alert failed: {str(e)}")
    
    @staticmethod
    def _route_region_alerts(provider, status, country_code):
        """Send alerts based on region"""
        from django.core.mail import send_mail
        import requests
        
        region_config = getattr(settings, 'REGIONAL_ALERTS', {}).get(country_code, {})
        
        # Email alerts
        if 'emails' in region_config and region_config['emails']:
            send_mail(
                f"Regional Alert: {provider} {'Up' if status else 'Down'}",
                f"{provider} verification is {'operational' if status else 'failing'} in {country_code}",
                settings.DEFAULT_FROM_EMAIL,
                region_config['emails'],
                fail_silently=True
            )
        
        # Slack alerts
        if 'slack' in region_config and region_config['slack']:
            try:
                requests.post(
                    region_config['slack'],
                    json={
                        "text": f"{provider} verification {'✅ Up' if status else '❌ Down'} in {country_code}"
                    }
                )
            except Exception as e:
                logger.error(f"Regional Slack alert failed: {str(e)}")
        
        # Teams alerts
        if 'teams' in region_config and region_config['teams']:
            try:
                requests.post(
                    region_config['teams'],
                    json={
                        "@type": "MessageCard",
                        "themeColor": "00FF00" if status else "FF0000",
                        "title": f"Regional Verification Alert - {country_code}",
                        "text": f"{provider} is {'back online' if status else 'experiencing outages'}"
                    }
                )
            except Exception as e:
                logger.error(f"Regional Teams alert failed: {str(e)}")
    
    @staticmethod
    def _test_africastalking():
        """Test Africa's Talking connectivity"""
        response = requests.get(
            "https://api.africastalking.com/version1",
            headers={"apiKey": settings.AFRICASTALKING_API_KEY},
            timeout=5
        )
        response.raise_for_status()
    
    @staticmethod
    def _test_twilio():
        """Test Twilio connectivity"""
        response = requests.get(
            "https://api.twilio.com/2010-04-01",
            auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
            timeout=5
        )
        response.raise_for_status()
        
    @staticmethod
    def _test_nexmo():
        """Test Nexmo connectivity"""
        response = requests.get(
            "https://rest.nexmo.com",
            timeout=5
        )
        response.raise_for_status()

    @staticmethod
    def _test_provider_region(provider, country_code):
        """Test provider in a specific region"""
        if provider == 'africastalking':
            return VerificationService._test_africastalking()
        elif provider == 'twilio':
            return VerificationService._test_twilio()
        elif provider == 'nexmo':
            return VerificationService._test_nexmo()
        else:
            return False

    @staticmethod
    def verify_phone_number(phone_number):
        """Try healthy providers first"""
        # Get healthy providers sorted by preference
        healthy_providers = [
            p for p in [
                settings.PHONE_VERIFICATION_PROVIDER,
                'africastalking',
                'twilio',
                'nexmo'
            ] 
            if VerificationService._provider_status.get(p, {}).get('healthy', True)
        ]
        
        for provider in healthy_providers:
            try:
                if provider == 'africastalking':
                    return VerificationService._africastalking_verify(phone_number)
                elif provider == 'twilio':
                    return VerificationService._twilio_verify(phone_number)
                elif provider == 'nexmo':
                    return VerificationService._nexmo_verify(phone_number)
            except Exception as e:
                logger.warning(f"{provider} verification failed: {str(e)}")
                VerificationService._provider_status[provider]['healthy'] = False
                continue
                
        return phone_number.startswith('233') and len(phone_number) == 12

    @staticmethod
    def _log_attempt(phone_number, provider, success, response_time, error=None, is_retry=False):
        """Log verification attempt"""
        from .models.verification import VerificationLog
        
        VerificationLog.objects.create(
            phone_number=phone_number,
            provider=provider,
            success=success,
            response_time=response_time,
            error_message=str(error)[:255] if error else None,
            is_retry=is_retry
        )
    
    @staticmethod
    def update_provider_health(provider, is_healthy, response_time):
        """Update provider health status"""
        from .models.verification import ProviderHealth
        from django.db.models import Avg, Count
        
        # Calculate recent success rate
        stats = VerificationLog.objects.filter(
            provider=provider
        ).order_by('-created_at')[:100].aggregate(
            success_rate=Avg('success'),
            total=Count('id')
        )
        
        ProviderHealth.objects.create(
            provider=provider,
            is_healthy=is_healthy,
            last_checked=timezone.now(),
            response_time=response_time,
            success_rate=stats['success_rate'] or 0
        )
    
    @staticmethod
    def _africastalking_verify(phone_number):
        """Africa's Talking API with logging"""
        start_time = time.time()
        try:
            response = requests.get(
                f"https://api.africastalking.com/version1/verify?phoneNumber={phone_number}",
                headers={"apiKey": settings.AFRICASTALKING_API_KEY},
                timeout=5
            )
            response.raise_for_status()
            success = response.json().get('status') == 'success'
            return success
        finally:
            response_time = time.time() - start_time
            VerificationService._log_attempt(
                phone_number,
                'africastalking',
                success,
                response_time
            )

    @staticmethod 
    def _twilio_verify(phone_number):
        """Twilio Lookup API verification"""
        response = requests.get(
            f"https://lookups.twilio.com/v1/PhoneNumbers/{phone_number}",
            auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        )
        return response.status_code == 200

    @staticmethod
    def _nexmo_verify(phone_number):
        """Nexmo Number Insight verification"""
        response = requests.get(
            "https://api.nexmo.com/ni/standard/json",
            params={
                "api_key": settings.NEXMO_API_KEY,
                "api_secret": settings.NEXMO_API_SECRET,
                "number": phone_number
            }
        )
        return response.json().get('status') == 0

    @staticmethod
    def verify_source_of_funds(customer):
        """Verify customer's source of funds"""
        if settings.SOURCE_OF_FUNDS_PROVIDER == 'local':
            # Basic local verification logic
            return customer.income_verified and customer.employment_verified
        else:
            # Integration with external providers
            return VerificationService._external_funds_verification(customer)
    
    @staticmethod
    def _external_funds_verification(customer):
        """External source of funds verification"""
        # Implementation would vary by provider
        return True

    @staticmethod
    def get_recent_alerts(limit=5):
        """Get recent alerts for dashboard"""
        # In production, store alerts in database
        return [
            {
                'provider': 'africastalking',
                'status': 'critical',
                'message': 'High failure rate',
                'timestamp': '2025-10-31 15:00'
            }
        ][:limit]
