"""Fraud detection models: alerts, blacklists, reports.
Migrated from the orphaned payments/models.py file."""
from django.db import models
from django.conf import settings
from users.models import Customer

class FraudAlert(models.Model):
    """Fraud detection alerts"""
    PENDING = 'pending_review'
    APPROVED = 'approved'
    BLOCKED = 'blocked'
    FALSE_POSITIVE = 'false_positive'

    STATUS_CHOICES = [
        (PENDING, 'Pending Review'),
        (APPROVED, 'Approved'),
        (BLOCKED, 'Blocked'),
        (FALSE_POSITIVE, 'False Positive'),
    ]

    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='fraud_alerts')
    payment = models.ForeignKey('payments.Payment', on_delete=models.CASCADE, null=True, blank=True, related_name='fraud_alerts')
    transaction_id = models.CharField(max_length=100, db_index=True)
    risk_score = models.DecimalField(max_digits=5, decimal_places=3)
    risk_level = models.CharField(max_length=20)
    triggered_rules = models.JSONField(default=list)
    transaction_data = models.JSONField(default=dict)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=PENDING)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['risk_level']),
        ]

    def __str__(self):
        return f"Fraud Alert: {self.transaction_id} - {self.risk_level}"

class FraudBlacklist(models.Model):
    """Blacklist for fraudulent entities"""
    ENTITY_TYPES = [
        ('email', 'Email Address'),
        ('ip', 'IP Address'),
        ('bin', 'Card BIN'),
        ('device', 'Device Fingerprint'),
        ('phone', 'Phone Number'),
    ]

    entity_type = models.CharField(max_length=20, choices=ENTITY_TYPES)
    entity_value = models.CharField(max_length=255, db_index=True)
    reason = models.TextField()
    added_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ['entity_type', 'entity_value']
        indexes = [
            models.Index(fields=['entity_type', 'entity_value']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.entity_type}: {self.entity_value}"

class BlacklistedBIN(models.Model):
    """Blacklisted card BINs"""
    bin = models.CharField(max_length=8, unique=True, db_index=True)
    reason = models.CharField(max_length=255)
    source = models.CharField(max_length=50, default='manual')
    added_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"BIN: {self.bin}"

class FraudReport(models.Model):
    """User-reported fraud"""
    transaction_id = models.CharField(max_length=100, db_index=True)
    reason = models.TextField()
    reported_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    reported_at = models.DateTimeField(auto_now_add=True)
    investigated = models.BooleanField(default=False)
    investigation_notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-reported_at']

    def __str__(self):
        return f"Fraud Report: {self.transaction_id}"
