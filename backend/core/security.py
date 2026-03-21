"""
Security Hardening Module for SikaRemit
Implements security best practices for Bank of Ghana compliance
"""

import hashlib
import hmac
import secrets
import logging
from functools import wraps
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response

logger = logging.getLogger(__name__)

# =============================================================================
# SECURITY CONSTANTS
# =============================================================================

# Rate limiting thresholds
RATE_LIMITS = {
    'login': {'requests': 5, 'window': 300},  # 5 attempts per 5 minutes
    'password_reset': {'requests': 3, 'window': 3600},  # 3 per hour
    'payment': {'requests': 10, 'window': 60},  # 10 per minute
    'api_general': {'requests': 100, 'window': 60},  # 100 per minute
    'otp_request': {'requests': 3, 'window': 300},  # 3 per 5 minutes
    'kyc_upload': {'requests': 5, 'window': 3600},  # 5 per hour
}

# Suspicious activity thresholds
SUSPICIOUS_THRESHOLDS = {
    'failed_logins': 10,  # Per day
    'failed_payments': 5,  # Per hour
    'ip_changes': 5,  # Per day
    'device_changes': 3,  # Per day
}

# =============================================================================
# INPUT VALIDATION
# =============================================================================

class InputValidator:
    """Validate and sanitize user inputs"""
    
    @staticmethod
    def sanitize_phone(phone: str) -> str:
        """Sanitize phone number input"""
        if not phone:
            return ''
        # Remove all non-digit characters except +
        sanitized = ''.join(c for c in phone if c.isdigit() or c == '+')
        return sanitized[:15]  # Max phone length
    
    @staticmethod
    def sanitize_email(email: str) -> str:
        """Sanitize email input"""
        if not email:
            return ''
        return email.lower().strip()[:254]  # Max email length
    
    @staticmethod
    def sanitize_amount(amount) -> Optional[float]:
        """Sanitize and validate amount"""
        try:
            amount = float(amount)
            if amount <= 0 or amount > 1000000:  # Max transaction limit
                return None
            return round(amount, 2)
        except (ValueError, TypeError):
            return None
    
    @staticmethod
    def validate_currency(currency: str) -> bool:
        """Validate currency code"""
        valid_currencies = ['GHS', 'USD', 'EUR', 'GBP', 'NGN', 'KES', 'ZAR']
        return currency.upper() in valid_currencies
    
    @staticmethod
    def validate_country_code(code: str) -> bool:
        """Validate ISO country code"""
        valid_codes = ['GH', 'US', 'GB', 'NG', 'KE', 'ZA', 'CI', 'SN', 'TG', 'BJ', 'BF']
        return code.upper() in valid_codes

# =============================================================================
# RATE LIMITING
# =============================================================================

class RateLimiter:
    """Rate limiting implementation using Redis/cache"""
    
    @staticmethod
    def get_rate_limit_key(identifier: str, action: str) -> str:
        """Generate rate limit cache key"""
        return f"rate_limit:{action}:{identifier}"
    
    @staticmethod
    def is_rate_limited(identifier: str, action: str) -> bool:
        """Check if identifier is rate limited for action"""
        if action not in RATE_LIMITS:
            return False
        
        config = RATE_LIMITS[action]
        key = RateLimiter.get_rate_limit_key(identifier, action)
        
        current_count = cache.get(key, 0)
        return current_count >= config['requests']
    
    @staticmethod
    def increment_rate_limit(identifier: str, action: str) -> int:
        """Increment rate limit counter"""
        if action not in RATE_LIMITS:
            return 0
        
        config = RATE_LIMITS[action]
        key = RateLimiter.get_rate_limit_key(identifier, action)
        
        current_count = cache.get(key, 0)
        new_count = current_count + 1
        
        cache.set(key, new_count, config['window'])
        return new_count
    
    @staticmethod
    def reset_rate_limit(identifier: str, action: str):
        """Reset rate limit counter"""
        key = RateLimiter.get_rate_limit_key(identifier, action)
        cache.delete(key)
    
    @staticmethod
    def get_remaining_attempts(identifier: str, action: str) -> int:
        """Get remaining attempts before rate limit"""
        if action not in RATE_LIMITS:
            return -1
        
        config = RATE_LIMITS[action]
        key = RateLimiter.get_rate_limit_key(identifier, action)
        
        current_count = cache.get(key, 0)
        return max(0, config['requests'] - current_count)

def rate_limit(action: str):
    """Decorator for rate limiting views"""
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Get identifier (IP or user ID)
            if hasattr(request, 'user') and request.user.is_authenticated:
                identifier = f"user:{request.user.id}"
            else:
                identifier = f"ip:{get_client_ip(request)}"
            
            if RateLimiter.is_rate_limited(identifier, action):
                logger.warning(f"Rate limit exceeded: {identifier} for {action}")
                return Response(
                    {'error': 'Too many requests. Please try again later.'},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )
            
            RateLimiter.increment_rate_limit(identifier, action)
            return view_func(request, *args, **kwargs)
        
        return wrapper
    return decorator

# =============================================================================
# IP AND DEVICE TRACKING
# =============================================================================

def get_client_ip(request) -> str:
    """Get client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '')
    return ip

def get_device_fingerprint() -> str:
    """Generate device fingerprint from request headers"""
    components = [
        request.META.get('HTTP_USER_AGENT', ''),
        request.META.get('HTTP_ACCEPT_LANGUAGE', ''),
        request.META.get('HTTP_ACCEPT_ENCODING', ''),
    ]
    fingerprint_string = '|'.join(components)
    return hashlib.sha256(fingerprint_string.encode()).hexdigest()[:32]

class DeviceTracker:
    """Track user devices for security"""
    
    @staticmethod
    def get_known_devices(user_id: int) -> set:
        """Get known devices for user"""
        key = f"known_devices:{user_id}"
        return cache.get(key, set())
    
    @staticmethod
    def add_device(user_id: int, device_fingerprint: str):
        """Add device to known devices"""
        key = f"known_devices:{user_id}"
        devices = cache.get(key, set())
        devices.add(device_fingerprint)
        cache.set(key, devices, 86400 * 30)  # 30 days
    
    @staticmethod
    def is_new_device(user_id: int, device_fingerprint: str) -> bool:
        """Check if device is new for user"""
        devices = DeviceTracker.get_known_devices(user_id)
        return device_fingerprint not in devices
    
    @staticmethod
    def get_device_count(user_id: int) -> int:
        """Get number of known devices"""
        return len(DeviceTracker.get_known_devices(user_id))

# =============================================================================
# SUSPICIOUS ACTIVITY DETECTION
# =============================================================================

class SuspiciousActivityDetector:
    """Detect and flag suspicious activities"""
    
    @staticmethod
    def record_failed_login(user_id: int, ip: str):
        """Record failed login attempt"""
        key = f"failed_logins:{user_id}:{timezone.now().date()}"
        count = cache.get(key, 0) + 1
        cache.set(key, count, 86400)  # 24 hours
        
        if count >= SUSPICIOUS_THRESHOLDS['failed_logins']:
            SuspiciousActivityDetector._flag_suspicious(
                user_id, 'excessive_failed_logins', {'ip': ip, 'count': count}
            )
    
    @staticmethod
    def record_failed_payment(user_id: int, amount: float):
        """Record failed payment attempt"""
        key = f"failed_payments:{user_id}:{timezone.now().hour}"
        count = cache.get(key, 0) + 1
        cache.set(key, count, 3600)  # 1 hour
        
        if count >= SUSPICIOUS_THRESHOLDS['failed_payments']:
            SuspiciousActivityDetector._flag_suspicious(
                user_id, 'excessive_failed_payments', {'count': count}
            )
    
    @staticmethod
    def record_ip_change(user_id: int, old_ip: str, new_ip: str):
        """Record IP address change"""
        key = f"ip_changes:{user_id}:{timezone.now().date()}"
        count = cache.get(key, 0) + 1
        cache.set(key, count, 86400)
        
        if count >= SUSPICIOUS_THRESHOLDS['ip_changes']:
            SuspiciousActivityDetector._flag_suspicious(
                user_id, 'excessive_ip_changes', {'old_ip': old_ip, 'new_ip': new_ip}
            )
    
    @staticmethod
    def _flag_suspicious(user_id: int, activity_type: str, details: Dict):
        """Flag suspicious activity for review"""
        logger.warning(f"Suspicious activity detected: {activity_type} for user {user_id}")
        
        # Store alert for admin review
        key = f"suspicious_alerts:{user_id}"
        alerts = cache.get(key, [])
        alerts.append({
            'type': activity_type,
            'details': details,
            'timestamp': timezone.now().isoformat()
        })
        cache.set(key, alerts, 86400 * 7)  # 7 days
        
        # Could also send notification to admin here

# =============================================================================
# SECURE TOKEN GENERATION
# =============================================================================

class SecureTokenGenerator:
    """Generate secure tokens for various purposes"""
    
    @staticmethod
    def generate_otp(length: int = 6) -> str:
        """Generate numeric OTP"""
        return ''.join(secrets.choice('0123456789') for _ in range(length))
    
    @staticmethod
    def generate_token(length: int = 32) -> str:
        """Generate secure random token"""
        return secrets.token_urlsafe(length)
    
    @staticmethod
    def generate_reference(prefix: str = 'TXN') -> str:
        """Generate transaction reference"""
        timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
        random_part = secrets.token_hex(4).upper()
        return f"{prefix}-{timestamp}-{random_part}"
    
    @staticmethod
    def hash_sensitive_data(data: str, salt: str = None) -> str:
        """Hash sensitive data with optional salt"""
        if salt is None:
            salt = getattr(settings, 'SECRET_KEY', '')[:16]
        
        return hashlib.pbkdf2_hmac(
            'sha256',
            data.encode(),
            salt.encode(),
            100000
        ).hex()

# =============================================================================
# WEBHOOK SECURITY
# =============================================================================

class WebhookSecurity:
    """Security utilities for webhook handling"""
    
    @staticmethod
    def verify_signature(payload: bytes, signature: str, secret: str, algorithm: str = 'sha256') -> bool:
        """Verify webhook signature"""
        if not signature or not secret:
            return False
        
        if algorithm == 'sha256':
            expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
        elif algorithm == 'sha512':
            expected = hmac.new(secret.encode(), payload, hashlib.sha512).hexdigest()
        else:
            return False
        
        return hmac.compare_digest(signature.lower(), expected.lower())
    
    @staticmethod
    def is_replay_attack(webhook_id: str, timestamp: int, window: int = 300) -> bool:
        """Check for replay attack"""
        # Check timestamp is within window
        current_time = int(timezone.now().timestamp())
        if abs(current_time - timestamp) > window:
            return True
        
        # Check if webhook ID was already processed
        key = f"webhook_processed:{webhook_id}"
        if cache.get(key):
            return True
        
        # Mark as processed
        cache.set(key, True, window * 2)
        return False

# =============================================================================
# AUDIT LOGGING
# =============================================================================

class AuditLogger:
    """Security audit logging"""
    
    @staticmethod
    def log_authentication(user_id: int, action: str, success: bool, ip: str, details: Dict = None):
        """Log authentication events"""
        logger.info(
            f"AUTH: user={user_id} action={action} success={success} ip={ip} details={details}"
        )
    
    @staticmethod
    def log_payment(user_id: int, transaction_id: str, amount: float, status: str, details: Dict = None):
        """Log payment events"""
        logger.info(
            f"PAYMENT: user={user_id} txn={transaction_id} amount={amount} status={status} details={details}"
        )
    
    @staticmethod
    def log_security_event(event_type: str, user_id: int = None, ip: str = None, details: Dict = None):
        """Log security events"""
        logger.warning(
            f"SECURITY: type={event_type} user={user_id} ip={ip} details={details}"
        )
    
    @staticmethod
    def log_admin_action(admin_id: int, action: str, target_user: int = None, details: Dict = None):
        """Log admin actions"""
        logger.info(
            f"ADMIN: admin={admin_id} action={action} target={target_user} details={details}"
        )

# =============================================================================
# PASSWORD SECURITY
# =============================================================================

class PasswordValidator:
    """Custom password validation"""
    
    MIN_LENGTH = 8
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_DIGIT = True
    REQUIRE_SPECIAL = True
    
    @classmethod
    def validate(cls, password: str) -> Dict[str, Any]:
        """Validate password strength"""
        errors = []
        
        if len(password) < cls.MIN_LENGTH:
            errors.append(f'Password must be at least {cls.MIN_LENGTH} characters')
        
        if cls.REQUIRE_UPPERCASE and not any(c.isupper() for c in password):
            errors.append('Password must contain at least one uppercase letter')
        
        if cls.REQUIRE_LOWERCASE and not any(c.islower() for c in password):
            errors.append('Password must contain at least one lowercase letter')
        
        if cls.REQUIRE_DIGIT and not any(c.isdigit() for c in password):
            errors.append('Password must contain at least one digit')
        
        if cls.REQUIRE_SPECIAL and not any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in password):
            errors.append('Password must contain at least one special character')
        
        # Check common passwords
        common_passwords = ['password', '123456', 'qwerty', 'admin', 'letmein']
        if password.lower() in common_passwords:
            errors.append('Password is too common')
        
        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'strength': cls._calculate_strength(password)
        }
    
    @classmethod
    def _calculate_strength(cls, password: str) -> str:
        """Calculate password strength"""
        score = 0
        
        if len(password) >= 8:
            score += 1
        if len(password) >= 12:
            score += 1
        if any(c.isupper() for c in password):
            score += 1
        if any(c.islower() for c in password):
            score += 1
        if any(c.isdigit() for c in password):
            score += 1
        if any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in password):
            score += 1
        
        if score <= 2:
            return 'weak'
        elif score <= 4:
            return 'medium'
        else:
            return 'strong'

# =============================================================================
# SECURITY MIDDLEWARE HELPERS
# =============================================================================

def add_security_headers(response):
    """Add security headers to response"""
    response['X-Content-Type-Options'] = 'nosniff'
    response['X-Frame-Options'] = 'DENY'
    response['X-XSS-Protection'] = '1; mode=block'
    response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
    
    if getattr(settings, 'IS_PRODUCTION', False):
        response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
    
    return response

def mask_sensitive_data(data: str, visible_chars: int = 4) -> str:
    """Mask sensitive data for logging"""
    if not data or len(data) <= visible_chars:
        return '*' * len(data) if data else ''
    
    return '*' * (len(data) - visible_chars) + data[-visible_chars:]
