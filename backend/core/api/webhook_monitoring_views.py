"""
API views for webhook monitoring with business_admin read-only access
"""
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from datetime import datetime, timedelta
import logging

from ..webhook_monitoring import (
    WebhookMonitoringService, WebhookEvent, WebhookEventSerializer,
    create_webhook_event_id
)
from users.permissions import IsBusinessAdmin
from users.services_admin import AdminPermissionService

logger = logging.getLogger(__name__)

class WebhookMonitoringPermission:
    """Custom permission class for webhook monitoring"""
    
    @staticmethod
    def has_monitoring_permission(request):
        """Check if user has webhook monitoring permission"""
        if not request.user.is_authenticated:
            return False
        
        # Business admins always have read-only access
        if request.user.user_type == 2:  # BUSINESS_ADMIN
            return True
        
        # Check specific permission for other admin types
        return AdminPermissionService.has_permission(request.user, 'webhook_monitoring')

class WebhookStatisticsAPIView(APIView):
    """
    API endpoint for webhook monitoring statistics
    Business admin read-only access
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get webhook statistics"""
        if not WebhookMonitoringPermission.has_monitoring_permission(request):
            return Response(
                {'error': 'Insufficient permissions for webhook monitoring'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            days = int(request.GET.get('days', 30))
            days = min(max(days, 1), 365)  # Limit between 1 and 365 days
            
            stats = WebhookMonitoringService.get_webhook_statistics(
                user=request.user,
                days=days
            )
            
            # Log access for audit
            AdminPermissionService.log_admin_action(
                user=request.user,
                action='WEBHOOK_STATS_VIEWED',
                description=f"Webhook statistics viewed for {days} days",
                resource_type='webhook_monitoring',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            return Response(stats, status=status.HTTP_200_OK)
            
        except ValueError as e:
            return Response(
                {'error': f'Invalid parameter: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error getting webhook statistics: {str(e)}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class WebhookEventsAPIView(APIView):
    """
    API endpoint for webhook events listing with filtering
    Business admin read-only access
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get webhook events with filtering and pagination"""
        if not WebhookMonitoringPermission.has_monitoring_permission(request):
            return Response(
                {'error': 'Insufficient permissions for webhook monitoring'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Parse query parameters
            filters = {}
            
            if request.GET.get('provider'):
                filters['provider'] = request.GET.get('provider')
            
            if request.GET.get('status'):
                filters['status'] = request.GET.get('status')
            
            if request.GET.get('direction'):
                filters['direction'] = request.GET.get('direction')
            
            if request.GET.get('event_type'):
                filters['event_type'] = request.GET.get('event_type')
            
            if request.GET.get('risk_min'):
                try:
                    filters['risk_min'] = float(request.GET.get('risk_min'))
                except ValueError:
                    return Response(
                        {'error': 'Invalid risk_min value'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            if request.GET.get('requires_review') is not None:
                filters['requires_review'] = request.GET.get('requires_review').lower() == 'true'
            
            if request.GET.get('date_from'):
                try:
                    filters['date_from'] = datetime.strptime(
                        request.GET.get('date_from'), '%Y-%m-%d'
                    )
                except ValueError:
                    return Response(
                        {'error': 'Invalid date_from format. Use YYYY-MM-DD'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            if request.GET.get('date_to'):
                try:
                    filters['date_to'] = datetime.strptime(
                        request.GET.get('date_to'), '%Y-%m-%d'
                    )
                except ValueError:
                    return Response(
                        {'error': 'Invalid date_to format. Use YYYY-MM-DD'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Pagination
            page = int(request.GET.get('page', 1))
            page_size = int(request.GET.get('page_size', 50))
            page_size = min(max(page_size, 10), 200)  # Limit between 10 and 200
            
            events_data = WebhookMonitoringService.get_webhook_events(
                user=request.user,
                filters=filters,
                page=page,
                page_size=page_size
            )
            
            # Log access for audit
            AdminPermissionService.log_admin_action(
                user=request.user,
                action='WEBHOOK_EVENTS_VIEWED',
                description=f"Webhook events list viewed - page {page}, filters: {filters}",
                resource_type='webhook_monitoring',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            return Response(events_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error getting webhook events: {str(e)}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class WebhookEventDetailAPIView(APIView):
    """
    API endpoint for detailed webhook event information
    Business admin read-only access
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, event_id):
        """Get detailed webhook event information"""
        if not WebhookMonitoringPermission.has_monitoring_permission(request):
            return Response(
                {'error': 'Insufficient permissions for webhook monitoring'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            event_detail = WebhookMonitoringService.get_webhook_event_detail(
                user=request.user,
                event_id=event_id
            )
            
            if not event_detail:
                return Response(
                    {'error': 'Webhook event not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            return Response(event_detail, status=status.HTTP_200_OK)
            
        except PermissionError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            logger.error(f"Error getting webhook event detail: {str(e)}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class WebhookEventReviewAPIView(APIView):
    """
    API endpoint for reviewing webhook events
    Requires webhook_review permission (not available to business_admin by default)
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, event_id):
        """Review a webhook event"""
        if not AdminPermissionService.has_permission(request.user, 'webhook_review'):
            return Response(
                {'error': 'Insufficient permissions for webhook review'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            review_notes = request.data.get('review_notes', '').strip()
            requires_review = request.data.get('requires_review', False)
            
            if not review_notes:
                return Response(
                    {'error': 'Review notes are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            success = WebhookMonitoringService.review_webhook_event(
                user=request.user,
                event_id=event_id,
                review_notes=review_notes,
                requires_review=requires_review
            )
            
            if not success:
                return Response(
                    {'error': 'Webhook event not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            return Response(
                {'message': 'Webhook event reviewed successfully'},
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"Error reviewing webhook event: {str(e)}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class HighRiskWebhookEventsAPIView(APIView):
    """
    API endpoint for high-risk webhook events
    Business admin read-only access
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get high-risk webhook events"""
        if not WebhookMonitoringPermission.has_monitoring_permission(request):
            return Response(
                {'error': 'Insufficient permissions for webhook monitoring'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            limit = int(request.GET.get('limit', 50))
            limit = min(max(limit, 10), 200)  # Limit between 10 and 200
            
            events = WebhookMonitoringService.get_high_risk_events(
                user=request.user,
                limit=limit
            )
            
            # Log access for audit
            AdminPermissionService.log_admin_action(
                user=request.user,
                action='WEBHOOK_HIGH_RISK_VIEWED',
                description=f"High-risk webhook events viewed - limit {limit}",
                resource_type='webhook_monitoring',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            return Response({'events': events}, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error getting high-risk webhook events: {str(e)}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@method_decorator(csrf_exempt, name='dispatch')
class WebhookEventLoggerAPIView(APIView):
    """
    Internal API endpoint for logging webhook events
    Used by other services to log webhook activity
    """
    permission_classes = []  # No authentication required for internal logging
    
    def post(self, request):
        """Log a webhook event"""
        try:
            # Verify internal request (could add additional security here)
            internal_secret = request.headers.get('X-Internal-Secret')
            if internal_secret != 'webhook_logger_internal':
                return Response(
                    {'error': 'Unauthorized'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            data = request.data
            
            # Validate required fields
            required_fields = ['event_type', 'provider', 'url', 'method']
            for field in required_fields:
                if field not in data:
                    return Response(
                        {'error': f'Missing required field: {field}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Create webhook event
            event_id = data.get('event_id', create_webhook_event_id())
            
            event = WebhookEvent.objects.create(
                event_id=event_id,
                event_type=data['event_type'],
                direction=data.get('direction', 'in'),
                provider=data['provider'],
                url=data['url'],
                method=data['method'],
                headers=data.get('headers', {}),
                payload=data.get('payload', {}),
                payload_size=len(str(data.get('payload', {}))),
                response_status=data.get('response_status'),
                response_body=data.get('response_body', ''),
                response_time_ms=data.get('response_time_ms'),
                signature_verified=data.get('signature_verified', False),
                signature_details=data.get('signature_details', {}),
                ip_address=data.get('ip_address', request.META.get('REMOTE_ADDR')),
                user_agent=data.get('user_agent', ''),
                processing_attempts=data.get('processing_attempts', 0),
                error_message=data.get('error_message', ''),
                status=data.get('status', 'pending')
            )
            
            # Calculate risk score
            event.calculate_risk_score()
            
            return Response(
                {'event_id': event_id, 'message': 'Webhook event logged successfully'},
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            logger.error(f"Error logging webhook event: {str(e)}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
