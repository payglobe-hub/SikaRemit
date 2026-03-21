"""
Production Configuration for SikaRemit
Centralizes all production-ready settings and validations
"""
import os
import secrets
from typing import Dict, List, Optional
from django.core.exceptions import ImproperlyConfigured

class ProductionConfig:
    """
    Production configuration validator and manager
    Ensures all required settings are properly configured before deployment
    """
    
    REQUIRED_ENV_VARS = [
        # Core Django
        ('SECRET_KEY', 'Django secret key for cryptographic signing'),
        ('ALLOWED_HOSTS', 'Comma-separated list of allowed hosts'),
        
        # Database
        ('DB_PASSWORD', 'PostgreSQL database password'),
        
        # Payment Providers (at least one required)
        ('PAYSTACK_SECRET_KEY', 'Paystack API secret key'),
        
        # Email
        ('EMAIL_HOST_PASSWORD', 'SMTP password or API key'),
        ('DEFAULT_FROM_EMAIL', 'Default sender email address'),
    ]
    
    OPTIONAL_ENV_VARS = [
        # Additional Payment Providers
        ('STRIPE_SECRET_KEY', 'Stripe API secret key'),
        ('FLUTTERWAVE_SECRET_KEY', 'Flutterwave API secret key'),
        
        # Mobile Money
        ('MTN_MOMO_API_KEY', 'MTN Mobile Money API key'),
        ('TELECEL_API_KEY', 'Telecel Cash API key'),
        ('AIRTEL_API_KEY', 'AirtelTigo Money API key'),
        
        # Monitoring
        ('SENTRY_DSN', 'Sentry error tracking DSN'),
        
        # SMS
        ('TWILIO_ACCOUNT_SID', 'Twilio account SID'),
        ('AFRICASTALKING_API_KEY', 'Africa\'s Talking API key'),
    ]
    
    @classmethod
    def validate_production_config(cls) -> Dict[str, any]:
        """
        Validate all production configuration
        Returns dict with validation results
        """
        results = {
            'valid': True,
            'errors': [],
            'warnings': [],
            'configured': [],
        }
        
        # Check required variables
        for var_name, description in cls.REQUIRED_ENV_VARS:
            value = os.environ.get(var_name)
            if not value or value.startswith('your_') or value == 'changeme':
                results['valid'] = False
                results['errors'].append(f"Missing or placeholder: {var_name} - {description}")
            else:
                results['configured'].append(var_name)
        
        # Check optional variables
        for var_name, description in cls.OPTIONAL_ENV_VARS:
            value = os.environ.get(var_name)
            if not value or value.startswith('your_'):
                results['warnings'].append(f"Not configured: {var_name} - {description}")
            else:
                results['configured'].append(var_name)
        
        # Validate SECRET_KEY strength
        secret_key = os.environ.get('SECRET_KEY', '')
        if len(secret_key) < 50:
            results['warnings'].append("SECRET_KEY should be at least 50 characters")
        
        # Check DEBUG is False
        if os.environ.get('DEBUG', 'True').lower() == 'true':
            results['errors'].append("DEBUG must be False in production")
            results['valid'] = False
        
        return results
    
    @staticmethod
    def generate_secret_key() -> str:
        """Generate a secure secret key"""
        return secrets.token_urlsafe(64)
    
    @classmethod
    def get_database_config(cls) -> Dict:
        """Get production database configuration"""
        return {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DB_NAME', 'sikaremit_prod'),
            'USER': os.environ.get('DB_USER', 'sikaremit_user'),
            'PASSWORD': os.environ.get('DB_PASSWORD'),
            'HOST': os.environ.get('DB_HOST', 'localhost'),
            'PORT': os.environ.get('DB_PORT', '5432'),
            'CONN_MAX_AGE': 60,
            'OPTIONS': {
                'connect_timeout': 10,
                'options': '-c statement_timeout=30000',  # 30 second query timeout
            },
        }
    
    @classmethod
    def get_cache_config(cls) -> Dict:
        """Get production cache configuration"""
        redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379/1')
        return {
            'default': {
                'BACKEND': 'django_redis.cache.RedisCache',
                'LOCATION': redis_url,
                'OPTIONS': {
                    'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                    'SOCKET_CONNECT_TIMEOUT': 5,
                    'SOCKET_TIMEOUT': 5,
                    'RETRY_ON_TIMEOUT': True,
                    'MAX_CONNECTIONS': 50,
                },
                'KEY_PREFIX': 'sikaremit',
            }
        }
    
    @classmethod
    def get_logging_config(cls) -> Dict:
        """Get production logging configuration"""
        return {
            'version': 1,
            'disable_existing_loggers': False,
            'formatters': {
                'verbose': {
                    'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
                    'style': '{',
                },
                'json': {
                    '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
                    'format': '%(asctime)s %(levelname)s %(name)s %(message)s',
                },
            },
            'filters': {
                'require_debug_false': {
                    '()': 'django.utils.log.RequireDebugFalse',
                },
            },
            'handlers': {
                'console': {
                    'level': 'INFO',
                    'class': 'logging.StreamHandler',
                    'formatter': 'json',
                },
                'file': {
                    'level': 'WARNING',
                    'class': 'logging.handlers.RotatingFileHandler',
                    'filename': 'logs/sikaremit.log',
                    'maxBytes': 10485760,  # 10MB
                    'backupCount': 10,
                    'formatter': 'json',
                },
                'payment_file': {
                    'level': 'INFO',
                    'class': 'logging.handlers.RotatingFileHandler',
                    'filename': 'logs/payments.log',
                    'maxBytes': 10485760,
                    'backupCount': 20,
                    'formatter': 'json',
                },
                'security_file': {
                    'level': 'WARNING',
                    'class': 'logging.handlers.RotatingFileHandler',
                    'filename': 'logs/security.log',
                    'maxBytes': 10485760,
                    'backupCount': 30,
                    'formatter': 'json',
                },
                'mail_admins': {
                    'level': 'ERROR',
                    'filters': ['require_debug_false'],
                    'class': 'django.utils.log.AdminEmailHandler',
                },
            },
            'loggers': {
                'django': {
                    'handlers': ['console', 'file'],
                    'level': 'INFO',
                    'propagate': True,
                },
                'django.security': {
                    'handlers': ['security_file', 'mail_admins'],
                    'level': 'WARNING',
                    'propagate': False,
                },
                'payments': {
                    'handlers': ['console', 'payment_file'],
                    'level': 'INFO',
                    'propagate': False,
                },
                'payments.gateways': {
                    'handlers': ['console', 'payment_file'],
                    'level': 'DEBUG',
                    'propagate': False,
                },
                'kyc': {
                    'handlers': ['console', 'security_file'],
                    'level': 'INFO',
                    'propagate': False,
                },
                'compliance': {
                    'handlers': ['console', 'security_file'],
                    'level': 'INFO',
                    'propagate': False,
                },
            },
            'root': {
                'handlers': ['console', 'file'],
                'level': 'INFO',
            },
        }

class SecurityConfig:
    """Security-related configuration for production"""
    
    @staticmethod
    def get_security_middleware() -> List[str]:
        """Get security middleware list"""
        return [
            'django.middleware.security.SecurityMiddleware',
            'whitenoise.middleware.WhiteNoiseMiddleware',
            'core.middleware.security_middleware.SecurityHeadersMiddleware',
            'core.middleware.security_middleware.APIRateLimitMiddleware',
            'core.middleware.security_middleware.SQLInjectionProtectionMiddleware',
            'core.middleware.security_middleware.XSSProtectionMiddleware',
        ]
    
    @staticmethod
    def get_security_settings() -> Dict:
        """Get security settings for production"""
        return {
            # HTTPS settings
            'SECURE_SSL_REDIRECT': True,
            'SECURE_PROXY_SSL_HEADER': ('HTTP_X_FORWARDED_PROTO', 'https'),
            
            # HSTS settings
            'SECURE_HSTS_SECONDS': 31536000,  # 1 year
            'SECURE_HSTS_INCLUDE_SUBDOMAINS': True,
            'SECURE_HSTS_PRELOAD': True,
            
            # Cookie settings
            'SESSION_COOKIE_SECURE': True,
            'SESSION_COOKIE_HTTPONLY': True,
            'SESSION_COOKIE_SAMESITE': 'Lax',
            'CSRF_COOKIE_SECURE': True,
            'CSRF_COOKIE_HTTPONLY': True,
            
            # Content security
            'SECURE_CONTENT_TYPE_NOSNIFF': True,
            'SECURE_BROWSER_XSS_FILTER': True,
            'X_FRAME_OPTIONS': 'DENY',
            
            # Referrer policy
            'SECURE_REFERRER_POLICY': 'strict-origin-when-cross-origin',
        }

class BackupConfig:
    """Database backup configuration"""
    
    @staticmethod
    def get_backup_settings() -> Dict:
        """Get backup configuration"""
        return {
            'BACKUP_ENABLED': True,
            'BACKUP_SCHEDULE': '0 2 * * *',  # Daily at 2 AM
            'BACKUP_RETENTION_DAYS': 30,
            'BACKUP_STORAGE': os.environ.get('BACKUP_STORAGE', 'local'),
            'BACKUP_S3_BUCKET': os.environ.get('BACKUP_S3_BUCKET', ''),
            'BACKUP_ENCRYPTION': True,
        }
    
    @staticmethod
    def generate_backup_script() -> str:
        """Generate PostgreSQL backup script"""
        return '''#!/bin/bash
# SikaRemit Database Backup Script
# Run daily via cron: 0 2 * * * /path/to/backup.sh

set -e

# Configuration
DB_NAME="${DB_NAME:-sikaremit_prod}"
DB_USER="${DB_USER:-sikaremit_user}"
DB_HOST="${DB_HOST:-localhost}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/sikaremit}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${DATE}.sql.gz"

# Create backup directory if not exists
mkdir -p "${BACKUP_DIR}"

# Create backup
echo "Starting backup of ${DB_NAME}..."
PGPASSWORD="${DB_PASSWORD}" pg_dump -h "${DB_HOST}" -U "${DB_USER}" "${DB_NAME}" | gzip > "${BACKUP_FILE}"

# Verify backup
if [ -f "${BACKUP_FILE}" ] && [ -s "${BACKUP_FILE}" ]; then
    echo "Backup created successfully: ${BACKUP_FILE}"
    echo "Size: $(du -h ${BACKUP_FILE} | cut -f1)"
else
    echo "ERROR: Backup failed!"
    exit 1
fi

# Remove old backups
echo "Removing backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete

# Optional: Upload to S3
if [ -n "${BACKUP_S3_BUCKET}" ]; then
    echo "Uploading to S3..."
    aws s3 cp "${BACKUP_FILE}" "s3://${BACKUP_S3_BUCKET}/backups/"
fi

echo "Backup completed successfully!"
'''

def validate_production_environment():
    """
    Validate production environment on startup
    Raises ImproperlyConfigured if critical settings are missing
    """
    is_production = os.environ.get('ENVIRONMENT', 'development').lower() == 'production'
    
    if not is_production:
        return  # Skip validation in development
    
    results = ProductionConfig.validate_production_config()
    
    if not results['valid']:
        error_msg = "Production configuration errors:\n"
        for error in results['errors']:
            error_msg += f"  - {error}\n"
        raise ImproperlyConfigured(error_msg)
    
    if results['warnings']:
        import logging
        logger = logging.getLogger(__name__)
        for warning in results['warnings']:
            logger.warning(f"Production config warning: {warning}")
