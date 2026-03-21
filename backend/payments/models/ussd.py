"""
USSD Models for SikaRemit
Handles USSD session management, menu navigation, and transaction tracking
"""

from django.db import models
from django.conf import settings
from django.utils import timezone
from accounts.models import User
from payments.models import Payment

class USSDSession(models.Model):
    """USSD Session management for maintaining user state across interactions"""

    SESSION_STATES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('expired', 'Expired'),
        ('error', 'Error'),
    ]

    session_id = models.CharField(max_length=100, unique=True, help_text="Unique session identifier")
    msisdn = models.CharField(max_length=15, help_text="Mobile number in international format")
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    network = models.CharField(max_length=20, help_text="Mobile network (MTN, Airtel, etc.)")
    language = models.CharField(max_length=5, default='en', help_text="User language preference")

    # Session state
    state = models.CharField(max_length=20, choices=SESSION_STATES, default='active')
    current_menu = models.CharField(max_length=100, default='main', help_text="Current menu position")
    menu_data = models.JSONField(default=dict, help_text="Menu-specific data storage")

    # Timing
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(help_text="Session expiration time")

    # Security and tracking
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, help_text="USSD gateway user agent")
    failed_attempts = models.IntegerField(default=0, help_text="Number of failed interactions")

    class Meta:
        indexes = [
            models.Index(fields=['session_id']),
            models.Index(fields=['msisdn', 'state']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"USSD Session {self.session_id} - {self.msisdn}"

    def is_expired(self):
        return timezone.now() > self.expires_at

    def extend_session(self, minutes=5):
        """Extend session expiration time"""
        self.expires_at = timezone.now() + timezone.timedelta(minutes=minutes)
        self.save()

    def increment_failures(self):
        """Increment failed attempts counter"""
        self.failed_attempts += 1
        if self.failed_attempts >= 3:
            self.state = 'error'
        self.save()

    def reset_failures(self):
        """Reset failed attempts counter"""
        self.failed_attempts = 0
        self.save()

class USSDMenu(models.Model):
    """USSD Menu definitions for different services"""

    MENU_TYPES = [
        ('main', 'Main Menu'),
        ('payment', 'Payment Menu'),
        ('balance', 'Balance Check'),
        ('transfer', 'Money Transfer'),
        ('bill_payment', 'Bill Payment'),
        ('airtime', 'Airtime Purchase'),
        ('registration', 'User Registration'),
        ('settings', 'Settings Menu'),
    ]

    menu_id = models.CharField(max_length=50, unique=True, help_text="Unique menu identifier")
    menu_type = models.CharField(max_length=20, choices=MENU_TYPES, default='main')
    title = models.CharField(max_length=200, help_text="Menu title text")
    content = models.TextField(help_text="Menu content/body text")
    options = models.JSONField(default=list, help_text="Menu options as list of dicts")

    # Language support
    language = models.CharField(max_length=5, default='en')
    is_default = models.BooleanField(default=False, help_text="Default menu for this type")

    # Navigation
    parent_menu = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True)
    timeout_seconds = models.IntegerField(default=60, help_text="Menu timeout in seconds")

    # Metadata
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['menu_type', 'language', 'is_default']

    def __str__(self):
        return f"{self.menu_type} - {self.title} ({self.language})"

    def get_option_by_input(self, user_input):
        """Get menu option by user input"""
        for option in self.options:
            if str(option.get('input')) == str(user_input):
                return option
        return None

class USSDTransaction(models.Model):
    """USSD transaction tracking for payments and transfers"""

    TRANSACTION_TYPES = [
        ('payment', 'Payment'),
        ('transfer', 'Money Transfer'),
        ('bill_payment', 'Bill Payment'),
        ('airtime', 'Airtime Purchase'),
        ('balance_check', 'Balance Check'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('pending_approval', 'Pending Approval'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    transaction_id = models.CharField(max_length=100, unique=True)
    session = models.ForeignKey(USSDSession, on_delete=models.CASCADE)
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Financial details
    amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default='UGX')
    recipient = models.CharField(max_length=15, blank=True, help_text="Recipient mobile number")

    # Service details
    service_provider = models.CharField(max_length=50, blank=True, help_text="Bill payment provider")
    account_number = models.CharField(max_length=50, blank=True, help_text="Account/bill reference")

    # External references
    external_transaction_id = models.CharField(max_length=100, blank=True)
    payment = models.ForeignKey(Payment, on_delete=models.SET_NULL, null=True, blank=True)

    # Timing
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    # Error tracking
    error_message = models.TextField(blank=True)
    error_code = models.CharField(max_length=20, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['transaction_id']),
            models.Index(fields=['session', 'status']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"USSD {self.transaction_type} - {self.transaction_id}"

    def mark_completed(self, external_id=None):
        """Mark transaction as completed"""
        self.status = 'completed'
        self.completed_at = timezone.now()
        if external_id:
            self.external_transaction_id = external_id
        self.save()

    def approve_transaction(self, admin_user=None):
        """Approve a pending transaction and process it"""
        if self.status != 'pending_approval':
            return False, "Transaction is not pending approval"

        # Update status to approved first
        self.status = 'approved'
        if admin_user:
            logger.info(f"Transaction {self.transaction_id} approved by admin {admin_user}")
        self.save()

        # Process the approved transaction
        try:
            if self.transaction_type == 'transfer':
                # Process the money transfer that was pending approval
                from .views.ussd import USSDHandler
                handler = USSDHandler({})
                handler.session = self.session
                success = handler._process_money_transfer(self.recipient, self.amount)

                if success:
                    self.mark_completed()
                    return True, "Transaction approved and processed successfully"
                else:
                    self.status = 'failed'
                    self.error_message = "Transfer failed during processing"
                    self.save()
                    return False, "Transaction approved but processing failed"
            else:
                # For other transaction types, just mark as completed
                self.mark_completed()
                return True, "Transaction approved successfully"

        except Exception as e:
            logger.error(f"Error processing approved transaction {self.transaction_id}: {e}")
            self.status = 'failed'
            self.error_message = f"Processing error: {str(e)}"
            self.save()
            return False, f"Transaction approved but processing failed: {str(e)}"

    def reject_transaction(self, admin_user=None, reason=""):
        """Reject a pending transaction"""
        if self.status != 'pending_approval':
            return False, "Transaction is not pending approval"

        self.status = 'rejected'
        if admin_user:
            logger.info(f"Transaction {self.transaction_id} rejected by admin {admin_user}: {reason}")
        self.save()
        return True, "Transaction rejected"

class USSDAnalytics(models.Model):
    """Analytics for USSD usage and performance"""

    date = models.DateField()
    network = models.CharField(max_length=20)

    # Session metrics
    total_sessions = models.IntegerField(default=0)
    completed_sessions = models.IntegerField(default=0)
    failed_sessions = models.IntegerField(default=0)
    avg_session_duration = models.IntegerField(default=0, help_text="Average session duration in seconds")

    # Transaction metrics
    total_transactions = models.IntegerField(default=0)
    successful_transactions = models.IntegerField(default=0)
    failed_transactions = models.IntegerField(default=0)
    total_transaction_value = models.DecimalField(max_digits=20, decimal_places=2, default=0)

    # Menu navigation
    popular_menus = models.JSONField(default=dict, help_text="Most accessed menus")
    drop_off_points = models.JSONField(default=dict, help_text="Common exit points")

    # Performance
    avg_response_time = models.IntegerField(default=0, help_text="Average response time in milliseconds")

    class Meta:
        unique_together = ['date', 'network']
        indexes = [
            models.Index(fields=['date', 'network']),
        ]

    def __str__(self):
        return f"USSD Analytics {self.date} - {self.network}"

class USSDProvider(models.Model):
    """USSD provider configurations for different networks"""

    PROVIDER_TYPES = [
        ('mtn', 'MTN'),
        ('airtel', 'Airtel'),
        ('africell', 'Africell'),
        ('utl', 'UTL'),
        ('orange', 'Orange'),
    ]

    name = models.CharField(max_length=50, unique=True)
    provider_type = models.CharField(max_length=20, choices=PROVIDER_TYPES)
    short_code = models.CharField(max_length=10, help_text="USSD short code (e.g., *165*)")

    # API Configuration
    api_url = models.URLField(help_text="Provider API endpoint")
    api_key = models.CharField(max_length=200)
    api_secret = models.CharField(max_length=200)

    # Service configuration
    max_session_time = models.IntegerField(default=300, help_text="Max session time in seconds")
    max_menu_depth = models.IntegerField(default=5, help_text="Maximum menu navigation depth")
    supported_languages = models.JSONField(default=list, help_text="Supported languages")

    # Status
    is_active = models.BooleanField(default=True)
    last_health_check = models.DateTimeField(null=True, blank=True)
    health_status = models.CharField(max_length=20, default='unknown')

    # Rate limiting
    requests_per_minute = models.IntegerField(default=100)
    burst_limit = models.IntegerField(default=20)

    def __str__(self):
        return f"{self.name} ({self.provider_type}) - {self.short_code}"
