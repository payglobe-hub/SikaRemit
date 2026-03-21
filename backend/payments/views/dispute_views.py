"""
Dispute Management API Views
Provides REST endpoints for admin dispute management
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from users.permissions import IsAdminUser
from rest_framework import serializers
from django.db.models import Count, Avg, F
from django.db.models.functions import Coalesce
from django.utils import timezone
from datetime import timedelta

from ..models.dispute import Dispute
from ..models.transaction import Transaction

class DisputeSerializer(serializers.ModelSerializer):
    transaction_id = serializers.CharField(source='transaction.id', read_only=True)
    transaction_amount = serializers.DecimalField(
        source='transaction.amount', max_digits=12, decimal_places=2, read_only=True
    )
    transaction_currency = serializers.CharField(source='transaction.currency', read_only=True)
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.SerializerMethodField()
    merchant_name = serializers.SerializerMethodField()
    resolved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Dispute
        fields = [
            'id', 'transaction_id', 'transaction_amount', 'transaction_currency',
            'customer_name', 'customer_email', 'merchant_name',
            'reason', 'status', 'resolution', 'created_at', 'updated_at',
            'resolved_at', 'resolved_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'resolved_at']

    def get_customer_name(self, obj):
        if obj.transaction.customer and obj.transaction.customer.user:
            user = obj.transaction.customer.user
            return f"{user.first_name} {user.last_name}".strip() or user.email
        return None

    def get_customer_email(self, obj):
        if obj.transaction.customer and obj.transaction.customer.user:
            return obj.transaction.customer.user.email
        return None

    def get_merchant_name(self, obj):
        if obj.transaction.merchant:
            return obj.transaction.merchant.business_name
        return None

    def get_resolved_by_name(self, obj):
        if obj.resolved_by:
            return f"{obj.resolved_by.first_name} {obj.resolved_by.last_name}".strip() or obj.resolved_by.email
        return None

class DisputeViewSet(viewsets.ModelViewSet):
    """
    Admin viewset for managing disputes
    """
    queryset = Dispute.objects.all().select_related(
        'transaction', 'transaction__customer', 'transaction__customer__user',
        'transaction__merchant', 'created_by', 'resolved_by'
    ).order_by('-created_at')
    serializer_class = DisputeSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter and status_filter != 'all':
            queryset = queryset.filter(status=status_filter)
        
        # Search
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                reason__icontains=search
            ) | queryset.filter(
                transaction__customer__user__email__icontains=search
            ) | queryset.filter(
                transaction__customer__user__first_name__icontains=search
            )
        
        return queryset

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get dispute statistics
        """
        total = Dispute.objects.count()
        open_disputes = Dispute.objects.filter(status=Dispute.OPEN).count()
        under_review = Dispute.objects.filter(status=Dispute.UNDER_REVIEW).count()
        resolved = Dispute.objects.filter(status__in=[Dispute.RESOLVED, Dispute.CLOSED]).count()

        # Calculate average resolution time
        resolved_disputes = Dispute.objects.filter(
            resolved_at__isnull=False
        ).annotate(
            resolution_time=F('resolved_at') - F('created_at')
        )
        
        avg_resolution_hours = 24  # default
        if resolved_disputes.exists():
            total_seconds = sum(
                (d.resolved_at - d.created_at).total_seconds() 
                for d in resolved_disputes 
                if d.resolved_at and d.created_at
            )
            count = resolved_disputes.count()
            if count > 0:
                avg_resolution_hours = round(total_seconds / count / 3600, 1)

        return Response({
            'total_disputes': total,
            'open_disputes': open_disputes,
            'under_review': under_review,
            'resolved_disputes': resolved,
            'avg_resolution_time_hours': avg_resolution_hours
        })

    @action(detail=True, methods=['post'])
    def mark_under_review(self, request, pk=None):
        """
        Mark a dispute as under review
        """
        dispute = self.get_object()
        if dispute.status != Dispute.OPEN:
            return Response(
                {'error': 'Only open disputes can be marked as under review'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        dispute.status = Dispute.UNDER_REVIEW
        dispute.save()
        
        return Response(DisputeSerializer(dispute).data)

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """
        Resolve a dispute
        """
        dispute = self.get_object()
        resolution = request.data.get('resolution')
        action_type = request.data.get('action', 'close')

        if not resolution:
            return Response(
                {'error': 'Resolution details are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if dispute.status in [Dispute.RESOLVED, Dispute.CLOSED]:
            return Response(
                {'error': 'Dispute is already resolved'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Handle different resolution actions
        if action_type == 'refund':
            # Process refund on the transaction
            transaction = dispute.transaction
            if transaction.status == 'completed':
                transaction.status = 'refunded'
                transaction.save()
            dispute.resolution = f"[REFUND PROCESSED] {resolution}"
        elif action_type == 'complete':
            # Complete the transaction
            transaction = dispute.transaction
            if transaction.status != 'completed':
                transaction.status = 'completed'
                transaction.save()
            dispute.resolution = f"[TRANSACTION COMPLETED] {resolution}"
        else:
            dispute.resolution = resolution

        dispute.status = Dispute.RESOLVED
        dispute.resolved_by = request.user
        dispute.resolved_at = timezone.now()
        dispute.save()

        return Response({
            'message': 'Dispute resolved successfully',
            'dispute': DisputeSerializer(dispute).data
        })

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """
        Close a dispute without resolution
        """
        dispute = self.get_object()
        
        if dispute.status in [Dispute.RESOLVED, Dispute.CLOSED]:
            return Response(
                {'error': 'Dispute is already closed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        dispute.close(request.user)
        
        return Response({
            'message': 'Dispute closed',
            'dispute': DisputeSerializer(dispute).data
        })
