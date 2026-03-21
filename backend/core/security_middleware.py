"""
Security Headers Middleware for SikaRemit
Implements comprehensive security headers for production
"""

from django.utils.deprecation import MiddlewareMixin
from django.http import HttpResponse
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class SecurityHeadersMiddleware(MiddlewareMixin):
    """
    Adds security headers to all HTTP responses
    """
    
    def process_response(self, request, response):
        """
        Add security headers to response
        """
        # Only add headers in production
        if getattr(settings, 'DEBUG', False):
            return response
            
        # Security headers configuration
        security_headers = getattr(settings, 'SECURITY_HEADERS', {})
        
        # Apply security headers
        for header, value in security_headers.items():
            response[header] = value
            
        # Additional security headers
        response['Permissions-Policy'] = (
            'geolocation=(), microphone=(), camera=(), '
            'payment=(), usb=(), magnetometer=(), gyroscope=()'
        )
        
        # Remove server information
        response.pop('Server', None)
        
        return response


class SecurityConfigurationValidator:
    """
    Validates security configuration on startup
    """
    
    def __init__(self):
        self.errors = []
        self.warnings = []
        
    def validate_configuration(self):
        """
        Validate all security settings
        """
        self._validate_secret_key()
        self._validate_debug_mode()
        self._validate_allowed_hosts()
        self._validate_database_ssl()
        self._validate_cors_settings()
        
        return self.errors, self.warnings
    
    def _validate_secret_key(self):
        """Validate SECRET_KEY configuration"""
        secret_key = getattr(settings, 'SECRET_KEY', None)
        
        if not secret_key:
            self.errors.append("SECRET_KEY is not set")
        elif 'django-insecure' in secret_key or 'default' in secret_key.lower():
            self.errors.append("SECRET_KEY is using default value")
        elif len(secret_key) < 50:
            self.warnings.append("SECRET_KEY should be at least 50 characters")
            
    def _validate_debug_mode(self):
        """Validate DEBUG mode"""
        if getattr(settings, 'DEBUG', False):
            self.errors.append("DEBUG mode is enabled in production")
            
    def _validate_allowed_hosts(self):
        """Validate ALLOWED_HOSTS"""
        allowed_hosts = getattr(settings, 'ALLOWED_HOSTS', [])
        
        if not allowed_hosts:
            self.errors.append("ALLOWED_HOSTS is empty")
            
        # Check for development hosts in production
        dev_hosts = ['localhost', '127.0.0.1', '0.0.0.0', '192.168']
        for host in allowed_hosts:
            if any(dev in host for dev in dev_hosts):
                self.warnings.append(f"Development host '{host}' in ALLOWED_HOSTS")
                
    def _validate_database_ssl(self):
        """Validate database SSL configuration"""
        databases = getattr(settings, 'DATABASES', {})
        default_db = databases.get('default', {})
        
        if default_db.get('ENGINE', '').endswith('postgresql'):
            options = default_db.get('OPTIONS', {})
            sslmode = options.get('sslmode')
            
            if sslmode != 'require':
                self.warnings.append("Database SSL mode should be 'require'")
                
    def _validate_cors_settings(self):
        """Validate CORS configuration"""
        cors_origins = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
        
        # Check for development origins
        dev_origins = ['localhost', '127.0.0.1', 'vercel.app']
        for origin in cors_origins:
            if any(dev in origin for dev in dev_origins):
                self.warnings.append(f"Development origin '{origin}' in CORS_ALLOWED_ORIGINS")


def validate_security_on_startup():
    """
    Run security validation on Django startup
    """
    validator = SecurityConfigurationValidator()
    errors, warnings = validator.validate_configuration()
    
    if errors:
        logger.error("🚨 SECURITY ERRORS FOUND:")
        for error in errors:
            logger.error(f"  ❌ {error}")
            
    if warnings:
        logger.warning("⚠️ SECURITY WARNINGS:")
        for warning in warnings:
            logger.warning(f"  ⚠️ {warning}")
            
    if not errors and not warnings:
        logger.info("✅ Security configuration validated successfully")
        
    return len(errors) == 0
