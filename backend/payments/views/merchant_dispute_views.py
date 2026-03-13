"""
Merchant Dispute Management API Views
Provides REST endpoints for merchants to respond to and resolve disputes
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Avg, Q
from django.utils import timezone
from datetime import timedelta
import logging

from ..models.dispute import Dispute
from ..serializers.dispute import (
    MerchantDisputeSerializer, MerchantResponseSerializer,
    MerchantResolutionSerializer, EscalationSerializer
)
from ..services.notification_service import NotificationService

logger = logging.getLogger(__name__)


class MerchantDisputeViewSet(viewsets.ModelViewSet):
    """
    Merchant viewset for managing disputes related to their transactions
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Only return disputes for the current merchant's transactions"""
        user = self.request.user
        if hasattr(user, 'merchant_profile'):
            return Dispute.objects.filter(
                transaction__merchant=user.merchant_profile
            ).select_related(
                'transaction', 'transaction__customer', 'transaction__customer__user',
                'transaction__merchant', 'created_by', 'resolved_by'
            ).order_by('-created_at')
        return Dispute.objects.none()

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action in ['retrieve', 'list']:
            return MerchantDisputeSerializer
        elif self.action == 'respond':
            return MerchantResponseSerializer
        elif self.action == 'resolve':
            return MerchantResolutionSerializer
        elif self.action == 'escalate':
            return EscalationSerializer
        return MerchantDisputeSerializer

    def list(self, request, *args, **kwargs):
        """List disputes with filtering options"""
        queryset = self.get_queryset()
        
        # Filter by status
        status_filter = request.query_params.get('status')
        if status_filter and status_filter != 'all':
            queryset = queryset.filter(status=status_filter)
        
        # Filter by escalated status
        escalated_filter = request.query_params.get('escalated')
        if escalated_filter == 'true':
            queryset = queryset.filter(escalated_to_admin=True)
        elif escalated_filter == 'false':
            queryset = queryset.filter(escalated_to_admin=False)
        
        # Search by customer name or reason
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(reason__icontains=search) |
                Q(transaction__customer__user__email__icontains=search) |
                Q(transaction__customer__user__first_name__icontains=search)
            )
        
        # Filter by date range
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def respond(self, request, pk=None):
        """Merchant responds to a dispute"""
        dispute = self.get_object()
        
        # Check if dispute can be responded to
        if dispute.status not in [Dispute.OPEN, Dispute.MERCHANT_RESPONSE]:
            return Response(
                {'error': 'This dispute cannot be responded to at this stage'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if already responded
        if dispute.merchant_response:
            return Response(
                {'error': 'You have already responded to this dispute'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = MerchantResponseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        response_text = serializer.validated_data['response_text']
        
        # Update dispute with merchant response
        dispute.merchant_respond(response_text)
        
        # Notify customer of response
        self._notify_customer_of_response(dispute)
        
        logger.info(f"Merchant {request.user.email} responded to dispute {dispute.id}")
        
        return Response({
            'message': 'Response submitted successfully',
            'dispute': MerchantDisputeSerializer(dispute).data
        })

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Merchant resolves a dispute"""
        dispute = self.get_object()
        
        # Check if dispute can be resolved
        if dispute.status not in [Dispute.UNDER_REVIEW, Dispute.MERCHANT_RESPONSE]:
            return Response(
                {'error': 'This dispute cannot be resolved at this stage'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = MerchantResolutionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        resolution_text = serializer.validated_data['resolution_text']
        
        # Update dispute with merchant resolution
        dispute.merchant_resolve(resolution_text, request.user)
        
        # Notify customer of resolution
        self._notify_customer_of_resolution(dispute)
        
        logger.info(f"Merchant {request.user.email} resolved dispute {dispute.id}")
        
        return Response({
            'message': 'Dispute resolved successfully',
            'dispute': MerchantDisputeSerializer(dispute).data
        })

    @action(detail=True, methods=['post'])
    def escalate(self, request, pk=None):
        """Escalate dispute to admin"""
        dispute = self.get_object()
        
        # Check if dispute can be escalated
        if dispute.escalated_to_admin:
            return Response(
                {'error': 'Dispute is already escalated to admin'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = EscalationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        escalation_reason = serializer.validated_data['escalation_reason']
        
        # Escalate dispute
        dispute.escalate_to_admin(escalation_reason)
        
        # Notify admin of escalation
        self._notify_admin_of_escalation(dispute, escalation_reason)
        
        # Notify customer of escalation
        self._notify_customer_of_escalation(dispute)
        
        logger.info(f"Merchant {request.user.email} escalated dispute {dispute.id} to admin")
        
        return Response({
            'message': 'Dispute escalated to admin successfully',
            'dispute': MerchantDisputeSerializer(dispute).data
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get merchant's dispute statistics"""
        user = request.user
        if not hasattr(user, 'merchant_profile'):
            return Response({'error': 'Merchant profile not found'}, status=status.HTTP_404_NOT_FOUND)
        
        disputes = self.get_queryset()
        
        total_disputes = disputes.count()
        open_disputes = disputes.filter(status__in=[Dispute.OPEN, Dispute.MERCHANT_RESPONSE]).count()
        under_review_disputes = disputes.filter(status=Dispute.UNDER_REVIEW).count()
        resolved_disputes = disputes.filter(status=Dispute.RESOLVED).count()
        escalated_disputes = disputes.filter(escalated_to_admin=True).count()
        
        # Calculate average response time
        responded_disputes = disputes.filter(merchant_responded_at__isnull=False)
        if responded_disputes.exists():
            total_response_time = sum(
                (d.merchant_responded_at - d.created_at).total_seconds() 
                for d in responded_disputes
            )
            avg_response_hours = round(total_response_time / responded_disputes.count() / 3600, 1)
        else:
            avg_response_hours = 0
        
        # Calculate satisfaction rate
        satisfied_disputes = disputes.filter(customer_satisfied=True).count()
        feedback_count = disputes.filter(customer_satisfied__isnull=False).count()
        satisfaction_rate = (satisfied_disputes / feedback_count * 100) if feedback_count > 0 else 0
        
        # Check for overdue disputes (older than 48 hours without response)
        overdue_cutoff = timezone.now() - timedelta(hours=48)
        overdue_disputes = disputes.filter(
            status=Dispute.MERCHANT_RESPONSE,
            merchant_responded_at__isnull=True,
            created_at__lt=overdue_cutoff
        ).count()
        
        return Response({
            'total_disputes': total_disputes,
            'open_disputes': open_disputes,
            'under_review_disputes': under_review_disputes,
            'resolved_disputes': resolved_disputes,
            'escalated_disputes': escalated_disputes,
            'overdue_disputes': overdue_disputes,
            'avg_response_time_hours': avg_response_hours,
            'satisfaction_rate': round(satisfaction_rate, 1)
        })

    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get list of overdue disputes (older than 48 hours without response)"""
        user = request.user
        if not hasattr(user, 'merchant_profile'):
            return Response({'error': 'Merchant profile not found'}, status=status.HTTP_404_NOT_FOUND)
        
        overdue_cutoff = timezone.now() - timedelta(hours=48)
        overdue_disputes = self.get_queryset().filter(
            status=Dispute.MERCHANT_RESPONSE,
            merchant_responded_at__isnull=True,
            created_at__lt=overdue_cutoff
        ).order_by('created_at')
        
        serializer = MerchantDisputeSerializer(overdue_disputes, many=True)
        return Response(serializer.data)

    def _notify_customer_of_response(self, dispute):
        """Send notification to customer about merchant response"""
        try:
            context = {
                'customer_name': f"{dispute.customer.user.first_name} {dispute.customer.user.last_name}".strip(),
                'merchant_name': dispute.transaction.merchant.business_name,
                'dispute_id': dispute.id,
                'transaction_id': dispute.transaction.id,
                'response': dispute.merchant_response
            }
            
            # Send email notification
            NotificationService.send_notification(
                notification_type='dispute_response',
                recipient_email=dispute.customer.user.email,
                recipient_phone=getattr(dispute.customer.user, 'phone', None),
                context=context,
                channels=['email', 'sms']
            )
            
            logger.info(f"Response notification sent to customer for dispute {dispute.id}")
            
        except Exception as e:
            logger.error(f"Failed to send response notification for dispute {dispute.id}: {str(e)}")

    def _notify_customer_of_resolution(self, dispute):
        """Send notification to customer about dispute resolution"""
        try:
            context = {
                'customer_name': f"{dispute.customer.user.first_name} {dispute.customer.user.last_name}".strip(),
                'merchant_name': dispute.transaction.merchant.business_name,
                'dispute_id': dispute.id,
                'transaction_id': dispute.transaction.id,
                'resolution': dispute.merchant_resolution
            }
            
            # Send email notification
            NotificationService.send_notification(
                notification_type='dispute_resolution',
                recipient_email=dispute.customer.user.email,
                recipient_phone=getattr(dispute.customer.user, 'phone', None),
                context=context,
                channels=['email', 'sms']
            )
            
            logger.info(f"Resolution notification sent to customer for dispute {dispute.id}")
            
        except Exception as e:
            logger.error(f"Failed to send resolution notification for dispute {dispute.id}: {str(e)}")

    def _notify_admin_of_escalation(self, dispute, escalation_reason):
        """Send notification to admin about dispute escalation"""
        try:
            context = {
                'dispute_id': dispute.id,
                'merchant_name': dispute.transaction.merchant.business_name,
                'customer_name': f"{dispute.customer.user.first_name} {dispute.customer.user.last_name}".strip(),
                'transaction_id': dispute.transaction.id,
                'escalation_reason': escalation_reason,
                'dispute_reason': dispute.reason
            }
            
            # Send notification to admin
            from django.conf import settings
            admin_email = getattr(settings, 'ADMIN_EMAIL', None)
            if admin_email:
                NotificationService.send_notification(
                    notification_type='dispute_escalation',
                    recipient_email=admin_email,
                    context=context,
                    channels=['email']
                )
            
            logger.info(f"Escalation notification sent to admin for dispute {dispute.id}")
            
        except Exception as e:
            logger.error(f"Failed to send escalation notification for dispute {dispute.id}: {str(e)}")

    def _notify_customer_of_escalation(self, dispute):
        """Send notification to customer about dispute escalation"""
        try:
            context = {
                'customer_name': f"{dispute.customer.user.first_name} {dispute.customer.user.last_name}".strip(),
                'merchant_name': dispute.transaction.merchant.business_name,
                'dispute_id': dispute.id,
                'transaction_id': dispute.id,
                'escalation_reason': dispute.escalation_reason
            }
            
            # Send email notification
            NotificationService.send_notification(
                notification_type='dispute_escalated_to_admin',
                recipient_email=dispute.customer.user.email,
                context=context,
                channels=['email']
            )
            
            logger.info(f"Escalation notification sent to customer for dispute {dispute.id}")
            
        except Exception as e:
            logger.error(f"Failed to send escalation notification to customer for dispute {dispute.id}: {str(e)}")
