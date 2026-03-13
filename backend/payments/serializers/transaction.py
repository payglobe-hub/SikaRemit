from rest_framework import serializers
from payments.models.transaction import Transaction

class TransactionSerializer(serializers.ModelSerializer):
    customer_id = serializers.IntegerField(source='customer.id', read_only=True, allow_null=True)
    merchant_id = serializers.IntegerField(source='merchant.id', read_only=True, allow_null=True)
    payment_method_type = serializers.CharField(source='payment_method.method_type', read_only=True, allow_null=True)
    
    class Meta:
        model = Transaction
        fields = [
            'id',
            'customer_id',
            'merchant_id',
            'amount',
            'currency',
            'status',
            'payment_method',
            'payment_method_type',
            'description',
            'metadata',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'status']
        component_name = 'PaymentsTransaction'
        
    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Amount must be positive')
        return value

class AdminTransactionSerializer(TransactionSerializer):
    """Admin-specific transaction serializer with dispute information"""

    # Dispute information
    dispute_id = serializers.SerializerMethodField()
    dispute_status = serializers.SerializerMethodField()
    dispute_reason = serializers.SerializerMethodField()
    dispute_created_at = serializers.SerializerMethodField()

    class Meta(TransactionSerializer.Meta):
        fields = TransactionSerializer.Meta.fields + [
            'dispute_id', 'dispute_status', 'dispute_reason', 'dispute_created_at'
        ]

    def get_dispute_id(self, obj):
        return obj.dispute.id if hasattr(obj, 'dispute') else None

    def get_dispute_status(self, obj):
        return obj.dispute.status if hasattr(obj, 'dispute') else None

    def get_dispute_reason(self, obj):
        return obj.dispute.reason if hasattr(obj, 'dispute') else None

    def get_dispute_created_at(self, obj):
        return obj.dispute.created_at if hasattr(obj, 'dispute') else None
