from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils.crypto import get_random_string
from django.utils import timezone
from datetime import timedelta
from .models import PasswordResetToken
from .validators import ComplexityValidator
from django.utils.module_loading import import_string
import logging

logger = logging.getLogger(__name__)

class PasswordResetService:
    @staticmethod
    def initiate_reset(email):
        """Create and send password reset token"""
        try:
            user = User.objects.get(email=email)
            token = get_random_string(length=32)
            expires_at = timezone.now() + timedelta(hours=1)
            
            PasswordResetToken.objects.create(
                user=user,
                token=token,
                expires_at=expires_at
            )
            
            reset_url = f"{settings.FRONTEND_URL}/reset-password/{token}/"
            
            send_mail(
                'Password Reset Request',
                render_to_string('accounts/password_reset_email.txt', {
                    'user': user,
                    'reset_url': reset_url
                }),
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False
            )
            return True
        except Exception as e:
            logger.error(f"Password reset failed: {str(e)}")
            return False
    
    @staticmethod
    def validate_token(token):
        """Check if reset token is valid"""
        try:
            reset = PasswordResetToken.objects.get(
                token=token,
                expires_at__gt=timezone.now(),
                used=False
            )
            return reset.user
        except PasswordResetToken.DoesNotExist:
            return None
    
    @staticmethod
    def complete_reset(token, new_password):
        """Update password and invalidate token"""
        user = PasswordResetService.validate_token(token)
        if not user:
            return False
            
        validator = ComplexityValidator()
        validator.validate(new_password)
        
        user.set_password(new_password)
        user.save()
        
        PasswordResetToken.objects.filter(token=token).update(used=True)
        return True
