from rest_framework import serializers
from ..models.cross_border import CrossBorderRemittance

class CrossBorderRemittanceSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.user.email', read_only=True)
    
    class Meta:
        model = CrossBorderRemittance
        fields = [
            'id', 'reference_number', 'user_reference_number', 'sender', 'sender_name',
            'sender_id_type', 'sender_id_number', 'sender_id_issuing_authority',
            'sender_account_type', 'sender_account_number', 'purpose_of_transfer',
            'recipient_name', 'recipient_phone', 'recipient_address', 'recipient_account_type',
            'recipient_account_number', 'recipient_country', 'beneficiary_institution_name',
            'beneficiary_institution_address', 'amount_sent', 'amount_received', 'exchange_rate',
            'fee', 'payment_method', 'status', 'created_at', 'reported_to_regulator',
            'recipient_verified', 'exempt_status', 'exemption_status'
        ]
        read_only_fields = ['id', 'reference_number', 'amount_received', 'exchange_rate', 'created_at', 'reported_to_regulator', 'recipient_verified']
