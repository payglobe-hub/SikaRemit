import time
import json
from django.utils.deprecation import MiddlewareMixin
import logging
import uuid
import traceback
from django.core.cache import cache
from django.conf import settings
from core.api_utils import api_error

logger = logging.getLogger(__name__)

class RequestLoggingMiddleware(MiddlewareMixin):
    def process_request(self, request):
        request.start_time = time.time()
        request.request_id = str(uuid.uuid4())
        
        # Skip logging for health checks
        if request.path == '/health/':
            return
            
        log_data = {
            'request_id': request.request_id,
            'method': request.method,
            'path': request.path,
            'ip': request.META.get('REMOTE_ADDR'),
            'user_agent': request.META.get('HTTP_USER_AGENT'),
        }
        
        if hasattr(request, 'user') and request.user.is_authenticated:
            log_data['user'] = request.user.email
            
        logger.info(json.dumps({
            'type': 'request_started',
            **log_data
        }))

    def process_response(self, request, response):
        # Skip logging for health checks
        if request.path == '/health/':
            return response
            
        duration = (time.time() - request.start_time) * 1000
        
        log_data = {
            'request_id': getattr(request, 'request_id', None),
            'method': request.method,
            'path': request.path,
            'status_code': response.status_code,
            'duration_ms': round(duration, 2),
        }
        
        if hasattr(request, 'user') and request.user.is_authenticated:
            log_data['user'] = request.user.email
            
        logger.info(json.dumps({
            'type': 'request_completed',
            **log_data
        }))
        
        return response

    def process_exception(self, request, exception):
        logger.error(json.dumps({
            'type': 'request_exception',
            'request_id': getattr(request, 'request_id', None),
            'method': request.method,
            'path': request.path,
            'exception': str(exception),
            'traceback': traceback.format_exc()
        }))

class RateLimitMiddleware(MiddlewareMixin):
    def process_request(self, request):
        if not settings.DEBUG and request.path.startswith('/api/'):
            ip = request.META.get('REMOTE_ADDR')
            key = f'ratelimit:{ip}'
            
            # Get current request count
            request_count = cache.get(key, 0)
            
            # Check if limit exceeded
            if request_count >= settings.RATE_LIMIT:
                logger.warning(f'Rate limit exceeded for IP {ip}')
                return api_error(
                    'Too many requests', 
                    status_code=429,
                    request=request
                )
            
            # Increment count
            cache.set(key, request_count + 1, timeout=60)

from accounts.models import AdminActivity
import json
import logging

logger = logging.getLogger(__name__)

class AdminActivityMiddleware(MiddlewareMixin):
    ADMIN_PATHS = [
        '/admin/',
        '/api/admin/',
        '/api/users/',
        '/api/merchants/'
    ]
    
    def process_view(self, request, view_func, view_args, view_kwargs):
        if not any(request.path.startswith(path) for path in self.ADMIN_PATHS):
            return
            
        if not request.user.is_authenticated or not request.user.is_staff:
            return
            
        # Skip logging for GET requests (except sensitive endpoints)
        if request.method == 'GET' and not any(
            request.path.startswith(p) for p in ['/api/users/', '/api/merchants/']
        ):
            return
            
        request._admin_action = {
            'path': request.path,
            'method': request.method,
            'data': request.POST.dict() if request.method == 'POST' else {},
            'user': request.user
        }
    
    def process_response(self, request, response):
        if not hasattr(request, '_admin_action'):
            return response
            
        try:
            action_type = self._determine_action_type(request)
            object_type = self._determine_object_type(request)
            
            AdminActivity.objects.create(
                admin=request.user,
                action_type=action_type,
                details={
                    'path': request.path,
                    'method': request.method,
                    'status_code': response.status_code
                },
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT')
            )
        except Exception as e:
            logger.error(f'Failed to log admin activity: {e}')
            
        return response
    
    def _determine_action_type(self, request):
        if request.method == 'POST':
            if 'add' in request.path:
                return 'USER_MOD'  # Assuming user creation
            return 'USER_MOD'  # General modification
        elif request.method == 'DELETE':
            return 'USER_MOD'  # Deletion as modification
        return 'USER_MOD'  # Default to modification
    
    def _determine_object_type(self, request):
        path_parts = [p for p in request.path.split('/') if p]
        if len(path_parts) > 2:
            return path_parts[2].title()
        return 'Unknown'

import time
import uuid
import json
from django.utils.deprecation import MiddlewareMixin
import logging

logger = logging.getLogger(__name__)

class RequestIDMiddleware(MiddlewareMixin):
    def process_request(self, request):
        request.request_id = str(uuid.uuid4())
        request.start_time = time.time()
        
        # Skip logging for health checks
        if request.path == '/health/':
            return
            
        log_data = {
            'request_id': request.request_id,
            'method': request.method,
            'path': request.path,
            'ip': request.META.get('REMOTE_ADDR'),
            'user_agent': request.META.get('HTTP_USER_AGENT'),
        }
        
        if request.user.is_authenticated:
            log_data['user'] = request.user.email
            
        logger.info(json.dumps({
            'type': 'request_started',
            **log_data
        }))

    def process_response(self, request, response):
        # Skip logging for health checks
        if request.path == '/health/':
            return response
            
        duration = (time.time() - request.start_time) * 1000
        
        log_data = {
            'request_id': getattr(request, 'request_id', None),
            'method': request.method,
            'path': request.path,
            'status_code': response.status_code,
            'duration_ms': round(duration, 2),
        }
        
        if hasattr(request, 'user') and request.user.is_authenticated:
            log_data['user'] = request.user.email
            
        logger.info(json.dumps({
            'type': 'request_completed',
            **log_data
        }))
        
        # Add request ID to response headers
        if hasattr(request, 'request_id'):
            response['X-Request-ID'] = request.request_id
            
        return response

from functools import wraps
from django.utils.decorators import method_decorator
import time
import logging

logger = logging.getLogger(__name__)

def api_performance_monitor(view_func=None, threshold_ms=1000):
    """
    Decorator to monitor API endpoint performance
    Logs slow requests and adds performance headers
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()

            # Get request object (different for function vs method views)
            request = args[0] if hasattr(args[0], 'method') else args[1]

            try:
                result = func(*args, **kwargs)

                # Calculate duration
                duration_ms = (time.time() - start_time) * 1000

                # Log slow requests
                if duration_ms > threshold_ms:
                    user_info = getattr(request.user, 'email', 'anonymous') if request.user.is_authenticated else 'anonymous'
                    logger.warning(
                        f"SLOW_API_REQUEST: {request.method} {request.path} "
                        f"duration={duration_ms:.2f}ms user={user_info}"
                    )

                # Add performance header to response
                if hasattr(result, 'data'):  # DRF Response
                    result['X-API-Response-Time'] = f"{duration_ms:.2f}ms"
                elif hasattr(result, '__setitem__'):  # Django HttpResponse
                    result['X-API-Response-Time'] = f"{duration_ms:.2f}ms"

                return result

            except Exception as e:
                duration_ms = (time.time() - start_time) * 1000
                logger.error(
                    f"API_EXCEPTION: {request.method} {request.path} "
                    f"duration={duration_ms:.2f}ms exception={type(e).__name__}"
                )
                raise

        return wrapper

    if view_func:
        return decorator(view_func)
    return decorator

# Method decorator version for class-based views
api_performance_monitor_method = method_decorator(api_performance_monitor)

class DisableCSRF:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith('/api/'):
            setattr(request, '_dont_enforce_csrf_checks', True)
        return self.get_response(request)
