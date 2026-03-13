"""
Security Middleware for SikaRemit
Implements security checks and headers for all requests
"""

import logging
from django.conf import settings
from django.http import JsonResponse
from django.utils import timezone

from core.security import (
    get_client_ip,
    get_device_fingerprint,
    add_security_headers,
    RateLimiter,
    DeviceTracker,
    SuspiciousActivityDetector,
    AuditLogger
)

logger = logging.getLogger(__name__)


class IPTrackingMiddleware:
    """Track IP addresses for security monitoring"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Get client IP
        client_ip = get_client_ip(request)
        request.client_ip = client_ip
        
        # Track IP for authenticated users
        if hasattr(request, 'user') and request.user.is_authenticated:
            self._track_ip_change(request.user, client_ip)
        
        response = self.get_response(request)
        return response
    
    def _track_ip_change(self, user, current_ip):
        """Track IP changes for user"""
        from django.core.cache import cache
        
        key = f"last_ip:{user.id}"
        last_ip = cache.get(key)
        
        if last_ip and last_ip != current_ip:
            SuspiciousActivityDetector.record_ip_change(user.id, last_ip, current_ip)
        
        cache.set(key, current_ip, 86400)  # 24 hours


class DeviceTrackingMiddleware:
    """Track devices for security monitoring"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Generate device fingerprint
        device_fingerprint = get_device_fingerprint(request)
        request.device_fingerprint = device_fingerprint
        
        # Track device for authenticated users
        if hasattr(request, 'user') and request.user.is_authenticated:
            if DeviceTracker.is_new_device(request.user.id, device_fingerprint):
                logger.info(f"New device detected for user {request.user.id}")
                DeviceTracker.add_device(request.user.id, device_fingerprint)
                
                # Could trigger 2FA or notification here
        
        response = self.get_response(request)
        return response


class APIRateLimitMiddleware:
    """Rate limiting for API endpoints"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.exempt_paths = [
            '/health/',
            '/api/v1/health/',
            '/admin/',
            '/static/',
            '/media/',
        ]
    
    def __call__(self, request):
        # Skip rate limiting for exempt paths
        if any(request.path.startswith(path) for path in self.exempt_paths):
            return self.get_response(request)
        
        # Skip in development mode
        if not getattr(settings, 'IS_PRODUCTION', False):
            return self.get_response(request)
        
        # Get identifier
        if hasattr(request, 'user') and request.user.is_authenticated:
            identifier = f"user:{request.user.id}"
        else:
            identifier = f"ip:{get_client_ip(request)}"
        
        # Check rate limit
        if RateLimiter.is_rate_limited(identifier, 'api_general'):
            logger.warning(f"API rate limit exceeded: {identifier}")
            return JsonResponse(
                {'error': 'Too many requests. Please try again later.'},
                status=429
            )
        
        RateLimiter.increment_rate_limit(identifier, 'api_general')
        
        response = self.get_response(request)
        
        # Add rate limit headers
        remaining = RateLimiter.get_remaining_attempts(identifier, 'api_general')
        response['X-RateLimit-Remaining'] = str(remaining)
        response['X-RateLimit-Limit'] = '100'
        
        return response


class AuditLoggingMiddleware:
    """Log all API requests for audit purposes"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.sensitive_paths = [
            '/api/v1/auth/',
            '/api/v1/payments/',
            '/api/v1/remittance/',
            '/api/v1/users/',
        ]
    
    def __call__(self, request):
        # Record request start time
        request.start_time = timezone.now()
        
        response = self.get_response(request)
        
        # Log sensitive API calls
        if any(request.path.startswith(path) for path in self.sensitive_paths):
            self._log_request(request, response)
        
        return response
    
    def _log_request(self, request, response):
        """Log API request details"""
        duration = (timezone.now() - request.start_time).total_seconds()
        
        user_id = request.user.id if hasattr(request, 'user') and request.user.is_authenticated else None
        
        log_data = {
            'method': request.method,
            'path': request.path,
            'status': response.status_code,
            'duration': f"{duration:.3f}s",
            'user_id': user_id,
            'ip': getattr(request, 'client_ip', get_client_ip(request)),
        }
        
        if response.status_code >= 400:
            logger.warning(f"API Request: {log_data}")
        else:
            logger.info(f"API Request: {log_data}")


class SQLInjectionProtectionMiddleware:
    """Basic SQL injection protection"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.suspicious_patterns = [
            "' OR '",
            "'; DROP",
            "'; DELETE",
            "'; UPDATE",
            "'; INSERT",
            "UNION SELECT",
            "/**/",
            "xp_cmdshell",
            "EXEC(",
        ]
    
    def __call__(self, request):
        # Check query parameters
        query_string = request.META.get('QUERY_STRING', '')
        
        for pattern in self.suspicious_patterns:
            if pattern.lower() in query_string.lower():
                logger.warning(f"Potential SQL injection attempt: {get_client_ip(request)}")
                return JsonResponse(
                    {'error': 'Invalid request'},
                    status=400
                )
        
        return self.get_response(request)


class XSSProtectionMiddleware:
    """Basic XSS protection"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.suspicious_patterns = [
            '<script',
            'javascript:',
            'onerror=',
            'onload=',
            'onclick=',
            'onmouseover=',
        ]
    
    def __call__(self, request):
        # Check POST data for XSS patterns
        if request.method == 'POST':
            body = request.body.decode('utf-8', errors='ignore').lower()
            
            for pattern in self.suspicious_patterns:
                if pattern.lower() in body:
                    logger.warning(f"Potential XSS attempt: {get_client_ip(request)}")
                    return JsonResponse(
                        {'error': 'Invalid request content'},
                        status=400
                    )
        
        return self.get_response(request)
