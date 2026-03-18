"""
Webhook monitoring system for read-only access by business_admin users
Provides secure monitoring capabilities without modification permissions
"""
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.cache import cache
from rest_framework import serializers

from users.permissions import IsBusinessAdmin
from users.services_admin import AdminPermissionService

logger = logging.getLogger(__name__)
User = get_user_model()

class WebhookEvent(models.Model):
    """
    Stores webhook events for monitoring and audit purposes
    """
    EVENT_TYPES = [
        ('incoming', 'Incoming Webhook'),
        ('outgoing', 'Outgoing Webhook'),
        ('verification_failed', 'Verification Failed'),
        ('processing_error', 'Processing Error'),
        ('retry_attempt', 'Retry Attempt'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processed', 'Processed'),
        ('failed', 'Failed'),
        ('retrying', 'Retrying'),
    ]
    
    event_id = models.CharField(max_length=100, unique=True, db_index=True)
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES, db_index=True)
    direction = models.CharField(max_length=10, choices=[('in', 'Inbound'), ('out', 'Outbound')])
    provider = models.CharField(max_length=50, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Request details
    url = models.URLField(max_length=500)
    method = models.CharField(max_length=10)
    headers = models.JSONField(default=dict)
    payload = models.JSONField(default=dict)
    payload_size = models.PositiveIntegerField(help_text="Size of payload in bytes")
    
    # Response details
    response_status = models.PositiveIntegerField(null=True, blank=True)
    response_body = models.TextField(blank=True)
    response_time_ms = models.PositiveIntegerField(null=True, blank=True)
    
    # Security
    signature_verified = models.BooleanField(default=False)
    signature_details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    
    # Processing
    processing_attempts = models.PositiveIntegerField(default=0)
    last_attempt_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    
    # Risk assessment
    risk_score = models.FloatField(default=0.0, help_text="Risk score 0.0-1.0")
    risk_factors = models.JSONField(default=list, blank=True)
    requires_review = models.BooleanField(default=False)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='reviewed_webhook_events')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Webhook Event"
        verbose_name_plural = "Webhook Events"
        indexes = [
            models.Index(fields=['provider', '-created_at']),
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['direction', '-created_at']),
            models.Index(fields=['requires_review', '-created_at']),
            models.Index(fields=['risk_score', '-created_at']),
        ]

    def __str__(self):
        return f"{self.event_id} - {self.provider} - {self.status}"

    @classmethod
    def log_incoming_webhook(cls, event_id: str, provider: str, request, 
                           signature_verified: bool = False, **kwargs):
        """Log an incoming webhook event"""
        return cls.objects.create(
            event_id=event_id,
            event_type='incoming',
            direction='in',
            provider=provider,
            url=request.build_absolute_uri(),
            method=request.method,
            headers=dict(request.headers),
            payload=json.loads(request.body.decode('utf-8')) if request.body else {},
            payload_size=len(request.body),
            signature_verified=signature_verified,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            **kwargs
        )

    @classmethod
    def log_outgoing_webhook(cls, event_id: str, provider: str, url: str, 
                           method: str, payload: Dict, response_status: int,
                           response_time_ms: int, **kwargs):
        """Log an outgoing webhook event"""
        return cls.objects.create(
            event_id=event_id,
            event_type='outgoing',
            direction='out',
            provider=provider,
            url=url,
            method=method,
            payload=payload,
            payload_size=len(json.dumps(payload)),
            response_status=response_status,
            response_time_ms=response_time_ms,
            **kwargs
        )

    def calculate_risk_score(self):
        """Calculate risk score based on various factors"""
        score = 0.0
        factors = []
        
        # High risk factors
        if not self.signature_verified and self.direction == 'in':
            score += 0.4
            factors.append('unverified_signature')
        
        if self.status == 'failed':
            score += 0.3
            factors.append('processing_failure')
        
        if self.processing_attempts > 3:
            score += 0.2
            factors.append('multiple_retries')
        
        # Medium risk factors
        if self.payload_size > 100000:  # 100KB
            score += 0.1
            factors.append('large_payload')
        
        # Provider-specific risk
        high_risk_providers = ['unknown', 'test', 'staging']
        if self.provider.lower() in high_risk_providers:
            score += 0.2
            factors.append('unknown_provider')
        
        self.risk_score = min(score, 1.0)
        self.risk_factors = factors
        self.requires_review = self.risk_score > 0.5
        self.save(update_fields=['risk_score', 'risk_factors', 'requires_review'])

class WebhookMonitoringService:
    """
    Service for webhook monitoring with business_admin read-only access
    """
    
    @staticmethod
    def has_monitoring_access(user) -> bool:
        """Check if user has webhook monitoring access"""
        return (user.is_authenticated and 
                (user.user_type == 2 or  # BUSINESS_ADMIN
                 AdminPermissionService.has_permission(user, 'webhook_monitoring')))
    
    @staticmethod
    def get_webhook_statistics(user, days: int = 30) -> Dict[str, Any]:
        """Get webhook statistics for monitoring dashboard"""
        if not WebhookMonitoringService.has_monitoring_access(user):
            raise PermissionError("Insufficient permissions for webhook monitoring")
        
        cache_key = f"webhook_stats_{days}_{user.id}"
        cached_stats = cache.get(cache_key)
        if cached_stats:
            return cached_stats
        
        start_date = timezone.now() - timedelta(days=days)
        
        # Base queryset
        events = WebhookEvent.objects.filter(created_at__gte=start_date)
        
        # Overall statistics
        total_events = events.count()
        successful_events = events.filter(status='processed').count()
        failed_events = events.filter(status='failed').count()
        pending_events = events.filter(status='pending').count()
        
        # Direction breakdown
        incoming_events = events.filter(direction='in').count()
        outgoing_events = events.filter(direction='out').count()
        
        # Provider breakdown
        provider_stats = {}
        for event in events.values('provider').annotate(
            count=models.Count('id'),
            success_rate=models.Count('id', filter=models.Q(status='processed')) * 100.0 / models.Count('id')
        ):
            provider_stats[event['provider']] = {
                'count': event['count'],
                'success_rate': round(event['success_rate'], 2)
            }
        
        # Risk assessment
        high_risk_events = events.filter(risk_score__gt=0.5).count()
        events_requiring_review = events.filter(requires_review=True).count()
        
        # Recent activity (last 24 hours)
        recent_start = timezone.now() - timedelta(hours=24)
        recent_events = events.filter(created_at__gte=recent_start)
        recent_success_rate = (
            recent_events.filter(status='processed').count() / 
            max(recent_events.count(), 1) * 100
        )
        
        stats = {
            'period_days': days,
            'total_events': total_events,
            'success_rate': round((successful_events / max(total_events, 1)) * 100, 2),
            'failed_events': failed_events,
            'pending_events': pending_events,
            'incoming_events': incoming_events,
            'outgoing_events': outgoing_events,
            'provider_breakdown': provider_stats,
            'high_risk_events': high_risk_events,
            'events_requiring_review': events_requiring_review,
            'recent_24h': {
                'total': recent_events.count(),
                'success_rate': round(recent_success_rate, 2)
            },
            'average_response_time': events.filter(
                response_time_ms__isnull=False
            ).aggregate(avg=models.Avg('response_time_ms'))['avg'] or 0
        }
        
        # Cache for 5 minutes
        cache.set(cache_key, stats, 300)
        return stats
    
    @staticmethod
    def get_webhook_events(user, filters: Dict = None, page: int = 1, 
                          page_size: int = 50) -> Dict[str, Any]:
        """Get paginated webhook events with filtering"""
        if not WebhookMonitoringService.has_monitoring_access(user):
            raise PermissionError("Insufficient permissions for webhook monitoring")
        
        queryset = WebhookEvent.objects.all()
        
        # Apply filters
        if filters:
            if 'provider' in filters:
                queryset = queryset.filter(provider__icontains=filters['provider'])
            
            if 'status' in filters:
                queryset = queryset.filter(status=filters['status'])
            
            if 'direction' in filters:
                queryset = queryset.filter(direction=filters['direction'])
            
            if 'event_type' in filters:
                queryset = queryset.filter(event_type=filters['event_type'])
            
            if 'risk_min' in filters:
                queryset = queryset.filter(risk_score__gte=filters['risk_min'])
            
            if 'requires_review' in filters:
                queryset = queryset.filter(requires_review=filters['requires_review'])
            
            if 'date_from' in filters:
                queryset = queryset.filter(created_at__gte=filters['date_from'])
            
            if 'date_to' in filters:
                queryset = queryset.filter(created_at__lte=filters['date_to'])
        
        # Pagination
        offset = (page - 1) * page_size
        total_count = queryset.count()
        events = queryset[offset:offset + page_size]
        
        # Serialize data
        event_data = []
        for event in events:
            event_data.append({
                'id': event.id,
                'event_id': event.event_id,
                'event_type': event.get_event_type_display(),
                'direction': event.get_direction_display(),
                'provider': event.provider,
                'status': event.get_status_display(),
                'url': event.url,
                'method': event.method,
                'payload_size': event.payload_size,
                'response_status': event.response_status,
                'response_time_ms': event.response_time_ms,
                'signature_verified': event.signature_verified,
                'ip_address': event.ip_address,
                'processing_attempts': event.processing_attempts,
                'risk_score': event.risk_score,
                'requires_review': event.requires_review,
                'created_at': event.created_at.isoformat(),
                'processed_at': event.processed_at.isoformat() if event.processed_at else None,
            })
        
        return {
            'events': event_data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_count': total_count,
                'total_pages': (total_count + page_size - 1) // page_size
            }
        }
    
    @staticmethod
    def get_webhook_event_detail(user, event_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific webhook event"""
        if not WebhookMonitoringService.has_monitoring_access(user):
            raise PermissionError("Insufficient permissions for webhook monitoring")
        
        try:
            event = WebhookEvent.objects.get(event_id=event_id)
            
            # Log access for audit
            AdminPermissionService.log_admin_action(
                user=user,
                action='WEBHOOK_EVENT_VIEWED',
                description=f"Webhook event {event_id} viewed by {user.email}",
                resource_type='webhook_event',
                resource_id=event_id,
                ip_address='127.0.0.1'  # Should be set from request
            )
            
            return {
                'id': event.id,
                'event_id': event.event_id,
                'event_type': event.get_event_type_display(),
                'direction': event.get_direction_display(),
                'provider': event.provider,
                'status': event.get_status_display(),
                'url': event.url,
                'method': event.method,
                'headers': event.headers,
                'payload': event.payload,
                'payload_size': event.payload_size,
                'response_status': event.response_status,
                'response_body': event.response_body,
                'response_time_ms': event.response_time_ms,
                'signature_verified': event.signature_verified,
                'signature_details': event.signature_details,
                'ip_address': event.ip_address,
                'user_agent': event.user_agent,
                'processing_attempts': event.processing_attempts,
                'last_attempt_at': event.last_attempt_at.isoformat() if event.last_attempt_at else None,
                'error_message': event.error_message,
                'risk_score': event.risk_score,
                'risk_factors': event.risk_factors,
                'requires_review': event.requires_review,
                'reviewed_by': event.reviewed_by.email if event.reviewed_by else None,
                'reviewed_at': event.reviewed_at.isoformat() if event.reviewed_at else None,
                'review_notes': event.review_notes,
                'created_at': event.created_at.isoformat(),
                'updated_at': event.updated_at.isoformat(),
                'processed_at': event.processed_at.isoformat() if event.processed_at else None,
            }
            
        except WebhookEvent.DoesNotExist:
            return None
    
    @staticmethod
    def review_webhook_event(user, event_id: str, review_notes: str, 
                           requires_review: bool = False) -> bool:
        """Review a webhook event (for authorized users)"""
        if not AdminPermissionService.has_permission(user, 'webhook_review'):
            raise PermissionError("Insufficient permissions for webhook review")
        
        try:
            event = WebhookEvent.objects.get(event_id=event_id)
            event.reviewed_by = user
            event.reviewed_at = timezone.now()
            event.review_notes = review_notes
            event.requires_review = requires_review
            event.save()
            
            # Log review action
            AdminPermissionService.log_admin_action(
                user=user,
                action='WEBHOOK_EVENT_REVIEWED',
                description=f"Webhook event {event_id} reviewed by {user.email}",
                resource_type='webhook_event',
                resource_id=event_id,
                new_values={'review_notes': review_notes, 'requires_review': requires_review},
                ip_address='127.0.0.1'  # Should be set from request
            )
            
            return True
            
        except WebhookEvent.DoesNotExist:
            return False
    
    @staticmethod
    def get_high_risk_events(user, limit: int = 50) -> List[Dict[str, Any]]:
        """Get high-risk webhook events that need attention"""
        if not WebhookMonitoringService.has_monitoring_access(user):
            raise PermissionError("Insufficient permissions for webhook monitoring")
        
        events = WebhookEvent.objects.filter(
            risk_score__gt=0.5
        ).order_by('-risk_score', '-created_at')[:limit]
        
        return [{
            'id': event.id,
            'event_id': event.event_id,
            'provider': event.provider,
            'status': event.get_status_display(),
            'risk_score': event.risk_score,
            'risk_factors': event.risk_factors,
            'requires_review': event.requires_review,
            'created_at': event.created_at.isoformat(),
        } for event in events]

class WebhookEventSerializer(serializers.ModelSerializer):
    """Serializer for webhook events"""
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    direction_display = serializers.CharField(source='get_direction_display', read_only=True)
    
    class Meta:
        model = WebhookEvent
        fields = [
            'id', 'event_id', 'event_type', 'event_type_display',
            'direction', 'direction_display', 'provider', 'status', 'status_display',
            'url', 'method', 'payload_size', 'response_status', 'response_time_ms',
            'signature_verified', 'ip_address', 'processing_attempts',
            'risk_score', 'requires_review', 'created_at', 'processed_at'
        ]
        read_only_fields = fields

def create_webhook_event_id() -> str:
    """Generate unique webhook event ID"""
    import uuid
    return f"wh_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{str(uuid.uuid4())[:8]}"
