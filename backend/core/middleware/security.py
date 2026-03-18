"""
Security Headers Middleware for Django
=====================================

This middleware provides comprehensive security headers for the SikaRemit Django application,
implementing OWASP security best practices and protecting against common web vulnerabilities.
"""

import os
import logging
from typing import Callable
from django.http import HttpResponse
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings

logger = logging.getLogger(__name__)

class SecurityHeadersMiddleware(MiddlewareMixin):
    """
    Django middleware that adds comprehensive security headers to all responses.

    This middleware implements OWASP security headers to protect against:
    - Cross-Site Scripting (XSS)
    - Clickjacking
    - Content Sniffing
    - Man-in-the-Middle attacks
    - Cross-Site Request Forgery (CSRF)
    """

    def __init__(self, get_response: Callable) -> None:
        self.get_response = get_response

        # Configure CSP based on environment
        self.csp_directives = self._get_csp_directives()

    def _get_csp_directives(self) -> str:
        """Generate Content Security Policy directives"""
        if settings.DEBUG:
            # More permissive CSP for development
            return (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' "
                "https://cdn.jsdelivr.net https://unpkg.com http://localhost:* https://localhost:*; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data: https: blob:; "
                "connect-src 'self' https://api.stripe.com https://api.gcb.com.gh "
                "ws://localhost:* wss://localhost:* http://localhost:* https://localhost:*; "
                "frame-src 'self' https://js.stripe.com https://hooks.stripe.com; "
                "object-src 'none'; "
                "base-uri 'self'; "
                "form-action 'self' https://js.stripe.com;"
            )
        else:
            # Strict CSP for production
            return (
                "default-src 'self'; "
                "script-src 'self' https://cdn.jsdelivr.net https://unpkg.com; "
                "style-src 'self' https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data: https:; "
                "connect-src 'self' https://api.stripe.com https://api.gcb.com.gh; "
                "frame-src 'self' https://js.stripe.com https://hooks.stripe.com; "
                "object-src 'none'; "
                "base-uri 'self'; "
                "form-action 'self' https://js.stripe.com; "
                "upgrade-insecure-requests;"
            )

    def __call__(self, request) -> HttpResponse:
        """Process the request and add security headers to response"""
        response = self.get_response(request)

        # Content Security Policy
        response['Content-Security-Policy'] = self.csp_directives

        # Prevent clickjacking
        response['X-Frame-Options'] = 'DENY'

        # Prevent MIME type sniffing
        response['X-Content-Type-Options'] = 'nosniff'

        # Enable XSS filtering
        response['X-XSS-Protection'] = '1; mode=block'

        # HTTP Strict Transport Security (HSTS)
        if not settings.DEBUG:
            response['Strict-Transport-Security'] = 'max-age=31536000; includeSubdomains; preload'

        # Referrer Policy
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'

        # Permissions Policy (formerly Feature Policy)
        response['Permissions-Policy'] = (
            'geolocation=(), '
            'microphone=(), '
            'camera=(), '
            'magnetometer=(), '
            'gyroscope=(), '
            'speaker=(), '
            'fullscreen=(self), '
            'payment=(self)'
        )

        # Cross-Origin policies
        response['Cross-Origin-Embedder-Policy'] = 'require-corp'
        response['Cross-Origin-Opener-Policy'] = 'same-origin'
        response['Cross-Origin-Resource-Policy'] = 'same-origin'

        # Remove server information disclosure
        if 'Server' in response:
            del response['Server']
        if 'X-Powered-By' in response:
            del response['X-Powered-By']

        # Add security-related headers for APIs
        if request.path.startswith('/api/'):
            response['X-API-Version'] = getattr(settings, 'API_VERSION', 'v1')

        return response

class RateLimitMiddleware(MiddlewareMixin):
    """
    Rate limiting middleware to prevent abuse and DoS attacks.
    Uses Django cache (Redis in production) for distributed rate limiting.
    """

    RATE_LIMITS = {
        'auth': {'requests': 5, 'window': 300},
        'payment': {'requests': 10, 'window': 600},
        'api': {'requests': 1000, 'window': 3600},
    }

    def __init__(self, get_response: Callable) -> None:
        self.get_response = get_response

    def _get_client_ip(self, request) -> str:
        xff = request.META.get('HTTP_X_FORWARDED_FOR')
        return xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR', '0.0.0.0')

    def _get_bucket(self, path: str) -> str:
        if '/auth/' in path or '/login/' in path or '/register/' in path:
            return 'auth'
        if '/payment' in path:
            return 'payment'
        return 'api'

    def __call__(self, request) -> HttpResponse:
        from django.core.cache import cache
        import time

        ip = self._get_client_ip(request)
        bucket = self._get_bucket(request.path)
        limit_cfg = self.RATE_LIMITS[bucket]
        limit = limit_cfg['requests']
        window = limit_cfg['window']

        cache_key = f"rl:{bucket}:{ip}"
        current = cache.get(cache_key)

        if current is None:
            cache.set(cache_key, 1, window)
            current = 1
        else:
            current = cache.incr(cache_key)

        remaining = max(0, limit - current)

        if current > limit:
            logger.warning(f"Rate limit exceeded for {ip} on {bucket} bucket")
            response = HttpResponse(
                '{"error": "Too many requests. Please try again later."}',
                content_type='application/json',
                status=429
            )
            response['Retry-After'] = str(window)
        else:
            response = self.get_response(request)

        response['X-RateLimit-Limit'] = str(limit)
        response['X-RateLimit-Remaining'] = str(remaining)
        response['X-RateLimit-Reset'] = str(int(time.time()) + window)

        return response

class SecurityAuditMiddleware(MiddlewareMixin):
    """
    Security audit middleware for logging security-related events.

    This middleware logs suspicious activities and security events for
    compliance and monitoring purposes.
    """

    def __init__(self, get_response: Callable) -> None:
        self.get_response = get_response

    def __call__(self, request) -> HttpResponse:
        """Log security-relevant request information"""
        # Log potential security threats
        suspicious_patterns = [
            '../../../',  # Directory traversal
            '<script',    # XSS attempts
            'union select',  # SQL injection
            'eval(',      # Code injection
        ]

        request_data = str(request.GET) + str(request.POST) + str(request.META.get('HTTP_USER_AGENT', ''))

        for pattern in suspicious_patterns:
            if pattern.lower() in request_data.lower():
                logger.warning(f"Security threat detected in request to {request.path}: {pattern}")
                break

        response = self.get_response(request)

        # Log authentication failures
        if response.status_code == 401:
            logger.info(f"Authentication failure for {request.path} from {self._get_client_ip(request)}")

        # Log access to sensitive endpoints
        sensitive_endpoints = ['/admin/', '/api/admin/', '/api/payments/']
        if any(endpoint in request.path for endpoint in sensitive_endpoints):
            username = getattr(request.user, 'username', 'anonymous') if hasattr(request, 'user') else 'anonymous'
            logger.info(f"Access to sensitive endpoint {request.path} by user: {username}")

        return response

    def _get_client_ip(self, request) -> str:
        """Get the client's IP address from the request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip or 'unknown'

class SSLRedirectMiddleware(MiddlewareMixin):
    """
    Middleware to enforce HTTPS redirection in production.

    This middleware automatically redirects HTTP requests to HTTPS
    when running in production environment.
    """

    def __init__(self, get_response: Callable) -> None:
        self.get_response = get_response

    def __call__(self, request) -> HttpResponse:
        """Redirect HTTP to HTTPS if configured"""
        if not settings.DEBUG and not request.is_secure():
            # Check if this is a health check or similar non-redirected request
            health_check_paths = ['/health/', '/ping/', '/status/']
            if not any(request.path.startswith(path) for path in health_check_paths):
                secure_url = request.build_absolute_uri().replace('http://', 'https://')
                return HttpResponse(status=301, headers={'Location': secure_url})

        return self.get_response(request)
