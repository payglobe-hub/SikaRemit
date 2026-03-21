from rest_framework import serializers
from ..models.ussd_transaction import SimpleUSSDTransaction as USSDTransaction

class USSDTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = USSDTransaction
        fields = [
            'id', 'session_id', 'phone_number', 'amount', 'status',
            'transaction', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
