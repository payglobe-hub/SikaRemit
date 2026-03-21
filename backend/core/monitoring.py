# SikaRemit Backend Monitoring Configuration
# Sentry, logging, and performance monitoring setup

import os
import logging
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.logging import LoggingIntegration

# Sentry Configuration
def init_sentry():
    """Initialize Sentry error tracking and performance monitoring"""
    sentry_dsn = os.getenv('SENTRY_DSN')
    if not sentry_dsn:
        logging.warning("SENTRY_DSN not configured - Sentry monitoring disabled")
        return

    sentry_sdk.init(
        dsn=sentry_dsn,
        environment=os.getenv('ENVIRONMENT', 'production'),
        release=os.getenv('RELEASE_VERSION', '1.0.0'),

        # Performance monitoring
        traces_sample_rate=float(os.getenv('SENTRY_TRACES_SAMPLE_RATE', '1.0')),
        profiles_sample_rate=float(os.getenv('SENTRY_PROFILES_SAMPLE_RATE', '1.0')),

        # Integrations
        integrations=[
            DjangoIntegration(
                transaction_style='url',
                middleware_spans=True,
                signals_spans=True,
                cache_spans=True,
            ),
            RedisIntegration(),
            CeleryIntegration(),
            LoggingIntegration(
                level=logging.INFO,
                event_level=logging.ERROR,
            ),
        ],

        # Sampling rates
        traces_sampler=lambda ctx: 1.0 if ctx.get('request') else 0.1,

        # Send PII data (be careful with this in production)
        send_default_pii=bool(os.getenv('SENTRY_SEND_PII', 'false').lower() == 'true'),

        # Error filtering
        before_send=before_send_filter,

        # Performance issue detection
        enable_tracing=True,
        enable_db_query_source=True,
    )

def before_send_filter(event, hint):
    """Filter out unwanted events before sending to Sentry"""
    # Don't send events from test environment
    if os.getenv('ENVIRONMENT') == 'test':
        return None

    # Filter out common non-errors
    exception = hint.get('exc_info')
    if exception:
        error_type = exception[0].__name__ if exception[0] else None
        if error_type in ['KeyboardInterrupt', 'SystemExit']:
            return None

    # Filter out specific error messages
    message = event.get('message', '').lower()
    if any(ignore in message for ignore in [
        'connection reset by peer',
        'broken pipe',
        'client disconnected',
    ]):
        return None

    return event

# Custom logging configuration
def setup_logging():
    """Configure structured logging for production"""
    import json
    from pythonjsonlogger import jsonlogger

    class CustomJsonFormatter(jsonlogger.JsonFormatter):
        def add_fields(self, log_record, record, message_dict):
            super().add_fields(log_record, record, message_dict)
            log_record['timestamp'] = record.created
            log_record['level'] = record.levelname
            log_record['logger'] = record.name
            log_record['environment'] = os.getenv('ENVIRONMENT', 'development')

            # Add request context if available
            from django.utils.deprecation import MiddlewareMixin
            if hasattr(record, 'request'):
                request = record.request
                log_record['request_id'] = getattr(request, 'request_id', None)
                log_record['user_id'] = getattr(request.user, 'id', None) if request.user.is_authenticated else None
                log_record['method'] = request.method
                log_record['path'] = request.path
                log_record['ip'] = request.META.get('REMOTE_ADDR')

    # Logging configuration
    LOGGING = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'json': {
                '()': CustomJsonFormatter,
                'format': '%(timestamp)s %(level)s %(name)s %(message)s',
            },
            'simple': {
                'format': '{levelname} {asctime} {name} {message}',
                'style': '{',
            },
        },
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'formatter': 'json' if os.getenv('ENVIRONMENT') == 'production' else 'simple',
            },
            'file': {
                'class': 'logging.FileHandler',
                'filename': os.getenv('LOG_FILE', '/var/log/SikaRemit/app.log'),
                'formatter': 'json',
            },
        },
        'root': {
            'handlers': ['console', 'file'] if os.getenv('ENVIRONMENT') == 'production' else ['console'],
            'level': os.getenv('LOG_LEVEL', 'INFO'),
        },
        'loggers': {
            'django': {
                'handlers': ['console', 'file'] if os.getenv('ENVIRONMENT') == 'production' else ['console'],
                'level': os.getenv('DJANGO_LOG_LEVEL', 'INFO'),
                'propagate': False,
            },
            'SikaRemit': {
                'handlers': ['console', 'file'] if os.getenv('ENVIRONMENT') == 'production' else ['console'],
                'level': os.getenv('LOG_LEVEL', 'INFO'),
                'propagate': False,
            },
        },
    }

    # Apply logging configuration
    logging.config.dictConfig(LOGGING)

# Performance monitoring utilities
class PerformanceMonitor:
    """Context manager for monitoring code performance"""

    def __init__(self, name, threshold_ms=1000):
        self.name = name
        self.threshold_ms = threshold_ms
        self.start_time = None

    def __enter__(self):
        self.start_time = time.time()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        duration_ms = (time.time() - self.start_time) * 1000

        # Log slow operations
        if duration_ms > self.threshold_ms:
            logging.warning(f"Slow operation: {self.name} took {duration_ms:.2f}ms")

            # Send to Sentry if very slow
            if duration_ms > 5000:  # 5 seconds
                sentry_sdk.capture_message(
                    f"Slow operation: {self.name}",
                    level="warning",
                    tags={"type": "performance"},
                    extra={
                        "operation": self.name,
                        "duration_ms": duration_ms,
                    }
                )

# Database query monitoring
def log_slow_queries(threshold_ms=1000):
    """Log slow database queries"""
    from django.db import connection
    from django.conf import settings

    if not settings.DEBUG and hasattr(connection, 'queries'):
        for query in connection.queries:
            duration = float(query.get('time', 0)) * 1000
            if duration > threshold_ms:
                logging.warning(f"Slow query ({duration:.2f}ms): {query.get('sql', '')}")

# Business metrics tracking
class BusinessMetrics:
    """Track business-specific metrics"""

    @staticmethod
    def record_payment(payment):
        """Record payment metrics"""
        sentry_sdk.set_tag('payment_status', payment.status)
        sentry_sdk.set_tag('payment_method', payment.method)

        # Add to metrics (if using Prometheus/DataDog)
        # PAYMENT_TOTAL.labels(status=payment.status, method=payment.method).inc()
        # PAYMENT_AMOUNT.labels(currency=payment.currency).inc(payment.amount)

    @staticmethod
    def record_user_action(user, action, metadata=None):
        """Record user action metrics"""
        sentry_sdk.set_user({
            'id': user.id,
            'email': user.email,
            'username': user.username,
        })
        sentry_sdk.set_tag('user_action', action)

        if metadata:
            for key, value in metadata.items():
                sentry_sdk.set_tag(f'user_{key}', value)

    @staticmethod
    def record_error(error_type, error_message, context=None):
        """Record application errors"""
        sentry_sdk.capture_message(
            error_message,
            level="error",
            tags={"error_type": error_type},
            extra=context or {}
        )

# Initialize monitoring when module is imported
init_sentry()
setup_logging()
