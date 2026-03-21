import pyotp
import qrcode
from io import BytesIO
from django.core.cache import cache
from django.conf import settings
from users.models import User
import secrets
from django.contrib.auth.hashers import make_password, check_password
from django.core.mail import send_mail
from django.template.loader import render_to_string

class MFAService:
    @staticmethod
    def generate_secret(user):
        """Create TOTP secret for user"""
        secret = pyotp.random_base32()
        cache.set(f'mfa_secret_{user.id}', secret, timeout=300)  # 5min expiry
        return secret
    
    @staticmethod
    def get_otp_uri(user, secret):
        """Generate provisioning URI for authenticator apps"""
        return pyotp.totp.TOTP(secret).provisioning_uri(
            name=user.email,
            issuer_name=settings.MFA_ISSUER_NAME
        )
    
    @staticmethod
    def generate_qr_code(uri):
        """Create QR code for secret"""
        img = qrcode.make(uri)
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        return buffer.getvalue()
    
    @staticmethod
    def verify_code(user, code):
        """Validate TOTP code"""
        secret = cache.get(f'mfa_secret_{user.id}') or user.mfa_secret
        if not secret:
            return False
            
        totp = pyotp.TOTP(secret)
        return totp.verify(code)

    @staticmethod
    def generate_backup_codes(user, count=5):
        """Generate one-time backup codes"""
        codes = [secrets.token_urlsafe(8) for _ in range(count)]
        hashed_codes = [make_password(code) for code in codes]
        
        user.mfa_backup_codes = hashed_codes
        user.save()
        
        return codes
    
    @staticmethod
    def verify_backup_code(user, code):
        """Check and consume backup code"""
        if not user.mfa_backup_codes:
            return False
            
        for i, hashed_code in enumerate(user.mfa_backup_codes):
            if check_password(code, hashed_code):
                # Remove used code
                user.mfa_backup_codes.pop(i)
                user.save()
                return True
        return False

    @staticmethod
    def send_backup_codes_email(user, codes):
        """Email backup codes to user"""
        send_mail(
            'Your MFA Backup Codes',
            render_to_string('accounts/backup_codes_email.txt', {
                'user': user,
                'codes': codes
            }),
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False
        )
