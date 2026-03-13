from rest_framework import serializers
from ..models import POSDevice, POSTransaction
from ..pos_integration import POSDeviceType, POSTransactionType


class POSDeviceSerializer(serializers.ModelSerializer):
    """Serializer for POS Device model"""

    class Meta:
        model = POSDevice
        fields = [
            'device_id', 'device_type', 'device_name', 'device_info',
            'location', 'status', 'last_seen', 'created_at', 'updated_at'
        ]
        read_only_fields = ['device_id', 'created_at', 'updated_at', 'last_seen']


class POSDeviceRegistrationSerializer(serializers.Serializer):
    """Serializer for POS device registration"""

    device_type = serializers.ChoiceField(choices=[
        (POSDeviceType.VIRTUAL_TERMINAL, 'Virtual Terminal'),
        (POSDeviceType.MOBILE_READER, 'Mobile Reader'),
        (POSDeviceType.COUNTERTOP, 'Countertop Terminal'),
        (POSDeviceType.INTEGRATED, 'Integrated POS'),
        (POSDeviceType.KIOSK, 'Kiosk')
    ])
    device_name = serializers.CharField(max_length=100)
    device_info = serializers.JSONField(required=False, default=dict)

    def validate_device_type(self, value):
        """Validate device type"""
        valid_types = [POSDeviceType.VIRTUAL_TERMINAL, POSDeviceType.MOBILE_READER,
                      POSDeviceType.COUNTERTOP, POSDeviceType.INTEGRATED, POSDeviceType.KIOSK]
        if value not in valid_types:
            raise serializers.ValidationError(f"Invalid device type. Must be one of: {', '.join(valid_types)}")
        return value


class POSTransactionSerializer(serializers.ModelSerializer):
    """Serializer for POS Transaction model"""

    device_type = serializers.CharField(source='device.device_type', read_only=True)
    device_id = serializers.CharField(source='device.device_id', read_only=True)

    class Meta:
        model = POSTransaction
        fields = [
            'transaction_id', 'device_type', 'device_id', 'transaction_type',
            'amount', 'currency', 'status', 'card_last4', 'card_brand',
            'processor_response', 'created_at'
        ]
        read_only_fields = ['transaction_id', 'created_at']


class POSTransactionCreateSerializer(serializers.Serializer):
    """Serializer for creating POS transactions"""

    device_id = serializers.CharField(max_length=50)
    device_type = serializers.ChoiceField(choices=[
        (POSDeviceType.VIRTUAL_TERMINAL, 'Virtual Terminal'),
        (POSDeviceType.MOBILE_READER, 'Mobile Reader'),
        (POSDeviceType.COUNTERTOP, 'Countertop Terminal'),
        (POSDeviceType.INTEGRATED, 'Integrated POS'),
        (POSDeviceType.KIOSK, 'Kiosk')
    ])
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0.01)
    currency = serializers.CharField(max_length=3, default='USD')
    transaction_type = serializers.ChoiceField(choices=[
        (POSTransactionType.SALE, 'Sale'),
        (POSTransactionType.REFUND, 'Refund'),
        (POSTransactionType.VOID, 'Void'),
        (POSTransactionType.PRE_AUTH, 'Pre-authorization'),
        (POSTransactionType.CAPTURE, 'Capture')
    ], default=POSTransactionType.SALE)

    # Virtual Terminal specific fields
    card_data = serializers.JSONField(required=False)

    # Countertop Terminal specific fields
    terminal_ip = serializers.IPAddressField(required=False)
    terminal_port = serializers.IntegerField(min_value=1, max_value=65535, default=8080, required=False)

    # Optional fields
    customer_info = serializers.JSONField(required=False, default=dict)
    metadata = serializers.JSONField(required=False, default=dict)

    def validate(self, data):
        """Validate transaction data based on device type"""
        device_type = data.get('device_type')
        transaction_type = data.get('transaction_type')

        if device_type == POSDeviceType.VIRTUAL_TERMINAL:
            if not data.get('card_data'):
                raise serializers.ValidationError({
                    'card_data': 'Card data is required for virtual terminal transactions'
                })

        elif device_type == POSDeviceType.COUNTERTOP:
            if not data.get('terminal_ip'):
                raise serializers.ValidationError({
                    'terminal_ip': 'Terminal IP is required for countertop terminal transactions'
                })

        # Validate currency
        if data.get('currency') and len(data['currency']) != 3:
            raise serializers.ValidationError({
                'currency': 'Currency must be a 3-letter code'
            })

        return data
