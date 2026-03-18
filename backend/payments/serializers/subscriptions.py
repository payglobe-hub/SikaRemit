from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone

from ..models.subscriptions import (
    SubscriptionPlan, Subscription, SubscriptionPayment,
    SubscriptionUsage, SubscriptionFeature, PlanFeature,
    SubscriptionDiscount
)

User = get_user_model()

class SubscriptionFeatureSerializer(serializers.ModelSerializer):
    """Serializer for subscription features"""
    class Meta:
        model = SubscriptionFeature
        fields = [
            'id', 'name', 'display_name', 'description', 'feature_type',
            'default_limit', 'icon', 'color', 'is_active'
        ]

class PlanFeatureSerializer(serializers.ModelSerializer):
    """Serializer for plan features"""
    feature = SubscriptionFeatureSerializer(read_only=True)

    class Meta:
        model = PlanFeature
        fields = [
            'id', 'feature', 'enabled', 'limit_value', 'custom_description'
        ]

class SubscriptionPlanSerializer(serializers.ModelSerializer):
    """Serializer for subscription plans"""
    features = PlanFeatureSerializer(many=True, read_only=True)
    price_display = serializers.ReadOnlyField()
    annual_price = serializers.ReadOnlyField()
    has_trial = serializers.ReadOnlyField()

    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'name', 'description', 'plan_type', 'billing_cycle',
            'price', 'currency', 'trial_days', 'max_users',
            'max_transactions_per_month', 'max_invoices_per_month',
            'max_storage_gb', 'features', 'is_active', 'is_popular',
            'display_order', 'price_display', 'annual_price', 'has_trial',
            'created_at', 'updated_at'
        ]

class SubscriptionPaymentSerializer(serializers.ModelSerializer):
    """Serializer for subscription payments"""
    class Meta:
        model = SubscriptionPayment
        fields = [
            'id', 'subscription', 'amount', 'currency', 'billing_period_start',
            'billing_period_end', 'status', 'transaction_id', 'payment_method',
            'failure_reason', 'retry_count', 'next_retry_date',
            'refunded_amount', 'refund_reason', 'created_at', 'processed_at'
        ]

class SubscriptionUsageSerializer(serializers.ModelSerializer):
    """Serializer for subscription usage"""
    feature = SubscriptionFeatureSerializer(read_only=True)
    usage_percentage = serializers.ReadOnlyField()
    is_over_limit = serializers.ReadOnlyField()

    class Meta:
        model = SubscriptionUsage
        fields = [
            'id', 'subscription', 'feature', 'current_usage', 'limit',
            'period_start', 'period_end', 'auto_reset', 'usage_percentage',
            'is_over_limit', 'created_at', 'updated_at'
        ]

class SubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for subscriptions"""
    plan = SubscriptionPlanSerializer(read_only=True)
    plan_id = serializers.IntegerField(write_only=True)

    # Computed fields
    is_on_trial = serializers.ReadOnlyField()
    trial_days_remaining = serializers.ReadOnlyField()
    days_until_next_billing = serializers.ReadOnlyField()

    class Meta:
        model = Subscription
        fields = [
            'id', 'plan', 'plan_id', 'status', 'start_date', 'current_period_start',
            'current_period_end', 'trial_end', 'canceled_at', 'payment_method_id',
            'cancel_at_period_end', 'cancellation_reason', 'is_on_trial',
            'trial_days_remaining', 'days_until_next_billing', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'start_date', 'current_period_start', 'current_period_end',
            'trial_end', 'canceled_at', 'is_on_trial', 'trial_days_remaining',
            'days_until_next_billing', 'created_at', 'updated_at'
        ]

class SubscriptionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating subscriptions"""
    plan_id = serializers.IntegerField()
    payment_method_id = serializers.CharField()

    class Meta:
        model = Subscription
        fields = ['plan_id', 'payment_method_id']

    def validate_plan_id(self, value):
        """Ensure plan exists and is active"""
        try:
            plan = SubscriptionPlan.objects.get(id=value, is_active=True)
            return value
        except SubscriptionPlan.DoesNotExist:
            raise serializers.ValidationError("Plan not found or inactive")

class SubscriptionDiscountSerializer(serializers.ModelSerializer):
    """Serializer for subscription discounts"""
    is_valid = serializers.ReadOnlyField()

    class Meta:
        model = SubscriptionDiscount
        fields = [
            'id', 'code', 'name', 'description', 'discount_type',
            'discount_value', 'applicable_plans', 'first_time_only',
            'max_uses', 'valid_from', 'valid_until', 'total_uses',
            'is_active', 'is_valid', 'created_at'
        ]

class SubscriptionAnalyticsSerializer(serializers.Serializer):
    """Serializer for subscription analytics"""
    overview = serializers.DictField()
    subscriptions = serializers.ListField()
    billing_history = serializers.ListField()

class FeatureAccessCheckSerializer(serializers.Serializer):
    """Serializer for feature access checks"""
    features = serializers.ListField(child=serializers.CharField())

class FeatureAccessResultSerializer(serializers.Serializer):
    """Serializer for feature access results"""
    has_access = serializers.BooleanField()
    usage = serializers.DictField(required=False)
    error = serializers.CharField(required=False)
