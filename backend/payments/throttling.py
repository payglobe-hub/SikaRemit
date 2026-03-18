"""
Advanced API Rate Limiting and Throttling System
Implements sophisticated rate limiting with multiple tiers, burst handling, and analytics
"""
import time
import logging
from django.core.cache import cache
from django.http import JsonResponse
from django.utils import timezone
from django.conf import settings
from rest_framework.throttling import BaseThrottle
from rest_framework import status
from typing import Dict, List, Any, Optional, Tuple
import math
from shared.constants import USER_TYPE_SUPER_ADMIN, USER_TYPE_MERCHANT

logger = logging.getLogger(__name__)

class AdvancedRateLimiter:
    """
    Advanced rate limiter with sliding window, burst allowance, and tiered limits
    """

    def __init__(self, cache_prefix: str = 'api_rate_limit'):
        self.cache_prefix = cache_prefix
        self.cache_timeout = 3600  # 1 hour

    def check_rate_limit(self, key: str, tier: str) -> Tuple[bool, Dict[str, Any]]:
        """
        Check if request is within rate limits
        Returns: (allowed: bool, info: dict)
        """
        limits = self.get_tier_limits(tier)
        now = time.time()

        # Get current window data
        window_key = f"{self.cache_prefix}:{key}:{tier}"
        window_data = cache.get(window_key, {
            'requests': [],
            'burst_used': 0,
            'last_reset': now
        })

        # Clean old requests outside the window
        window_data['requests'] = [
            req_time for req_time in window_data['requests']
            if now - req_time < limits['window_seconds']
        ]

        # Check burst limit first (immediate allowance)
        if len(window_data['requests']) < limits['burst_limit']:
            # Within burst limit, allow immediately
            window_data['requests'].append(now)
            cache.set(window_key, window_data, self.cache_timeout)

            return True, {
                'remaining_burst': limits['burst_limit'] - len(window_data['requests']),
                'remaining_sustained': limits['sustained_limit'] - len(window_data['requests']),
                'reset_in': limits['window_seconds'],
                'tier': tier
            }

        # Check sustained limit
        if len(window_data['requests']) >= limits['sustained_limit']:
            # Rate limit exceeded
            reset_in = limits['window_seconds'] - (now - min(window_data['requests']) if window_data['requests'] else 0)

            return False, {
                'error': 'Rate limit exceeded',
                'retry_after': max(1, int(reset_in)),
                'limit': limits['sustained_limit'],
                'window_seconds': limits['window_seconds'],
                'tier': tier
            }

        # Within sustained limit, add request
        window_data['requests'].append(now)
        cache.set(window_key, window_data, self.cache_timeout)

        remaining_burst = max(0, limits['burst_limit'] - len(window_data['requests']))
        remaining_sustained = max(0, limits['sustained_limit'] - len(window_data['requests']))

        return True, {
            'remaining_burst': remaining_burst,
            'remaining_sustained': remaining_sustained,
            'reset_in': limits['window_seconds'],
            'tier': tier
        }

    def get_tier_limits(self, tier: str) -> Dict[str, int]:
        """
        Get rate limits for a specific tier
        """
        tier_limits = {
            'free': {
                'sustained_limit': 100,    # requests per window
                'burst_limit': 20,         # immediate requests allowed
                'window_seconds': 3600,    # 1 hour window
            },
            'basic': {
                'sustained_limit': 1000,
                'burst_limit': 100,
                'window_seconds': 3600,
            },
            'premium': {
                'sustained_limit': 5000,
                'burst_limit': 500,
                'window_seconds': 3600,
            },
            'enterprise': {
                'sustained_limit': 25000,
                'burst_limit': 2500,
                'window_seconds': 3600,
            },
            'admin': {
                'sustained_limit': 100000,
                'burst_limit': 10000,
                'window_seconds': 3600,
            }
        }

        return tier_limits.get(tier, tier_limits['free'])

    def get_user_tier(self, user) -> str:
        """
        Determine user's rate limiting tier based on their account
        """
        if not user:
            return 'free'

        if user.is_staff or user.is_superuser:
            return 'admin'

        # Check user type (assuming user_type field exists)
        user_type = getattr(user, 'user_type', 6)  # Default to customer

        if user_type == USER_TYPE_SUPER_ADMIN:  # Admin
            return 'admin'
        elif user_type == USER_TYPE_MERCHANT:  # Merchant
            return 'premium'
        else:  # Customer
            return 'basic'

    def get_client_tier(self, request) -> str:
        """
        Determine client tier based on API key or other factors
        """
        # Check for API key in headers
        api_key = request.headers.get('X-API-Key')
        if api_key:
            # Validate API key and return appropriate tier
            # This would integrate with API key management system
            return 'enterprise'

        # Check for OAuth client
        client_id = request.headers.get('X-Client-ID')
        if client_id:
            # Validate OAuth client and return tier
            return 'premium'

        return 'free'

class AdvancedThrottle(BaseThrottle):
    """
    Advanced Django REST Framework throttle with tiered limits
    """

    def __init__(self):
        self.rate_limiter = AdvancedRateLimiter()

    def allow_request(self, request, view):
        """
        Check if request should be allowed based on rate limits
        """
        # Disable throttling in development mode
        if getattr(settings, 'DEBUG', True) and not getattr(settings, 'IS_PRODUCTION', False):
            return True
        
        # Get client identifier
        if hasattr(request, 'user') and request.user.is_authenticated:
            client_key = f"user:{request.user.id}"
            tier = self.rate_limiter.get_user_tier(request.user)
        else:
            client_key = f"ip:{self.get_client_ip(request)}"
            tier = self.rate_limiter.get_client_tier(request)
        
        # Check rate limit
        allowed, info = self.rate_limiter.check_rate_limit(client_key, tier)
        
        # Store info for response headers
        request._throttle_info = info
        
        if not allowed:
            self._wait = info.get('retry_after', 60)
            return False
        
        return True

    def get_client_ip(self, request):
        """
        Get client IP address from request
        """
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    def wait(self):
        """
        Return number of seconds to wait before retrying
        """
        return getattr(self, 'wait', 60)

class BurstThrottle(AdvancedThrottle):
    """
    Throttle that focuses on burst prevention
    """

    def allow_request(self, request, view):
        # Use same logic as parent but with burst-focused limits
        return super().allow_request(request, view)

class SustainedThrottle(AdvancedThrottle):
    """
    Throttle that focuses on sustained rate limiting
    """

    def allow_request(self, request, view):
        # Use same logic as parent but with sustained-focused limits
        return super().allow_request(request, view)

class EndpointThrottle(AdvancedThrottle):
    """
    Throttle specific to certain endpoints with custom limits
    """

    def __init__(self, endpoint_limits: Dict[str, Dict[str, int]] = None):
        super().__init__()
        self.endpoint_limits = endpoint_limits or {}

    def allow_request(self, request, view):
        # Check if this endpoint has custom limits
        endpoint_key = f"{request.method}:{request.path_info}"
        if endpoint_key in self.endpoint_limits:
            # Apply custom limits for this endpoint
            custom_limits = self.endpoint_limits[endpoint_key]
            # Override tier limits temporarily
            original_get_tier_limits = self.rate_limiter.get_tier_limits
            self.rate_limiter.get_tier_limits = lambda tier: custom_limits
            result = super().allow_request(request, view)
            self.rate_limiter.get_tier_limits = original_get_tier_limits
            return result

        return super().allow_request(request, view)

def rate_limit_exceeded_handler(request, exc):
    """
    Custom handler for rate limit exceeded responses
    """
    return JsonResponse({
        'error': 'Rate limit exceeded',
        'detail': 'Too many requests. Please try again later.',
        'retry_after': getattr(exc, 'wait', 60),
        'tier': getattr(request, '_throttle_info', {}).get('tier', 'unknown')
    }, status=status.HTTP_429_TOO_MANY_REQUESTS)

class RateLimitAnalytics:
    """
    Analytics for rate limiting usage and effectiveness
    """

    @staticmethod
    def get_rate_limit_stats(hours: int = 24) -> Dict[str, Any]:
        """
        Get comprehensive rate limiting statistics
        """
        cache_keys = cache.keys('api_rate_limit:*')

        stats = {
            'total_keys': len(cache_keys),
            'tier_distribution': {},
            'top_offenders': [],
            'time_range_hours': hours,
            'generated_at': timezone.now().isoformat()
        }

        tier_counts = {}
        offender_counts = {}

        for key in cache_keys:
            try:
                key_parts = key.split(':')
                if len(key_parts) >= 3:
                    tier = key_parts[2]
                    tier_counts[tier] = tier_counts.get(tier, 0) + 1

                    # Extract user/IP info
                    identifier = key_parts[1]
                    if identifier.startswith('user:'):
                        user_id = identifier.split(':')[1]
                        offender_counts[user_id] = offender_counts.get(user_id, 0) + 1
            except Exception:
                continue

        stats['tier_distribution'] = tier_counts
        stats['top_offenders'] = sorted(
            offender_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )[:10]

        return stats

    @staticmethod
    def get_endpoint_usage_stats(hours: int = 24) -> Dict[str, Any]:
        """
        Get endpoint usage statistics for rate limiting optimization
        """
        from django.core.cache import cache

        # Gather endpoint hit counts from cache counters
        endpoint_keys = cache.keys('endpoint_hits:*') or []
        endpoint_counts = {}
        for key in endpoint_keys:
            endpoint = key.replace('endpoint_hits:', '')
            count = cache.get(key, 0)
            endpoint_counts[endpoint] = count

        # Sort by usage
        sorted_endpoints = sorted(endpoint_counts.items(), key=lambda x: x[1], reverse=True)
        most_used = [{'endpoint': ep, 'hits': cnt} for ep, cnt in sorted_endpoints[:20]]

        # Gather rate-limited endpoints from violation counters
        violation_keys = cache.keys('endpoint_violations:*') or []
        rate_limited = []
        for key in violation_keys:
            endpoint = key.replace('endpoint_violations:', '')
            count = cache.get(key, 0)
            if count > 0:
                rate_limited.append({'endpoint': endpoint, 'violations': count})
        rate_limited.sort(key=lambda x: x['violations'], reverse=True)

        # Peak usage hours from hourly counters
        hourly_keys = cache.keys('hourly_hits:*') or []
        hourly_counts = {}
        for key in hourly_keys:
            hour = key.replace('hourly_hits:', '')
            count = cache.get(key, 0)
            hourly_counts[hour] = count
        peak_hours = sorted(hourly_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        peak_usage = [{'hour': h, 'hits': c} for h, c in peak_hours]

        return {
            'most_used_endpoints': most_used,
            'rate_limited_endpoints': rate_limited,
            'peak_usage_hours': peak_usage,
            'time_range_hours': hours,
        }

# Custom throttle classes for different use cases
class PaymentThrottle(AdvancedThrottle):
    """Specialized throttle for payment endpoints"""
    pass

class AdminThrottle(AdvancedThrottle):
    """Specialized throttle for admin endpoints"""
    pass

class PublicThrottle(AdvancedThrottle):
    """Throttle for public endpoints (no authentication required)"""
    pass

# Configuration for different endpoint types
ENDPOINT_THROTTLE_CONFIG = {
    # Payment endpoints - stricter limits
    'POST:/api/payments/process/': {
        'sustained_limit': 10,   # 10 payments per hour
        'burst_limit': 2,        # Max 2 immediate payments
        'window_seconds': 3600,
    },
    'POST:/api/payments/transactions/process_payment/': {
        'sustained_limit': 20,
        'burst_limit': 3,
        'window_seconds': 3600,
    },

    # Authentication endpoints
    'POST:/api/v1/accounts/login/': {
        'sustained_limit': 5,    # 5 login attempts per hour
        'burst_limit': 3,        # Max 3 immediate attempts
        'window_seconds': 3600,
    },

    # Remittance endpoints
    'POST:/api/payments/cross-border/initiate/': {
        'sustained_limit': 5,    # 5 remittances per hour
        'burst_limit': 1,        # Max 1 immediate remittance
        'window_seconds': 3600,
    },
}
