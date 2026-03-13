"""
Soft POS Serializers
Handles serialization for modern Soft POS features including NFC, mobile money, and smartphone devices
"""

from rest_framework import serializers
from ..models import (
    POSDevice, POSTransaction, NFCPayment, 
    MobileMoneyPayment, SmartphonePOSDevice
)
from ..soft_pos_integration import PaymentMethod, SoftPOSType


class SmartphonePOSSerializer(serializers.ModelSerializer):
    """Serializer for Smartphone POS Device configuration"""
    
    device_name = serializers.CharField(source='pos_device.device_name', read_only=True)
    device_id = serializers.CharField(source='pos_device.device_id', read_only=True)
    device_type = serializers.CharField(source='pos_device.device_type', read_only=True)
    status = serializers.CharField(source='pos_device.status', read_only=True)
    supports_nfc = serializers.BooleanField(source='pos_device.supports_nfc', read_only=True)
    supports_mobile_money = serializers.BooleanField(source='pos_device.supports_mobile_money', read_only=True)
    is_online = serializers.SerializerMethodField()
    
    class Meta:
        model = SmartphonePOSDevice
        fields = [
            'id', 'device_name', 'device_id', 'device_type', 'status',
            'device_model', 'os_type', 'os_version', 'app_version',
            'supports_nfc', 'supports_mobile_money', 'biometric_enabled',
            'pin_required', 'nfc_capable', 'bluetooth_capable', 'camera_available',
            'battery_level', 'last_heartbeat', 'is_online',
            'last_location_lat', 'last_location_lng', 'location_timestamp',
            'security_events', 'last_security_check', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'device_name', 'device_id', 'device_type', 'status',
            'last_heartbeat', 'security_events', 'last_security_check',
            'created_at', 'updated_at'
        ]
    
    def get_is_online(self, obj):
        """Check if device is online"""
        return obj.is_online()


class NFCPaymentSerializer(serializers.ModelSerializer):
    """Serializer for NFC Payment records"""
    
    transaction_id = serializers.CharField(source='transaction.transaction_id', read_only=True)
    amount = serializers.DecimalField(source='transaction.amount', max_digits=12, decimal_places=2, read_only=True)
    currency = serializers.CharField(source='transaction.currency', read_only=True)
    status = serializers.CharField(source='transaction.status', read_only=True)
    card_last4 = serializers.CharField(source='transaction.card_last4', read_only=True)
    card_brand = serializers.CharField(source='transaction.card_brand', read_only=True)
    
    class Meta:
        model = NFCPayment
        fields = [
            'id', 'transaction_id', 'nfc_type', 'nfc_id', 'card_token',
            'wallet_provider', 'reader_id', 'reader_type', 'signal_strength',
            'cryptogram', 'aic', 'un', 'amount', 'currency', 'status',
            'card_last4', 'card_brand', 'nfc_data', 'emv_tags', 'created_at'
        ]
        read_only_fields = [
            'id', 'transaction_id', 'nfc_id', 'card_token', 'cryptogram',
            'aic', 'un', 'created_at'
        ]


class MobileMoneyPaymentSerializer(serializers.ModelSerializer):
    """Serializer for Mobile Money Payment records"""
    
    transaction_id = serializers.CharField(source='transaction.transaction_id', read_only=True)
    amount = serializers.DecimalField(source='transaction.amount', max_digits=12, decimal_places=2, read_only=True)
    currency = serializers.CharField(source='transaction.currency', read_only=True)
    status = serializers.CharField(source='transaction.status', read_only=True)
    
    class Meta:
        model = MobileMoneyPayment
        fields = [
            'id', 'transaction_id', 'network', 'mobile_number', 'customer_name',
            'mobile_money_transaction_id', 'reference_number', 'status',
            'prompt_sent_at', 'confirmed_at', 'expires_at', 'amount', 'currency',
            'network_response', 'confirmation_code', 'metadata', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'transaction_id', 'mobile_money_transaction_id',
            'prompt_sent_at', 'confirmed_at', 'expires_at', 'created_at', 'updated_at'
        ]


class SoftPOSTransactionSerializer(serializers.ModelSerializer):
    """Enhanced serializer for POS Transactions with Soft POS support"""
    
    nfc_payment = NFCPaymentSerializer(read_only=True)
    mobile_money_payment = MobileMoneyPaymentSerializer(read_only=True)
    device_info = POSDeviceSerializer(source='device', read_only=True)
    
    class Meta:
        model = POSTransaction
        fields = [
            'id', 'transaction_id', 'merchant', 'device', 'transaction_type',
            'payment_method', 'entry_mode', 'amount', 'currency',
            'card_last4', 'card_brand', 'card_type', 'emv_data',
            'mobile_number', 'mobile_network', 'mobile_money_transaction_id',
            'nfc_data', 'wallet_provider', 'customer_email', 'customer_phone',
            'customer_name', 'pin_verified', 'biometric_verified',
            'signature_required', 'authorization_code', 'approval_code',
            'response_code', 'response_message', 'gateway_transaction_id',
            'processor_response', 'status', 'failure_reason', 'metadata',
            'pos_data', 'created_at', 'updated_at', 'completed_at',
            'nfc_payment', 'mobile_money_payment', 'device_info'
        ]
        read_only_fields = [
            'id', 'transaction_id', 'authorization_code', 'approval_code',
            'response_code', 'gateway_transaction_id', 'created_at',
            'updated_at', 'completed_at'
        ]


class SoftPOSDeviceSerializer(serializers.ModelSerializer):
    """Enhanced serializer for POS Devices with Soft POS features"""
    
    smartphone_config = SmartphonePOSSerializer(read_only=True)
    supported_payment_methods = serializers.SerializerMethodField()
    is_online = serializers.SerializerMethodField()
    
    class Meta:
        model = POSDevice
        fields = [
            'id', 'device_id', 'merchant', 'device_type', 'device_name',
            'connection_type', 'supports_nfc', 'supports_mobile_money',
            'supports_chip', 'supports_swipe', 'supports_contactless',
            'pin_required', 'biometric_supported', 'encryption_enabled',
            'security_level', 'device_info', 'hardware_specs', 'location',
            'ip_address', 'status', 'last_seen', 'battery_level',
            'signal_strength', 'pci_certified', 'emv_certified',
            'certification_details', 'created_at', 'updated_at',
            'last_maintenance', 'smartphone_config', 'supported_payment_methods',
            'is_online'
        ]
        read_only_fields = [
            'id', 'device_id', 'created_at', 'updated_at', 'last_seen',
            'last_maintenance', 'smartphone_config'
        ]
    
    def get_supported_payment_methods(self, obj):
        """Get list of supported payment methods"""
        return obj.get_supported_payment_methods()
    
    def get_is_online(self, obj):
        """Check if device is online"""
        return obj.is_online()


class SoftPOSDeviceRegistrationSerializer(serializers.Serializer):
    """Serializer for Soft POS device registration"""
    
    device_type = serializers.ChoiceField(choices=[
        (SoftPOSType.SMARTPHONE_POS, 'Smartphone POS'),
        (SoftPOSType.NFC_READER, 'NFC Reader'),
        (SoftPOSType.TABLET_POS, 'Tablet POS'),
        (SoftPOSType.VIRTUAL_TERMINAL, 'Virtual Terminal'),
    ])
    device_name = serializers.CharField(max_length=100)
    connection_type = serializers.ChoiceField(choices=[
        ('internet', 'Internet'),
        ('bluetooth', 'Bluetooth'),
        ('wifi', 'WiFi'),
        ('nfc', 'NFC'),
    ], default='internet')
    
    # Device capabilities
    supports_nfc = serializers.BooleanField(default=False)
    supports_mobile_money = serializers.BooleanField(default=True)
    supports_contactless = serializers.BooleanField(default=False)
    
    # Security settings
    pin_required = serializers.BooleanField(default=True)
    biometric_supported = serializers.BooleanField(default=False)
    security_level = serializers.ChoiceField(choices=[
        ('basic', 'Basic'),
        ('standard', 'Standard'),
        ('enhanced', 'Enhanced'),
        ('pci_compliant', 'PCI Compliant'),
    ], default='standard')
    
    # Device information
    device_info = serializers.JSONField(default=dict)
    hardware_specs = serializers.JSONField(default=dict)
    location = serializers.CharField(max_length=255, required=False, allow_blank=True)


class SmartphonePOSRegistrationSerializer(serializers.Serializer):
    """Serializer for Smartphone POS specific registration"""
    
    # Device information
    device_model = serializers.CharField(max_length=100)
    os_type = serializers.ChoiceField(choices=[
        ('android', 'Android'),
        ('ios', 'iOS'),
    ])
    os_version = serializers.CharField(max_length=20)
    app_version = serializers.CharField(max_length=20)
    
    # Capabilities
    nfc_capable = serializers.BooleanField(default=False)
    bluetooth_capable = serializers.BooleanField(default=True)
    camera_available = serializers.BooleanField(default=True)
    biometric_available = serializers.BooleanField(default=False)
    biometric_enabled = serializers.BooleanField(default=False)
    
    # Hardware specs
    hardware_specs = serializers.JSONField(default=dict)
    
    # Security credentials
    device_id_hash = serializers.CharField(max_length=200)  # Hashed device identifier
    security_credentials = serializers.JSONField(default=dict)


class SoftPOSAuthenticationSerializer(serializers.Serializer):
    """Serializer for Soft POS device authentication"""
    
    device_id_hash = serializers.CharField(max_length=200)
    pin = serializers.CharField(max_length=10, required=False, allow_blank=True)
    biometric_data = serializers.JSONField(required=False, default=dict)
    
    # Device status
    battery_level = serializers.IntegerField(min_value=0, max_value=100, required=False)
    location = serializers.JSONField(required=False, default=dict)
    
    # Request metadata
    ip_address = serializers.IPAddressField(required=False, allow_blank=True)
    user_agent = serializers.CharField(max_length=500, required=False, allow_blank=True)


class SoftPOSPaymentSerializer(serializers.Serializer):
    """Serializer for Soft POS payment processing"""
    
    payment_method = serializers.ChoiceField(choices=[
        (PaymentMethod.NFC_CREDIT, 'NFC Credit Card'),
        (PaymentMethod.NFC_DEBIT, 'NFC Debit Card'),
        (PaymentMethod.MTN_MONEY, 'MTN Mobile Money'),
        (PaymentMethod.TELECEL_CASH, 'Telecel Cash'),
        (PaymentMethod.AIRTELTIGO_MONEY, 'AirtelTigo Money'),
                (PaymentMethod.MOBILE_WALLET, 'Mobile Wallet'),
    ])
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0.01)
    currency = serializers.CharField(max_length=3, default='GHS')
    
    # Payment method specific data
    payment_data = serializers.JSONField(default=dict)
    
    # Customer information
    customer_info = serializers.JSONField(default=dict)
    
    # Transaction metadata
    reference = serializers.CharField(max_length=50, required=False, allow_blank=True)
    metadata = serializers.JSONField(default=dict)


class NFCPaymentDataSerializer(serializers.Serializer):
    """Serializer for NFC payment data"""
    
    nfc_id = serializers.CharField(max_length=100)
    reader_id = serializers.CharField(max_length=50)
    reader_type = serializers.CharField(max_length=30)
    signal_strength = serializers.IntegerField(min_value=0, max_value=100, required=False)
    
    # EMV data
    emv_tags = serializers.JSONField()
    cryptogram = serializers.CharField()
    
    # Optional wallet data
    wallet_provider = serializers.CharField(max_length=50, required=False, allow_blank=True)
    
    # Additional NFC data
    nfc_data = serializers.JSONField(default=dict)


class MobileMoneyPaymentDataSerializer(serializers.Serializer):
    """Serializer for Mobile Money payment data"""
    
    mobile_number = serializers.CharField(max_length=20)
    customer_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    reference = serializers.CharField(max_length=50, required=False, allow_blank=True)
    
    # Optional customer verification
    customer_email = serializers.EmailField(required=False, allow_blank=True)
    customer_note = serializers.CharField(max_length=200, required=False, allow_blank=True)


class SoftPOSDeviceStatusSerializer(serializers.Serializer):
    """Serializer for device status updates"""
    
    device_id_hash = serializers.CharField(max_length=200)
    
    # Device metrics
    battery_level = serializers.IntegerField(min_value=0, max_value=100, required=False)
    storage_available = serializers.BigIntegerField(required=False)
    signal_strength = serializers.IntegerField(min_value=0, max_value=100, required=False)
    
    # Location data
    location = serializers.JSONField(required=False, default=dict)
    
    # Network status
    network_type = serializers.ChoiceField(choices=[
        ('wifi', 'WiFi'),
        ('mobile', 'Mobile Data'),
        ('bluetooth', 'Bluetooth'),
        ('none', 'No Connection')
    ], required=False)
    
    # App status
    app_version = serializers.CharField(max_length=20, required=False)
    crash_reports = serializers.JSONField(default=list, required=False)


class SoftPOSSecurityEventSerializer(serializers.Serializer):
    """Serializer for security event logging"""
    
    device_id_hash = serializers.CharField(max_length=200)
    event_type = serializers.ChoiceField(choices=[
        ('authentication_success', 'Authentication Success'),
        ('authentication_failure', 'Authentication Failure'),
        ('pin_attempt', 'PIN Attempt'),
        ('biometric_attempt', 'Biometric Attempt'),
        ('device_jailbreak', 'Device Jailbreak/Root Detected'),
        ('usb_connected', 'USB Connected'),
        ('screenshot_attempt', 'Screenshot Attempt'),
        ('unusual_location', 'Unusual Location'),
        ('battery_critical', 'Critical Battery Level'),
        ('network_change', 'Network Change'),
        ('app_backgrounded', 'App Backgrounded'),
        ('security_policy_violation', 'Security Policy Violation'),
    ])
    event_details = serializers.JSONField(default=dict)
    
    # Event context
    timestamp = serializers.DateTimeField(required=False)
    user_action = serializers.CharField(max_length=100, required=False, allow_blank=True)
    ip_address = serializers.IPAddressField(required=False, allow_blank=True)


class SoftPOSDashboardSerializer(serializers.Serializer):
    """Serializer for Soft POS dashboard data"""
    
    # Date range
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    days = serializers.IntegerField(min_value=1, max_value=365, default=30)
    
    # Filters
    device_type = serializers.CharField(max_length=20, required=False, allow_blank=True)
    payment_method = serializers.CharField(max_length=20, required=False, allow_blank=True)
    status = serializers.CharField(max_length=20, required=False, allow_blank=True)


class SoftPOSAnalyticsSerializer(serializers.Serializer):
    """Serializer for Soft POS analytics requests"""
    
    # Analysis parameters
    days = serializers.IntegerField(min_value=1, max_value=365, default=30)
    group_by = serializers.ChoiceField(choices=[
        ('day', 'Day'),
        ('week', 'Week'),
        ('month', 'Month'),
        ('payment_method', 'Payment Method'),
        ('device_type', 'Device Type'),
        ('network', 'Mobile Network'),
    ], default='day')
    
    # Metrics to include
    metrics = serializers.ListField(
        child=serializers.ChoiceField(choices=[
            ('transactions', 'Transaction Count'),
            ('amount', 'Transaction Amount'),
            ('success_rate', 'Success Rate'),
            ('avg_processing_time', 'Average Processing Time'),
            ('device_uptime', 'Device Uptime'),
        ]),
        default=['transactions', 'amount', 'success_rate']
    )
    
    # Filters
    device_ids = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        default=list
    )
    payment_methods = serializers.ListField(
        child=serializers.CharField(max_length=20),
        required=False,
        default=list
    )
