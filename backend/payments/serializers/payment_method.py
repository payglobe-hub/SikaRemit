from rest_framework import serializers
from ..models.payment_method import PaymentMethod, MOBILE_PROVIDERS

class PaymentMethodSerializer(serializers.ModelSerializer):
    provider = serializers.ChoiceField(
        choices=MOBILE_PROVIDERS,
        write_only=True,
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = PaymentMethod
        fields = [
            'id', 
            'method_type',
            'details',
            'is_default',
            'created_at',
            'updated_at',
            'provider'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def to_representation(self, instance):
        """Ensure consistent output format for frontend"""
        data = super().to_representation(instance)
        # Ensure details is always a dict
        if not isinstance(data.get('details'), dict):
            data['details'] = {}
        return data
        
    def validate(self, data):
        method_type = data.get('method_type')
        details = data.get('details', {})
        
        # Mobile money validation
        if method_type in PaymentMethod.MOBILE_MONEY_TYPES:
            if 'provider' not in data and 'provider' not in details:
                raise serializers.ValidationError({
                    'provider': 'Required field for mobile money'
                })
            if 'phone_number' not in details:
                raise serializers.ValidationError({
                    'phone_number': 'Required for mobile money payments'
                })
            # Move provider to details if provided at root
            if 'provider' in data:
                details['provider'] = data.pop('provider')
                data['details'] = details
            # Move phone_number to details if provided at root
            if 'phone_number' in data:
                details['phone_number'] = data.pop('phone_number')
                data['details'] = details
                
        # Card validation
        elif method_type == PaymentMethod.CARD:
            required = ['last4', 'exp_month', 'exp_year', 'brand']
            if not all(k in details for k in required):
                raise serializers.ValidationError({
                    'details': 'Card payment requires: ' + ', '.join(required)
                })
                
        # Bank transfer validation
        elif method_type == PaymentMethod.BANK:
            if not all(k in details for k in ['account_number', 'bank_name']):
                raise serializers.ValidationError({
                    'details': 'Bank transfer requires account details'
                })
                
        return data
