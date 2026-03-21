from django.db import models
from django.contrib.auth import get_user_model
from users.models import Merchant
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

User = get_user_model()

class POSDevice(models.Model):
    """Modern POS devices including smartphones, NFC readers, and soft POS terminals"""
    
    DEVICE_TYPES = [
        ('smartphone_pos', 'Smartphone POS'),
        ('nfc_reader', 'NFC Reader'),
        ('virtual_terminal', 'Virtual Terminal'),
        ('mobile_reader', 'Mobile Reader'),
        ('countertop', 'Countertop Terminal'),
        ('integrated', 'Integrated POS'),
        ('kiosk', 'Self-Service Kiosk'),
        ('tablet_pos', 'Tablet POS'),
    ]
    
    CONNECTION_TYPES = [
        ('bluetooth', 'Bluetooth'),
        ('wifi', 'WiFi'),
        ('usb', 'USB'),
        ('nfc', 'NFC'),
        ('audio_jack', 'Audio Jack'),
        ('internet', 'Internet'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('maintenance', 'Maintenance'),
        ('decommissioned', 'Decommissioned'),
        ('suspended', 'Suspended'),
    ]
    
    SECURITY_LEVELS = [
        ('basic', 'Basic'),
        ('standard', 'Standard'),
        ('enhanced', 'Enhanced'),
        ('pci_compliant', 'PCI Compliant'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    device_id = models.CharField(max_length=50, unique=True, db_index=True)
    merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name='pos_devices')
    device_type = models.CharField(max_length=20, choices=DEVICE_TYPES)
    device_name = models.CharField(max_length=100)
    connection_type = models.CharField(max_length=15, choices=CONNECTION_TYPES, default='internet')
    
    # Device capabilities
    supports_nfc = models.BooleanField(default=False)
    supports_mobile_money = models.BooleanField(default=False)
    supports_chip = models.BooleanField(default=True)
    supports_swipe = models.BooleanField(default=True)
    supports_contactless = models.BooleanField(default=False)
    
    # Security features
    pin_required = models.BooleanField(default=True)
    biometric_supported = models.BooleanField(default=False)
    encryption_enabled = models.BooleanField(default=True)
    security_level = models.CharField(max_length=15, choices=SECURITY_LEVELS, default='standard')
    
    # Device information
    device_info = models.JSONField(default=dict)
    hardware_specs = models.JSONField(default=dict)
    location = models.CharField(max_length=255, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    # Status and monitoring
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    last_seen = models.DateTimeField(null=True, blank=True)
    battery_level = models.IntegerField(null=True, blank=True)  # For mobile devices
    signal_strength = models.IntegerField(null=True, blank=True)  # For wireless devices
    
    # Compliance and certification
    pci_certified = models.BooleanField(default=False)
    emv_certified = models.BooleanField(default=False)
    certification_details = models.JSONField(default=dict)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_maintenance = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['merchant', 'status']),
            models.Index(fields=['device_type']),
            models.Index(fields=['connection_type']),
            models.Index(fields=['last_seen']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.device_name} ({self.device_id})"
    
    def is_online(self):
        """Check if device is online based on last_seen"""
        if not self.last_seen:
            return False
        return datetime.now() - self.last_seen < timedelta(minutes=5)
    
    def get_supported_payment_methods(self):
        """Get list of supported payment methods"""
        methods = ['credit_card', 'debit_card']
        if self.supports_nfc:
            methods.extend(['nfc_credit', 'nfc_debit', 'mobile_wallets'])
        if self.supports_mobile_money:
            methods.extend(['mtn_money', 'telecel_cash', 'airtel_tigo_money'])
        return methods

class POSTransaction(models.Model):
    """Enhanced POS transaction records supporting NFC, mobile money, and modern payment methods"""
    
    TRANSACTION_TYPES = [
        ('sale', 'Sale'),
        ('refund', 'Refund'),
        ('void', 'Void'),
        ('pre_auth', 'Pre-Authorization'),
        ('capture', 'Capture'),
        ('adjustment', 'Adjustment'),
    ]
    
    PAYMENT_METHODS = [
        ('credit_card', 'Credit Card'),
        ('debit_card', 'Debit Card'),
        ('nfc_credit', 'NFC Credit Card'),
        ('nfc_debit', 'NFC Debit Card'),
        ('mobile_wallet', 'Mobile Wallet'),
        ('mtn_money', 'MTN Mobile Money'),
        ('telecel_cash', 'Telecel Cash'),
        ('airtel_tigo_money', 'AirtelTigo Money'),
        ('qr_payment', 'QR Payment'),
        ('upi', 'UPI Payment'),
    ]
    
    ENTRY_MODES = [
        ('manual', 'Manual Entry'),
        ('chip', 'Chip'),
        ('swipe', 'Swipe'),
        ('contactless', 'Contactless'),
        ('nfc', 'NFC'),
        ('qr_scan', 'QR Scan'),
        ('mobile_app', 'Mobile App'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
        ('chargeback', 'Chargeback'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaction_id = models.CharField(max_length=100, unique=True, db_index=True)
    merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name='pos_transactions')
    device = models.ForeignKey(POSDevice, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    
    # Transaction details
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS, default='credit_card')
    entry_mode = models.CharField(max_length=15, choices=ENTRY_MODES, default='manual')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='GHS')
    
    # Card details (encrypted)
    card_last4 = models.CharField(max_length=4, blank=True)
    card_brand = models.CharField(max_length=20, blank=True)
    card_type = models.CharField(max_length=10, blank=True)  # credit/debit
    emv_data = models.JSONField(default=dict, blank=True)  # EMV transaction data
    
    # Mobile money details
    mobile_number = models.CharField(max_length=20, blank=True)
    mobile_network = models.CharField(max_length=20, blank=True)
    mobile_money_transaction_id = models.CharField(max_length=100, blank=True)
    
    # NFC details
    nfc_data = models.JSONField(default=dict, blank=True)
    wallet_provider = models.CharField(max_length=50, blank=True)
    
    # Customer information
    customer_email = models.EmailField(blank=True)
    customer_phone = models.CharField(max_length=20, blank=True)
    customer_name = models.CharField(max_length=100, blank=True)
    
    # Security and verification
    pin_verified = models.BooleanField(default=False)
    biometric_verified = models.BooleanField(default=False)
    signature_required = models.BooleanField(default=False)
    signature_data = models.TextField(blank=True)
    
    # Processing details
    authorization_code = models.CharField(max_length=50, blank=True)
    approval_code = models.CharField(max_length=50, blank=True)
    response_code = models.CharField(max_length=10, blank=True)
    response_message = models.TextField(blank=True)
    
    # Gateway and processor info
    gateway_transaction_id = models.CharField(max_length=100, blank=True)
    processor_response = models.JSONField(default=dict)
    
    # Status and timestamps
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    failure_reason = models.TextField(blank=True)
    
    # Metadata
    metadata = models.JSONField(default=dict)
    pos_data = models.JSONField(default=dict)  # POS-specific data
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['merchant', 'created_at']),
            models.Index(fields=['device', 'created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['payment_method']),
            models.Index(fields=['transaction_id']),
            models.Index(fields=['mobile_money_transaction_id']),
        ]

    def __str__(self):
        return f"POS {self.transaction_id}: {self.amount} {self.currency} ({self.payment_method})"
    
    def mark_completed(self, authorization_code=None, approval_code=None):
        """Mark transaction as completed"""
        self.status = 'completed'
        self.completed_at = datetime.now()
        if authorization_code:
            self.authorization_code = authorization_code
        if approval_code:
            self.approval_code = approval_code
        self.save()
    
    def mark_failed(self, failure_reason, response_code=None):
        """Mark transaction as failed"""
        self.status = 'failed'
        self.failure_reason = failure_reason
        if response_code:
            self.response_code = response_code
        self.save()
    
    def is_successful(self):
        """Check if transaction was successful"""
        return self.status == 'completed'
    
    def can_refund(self):
        """Check if transaction can be refunded"""
        return self.status == 'completed' and self.transaction_type == 'sale'

class NFCPayment(models.Model):
    """NFC payment processing data"""
    
    NFC_TYPES = [
        ('credit_card', 'Credit Card'),
        ('debit_card', 'Debit Card'),
        ('mobile_wallet', 'Mobile Wallet'),
        ('wearable', 'Wearable Device'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaction = models.OneToOneField(POSTransaction, on_delete=models.CASCADE, related_name='nfc_payment')
    nfc_type = models.CharField(max_length=20, choices=NFC_TYPES)
    
    # NFC transaction data
    nfc_id = models.CharField(max_length=100, unique=True)
    card_token = models.CharField(max_length=200, blank=True)
    wallet_provider = models.CharField(max_length=50, blank=True)
    
    # Device and reader info
    reader_id = models.CharField(max_length=50)
    reader_type = models.CharField(max_length=30)
    signal_strength = models.IntegerField(null=True, blank=True)
    
    # Security
    cryptogram = models.TextField(blank=True)
    aic = models.CharField(max_length=10, blank=True)  # Application Identifier
    un = models.CharField(max_length=20, blank=True)  # Unpredictable Number
    
    # Processing data
    nfc_data = models.JSONField(default=dict)
    emv_tags = models.JSONField(default=dict)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['nfc_id']),
            models.Index(fields=['wallet_provider']),
        ]

class MobileMoneyPayment(models.Model):
    """Mobile money payment processing"""
    
    NETWORKS = [
        ('mtn', 'MTN Mobile Money'),
        ('telecel', 'Telecel Cash'),
        ('airteltigo', 'AirtelTigo Money'),
        ('glo', 'Glo Cash'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent_prompt', 'Prompt Sent'),
        ('confirmed', 'Confirmed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('timeout', 'Timeout'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaction = models.OneToOneField(POSTransaction, on_delete=models.CASCADE, related_name='mobile_money_payment')
    network = models.CharField(max_length=15, choices=NETWORKS)
    
    # Customer details
    mobile_number = models.CharField(max_length=20)
    customer_name = models.CharField(max_length=100, blank=True)
    
    # Transaction details
    mobile_money_transaction_id = models.CharField(max_length=100, unique=True, db_index=True)
    reference_number = models.CharField(max_length=50, blank=True)
    
    # Processing
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    prompt_sent_at = models.DateTimeField(null=True, blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    # Response data
    network_response = models.JSONField(default=dict)
    confirmation_code = models.CharField(max_length=10, blank=True)
    
    # Metadata
    metadata = models.JSONField(default=dict)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['mobile_money_transaction_id']),
            models.Index(fields=['mobile_number']),
            models.Index(fields=['network']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.network} - {self.mobile_number} ({self.mobile_money_transaction_id})"
    
    def is_expired(self):
        """Check if mobile money payment has expired"""
        if not self.expires_at:
            return False
        return datetime.now() > self.expires_at
    
    def send_prompt(self):
        """Mark that prompt was sent to customer"""
        self.status = 'sent_prompt'
        self.prompt_sent_at = datetime.now()
        self.expires_at = datetime.now() + timedelta(minutes=5)  # 5 minute expiry
        self.save()
    
    def confirm_payment(self, confirmation_code=None):
        """Confirm mobile money payment"""
        self.status = 'confirmed'
        self.confirmed_at = datetime.now()
        if confirmation_code:
            self.confirmation_code = confirmation_code
        self.save()

class SmartphonePOSDevice(models.Model):
    """Smartphone POS device configuration and management"""
    
    OS_TYPES = [
        ('android', 'Android'),
        ('ios', 'iOS'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('lost', 'Lost/Stolen'),
        ('damaged', 'Damaged'),
        ('decommissioned', 'Decommissioned'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pos_device = models.OneToOneField(POSDevice, on_delete=models.CASCADE, related_name='smartphone_config')
    
    # Device information
    device_model = models.CharField(max_length=100)
    os_type = models.CharField(max_length=10, choices=OS_TYPES)
    os_version = models.CharField(max_length=20)
    app_version = models.CharField(max_length=20)
    
    # Security
    device_id_hash = models.CharField(max_length=200, unique=True)  # Hashed device identifier
    encryption_key = models.CharField(max_length=200, blank=True)  # Encrypted storage key
    biometric_enabled = models.BooleanField(default=False)
    pin_required = models.BooleanField(default=True)
    
    # Capabilities
    nfc_capable = models.BooleanField(default=False)
    bluetooth_capable = models.BooleanField(default=True)
    camera_available = models.BooleanField(default=True)
    
    # Status
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='active')
    last_heartbeat = models.DateTimeField(null=True, blank=True)
    battery_level = models.IntegerField(null=True, blank=True)
    storage_available = models.BigIntegerField(null=True, blank=True)
    
    # Location tracking
    last_location_lat = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    last_location_lng = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    location_timestamp = models.DateTimeField(null=True, blank=True)
    
    # Security events
    security_events = models.JSONField(default=list)
    last_security_check = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['device_id_hash']),
            models.Index(fields=['status']),
            models.Index(fields=['last_heartbeat']),
        ]
    
    def is_online(self):
        """Check if smartphone is online based on heartbeat"""
        if not self.last_heartbeat:
            return False
        return datetime.now() - self.last_heartbeat < timedelta(minutes=2)
    
    def update_heartbeat(self, battery_level=None, location=None):
        """Update device heartbeat"""
        self.last_heartbeat = datetime.now()
        if battery_level is not None:
            self.battery_level = battery_level
        if location:
            self.last_location_lat = location.get('lat')
            self.last_location_lng = location.get('lng')
            self.location_timestamp = datetime.now()
        self.save()
    
    def add_security_event(self, event_type, details):
        """Add security event log"""
        event = {
            'timestamp': datetime.now().isoformat(),
            'type': event_type,
            'details': details
        }
        self.security_events.append(event)
        self.last_security_check = datetime.now()
        self.save()
