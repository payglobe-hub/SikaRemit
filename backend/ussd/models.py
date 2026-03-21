from django.db import models
from django.utils import timezone
from users.models import Customer, Merchant
import uuid

class USSDSession(models.Model):
    """USSD session tracking"""

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('timeout', 'Timeout'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone_number = models.CharField(max_length=20, db_index=True)
    session_id = models.CharField(max_length=100, unique=True, db_index=True)
    service_code = models.CharField(max_length=50)  # e.g., "*123#"
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    current_menu = models.CharField(max_length=100, blank=True, null=True)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)

    # Track menu navigation history
    menu_history = models.JSONField(default=list, blank=True)

    # Store session data
    data = models.JSONField(default=dict, blank=True)

    # Steps tracking (similar to frontend interface)
    steps = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ['-last_activity']
        indexes = [
            models.Index(fields=['phone_number', 'status']),
            models.Index(fields=['session_id']),
            models.Index(fields=['status', 'last_activity']),
        ]

    def __str__(self):
        return f"USSD {self.phone_number} - {self.session_id}"

    def add_step(self, step_number, input_text, response_text):
        """Add a step to the session"""
        step = {
            'step': step_number,
            'input': input_text,
            'response': response_text,
            'timestamp': timezone.now().isoformat()
        }
        self.steps.append(step)
        self.save(update_fields=['steps', 'last_activity'])

    def update_menu_history(self, menu):
        """Update menu navigation history"""
        if menu not in self.menu_history:
            self.menu_history.append(menu)
            self.save(update_fields=['menu_history'])

    def end_session(self, status='completed'):
        """End the session"""
        self.status = status
        self.ended_at = timezone.now()
        self.save(update_fields=['status', 'ended_at'])

    @property
    def duration_seconds(self):
        """Calculate session duration in seconds"""
        end_time = self.ended_at or timezone.now()
        return int((end_time - self.started_at).total_seconds())

class USSDTransaction(models.Model):
    """USSD transaction records"""

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(USSDSession, on_delete=models.CASCADE, related_name='transactions')
    phone_number = models.CharField(max_length=20, db_index=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default='USD')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Service information
    service_code = models.CharField(max_length=50)
    current_menu = models.CharField(max_length=100, blank=True, null=True)

    # User input and menu data
    text = models.TextField(blank=True, null=True)
    menu_data = models.JSONField(default=dict, blank=True)

    # Link to actual payment if completed
    payment = models.ForeignKey('payments.Payment', on_delete=models.SET_NULL, null=True, blank=True, related_name='ussd_transactions')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['phone_number', 'status']),
            models.Index(fields=['session', 'created_at']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['service_code']),
        ]

    def __str__(self):
        return f"USSD TX {self.phone_number} - {self.amount or 'N/A'} {self.currency}"

    def mark_completed(self, payment=None):
        """Mark transaction as completed"""
        self.status = 'completed'
        if payment:
            self.payment = payment
        self.save()

    def mark_failed(self, reason=None):
        """Mark transaction as failed"""
        self.status = 'failed'
        if reason:
            self.menu_data['failure_reason'] = reason
        self.save()

class USSDService(models.Model):
    """USSD service configurations"""

    SERVICE_TYPES = [
        ('payment', 'Payment Service'),
        ('balance', 'Balance Check'),
        ('transfer', 'Money Transfer'),
        ('airtime', 'Airtime Purchase'),
        ('bill_payment', 'Bill Payment'),
        ('custom', 'Custom Service'),
    ]

    code = models.CharField(max_length=50, unique=True)  # e.g., "*123#"
    name = models.CharField(max_length=100)
    service_type = models.CharField(max_length=20, choices=SERVICE_TYPES, default='payment')
    description = models.TextField(blank=True)

    # Menu configuration
    menu_config = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.code} - {self.name}"
