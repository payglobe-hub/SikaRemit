"""Extra exchange rate models: history, alerts, multi-currency payments.
Migrated from the orphaned payments/models.py file."""
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from django.utils import timezone

class ExchangeRateHistory(models.Model):
    """
    Historical record of exchange rate changes for audit trails
    """
    rate = models.ForeignKey('payments.ExchangeRate', on_delete=models.CASCADE, related_name='history')
    old_rate = models.DecimalField(max_digits=18, decimal_places=8, null=True, blank=True)
    new_rate = models.DecimalField(max_digits=18, decimal_places=8)

    # Who made the change
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    changed_at = models.DateTimeField(auto_now_add=True)

    # Change details
    change_reason = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-changed_at']
        verbose_name = 'Exchange Rate History'
        verbose_name_plural = 'Exchange Rate History'

    def __str__(self):
        return f"Rate change: {self.rate} - {self.old_rate} → {self.new_rate}"

class ExchangeRateAlert(models.Model):
    """
    Alerts for exchange rate changes or thresholds
    """
    ALERT_TYPES = [
        ('threshold', 'Rate Threshold Alert'),
        ('change', 'Rate Change Alert'),
        ('stale', 'Stale Rate Alert'),
    ]

    alert_type = models.CharField(max_length=20, choices=ALERT_TYPES)
    from_currency = models.CharField(max_length=3)
    to_currency = models.CharField(max_length=3)

    # Alert conditions
    threshold_rate = models.DecimalField(max_digits=18, decimal_places=8, null=True, blank=True)
    change_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Percentage change that triggers alert")

    # Alert recipients
    notify_users = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name='exchange_rate_alert_notifications', help_text="Users to notify")
    notify_emails = models.JSONField(default=list, blank=True, help_text="Additional email addresses to notify")

    # Alert status
    is_active = models.BooleanField(default=True)
    last_triggered = models.DateTimeField(null=True, blank=True)

    # Metadata
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_exchange_rate_alerts')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Exchange Rate Alert'
        verbose_name_plural = 'Exchange Rate Alerts'

    def __str__(self):
        return f"{self.alert_type}: {self.from_currency}/{self.to_currency}"

class MultiCurrencyPayment(models.Model):
    """Track multi-currency payment transactions"""
    payment = models.OneToOneField('payments.Payment', on_delete=models.CASCADE, related_name='multi_currency')
    original_amount = models.DecimalField(max_digits=12, decimal_places=2)
    original_currency = models.CharField(max_length=3)
    converted_amount = models.DecimalField(max_digits=12, decimal_places=2)
    converted_currency = models.CharField(max_length=3)
    exchange_rate = models.DecimalField(max_digits=18, decimal_places=8)
    conversion_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    rate_source = models.CharField(max_length=50, default='api')
    converted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.original_amount} {self.original_currency} → {self.converted_amount} {self.converted_currency}"

    class Meta:
        verbose_name = 'Multi-Currency Payment'
        verbose_name_plural = 'Multi-Currency Payments'

class ReportDashboard(models.Model):
    """
    Model for storing reporting dashboard configurations
    """
    name = models.CharField(max_length=100)
    config = models.JSONField(default=dict)

    def __str__(self):
        return self.name

# Signal to track rate changes
@receiver(post_save, sender='payments.ExchangeRate')
def track_rate_changes(sender, instance, created, **kwargs):
    """Track changes to exchange rates for audit purposes"""
    if not created:
        try:
            from .currency import ExchangeRate
            old_instance = ExchangeRate.objects.get(pk=instance.pk)
            if old_instance.rate != instance.rate:
                ExchangeRateHistory.objects.create(
                    rate=instance,
                    old_rate=old_instance.rate,
                    new_rate=instance.rate,
                    changed_by=instance.updated_by,
                    change_reason="Rate updated via admin"
                )
        except Exception:
            pass
