import logging
from datetime import datetime
from django.core.mail import send_mail
from django.conf import settings
from .models import AuthLog
from .device_fingerprint import DeviceFingerprint

logger = logging.getLogger('security')

class SecurityLogger:
    @staticmethod
    def log_auth_attempt(request, user, success, reason=None):
        """Log authentication attempts with device fingerprint"""
        try:
            device_id = DeviceFingerprint.generate(request)
            
            AuthLog.objects.create(
                user=user if user else None,
                ip_address=request.META.get('REMOTE_ADDR'),
                device_id=device_id,
                success=success,
                reason=reason,
                timestamp=datetime.now()
            )
            
            if not success:
                SecurityLogger._check_suspicious_activity(request, device_id)
                
        except Exception as e:
            logger.error(f"Failed to log auth attempt: {str(e)}")
    
    @staticmethod
    def _check_suspicious_activity(request, device_id):
        """Check for patterns of suspicious activity"""
        from django.utils import timezone
        from datetime import timedelta
        
        recent_failures = AuthLog.objects.filter(
            device_id=device_id,
            success=False,
            timestamp__gte=timezone.now() - timedelta(minutes=15)
        ).count()
        
        if recent_failures >= 5:
            SecurityLogger._notify_admin(
                f"Suspicious activity detected from {request.META.get('REMOTE_ADDR')}",
                f"Device {device_id} has {recent_failures} failed attempts in last 15 minutes"
            )
    
    @staticmethod
    def _notify_admin(subject, message):
        """Send email notification to admin"""
        try:
            send_mail(
                subject=f"[Security Alert] {subject}",
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[settings.ADMIN_EMAIL],
                fail_silently=True
            )
        except Exception as e:
            logger.error(f"Failed to send security alert: {str(e)}")
