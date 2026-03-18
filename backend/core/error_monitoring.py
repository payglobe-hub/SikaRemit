"""
Enhanced error monitoring and tracking for SikaRemit
Integrates with Sentry and provides custom error handling
"""
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from django.conf import settings
import logging
import traceback
from typing import Optional, Dict, Any
from functools import wraps

logger = logging.getLogger(__name__)

def initialize_sentry():
    """
    Initialize Sentry error monitoring
    """
    # Disabled for deployment stability
    logger.warning("Sentry error monitoring is disabled for deployment stability.")
    return

def filter_sensitive_data(event, hint):
    """
    Filter sensitive data before sending to Sentry
    
    Args:
        event: Sentry event dict
        hint: Additional context
        
    Returns:
        Modified event or None to drop event
    """
    # Remove sensitive headers
    if 'request' in event and 'headers' in event['request']:
        sensitive_headers = ['Authorization', 'Cookie', 'X-API-Key']
        for header in sensitive_headers:
            if header in event['request']['headers']:
                event['request']['headers'][header] = '[Filtered]'
    
    # Remove sensitive POST data
    if 'request' in event and 'data' in event['request']:
        sensitive_fields = ['password', 'token', 'secret', 'api_key', 'credit_card']
        for field in sensitive_fields:
            if field in event['request']['data']:
                event['request']['data'][field] = '[Filtered]'
    
    return event

class ErrorTracker:
    """
    Custom error tracking with context
    """
    
    @staticmethod
    def capture_exception(
        exception: Exception,
        context: Optional[Dict[str, Any]] = None,
        level: str = 'error',
        user: Optional[Any] = None
    ):
        """
        Capture exception with additional context
        
        Args:
            exception: Exception to capture
            context: Additional context dict
            level: Error level (error, warning, info)
            user: User object
        """
        # Set user context
        if user:
            sentry_sdk.set_user({
                'id': getattr(user, 'id', None),
                'email': getattr(user, 'email', None),
                'username': getattr(user, 'username', None),
            })
        
        # Set additional context
        if context:
            sentry_sdk.set_context('custom', context)
        
        # Capture exception
        sentry_sdk.capture_exception(exception, level=level)
        
        # Log locally as well
        logger.error(
            f"Exception captured: {str(exception)}",
            exc_info=True,
            extra={'context': context}
        )
    
    @staticmethod
    def capture_message(
        message: str,
        level: str = 'info',
        context: Optional[Dict[str, Any]] = None
    ):
        """
        Capture a message (non-exception event)
        
        Args:
            message: Message to capture
            level: Message level
            context: Additional context
        """
        if context:
            sentry_sdk.set_context('custom', context)
        
        sentry_sdk.capture_message(message, level=level)
    
    @staticmethod
    def add_breadcrumb(
        message: str,
        category: str = 'custom',
        level: str = 'info',
        data: Optional[Dict[str, Any]] = None
    ):
        """
        Add breadcrumb for debugging context
        
        Args:
            message: Breadcrumb message
            category: Category (e.g., 'payment', 'auth')
            level: Level (debug, info, warning, error)
            data: Additional data
        """
        sentry_sdk.add_breadcrumb(
            message=message,
            category=category,
            level=level,
            data=data or {}
        )

class PaymentErrorTracker:
    """
    Specialized error tracking for payment operations
    """
    
    @staticmethod
    def track_payment_failure(
        payment_id: str,
        error: Exception,
        payment_method: str,
        amount: float,
        currency: str,
        user_id: Optional[str] = None
    ):
        """
        Track payment failure with detailed context
        """
        context = {
            'payment_id': payment_id,
            'payment_method': payment_method,
            'amount': amount,
            'currency': currency,
            'error_type': type(error).__name__,
        }
        
        # Add tags for filtering
        sentry_sdk.set_tag('payment_method', payment_method)
        sentry_sdk.set_tag('currency', currency)
        sentry_sdk.set_tag('error_category', 'payment_failure')
        
        ErrorTracker.capture_exception(
            exception=error,
            context=context,
            level='error'
        )
    
    @staticmethod
    def track_refund_failure(
        payment_id: str,
        refund_amount: float,
        error: Exception
    ):
        """
        Track refund failure
        """
        context = {
            'payment_id': payment_id,
            'refund_amount': refund_amount,
            'error_type': type(error).__name__,
        }
        
        sentry_sdk.set_tag('error_category', 'refund_failure')
        
        ErrorTracker.capture_exception(
            exception=error,
            context=context,
            level='error'
        )

class APIErrorTracker:
    """
    Track API-specific errors
    """
    
    @staticmethod
    def track_api_error(
        endpoint: str,
        method: str,
        status_code: int,
        error: Exception,
        request_data: Optional[Dict] = None
    ):
        """
        Track API endpoint errors
        """
        context = {
            'endpoint': endpoint,
            'method': method,
            'status_code': status_code,
            'error_type': type(error).__name__,
        }
        
        if request_data:
            # Filter sensitive data
            safe_data = {k: v for k, v in request_data.items() 
                        if k not in ['password', 'token', 'api_key']}
            context['request_data'] = safe_data
        
        sentry_sdk.set_tag('endpoint', endpoint)
        sentry_sdk.set_tag('http_method', method)
        sentry_sdk.set_tag('status_code', status_code)
        
        ErrorTracker.capture_exception(
            exception=error,
            context=context,
            level='error'
        )

# Decorator for automatic error tracking
def track_errors(category: str = 'general'):
    """
    Decorator to automatically track errors in functions
    
    Usage:
        @track_errors(category='payment')
        def process_payment(amount):
            # Function code
            pass
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                # Add breadcrumb
                ErrorTracker.add_breadcrumb(
                    message=f"Executing {func.__name__}",
                    category=category,
                    level='info'
                )
                
                return func(*args, **kwargs)
                
            except Exception as e:
                # Capture exception with context
                context = {
                    'function': func.__name__,
                    'category': category,
                    'args_count': len(args),
                    'kwargs_keys': list(kwargs.keys())
                }
                
                ErrorTracker.capture_exception(
                    exception=e,
                    context=context,
                    level='error'
                )
                
                # Re-raise exception
                raise
        
        return wrapper
    return decorator

# Performance monitoring
class PerformanceMonitor:
    """
    Monitor performance of critical operations
    """
    
    @staticmethod
    def start_transaction(name: str, op: str = 'function'):
        """
        Start a performance transaction
        
        Args:
            name: Transaction name
            op: Operation type (function, http.request, db.query, etc.)
            
        Returns:
            Transaction object
        """
        return sentry_sdk.start_transaction(name=name, op=op)
    
    @staticmethod
    def track_slow_query(query: str, duration: float, threshold: float = 1.0):
        """
        Track slow database queries
        
        Args:
            query: SQL query
            duration: Query duration in seconds
            threshold: Threshold for slow query (default 1 second)
        """
        if duration > threshold:
            ErrorTracker.capture_message(
                message=f"Slow query detected: {duration:.2f}s",
                level='warning',
                context={
                    'query': query[:200],  # Truncate long queries
                    'duration': duration,
                    'threshold': threshold
                }
            )
            
            sentry_sdk.set_tag('performance_issue', 'slow_query')

# Middleware for automatic error tracking
class ErrorTrackingMiddleware:
    """
    Middleware to automatically track errors in requests
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Add request breadcrumb
        ErrorTracker.add_breadcrumb(
            message=f"{request.method} {request.path}",
            category='request',
            level='info',
            data={
                'method': request.method,
                'path': request.path,
                'user': str(request.user) if hasattr(request, 'user') else 'anonymous'
            }
        )
        
        # Set user context
        if hasattr(request, 'user') and request.user.is_authenticated:
            sentry_sdk.set_user({
                'id': request.user.id,
                'email': request.user.email,
                'username': request.user.username,
            })
        
        response = self.get_response(request)
        
        return response
    
    def process_exception(self, request, exception):
        """
        Process exceptions that occur during request handling
        """
        APIErrorTracker.track_api_error(
            endpoint=request.path,
            method=request.method,
            status_code=500,
            error=exception,
            request_data=request.POST.dict() if hasattr(request.POST, 'dict') else None
        )
        
        return None  # Let Django handle the exception

# Health check for monitoring
class HealthCheckMonitor:
    """
    Monitor system health and report issues
    """
    
    @staticmethod
    def check_database():
        """Check database connectivity"""
        try:
            from django.db import connection
            connection.ensure_connection()
            return True, "Database OK"
        except Exception as e:
            ErrorTracker.capture_exception(e, context={'check': 'database'})
            return False, str(e)
    
    @staticmethod
    def check_redis():
        """Check Redis connectivity"""
        try:
            from django.core.cache import cache
            cache.set('health_check', 'ok', 10)
            result = cache.get('health_check')
            return result == 'ok', "Redis OK" if result == 'ok' else "Redis check failed"
        except Exception as e:
            ErrorTracker.capture_exception(e, context={'check': 'redis'})
            return False, str(e)
    
    @staticmethod
    def check_celery():
        """Check Celery worker status"""
        try:
            from celery import current_app
            stats = current_app.control.inspect().stats()
            return bool(stats), "Celery OK" if stats else "No Celery workers"
        except Exception as e:
            ErrorTracker.capture_exception(e, context={'check': 'celery'})
            return False, str(e)
