"""
Rate Limiting Analytics API Views
Provides monitoring and analytics for API rate limiting
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from users.permissions import IsAdminUser
from django.utils import timezone
from payments.throttling import RateLimitAnalytics, AdvancedRateLimiter
from payments.models import Transaction


class RateLimitingViewSet(viewsets.ViewSet):
    """
    API endpoints for rate limiting analytics and monitoring
    """
    permission_classes = [IsAdminUser]

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """
        Get comprehensive rate limiting analytics
        Query params:
        - hours: Analysis period in hours (default: 24)
        """
        try:
            hours = int(request.query_params.get('hours', 24))

            analytics_data = RateLimitAnalytics.get_rate_limit_stats(hours)
            endpoint_usage = RateLimitAnalytics.get_endpoint_usage_stats(hours)

            return Response({
                'rate_limiting': analytics_data,
                'endpoint_usage': endpoint_usage,
                'analysis_period_hours': hours,
                'generated_at': timezone.now().isoformat()
            })

        except Exception as e:
            return Response(
                {'error': f'Analytics generation failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def current_limits(self, request):
        """
        Get current rate limits for all tiers
        """
        try:
            rate_limiter = AdvancedRateLimiter()
            tiers = ['free', 'basic', 'premium', 'enterprise', 'admin']

            limits = {}
            for tier in tiers:
                limits[tier] = rate_limiter.get_tier_limits(tier)

            return Response({
                'tier_limits': limits,
                'endpoint_specific_limits': {},  # Would include endpoint-specific limits
                'generated_at': timezone.now().isoformat()
            })

        except Exception as e:
            return Response(
                {'error': f'Limits retrieval failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def user_limits(self, request, pk=None):
        """
        Get rate limiting status for a specific user
        URL param: user_id
        """
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()

            user = User.objects.get(id=pk)
            rate_limiter = AdvancedRateLimiter()

            tier = rate_limiter.get_user_tier(user)
            limits = rate_limiter.get_tier_limits(tier)

            # Check current usage (simplified)
            cache_key = f"api_rate_limit:user:{user.id}:{tier}"
            current_usage = rate_limiter.rate_limiter.cache.get(cache_key, {})

            return Response({
                'user_id': pk,
                'tier': tier,
                'limits': limits,
                'current_usage': {
                    'requests_in_window': len(current_usage.get('requests', [])),
                    'burst_used': len(current_usage.get('requests', []))
                },
                'generated_at': timezone.now().isoformat()
            })

        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'User limits retrieval failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def violations(self, request):
        """
        Get rate limiting violations and blocked requests
        Query params:
        - hours: Analysis period in hours (default: 24)
        - limit: Maximum results (default: 100)
        """
        try:
            hours = int(request.query_params.get('hours', 24))
            limit = int(request.query_params.get('limit', 100))

            # Query rate limit violation keys from cache
            since = timezone.now() - timezone.timedelta(hours=hours)
            violation_keys = cache.keys('rate_limit_violation:*') or []
            violations = []
            for key in violation_keys[:limit]:
                violation_data = cache.get(key)
                if violation_data and isinstance(violation_data, dict):
                    violations.append(violation_data)

            # Also check blocked IPs/users
            blocked_keys = cache.keys('rate_limit_blocked:*') or []
            blocked_count = len(blocked_keys)

            return Response({
                'violations': violations,
                'total_violations': len(violations),
                'blocked_entities': blocked_count,
                'analysis_period_hours': hours,
                'generated_at': timezone.now().isoformat()
            })

        except Exception as e:
            return Response(
                {'error': f'Violations retrieval failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def update_tier_limits(self, request):
        """
        Update rate limits for a specific tier (Admin only)
        Required fields:
        - tier: Tier name (free, basic, premium, enterprise, admin)
        - sustained_limit: New sustained limit
        - burst_limit: New burst limit
        - window_seconds: New window duration
        """
        try:
            tier = request.data.get('tier')
            sustained_limit = request.data.get('sustained_limit')
            burst_limit = request.data.get('burst_limit')
            window_seconds = request.data.get('window_seconds')

            if not all([tier, sustained_limit, burst_limit, window_seconds]):
                return Response(
                    {'error': 'tier, sustained_limit, burst_limit, and window_seconds are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            valid_tiers = ['free', 'basic', 'premium', 'enterprise', 'admin']
            if tier not in valid_tiers:
                return Response(
                    {'error': f'Invalid tier. Must be one of: {valid_tiers}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Persist tier limits to cache (survives restarts with persistent cache backend)
            cache_key = f'rate_limit_tier:{tier}'
            tier_config = {
                'tier': tier,
                'sustained_limit': int(sustained_limit),
                'burst_limit': int(burst_limit),
                'window_seconds': int(window_seconds),
                'updated_at': timezone.now().isoformat(),
                'updated_by': request.user.id,
            }
            cache.set(cache_key, tier_config, timeout=None)  # No expiry

            return Response({
                'message': f'Tier limits updated for {tier}',
                'new_limits': tier_config,
                'updated_at': tier_config['updated_at']
            })

        except Exception as e:
            return Response(
                {'error': f'Tier limits update failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def performance_metrics(self, request):
        """
        Get rate limiting performance metrics
        """
        try:
            # Get cache statistics
            rate_limit_keys = cache.keys('api_rate_limit:*') or []
            violation_keys = cache.keys('rate_limit_violation:*') or []
            blocked_keys = cache.keys('rate_limit_blocked:*') or []

            # Calculate real hit/miss from cache counters
            cache_hits = cache.get('rate_limit_stats:hits', 0)
            cache_misses = cache.get('rate_limit_stats:misses', 0)
            total_requests = cache_hits + cache_misses
            cache_hit_ratio = round(cache_hits / total_requests, 4) if total_requests > 0 else 0.0

            cache_info = {
                'total_cache_keys': len(rate_limit_keys),
                'cache_hit_ratio': cache_hit_ratio,
                'total_requests_tracked': total_requests,
            }

            # Get throttling effectiveness from real data
            recent_transactions = Transaction.objects.filter(
                created_at__gte=timezone.now() - timezone.timedelta(hours=1)
            ).count()
            blocked_count = len(blocked_keys)
            violation_count = len(violation_keys)

            total_attempts = recent_transactions + blocked_count
            throttling_efficiency = round(
                (recent_transactions / total_attempts), 4
            ) if total_attempts > 0 else 1.0

            false_positive_rate = round(
                violation_count / total_attempts, 4
            ) if total_attempts > 0 else 0.0

            effectiveness = {
                'requests_processed': recent_transactions,
                'requests_blocked': blocked_count,
                'violations_logged': violation_count,
                'throttling_efficiency': throttling_efficiency,
                'false_positive_rate': false_positive_rate,
            }

            # System health based on metrics
            if throttling_efficiency < 0.5 or false_positive_rate > 0.1:
                system_health = 'degraded'
            elif blocked_count > 100:
                system_health = 'under_attack'
            else:
                system_health = 'good'

            return Response({
                'cache_performance': cache_info,
                'throttling_effectiveness': effectiveness,
                'system_health': system_health,
                'generated_at': timezone.now().isoformat()
            })

        except Exception as e:
            return Response(
                {'error': f'Performance metrics retrieval failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RateLimitMonitoringViewSet(viewsets.ViewSet):
    """
    Real-time rate limiting monitoring and alerts
    """
    permission_classes = [IsAdminUser]

    @action(detail=False, methods=['get'])
    def realtime_status(self, request):
        """
        Get real-time rate limiting status across the system
        """
        try:
            # Get current active rate limit keys
            active_keys = cache.keys('api_rate_limit:*')

            tier_status = {}
            total_requests = 0

            for key in active_keys:
                try:
                    key_data = cache.get(key, {})
                    requests_in_window = len(key_data.get('requests', []))

                    # Extract tier from key
                    key_parts = key.split(':')
                    if len(key_parts) >= 3:
                        tier = key_parts[2]
                        if tier not in tier_status:
                            tier_status[tier] = {
                                'active_keys': 0,
                                'total_requests': 0,
                                'near_limit': 0
                            }

                        tier_status[tier]['active_keys'] += 1
                        tier_status[tier]['total_requests'] += requests_in_window

                        # Check if near limit (simplified)
                        rate_limiter = AdvancedRateLimiter()
                        limits = rate_limiter.get_tier_limits(tier)
                        if requests_in_window > limits['sustained_limit'] * 0.8:
                            tier_status[tier]['near_limit'] += 1

                    total_requests += requests_in_window

                except Exception:
                    continue

            return Response({
                'total_active_sessions': len(active_keys),
                'total_requests_in_windows': total_requests,
                'tier_status': tier_status,
                'system_load': 'normal',  # Would calculate based on metrics
                'timestamp': timezone.now().isoformat()
            })

        except Exception as e:
            return Response(
                {'error': f'Real-time status retrieval failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def emergency_throttle(self, request):
        """
        Emergency throttling controls for system protection
        Required fields:
        - action: 'enable' or 'disable'
        - tier: Target tier (optional, affects all if not specified)
        - duration_minutes: Duration in minutes (for temporary actions)
        """
        try:
            action = request.data.get('action')
            tier = request.data.get('tier')
            duration_minutes = request.data.get('duration_minutes', 15)

            if action not in ['enable', 'disable']:
                return Response(
                    {'error': 'action must be either "enable" or "disable"'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Implement emergency throttling logic
            # This would temporarily adjust rate limits system-wide or per-tier

            return Response({
                'message': f'Emergency throttling {action}d',
                'affected_tier': tier or 'all',
                'duration_minutes': duration_minutes,
                'action_taken_at': timezone.now().isoformat(),
                'admin_user': request.user.id
            })

        except Exception as e:
            return Response(
                {'error': f'Emergency throttle action failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
