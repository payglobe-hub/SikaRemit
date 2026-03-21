"""
Customer Dispute Management API Views
Provides REST endpoints for customers to create and manage disputes
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Avg
from django.utils import timezone
from datetime import timedelta
import logging

from ..models.dispute import Dispute
from ..models.transaction import Transaction
from ..serializers.dispute import (
    DisputeCreateSerializer, DisputeDetailSerializer, 
    CustomerDisputeListSerializer, CustomerFeedbackSerializer
)
from ..services.notification_service import NotificationService

logger = logging.getLogger(__name__)

class CustomerDisputeViewSet(viewsets.ModelViewSet):
    """
    Customer viewset for managing their own disputes
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Only return disputes for the current customer"""
        user = self.request.user
        if hasattr(user, 'customer_profile'):
            return Dispute.objects.filter(
                transaction__customer=user.customer_profile
            ).select_related(
                'transaction', 'transaction__customer', 'transaction__customer__user',
                'transaction__merchant', 'created_by', 'resolved_by'
            ).order_by('-created_at')
        return Dispute.objects.none()

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return DisputeCreateSerializer
        elif self.action in ['retrieve', 'list']:
            return CustomerDisputeListSerializer
        elif self.action == 'feedback':
            return CustomerFeedbackSerializer
        return CustomerDisputeListSerializer

    def create(self, request, *args, **kwargs):
        """Create a new dispute for a transaction"""
        serializer = DisputeCreateSerializer(
            data=request.data, 
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        transaction = serializer.validated_data['transaction']
        reason = serializer.validated_data['reason']
        dispute_type = serializer.validated_data.get('dispute_type', Dispute.CUSTOMER_MERCHANT)
        
        # Create dispute
        dispute = Dispute.objects.create(
            transaction=transaction,
            dispute_type=dispute_type,
            reason=reason,
            created_by=request.user,
            status=Dispute.MERCHANT_RESPONSE  # Awaiting merchant response
        )
        
        # Send notification to merchant
        if transaction.merchant:
            self._notify_merchant_of_dispute(dispute, transaction.merchant)
        
        # Send confirmation to customer
        self._notify_customer_of_dispute_creation(dispute, request.user)
        
        logger.info(f"Customer {request.user.email} created dispute for transaction {transaction.id}")
        
        return Response(
            CustomerDisputeListSerializer(dispute).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'])
    def feedback(self, request, pk=None):
        """Provide feedback on dispute resolution"""
        dispute = self.get_object()
        
        # Check if dispute is resolved
        if dispute.status not in [Dispute.RESOLVED]:
            return Response(
                {'error': 'You can only provide feedback for resolved disputes'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if feedback already provided
        if dispute.customer_satisfied is not None:
            return Response(
                {'error': 'Feedback already provided for this dispute'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = CustomerFeedbackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        satisfied = serializer.validated_data['satisfied']
        feedback_text = serializer.validated_data.get('feedback_text', '')
        
        # Update dispute with feedback
        dispute.provide_customer_feedback(satisfied, feedback_text)
        
        # Send feedback notification to merchant if satisfied
        if satisfied and dispute.transaction.merchant:
            self._notify_merchant_of_positive_feedback(dispute, dispute.transaction.merchant)
        
        # Send escalation notification if not satisfied
        if not satisfied:
            self._escalate_unsatisfied_dispute(dispute)
        
        logger.info(f"Customer {request.user.email} provided feedback for dispute {dispute.id}: satisfied={satisfied}")
        
        return Response({
            'message': 'Feedback submitted successfully',
            'dispute': CustomerDisputeListSerializer(dispute).data
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get customer's dispute statistics"""
        user = request.user
        if not hasattr(user, 'customer_profile'):
            return Response({'error': 'Customer profile not found'}, status=status.HTTP_404_NOT_FOUND)
        
        disputes = self.get_queryset()
        
        total_disputes = disputes.count()
        open_disputes = disputes.filter(status__in=[Dispute.OPEN, Dispute.MERCHANT_RESPONSE]).count()
        resolved_disputes = disputes.filter(status=Dispute.RESOLVED).count()
        escalated_disputes = disputes.filter(escalated_to_admin=True).count()
        
        # Calculate satisfaction rate
        satisfied_disputes = disputes.filter(customer_satisfied=True).count()
        feedback_count = disputes.filter(customer_satisfied__isnull=False).count()
        satisfaction_rate = (satisfied_disputes / feedback_count * 100) if feedback_count > 0 else 0
        
        return Response({
            'total_disputes': total_disputes,
            'open_disputes': open_disputes,
            'resolved_disputes': resolved_disputes,
            'escalated_disputes': escalated_disputes,
            'satisfaction_rate': round(satisfaction_rate, 1)
        })

    def _notify_merchant_of_dispute(self, dispute, merchant):
        """Send notification to merchant about new dispute"""
        try:
            context = {
                'merchant_name': merchant.business_name,
                'customer_name': f"{dispute.customer.user.first_name} {dispute.customer.user.last_name}".strip(),
                'transaction_id': dispute.transaction.id,
                'amount': float(dispute.transaction.amount),
                'currency': dispute.transaction.currency,
                'reason': dispute.reason,
                'dispute_id': dispute.id
            }
            
            # Send email notification
            NotificationService.send_notification(
                notification_type='dispute_created',
                recipient_email=merchant.user.email,
                recipient_phone=getattr(merchant.user, 'phone', None),
                context=context,
                channels=['email', 'sms']
            )
            
            logger.info(f"Notification sent to merchant {merchant.business_name} for dispute {dispute.id}")
            
        except Exception as e:
            logger.error(f"Failed to notify merchant of dispute {dispute.id}: {str(e)}")

    def _notify_customer_of_dispute_creation(self, dispute, customer):
        """Send confirmation notification to customer"""
        try:
            context = {
                'customer_name': f"{customer.first_name} {customer.last_name}".strip(),
                'transaction_id': dispute.transaction.id,
                'amount': float(dispute.transaction.amount),
                'currency': dispute.transaction.currency,
                'dispute_id': dispute.id,
                'merchant_name': dispute.transaction.merchant.business_name if dispute.transaction.merchant else 'Merchant'
            }
            
            # Send email notification
            NotificationService.send_notification(
                notification_type='dispute_confirmation',
                recipient_email=customer.email,
                recipient_phone=getattr(customer, 'phone', None),
                context=context,
                channels=['email']
            )
            
            logger.info(f"Confirmation sent to customer {customer.email} for dispute {dispute.id}")
            
        except Exception as e:
            logger.error(f"Failed to send confirmation to customer for dispute {dispute.id}: {str(e)}")

    def _notify_merchant_of_positive_feedback(self, dispute, merchant):
        """Send notification to merchant about positive feedback"""
        try:
            context = {
                'merchant_name': merchant.business_name,
                'customer_name': f"{dispute.customer.user.first_name} {dispute.customer.user.last_name}".strip(),
                'dispute_id': dispute.id,
                'feedback': dispute.customer_feedback
            }
            
            # Send email notification
            NotificationService.send_notification(
                notification_type='dispute_positive_feedback',
                recipient_email=merchant.user.email,
                context=context,
                channels=['email']
            )
            
            logger.info(f"Positive feedback notification sent to merchant {merchant.business_name}")
            
        except Exception as e:
            logger.error(f"Failed to send positive feedback notification: {str(e)}")

    def _escalate_unsatisfied_dispute(self, dispute):
        """Automatically escalate unsatisfied disputes to admin"""
        try:
            dispute.escalate_to_admin(
                escalation_reason=f"Customer not satisfied with resolution. Feedback: {dispute.customer_feedback}"
            )
            
            # Notify admin of escalation
            context = {
                'dispute_id': dispute.id,
                'customer_name': f"{dispute.customer.user.first_name} {dispute.customer.user.last_name}".strip(),
                'merchant_name': dispute.transaction.merchant.business_name if dispute.transaction.merchant else 'Merchant',
                'reason': dispute.reason,
                'feedback': dispute.customer_feedback
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
            
            logger.info(f"Dispute {dispute.id} escalated to admin due to customer dissatisfaction")
            
        except Exception as e:
            logger.error(f"Failed to escalate unsatisfied dispute {dispute.id}: {str(e)}")
