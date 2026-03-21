"""
Centralized Logging Configuration for SikaRemit
Provides structured JSON logging with request tracking and specialized loggers
"""
import logging
import logging.config
import logging.handlers
import os
from pathlib import Path
from django.conf import settings

class RequestIdFilter(logging.Filter):
    """Add request ID to log records for tracing"""
    def filter(self, record):
        from django.http import HttpRequest
        request = getattr(record, 'request', None)
        
        if isinstance(request, HttpRequest):
            record.request_id = getattr(request, 'request_id', 'none')
            record.user_id = getattr(request.user, 'id', 'anonymous') if hasattr(request, 'user') else 'anonymous'
            record.ip_address = get_client_ip(request)
        else:
            record.request_id = 'none'
            record.user_id = 'system'
            record.ip_address = 'localhost'
            
        return True

def get_client_ip(request):
    """Extract client IP from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', 'unknown')

def get_logging_config(is_production: bool = False):
    """
    Get logging configuration based on environment
    """
    # Ensure logs directory exists
    logs_dir = getattr(settings, 'LOGS_DIR', Path(settings.BASE_DIR) / 'logs')
    if isinstance(logs_dir, str):
        logs_dir = Path(logs_dir)
    logs_dir.mkdir(exist_ok=True)
    
    base_config = {
        'version': 1,
        'disable_existing_loggers': False,
        'filters': {
            'request_id': {
                '()': RequestIdFilter
            },
            'require_debug_false': {
                '()': 'django.utils.log.RequireDebugFalse',
            },
        },
        'formatters': {
            'verbose': {
                'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
                'style': '{',
            },
            'simple': {
                'format': '{levelname} {asctime} {message}',
                'style': '{',
            },
            'json': {
                '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
                'format': '%(asctime)s %(levelname)s %(name)s %(message)s %(request_id)s %(user_id)s %(ip_address)s'
            },
        },
        'handlers': {
            'console': {
                'level': 'DEBUG' if not is_production else 'INFO',
                'class': 'logging.StreamHandler',
                'formatter': 'json' if is_production else 'simple',
                'filters': ['request_id']
            },
            'file': {
                'level': 'INFO',
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': str(logs_dir / 'sikaremit.log'),
                'maxBytes': 1024 * 1024 * 10,  # 10MB
                'backupCount': 10,
                'formatter': 'json',
                'filters': ['request_id']
            },
            'payment_file': {
                'level': 'INFO',
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': str(logs_dir / 'payments.log'),
                'maxBytes': 1024 * 1024 * 20,  # 20MB
                'backupCount': 20,
                'formatter': 'json',
                'filters': ['request_id']
            },
            'security_file': {
                'level': 'WARNING',
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': str(logs_dir / 'security.log'),
                'maxBytes': 1024 * 1024 * 10,  # 10MB
                'backupCount': 30,
                'formatter': 'json',
                'filters': ['request_id']
            },
            'error_file': {
                'level': 'ERROR',
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': str(logs_dir / 'errors.log'),
                'maxBytes': 1024 * 1024 * 10,  # 10MB
                'backupCount': 10,
                'formatter': 'json',
                'filters': ['request_id']
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
            'django.request': {
                'handlers': ['console', 'file', 'error_file'],
                'level': 'WARNING',
                'propagate': False,
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
                'level': 'DEBUG' if not is_production else 'INFO',
                'propagate': False,
            },
            'payments.transactions': {
                'handlers': ['payment_file'],
                'level': 'INFO',
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
            'accounts': {
                'handlers': ['console', 'security_file'],
                'level': 'INFO',
                'propagate': False,
            },
            'notifications': {
                'handlers': ['console', 'file'],
                'level': 'INFO',
                'propagate': False,
            },
        },
        'root': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
        },
    }
    
    # Add production-specific handlers
    if is_production:
        base_config['handlers']['mail_admins'] = {
            'level': 'ERROR',
            'filters': ['require_debug_false'],
            'class': 'django.utils.log.AdminEmailHandler',
        }
    
    return base_config

def configure_logging():
    """Configure logging based on current environment"""
    is_production = getattr(settings, 'IS_PRODUCTION', False)
    config = get_logging_config(is_production)
    logging.config.dictConfig(config)

class PaymentLogger:
    """Specialized logger for payment operations"""
    
    def __init__(self):
        self.logger = logging.getLogger('payments')
    
    def log_payment_initiated(self, payment_id: str, amount: float, currency: str, 
                              method: str, user_id: str):
        self.logger.info(
            "Payment initiated",
            extra={
                'event': 'payment_initiated',
                'payment_id': payment_id,
                'amount': amount,
                'currency': currency,
                'payment_method': method,
                'user_id': user_id,
            }
        )
    
    def log_payment_completed(self, payment_id: str, transaction_id: str, 
                               provider: str, amount: float):
        self.logger.info(
            "Payment completed",
            extra={
                'event': 'payment_completed',
                'payment_id': payment_id,
                'transaction_id': transaction_id,
                'provider': provider,
                'amount': amount,
            }
        )
    
    def log_payment_failed(self, payment_id: str, error: str, provider: str):
        self.logger.error(
            "Payment failed",
            extra={
                'event': 'payment_failed',
                'payment_id': payment_id,
                'error': error,
                'provider': provider,
            }
        )
    
    def log_refund(self, payment_id: str, refund_id: str, amount: float, reason: str):
        self.logger.info(
            "Refund processed",
            extra={
                'event': 'refund_processed',
                'payment_id': payment_id,
                'refund_id': refund_id,
                'amount': amount,
                'reason': reason,
            }
        )

class SecurityLogger:
    """Specialized logger for security events"""
    
    def __init__(self):
        self.logger = logging.getLogger('django.security')
    
    def log_login_attempt(self, email: str, success: bool, ip_address: str, 
                          user_agent: str = None):
        level = logging.INFO if success else logging.WARNING
        self.logger.log(
            level,
            f"Login {'successful' if success else 'failed'}",
            extra={
                'event': 'login_attempt',
                'email': email,
                'success': success,
                'ip_address': ip_address,
                'user_agent': user_agent,
            }
        )
    
    def log_suspicious_activity(self, user_id: str, activity_type: str, 
                                 details: dict, ip_address: str):
        self.logger.warning(
            f"Suspicious activity detected: {activity_type}",
            extra={
                'event': 'suspicious_activity',
                'user_id': user_id,
                'activity_type': activity_type,
                'details': details,
                'ip_address': ip_address,
            }
        )
    
    def log_rate_limit_exceeded(self, identifier: str, endpoint: str, 
                                 ip_address: str):
        self.logger.warning(
            "Rate limit exceeded",
            extra={
                'event': 'rate_limit_exceeded',
                'identifier': identifier,
                'endpoint': endpoint,
                'ip_address': ip_address,
            }
        )

# Global logger instances
payment_logger = PaymentLogger()
security_logger = SecurityLogger()
