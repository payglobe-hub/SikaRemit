"""
Merchant Payout System Serializers - Real financial data serialization
"""

from rest_framework import serializers
from .models_payout import (
    MerchantRevenue,
    MerchantPayout,
    MerchantSettlementSettings,
    MerchantRevenueSummary
)

class MerchantRevenueSerializer(serializers.ModelSerializer):
    """Serializer for merchant revenue records"""
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    customer_name = serializers.SerializerMethodField()
    product_name = serializers.CharField(source='order_item.product.name', read_only=True)
    quantity = serializers.IntegerField(source='order_item.quantity', read_only=True)
    unit_price = serializers.DecimalField(
        source='order_item.price',
        max_digits=10,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = MerchantRevenue
        fields = [
            'id', 'order_number', 'customer_name', 'product_name',
            'quantity', 'unit_price', 'gross_amount', 'platform_fee',
            'net_amount', 'is_settled', 'settled_at', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'settled_at']

    def get_customer_name(self, obj):
        """Get customer name from order"""
        user = obj.order.user
        return f"{user.first_name} {user.last_name}".strip() or user.email

class MerchantPayoutSerializer(serializers.ModelSerializer):
    """Serializer for merchant payout records"""
    revenue_count = serializers.IntegerField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payout_method_display = serializers.CharField(source='get_payout_method_display', read_only=True)

    class Meta:
        model = MerchantPayout
        fields = [
            'id', 'payout_reference', 'payout_method', 'payout_method_display',
            'total_amount', 'fee_amount', 'net_amount', 'status', 'status_display',
            'revenue_count', 'processed_at', 'completed_at', 'transaction_id',
            'bank_name', 'account_number', 'account_holder_name', 'mobile_number',
            'failure_reason', 'notes', 'created_at'
        ]
        read_only_fields = [
            'id', 'payout_reference', 'revenue_count', 'processed_at',
            'completed_at', 'transaction_id', 'created_at'
        ]

class MerchantSettlementSettingsSerializer(serializers.ModelSerializer):
    """Serializer for merchant settlement settings"""

    class Meta:
        model = MerchantSettlementSettings
        fields = [
            'id', 'default_payout_method', 'auto_payout_enabled',
            'minimum_payout_amount', 'payout_schedule', 'bank_name',
            'account_number', 'account_holder_name', 'routing_number',
            'mobile_money_provider', 'mobile_money_number', 'tax_id',
            'tax_withholding_rate', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class MerchantRevenueSummarySerializer(serializers.ModelSerializer):
    """Serializer for revenue summary records"""
    store_name = serializers.CharField(source='store.name', read_only=True)
    merchant_name = serializers.CharField(source='merchant.get_full_name', read_only=True)

    class Meta:
        model = MerchantRevenueSummary
        fields = [
            'id', 'store_name', 'merchant_name', 'period_start', 'period_end',
            'period_type', 'gross_revenue', 'platform_fees', 'net_revenue',
            'order_count', 'item_count', 'is_settled', 'settled_amount', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

class PayoutRequestSerializer(serializers.Serializer):
    """Serializer for payout request validation"""
    payout_method = serializers.ChoiceField(
        choices=MerchantPayout.PAYOUT_METHODS,
        required=False
    )

    def validate(self, data):
        """Validate payout request"""
        request = self.context.get('request')
        if not request or not request.user:
            raise serializers.ValidationError("Authentication required")

        # Check if merchant has settlement settings
        try:
            settings = MerchantSettlementSettings.objects.get(merchant=request.user)
        except MerchantSettlementSettings.DoesNotExist:
            raise serializers.ValidationError(
                "Settlement settings not configured. Please set up payout preferences first."
            )

        # Check if merchant has pending revenue
        unsettled_revenue = MerchantRevenue.objects.filter(
            merchant=request.user,
            is_settled=False
        )

        if not unsettled_revenue.exists():
            raise serializers.ValidationError("No pending revenue available for payout")

        # Calculate total amount
        total_amount = unsettled_revenue.aggregate(
            total=Sum('net_amount')
        )['total'] or Decimal('0')

        # Check minimum payout amount
        if total_amount < settings.minimum_payout_amount:
            raise serializers.ValidationError(
                f"Minimum payout amount is {settings.minimum_payout_amount}. "
                f"Current pending: {total_amount}"
            )

        return data
