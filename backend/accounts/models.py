from django.db import models
from django.contrib.auth import get_user_model
from django.conf import settings
from django.utils import timezone
from shared.constants import (
    ADMIN_ACTIVITY_TYPES, USER_ACTIVITY_TYPES,
    BACKUP_VERIFICATION_TYPES, PROCESSING_STATUS_CHOICES,
    TRANSACTION_TYPE_CHOICES, GENERAL_STATUS_CHOICES,
    PAYOUT_STATUS_CHOICES, PAYOUT_METHOD_CHOICES,
    SUPPORT_TICKET_STATUS_CHOICES, PRIORITY_CHOICES,
    RECIPIENT_TYPE_CHOICES, MOBILE_MONEY_PROVIDERS,
    STATUS_PENDING, STATUS_COMPLETED, STATUS_FAILED,
)

User = get_user_model()

# Note: The main User model is now users.User
# This accounts app contains additional user-related models that reference the main User model
# 
# IMPORTANT: Notification model has been moved to notifications app
# IMPORTANT: Product model has been moved to merchants app

class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.CharField(max_length=32, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)

    def __str__(self):
        return f"Reset token for {self.user.email}"


class BlacklistedToken(models.Model):
    """Store blacklisted JWT tokens to prevent reuse"""
    token = models.TextField(unique=True)
    blacklisted_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blacklisted_tokens')
    
    class Meta:
        db_table = 'auth_blacklisted_token'
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['user']),
            models.Index(fields=['expires_at']),
        ]
    
    def __str__(self):
        return f"Blacklisted token for {self.user.email} at {self.blacklisted_at}"
    
    @classmethod
    def is_blacklisted(cls, token):
        """Check if a token is blacklisted"""
        return cls.objects.filter(token=token, expires_at__gt=timezone.now()).exists()
    
    @classmethod
    def blacklist_token(cls, token, user, expires_at):
        """Add a token to the blacklist"""
        # Clean up expired tokens first
        cls.objects.filter(expires_at__lt=timezone.now()).delete()
        
        # Add new token to blacklist
        cls.objects.get_or_create(
            token=token,
            defaults={
                'user': user,
                'expires_at': expires_at
            }
        )

class AdminActivity(models.Model):
    admin = models.ForeignKey(User, on_delete=models.PROTECT)
    action_type = models.CharField(max_length=50, choices=ADMIN_ACTIVITY_TYPES)
    details = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True)
    user_agent = models.TextField(null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['admin', 'timestamp']),
            models.Index(fields=['action_type', 'timestamp'])
        ]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

class AuthLog(models.Model):
    """Tracks all authentication attempts"""
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    ip_address = models.GenericIPAddressField()
    device_id = models.CharField(max_length=32)  # Device fingerprint
    success = models.BooleanField(default=False)
    reason = models.CharField(max_length=255, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['device_id']),
            models.Index(fields=['ip_address']),
            models.Index(fields=['user']),
        ]
        ordering = ['-timestamp']

class BackupVerification(models.Model):
    verification_type = models.CharField(max_length=10, choices=BACKUP_VERIFICATION_TYPES)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=PROCESSING_STATUS_CHOICES, default=STATUS_PENDING)
    checksum = models.CharField(max_length=64, null=True, blank=True)
    file_size = models.BigIntegerField(null=True, blank=True)
    verified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    notes = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f"{self.get_verification_type_display()} - {self.status}"

class Transaction(models.Model):
    """P2P Transaction model for user-to-user transfers"""
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sent_transactions'
    )
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='received_transactions'
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=GENERAL_STATUS_CHOICES, default=STATUS_PENDING)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict)

    class Meta:
        indexes = [
            models.Index(fields=['sender']),
            models.Index(fields=['recipient']),
            models.Index(fields=['created_at']),
            models.Index(fields=['status']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_transaction_type_display()} - {self.amount} from {self.sender.email} to {self.recipient.email}"

class PaymentLog(models.Model):
    PAYMENT_TYPES = [
        ('subscription', 'Subscription'),
        ('remittance', 'Remittance'),
        ('bill', 'Bill Payment'),
        ('other', 'Other')
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='accounts_paymentlog_set')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPES, default='other')
    plan = models.CharField(max_length=20, blank=True, null=True)
    stripe_charge_id = models.CharField(max_length=100, blank=True, null=True)
    stripe_payment_intent_id = models.CharField(max_length=100, blank=True, null=True)
    qr_data = models.TextField(blank=True, null=True)

    # Remittance specific fields
    recipient_name = models.CharField(max_length=255, blank=True, null=True)
    recipient_account = models.CharField(max_length=255, blank=True, null=True)
    recipient_bank = models.CharField(max_length=255, blank=True, null=True)

    # Bill payment specific fields
    biller_name = models.CharField(max_length=255, blank=True, null=True)
    bill_reference = models.CharField(max_length=255, blank=True, null=True)
    bill_due_date = models.DateField(blank=True, null=True)

    # Mobile Money specific fields
    mobile_money_provider = models.CharField(max_length=50, blank=True, null=True)
    mobile_money_number = models.CharField(max_length=20, blank=True, null=True)
    provider_reference = models.CharField(max_length=100, blank=True, null=True)

    error = models.TextField(null=True, blank=True)
    metadata = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

# NOTE: Product model removed - use merchants.Product instead
# This avoids duplicate Product models across apps


class Session(models.Model):
    """Tracks user sessions for security and analytics"""
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sessions',
        null=True,
        blank=True
    )
    session_key = models.CharField(max_length=255, unique=True, db_index=True, default='')
    refresh_token = models.TextField(blank=True, null=True, default='')
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    device_id = models.CharField(max_length=32)  # Device fingerprint
    created_at = models.DateTimeField(auto_now_add=True)
    expiry_date = models.DateTimeField()
    is_active = models.BooleanField(default=True)

    class Meta:
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['ip_address']),
            models.Index(fields=['device_id']),
            models.Index(fields=['session_key']),
            models.Index(fields=['refresh_token']),
            models.Index(fields=['created_at']),
            models.Index(fields=['expiry_date']),
            models.Index(fields=['is_active']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"Session for {self.user.email if self.user else 'Anonymous'} from {self.ip_address}"
    
    @classmethod
    def create_jwt_session(cls, user, session_key, refresh_token, expires_at, ip_address, user_agent='', device_id=''):
        """Create a new JWT-based user session"""
        # Clean up expired sessions first
        cls.objects.filter(expiry_date__lt=timezone.now()).delete()
        
        return cls.objects.create(
            user=user,
            session_key=session_key,
            refresh_token=refresh_token,
            ip_address=ip_address,
            user_agent=user_agent,
            device_id=device_id,
            expiry_date=expires_at
        )
    
    @classmethod
    def invalidate_user_sessions(cls, user, exclude_session_key=None):
        """Invalidate all sessions for a user except optionally one session"""
        queryset = cls.objects.filter(user=user, is_active=True)
        if exclude_session_key:
            queryset = queryset.exclude(session_key=exclude_session_key)
        
        # Get sessions to invalidate
        sessions = queryset.all()
        
        # Blacklist the refresh tokens
        for session in sessions:
            if session.refresh_token:
                BlacklistedToken.blacklist_token(
                    token=session.refresh_token,
                    user=user,
                    expires_at=session.expiry_date
                )
        
        # Mark sessions as inactive
        queryset.update(is_active=False)
        
        return sessions.count()
    
    @classmethod
    def get_active_sessions(cls, user):
        """Get all active sessions for a user"""
        return cls.objects.filter(
            user=user, 
            is_active=True,
            expiry_date__gt=timezone.now()
        ).order_by('-created_at')

class UserActivity(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='activities'
    )
    event_type = models.CharField(max_length=20, choices=USER_ACTIVITY_TYPES)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'User Activities'
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['event_type']),
            models.Index(fields=['created_at']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.get_event_type_display()} at {self.created_at}"

# NOTE: Notification model removed - use notifications.Notification instead
# This avoids duplicate Notification models across apps


class Payout(models.Model):
    merchant = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payouts')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=PAYOUT_STATUS_CHOICES, default=STATUS_PENDING)
    method = models.CharField(max_length=50, choices=PAYOUT_METHOD_CHOICES)
    reference = models.CharField(max_length=100, blank=True)
    
    # Additional verification fields (optional for backward compatibility)
    recipient_name = models.CharField(max_length=100, blank=True, null=True, help_text="Full name of the payout recipient")
    recipient_email = models.EmailField(blank=True, null=True, help_text="Email address for notifications and verification")
    
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['merchant', 'status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['recipient_email']),
        ]

class SupportTicket(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='support_tickets')
    subject = models.CharField(max_length=200)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=SUPPORT_TICKET_STATUS_CHOICES, default='open')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['status', 'priority']),
        ]

    def __str__(self):
        return f"{self.subject} - {self.user.email}"

class SupportMessage(models.Model):
    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name='messages')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField()
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

class Recipient(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='recipients'
    )
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    account_number = models.CharField(max_length=50, blank=True, null=True)
    bank_name = models.CharField(max_length=255, blank=True, null=True)
    bank_branch = models.CharField(max_length=255, blank=True, null=True)
    mobile_provider = models.CharField(
        max_length=20,
        choices=MOBILE_MONEY_PROVIDERS,
        blank=True,
        null=True
    )
    recipient_type = models.CharField(
        max_length=10,
        choices=RECIPIENT_TYPE_CHOICES,
        default='mobile'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['recipient_type']),
        ]

    def __str__(self):
        return f"{self.name} - {self.user.email}"
