from rest_framework import serializers
from ..models.dispute import Dispute
from ..models.transaction import Transaction

class DisputeCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating disputes by customers"""
    
    class Meta:
        model = Dispute
        fields = [
            'transaction', 'reason', 'dispute_type'
        ]
    
    def validate_transaction(self, value):
        """Validate that customer can dispute this transaction"""
        user = self.context['request'].user
        
        # Check if transaction belongs to this customer
        if value.customer.user != user:
            raise serializers.ValidationError(
                "You can only dispute your own transactions"
            )
        
        # Check if dispute already exists
        if hasattr(value, 'dispute'):
            raise serializers.ValidationError(
                "A dispute already exists for this transaction"
            )
        
        # Check if transaction is completed (can only dispute completed transactions)
        if value.status != Transaction.COMPLETED:
            raise serializers.ValidationError(
                "You can only dispute completed transactions"
            )
        
        return value

class DisputeDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for dispute information"""
    
    transaction_id = serializers.CharField(source='transaction.id', read_only=True)
    transaction_amount = serializers.DecimalField(
        source='transaction.amount', max_digits=12, decimal_places=2, read_only=True
    )
    transaction_currency = serializers.CharField(source='transaction.currency', read_only=True)
    transaction_date = serializers.DateTimeField(source='transaction.created_at', read_only=True)
    
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.SerializerMethodField()
    merchant_name = serializers.SerializerMethodField()
    merchant_business_name = serializers.SerializerMethodField()
    
    # Response and resolution info
    merchant_response_time = serializers.DateTimeField(source='merchant_responded_at', read_only=True)
    merchant_resolution_time = serializers.DateTimeField(source='merchant_resolved_at', read_only=True)
    
    # Escalation info
    escalated_time = serializers.DateTimeField(source='escalated_at', read_only=True)
    
    # Status tracking
    days_open = serializers.ReadOnlyField()
    is_escalated = serializers.ReadOnlyField()
    is_customer_merchant_dispute = serializers.ReadOnlyField()

    class Meta:
        model = Dispute
        fields = [
            'id', 'transaction_id', 'transaction_amount', 'transaction_currency', 'transaction_date',
            'customer_name', 'customer_email', 'merchant_name', 'merchant_business_name',
            'dispute_type', 'reason', 'status', 'resolution',
            'merchant_response', 'merchant_responded_at', 'merchant_resolution', 'merchant_resolved_at',
            'escalated_to_admin', 'escalated_at', 'escalation_reason',
            'customer_satisfied', 'customer_feedback',
            'created_at', 'updated_at', 'resolved_at', 'resolved_by',
            'days_open', 'is_escalated', 'is_customer_merchant_dispute'
        ]

    def get_customer_name(self, obj):
        if obj.customer and obj.customer.user:
            user = obj.customer.user
            return f"{user.first_name} {user.last_name}".strip() or user.email
        return None

    def get_customer_email(self, obj):
        if obj.customer and obj.customer.user:
            return obj.customer.user.email
        return None

    def get_merchant_name(self, obj):
        if obj.merchant and obj.merchant.user:
            user = obj.merchant.user
            return f"{user.first_name} {obj.merchant.business_name}".strip()
        return None

    def get_merchant_business_name(self, obj):
        if obj.merchant:
            return obj.merchant.business_name
        return None

class MerchantDisputeSerializer(serializers.ModelSerializer):
    """Serializer for merchants to view and respond to disputes"""
    
    transaction_id = serializers.CharField(source='transaction.id', read_only=True)
    transaction_amount = serializers.DecimalField(
        source='transaction.amount', max_digits=12, decimal_places=2, read_only=True
    )
    transaction_currency = serializers.CharField(source='transaction.currency', read_only=True)
    transaction_date = serializers.DateTimeField(source='transaction.created_at', read_only=True)
    
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.SerializerMethodField()
    
    # Time tracking
    days_open = serializers.ReadOnlyField()
    response_deadline = serializers.SerializerMethodField()

    class Meta:
        model = Dispute
        fields = [
            'id', 'transaction_id', 'transaction_amount', 'transaction_currency', 'transaction_date',
            'customer_name', 'customer_email', 'dispute_type', 'reason', 'status',
            'merchant_response', 'merchant_responded_at', 'merchant_resolution', 'merchant_resolved_at',
            'escalated_to_admin', 'escalated_at', 'escalation_reason',
            'customer_satisfied', 'customer_feedback',
            'created_at', 'updated_at', 'resolved_at',
            'days_open', 'response_deadline'
        ]
        read_only_fields = [
            'id', 'transaction_id', 'transaction_amount', 'transaction_currency', 'transaction_date',
            'customer_name', 'customer_email', 'dispute_type', 'reason', 'created_at', 'updated_at',
            'resolved_at', 'days_open', 'response_deadline'
        ]

    def get_customer_name(self, obj):
        if obj.customer and obj.customer.user:
            user = obj.customer.user
            return f"{user.first_name} {user.last_name}".strip() or user.email
        return None

    def get_customer_email(self, obj):
        if obj.customer and obj.customer.user:
            return obj.customer.user.email
        return None

    def get_response_deadline(self, obj):
        """Calculate response deadline (48 hours from creation)"""
        from django.utils import timezone
        import datetime
        
        deadline = obj.created_at + datetime.timedelta(hours=48)
        return deadline

class MerchantResponseSerializer(serializers.Serializer):
    """Serializer for merchant response to dispute"""
    
    response_text = serializers.CharField(
        max_length=2000,
        required=True,
        help_text="Merchant's response to the dispute"
    )

class MerchantResolutionSerializer(serializers.Serializer):
    """Serializer for merchant resolution of dispute"""
    
    resolution_text = serializers.CharField(
        max_length=2000,
        required=True,
        help_text="Resolution details for the dispute"
    )

class EscalationSerializer(serializers.Serializer):
    """Serializer for escalating disputes to admin"""
    
    escalation_reason = serializers.CharField(
        max_length=1000,
        required=True,
        help_text="Reason for escalating to admin"
    )

class CustomerFeedbackSerializer(serializers.Serializer):
    """Serializer for customer feedback on resolution"""
    
    satisfied = serializers.BooleanField(required=True)
    feedback_text = serializers.CharField(
        max_length=1000,
        required=False,
        allow_blank=True,
        help_text="Customer feedback on resolution"
    )

class CustomerDisputeListSerializer(serializers.ModelSerializer):
    """Serializer for customers to view their disputes"""
    
    transaction_id = serializers.CharField(source='transaction.id', read_only=True)
    transaction_amount = serializers.DecimalField(
        source='transaction.amount', max_digits=12, decimal_places=2, read_only=True
    )
    transaction_currency = serializers.CharField(source='transaction.currency', read_only=True)
    merchant_name = serializers.SerializerMethodField()
    
    days_open = serializers.ReadOnlyField()
    is_escalated = serializers.ReadOnlyField()

    class Meta:
        model = Dispute
        fields = [
            'id', 'transaction_id', 'transaction_amount', 'transaction_currency',
            'merchant_name', 'dispute_type', 'reason', 'status', 'resolution',
            'merchant_response', 'merchant_resolution',
            'escalated_to_admin', 'customer_satisfied',
            'created_at', 'updated_at', 'resolved_at',
            'days_open', 'is_escalated'
        ]

    def get_merchant_name(self, obj):
        if obj.merchant:
            return obj.merchant.business_name
        return None
