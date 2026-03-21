from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.utils import timezone
from decimal import Decimal
from ..models.fees import FeeConfiguration, FeeCalculationLog, MerchantFeeOverride
from ..services.fee_calculator import DynamicFeeCalculator

class FeeConfigurationSerializer(serializers.ModelSerializer):
    """Serializer for FeeConfiguration model"""
    fee_type_display = serializers.CharField(source='get_fee_type_display', read_only=True)
    calculation_method_display = serializers.CharField(source='get_calculation_method_display', read_only=True)
    merchant_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = FeeConfiguration
        fields = [
            'id', 'name', 'fee_type', 'fee_type_display', 'description',
            'merchant', 'merchant_name', 'is_platform_default',
            'corridor_from', 'corridor_to', 'currency',
            'calculation_method', 'calculation_method_display',
            'fixed_fee', 'percentage_fee', 'min_fee', 'max_fee',
            'min_transaction_amount', 'max_transaction_amount',
            'effective_from', 'effective_to',
            'is_active', 'requires_approval',
            'created_by', 'created_by_name', 'approved_by',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'approved_by']

    def get_merchant_name(self, obj):
        if obj.merchant:
            return obj.merchant.business_name
        return None

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.email
        return None

class FeeConfigurationViewSet(viewsets.ModelViewSet):
    """
    API for managing fee configurations
    Admin-only for creating/editing platform fees
    Merchants can only view applicable fees
    """
    permission_classes = [IsAuthenticated]
    serializer_class = FeeConfigurationSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            # Admin can see all fee configurations
            return FeeConfiguration.objects.all().select_related('merchant', 'created_by', 'approved_by')
        elif hasattr(user, 'merchant_profile') and user.merchant_profile:
            # Merchants can see their own fees and platform defaults
            merchant = user.merchant_profile
            return FeeConfiguration.objects.filter(
                Q(merchant=merchant) | Q(merchant__isnull=True, is_platform_default=True)
            ).select_related('merchant', 'created_by', 'approved_by')
        else:
            # Regular users see only platform defaults
            return FeeConfiguration.objects.filter(
                merchant__isnull=True,
                is_platform_default=True,
                is_active=True
            ).select_related('merchant', 'created_by', 'approved_by')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['post'])
    def calculate_fee(self, request):
        """
        Calculate fee for a transaction
        """
        # Support both fee_type and transaction_type for compatibility
        fee_type = request.data.get('fee_type') or request.data.get('transaction_type')
        amount = request.data.get('amount')
        corridor_from = request.data.get('corridor_from')
        corridor_to = request.data.get('corridor_to') or request.data.get('country')
        currency = request.data.get('currency', 'USD')

        if not fee_type or not amount:
            return Response(
                {'error': 'fee_type/transaction_type and amount are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            amount = Decimal(str(amount))
        except:
            return Response(
                {'error': 'Invalid amount format'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get merchant from user if applicable
        merchant = None
        if hasattr(request.user, 'merchant_profile') and request.user.merchant_profile:
            merchant = request.user.merchant_profile

        result = DynamicFeeCalculator.calculate_fee(
            fee_type=fee_type,
            amount=amount,
            merchant=merchant,
            corridor_from=corridor_from,
            corridor_to=corridor_to,
            currency=currency,
            user=request.user,
            transaction_id=request.data.get('transaction_id')
        )

        return Response(result)

    @action(detail=False, methods=['get'])
    def preview_fee(self, request):
        """
        Preview fee calculation without logging
        """
        fee_type = request.query_params.get('fee_type')
        amount = request.query_params.get('amount')
        corridor_from = request.query_params.get('corridor_from')
        corridor_to = request.query_params.get('corridor_to')
        currency = request.query_params.get('currency', 'USD')

        if not fee_type or not amount:
            return Response(
                {'error': 'fee_type and amount are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            amount = Decimal(str(amount))
        except:
            return Response(
                {'error': 'Invalid amount format'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get merchant from user if applicable
        merchant = None
        if hasattr(request.user, 'merchant_profile') and request.user.merchant_profile:
            merchant = request.user.merchant_profile

        result = DynamicFeeCalculator.get_fee_preview(
            fee_type=fee_type,
            amount=amount,
            merchant=merchant,
            corridor_from=corridor_from,
            corridor_to=corridor_to,
            currency=currency
        )

        return Response(result)

    @action(detail=False, methods=['get'])
    def merchant_summary(self, request):
        """
        Get fee configuration summary for merchant
        """
        if not hasattr(request.user, 'merchant_profile') or not request.user.merchant_profile:
            return Response(
                {'error': 'User is not a merchant'},
                status=status.HTTP_403_FORBIDDEN
            )

        merchant = request.user.merchant_profile
        summary = DynamicFeeCalculator.get_merchant_fee_summary(merchant)

        return Response({
            'merchant': merchant.business_name,
            'fee_configurations': summary
        })

class MerchantFeeOverrideViewSet(viewsets.ModelViewSet):
    """
    API for merchants to request fee overrides
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'merchant_profile') and user.merchant_profile:
            return MerchantFeeOverride.objects.filter(merchant=user.merchant_profile)
        return MerchantFeeOverride.objects.none()

    def get_serializer_class(self):
        from payments.serializers.fees import MerchantFeeOverrideSerializer
        return MerchantFeeOverrideSerializer

    def perform_create(self, serializer):
        if hasattr(self.request.user, 'merchant_profile') and self.request.user.merchant_profile:
            serializer.save(
                merchant=self.request.user.merchant_profile,
                requested_by=self.request.user
            )
        else:
            raise serializers.ValidationError("User is not associated with a merchant")

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Admin action to approve fee override
        """
        if not request.user.is_staff and not request.user.is_superuser:
            return Response(
                {'error': 'Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )

        override = self.get_object()
        override.status = 'approved'
        override.reviewed_by = request.user
        override.reviewed_at = timezone.now()
        override.save()

        # Create the actual fee configuration
        FeeConfiguration.objects.create(
            name=f"{override.merchant.business_name} - {override.fee_configuration.fee_type}",
            fee_type=override.fee_configuration.fee_type,
            merchant=override.merchant,
            corridor_from=override.fee_configuration.corridor_from,
            corridor_to=override.fee_configuration.corridor_to,
            currency=override.fee_configuration.currency,
            calculation_method=override.fee_configuration.calculation_method,
            fixed_fee=override.proposed_fixed_fee or override.fee_configuration.fixed_fee,
            percentage_fee=override.proposed_percentage_fee or override.fee_configuration.percentage_fee,
            min_fee=override.proposed_min_fee or override.fee_configuration.min_fee,
            max_fee=override.proposed_max_fee or override.fee_configuration.max_fee,
            effective_from=override.effective_from or timezone.now(),
            effective_to=override.effective_to,
            is_active=True,
            requires_approval=False,
            created_by=request.user,
            approved_by=request.user,
        )

        return Response({'message': 'Fee override approved'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Admin action to reject fee override
        """
        if not request.user.is_staff and not request.user.is_superuser:
            return Response(
                {'error': 'Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )

        override = self.get_object()
        override.status = 'rejected'
        override.reviewed_by = request.user
        override.reviewed_at = timezone.now()
        override.review_notes = request.data.get('notes', '')
        override.save()

        return Response({'message': 'Fee override rejected'})

class FeeCalculationLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API for viewing fee calculation logs
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            # Admin can see all logs
            return FeeCalculationLog.objects.all()
        elif hasattr(user, 'merchant_profile') and user.merchant_profile:
            # Merchants can see logs for their transactions
            return FeeCalculationLog.objects.filter(merchant=user.merchant_profile)
        else:
            # Users can see logs for their own transactions
            return FeeCalculationLog.objects.filter(user=user)

    def get_serializer_class(self):
        from payments.serializers.fees import FeeCalculationLogSerializer
        return FeeCalculationLogSerializer
