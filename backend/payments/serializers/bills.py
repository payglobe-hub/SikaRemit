from rest_framework import serializers
from ..models import Bill

class BillSerializer(serializers.ModelSerializer):
    payment_method_name = serializers.CharField(source='payment_method.display_name', read_only=True)
    
    class Meta:
        model = Bill
        fields = [
            'id', 'bill_issuer', 'bill_reference', 'bill_type', 'amount', 'currency',
            'due_date', 'description', 'status', 'late_fee', 'is_overdue', 'days_overdue',
            'payment_method', 'payment_method_name', 'paid_at', 'transaction_id',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_overdue', 'days_overdue', 'paid_at', 'created_at', 'updated_at']

class CreateBillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bill
        fields = [
            'bill_issuer', 'bill_reference', 'bill_type', 'amount', 'currency',
            'due_date', 'description'
        ]

class AddLateFeeSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)

class PayBillSerializer(serializers.Serializer):
    payment_method_id = serializers.CharField()
