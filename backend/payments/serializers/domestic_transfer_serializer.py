from rest_framework import serializers
from payments.models import DomesticTransfer, PaymentMethod
from accounts.models import Recipient
from .payment_method import PaymentMethodSerializer

class DomesticTransferSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.user.get_full_name', read_only=True)
    recipient_name = serializers.CharField(source='recipient.name', read_only=True)
    payment_method_details = PaymentMethodSerializer(source='payment_method', read_only=True)
    
    # For input, accept recipient details
    recipient = serializers.DictField(write_only=True, required=True)
    
    # Make payment_method optional for SikaRemit wallet transfers
    payment_method = serializers.PrimaryKeyRelatedField(
        queryset=PaymentMethod.objects.all(),
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = DomesticTransfer
        fields = [
            'id', 'sender', 'amount', 'currency', 'status',
            'reference_number', 'description', 'payment_method', 'fee',
            'processed_at', 'created_at', 'updated_at',
            'sender_name', 'recipient_name', 'payment_method_details', 'recipient'
        ]
        read_only_fields = ['id', 'reference_number', 'processed_at', 'created_at', 'updated_at', 'fee', 'sender']
    
    def validate_payment_method(self, value):
        """Ensure payment method belongs to the current user"""
        if value is None:
            return value
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            if value.user != request.user:
                raise serializers.ValidationError("Payment method does not belong to you")
        return value
    
    def _normalize_mobile_provider(self, provider):
        """Normalize mobile provider name to match backend constants"""
        if not provider:
            return None
        provider_lower = provider.lower()
        provider_map = {
            'mtn': 'mtn_momo',
            'mtn_momo': 'mtn_momo',
            'mtn mobile money': 'mtn_momo',
            'telecel': 'telecel',
            'telecel cash': 'telecel',
            'airtel_tigo': 'airtel_tigo',
            'airteltigo': 'airtel_tigo',
            'airteltigo money': 'airtel_tigo',
            'g-money': 'g_money',
            'g_money': 'g_money',
            'g money': 'g_money',
            'gmoney': 'g_money',
        }
        return provider_map.get(provider_lower, provider_lower)
    
    def create(self, validated_data):
        recipient_details = validated_data.pop('recipient')
        sender = validated_data['sender']
        
        # Create or get recipient based on type to prevent duplicates
        if recipient_details['type'] == 'bank':
            recipient, created = Recipient.objects.get_or_create(
                user=sender.user,
                recipient_type=recipient_details['type'],
                account_number=recipient_details.get('accountNumber'),
                defaults={
                    'name': recipient_details['name'],
                    'bank_name': recipient_details.get('bankName'),
                    'bank_branch': recipient_details.get('bankBranch'),
                }
            )
        elif recipient_details['type'] == 'mobile':
            mobile_provider = recipient_details.get('mobileProvider')
            if mobile_provider:
                # Normalize the mobile provider name
                normalized_provider = self._normalize_mobile_provider(mobile_provider)
                recipient, created = Recipient.objects.get_or_create(
                    user=sender.user,
                    recipient_type=recipient_details['type'],
                    phone=recipient_details.get('phone'),
                    defaults={
                        'name': recipient_details['name'],
                        'mobile_provider': normalized_provider,
                    }
                )
                if not created:
                    recipient.mobile_provider = normalized_provider
                    recipient.save()
            else:
                recipient, created = Recipient.objects.get_or_create(
                    user=sender.user,
                    recipient_type=recipient_details['type'],
                    phone=recipient_details.get('phone'),
                    defaults={
                        'name': recipient_details['name'],
                    }
                )
        elif recipient_details['type'] == 'sikaremit':
            # SikaRemit wallet transfer - recipient is identified by phone/email
            sikaremit_identifier = recipient_details.get('sikaremit_identifier', '')
            recipient, created = Recipient.objects.get_or_create(
                user=sender.user,
                recipient_type='sikaremit',
                phone=sikaremit_identifier if '@' not in sikaremit_identifier else '',
                email=sikaremit_identifier if '@' in sikaremit_identifier else '',
                defaults={
                    'name': recipient_details.get('name', 'SikaRemit User'),
                }
            )
        else:
            # Fallback for other types
            recipient, created = Recipient.objects.get_or_create(
                user=sender.user,
                name=recipient_details['name'],
                recipient_type=recipient_details['type'],
                defaults={
                    'phone': recipient_details.get('phone'),
                    'account_number': recipient_details.get('accountNumber'),
                    'bank_name': recipient_details.get('bankName'),
                    'bank_branch': recipient_details.get('bankBranch'),
                    'mobile_provider': recipient_details.get('mobileProvider'),
                }
            )
        
        validated_data['recipient'] = recipient
        
        # Generate reference number
        import uuid
        validated_data['reference_number'] = str(uuid.uuid4())[:16].upper()
        
        return super().create(validated_data)
