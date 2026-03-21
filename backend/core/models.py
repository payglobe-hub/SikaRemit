from django.db import models
from django.contrib.auth import get_user_model
from decimal import Decimal

User = get_user_model()

class SystemSettings(models.Model):
    """
    System-wide configurable settings organized by categories
    """
    # General Settings
    system_name = models.CharField(max_length=100, default='SikaRemit')
    default_timezone = models.CharField(max_length=50, default='UTC')
    default_currency = models.CharField(max_length=3, default='USD')
    default_language = models.CharField(max_length=10, default='en')
    
    # System State
    maintenance_mode = models.BooleanField(default=False)
    debug_mode = models.BooleanField(default=False)
    public_registration = models.BooleanField(default=True)
    
    # Transfer fees
    bank_transfer_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('2.50'),
        help_text='Flat fee for bank transfers (USD)'
    )
    mobile_money_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('1.00'),
        help_text='Flat fee for mobile money transfers (USD)'
    )
    SikaRemit_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Fee for SikaRemit user transfers (USD)'
    )

    # Security Settings
    session_timeout = models.PositiveIntegerField(default=60, help_text='Session timeout in minutes')
    max_login_attempts = models.PositiveIntegerField(default=5)
    min_password_length = models.PositiveIntegerField(default=8)
    password_policy = models.CharField(max_length=20, default='strong', choices=[
        ('basic', 'Basic'),
        ('medium', 'Medium'),
        ('strong', 'Strong')
    ])
    two_factor_required = models.BooleanField(default=True, help_text='Require 2FA for all admin accounts')
    ip_whitelisting = models.BooleanField(default=False)
    audit_logging = models.BooleanField(default=True)

    # API Settings
    api_rate_limit = models.PositiveIntegerField(default=1000, help_text='Requests per minute')
    api_timeout = models.PositiveIntegerField(default=30, help_text='API timeout in seconds')
    webhook_secret = models.CharField(max_length=255, blank=True)
    api_version = models.CharField(max_length=10, default='v1')
    cors_origins = models.JSONField(default=list)
    api_documentation = models.BooleanField(default=True)
    request_logging = models.BooleanField(default=False)

    # Notification Settings
    admin_email_notifications = models.BooleanField(default=True)
    admin_sms_notifications = models.BooleanField(default=False)
    admin_push_notifications = models.BooleanField(default=True)
    error_alerts = models.BooleanField(default=True)
    transaction_alerts = models.BooleanField(default=True)
    admin_email = models.EmailField(blank=True, help_text='Admin notification email')
    transaction_alert_threshold = models.DecimalField(max_digits=10, decimal_places=2, default=10000)

    # Maintenance Settings
    scheduled_maintenance = models.BooleanField(default=False)
    auto_backups = models.BooleanField(default=True)
    log_rotation = models.BooleanField(default=True)
    backup_frequency = models.CharField(max_length=20, default='daily', choices=[
        ('hourly', 'Hourly'),
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly')
    ])
    log_retention_days = models.PositiveIntegerField(default=30)

    # System limits
    max_daily_transactions = models.PositiveIntegerField(
        default=1000,
        help_text='Maximum transactions per day per user'
    )

    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='settings_updates'
    )

    class Meta:
        verbose_name = 'System Settings'
        verbose_name_plural = 'System Settings'

    def __str__(self):
        return f"System Settings (updated {self.updated_at})"

    @classmethod
    def get_settings(cls):
        """Get the current system settings, creating default if none exists"""
        settings, created = cls.objects.get_or_create(
            defaults={
                'bank_transfer_fee': Decimal('2.50'),
                'mobile_money_fee': Decimal('1.00'),
                'SikaRemit_fee': Decimal('0.00'),
            }
        )
        return settings

class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('VERIFICATION_APPROVE', 'Verification Approved'),
        ('VERIFICATION_REJECT', 'Verification Rejected'),
        ('USER_ACTIVATE', 'User Activated'),
        ('USER_DEACTIVATE', 'User Deactivated'),
        ('LOGIN', 'User Login'),
        ('SETTINGS_UPDATE', 'Settings Updated'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    admin = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='admin_actions')
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'

    def __str__(self):
        return f"{self.get_action_display()} by {self.admin} at {self.created_at}"

class Country(models.Model):
    """
    Country model for storing country information used in transfers and payments
    """
    code = models.CharField(max_length=3, unique=True, help_text='ISO 3166-1 alpha-2 country code')
    name = models.CharField(max_length=100, help_text='Country name')
    flag_emoji = models.CharField(max_length=10, blank=True, help_text='Flag emoji')
    phone_code = models.CharField(max_length=10, blank=True, help_text='Phone country code')
    phone_code_formatted = models.CharField(max_length=20, blank=True, help_text='Formatted phone code')
    currency = models.CharField(max_length=100, blank=True, help_text='Currency name')
    currency_code = models.CharField(max_length=3, blank=True, help_text='ISO 4217 currency code')
    currency_symbol = models.CharField(max_length=10, blank=True, help_text='Currency symbol')
    is_active = models.BooleanField(default=True, help_text='Whether country is active for transfers')

    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['is_active']),
        ]
        verbose_name = 'Country'
        verbose_name_plural = 'Countries'

    def __str__(self):
        return f"{self.name} ({self.code})"
