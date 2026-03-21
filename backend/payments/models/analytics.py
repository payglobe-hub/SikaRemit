from django.db import models
from django.conf import settings
from django.db.models import Sum, Count, Avg, Max, Min
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
import json

class AnalyticsMetric(models.Model):
    """
    Real-time analytics metrics for dashboard
    """

    METRIC_TYPES = [
        ('transaction_volume', 'Transaction Volume'),
        ('transaction_value', 'Transaction Value'),
        ('fee_revenue', 'Fee Revenue'),
        ('merchant_count', 'Active Merchants'),
        ('customer_count', 'Active Customers'),
        ('conversion_rate', 'Conversion Rate'),
        ('success_rate', 'Success Rate'),
        ('geographic_distribution', 'Geographic Distribution'),
        ('payment_method_usage', 'Payment Method Usage'),
        ('kyc_completion_rate', 'KYC Completion Rate'),
        ('risk_score_distribution', 'Risk Score Distribution'),
        ('merchant_performance', 'Merchant Performance'),
    ]

    FREQUENCY_CHOICES = [
        ('realtime', 'Real-time'),
        ('hourly', 'Hourly'),
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    ]

    metric_type = models.CharField(max_length=50, choices=METRIC_TYPES)
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default='daily')
    value = models.DecimalField(max_digits=20, decimal_places=4, null=True, blank=True)
    value_json = models.JSONField(null=True, blank=True)  # For complex data structures
    dimensions = models.JSONField(default=dict, help_text="Filter dimensions (merchant, country, etc.)")
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()
    calculated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Analytics Metric'
        verbose_name_plural = 'Analytics Metrics'
        ordering = ['-calculated_at']
        indexes = [
            models.Index(fields=['metric_type', 'period_start', 'period_end']),
            models.Index(fields=['frequency', 'calculated_at']),
            models.Index(fields=['is_active', 'metric_type']),
        ]

    def __str__(self):
        return f"{self.metric_type} ({self.frequency}) - {self.period_start.date()}"

class DashboardSnapshot(models.Model):
    """
    Daily snapshots of key dashboard metrics
    """

    date = models.DateField(unique=True)
    total_transactions = models.PositiveIntegerField(default=0)
    total_transaction_value = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_fee_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    active_merchants = models.PositiveIntegerField(default=0)
    active_customers = models.PositiveIntegerField(default=0)
    new_registrations = models.PositiveIntegerField(default=0)
    successful_transactions = models.PositiveIntegerField(default=0)
    failed_transactions = models.PositiveIntegerField(default=0)

    # Geographic breakdown (stored as JSON)
    transactions_by_country = models.JSONField(default=dict)
    revenue_by_country = models.JSONField(default=dict)

    # Payment method usage
    payment_method_usage = models.JSONField(default=dict)

    # Merchant performance (top 10)
    top_merchants_by_volume = models.JSONField(default=list)
    top_merchants_by_revenue = models.JSONField(default=list)

    # Risk and compliance
    kyc_completion_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    high_risk_transactions = models.PositiveIntegerField(default=0)
    reported_to_regulator = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Dashboard Snapshot'
        verbose_name_plural = 'Dashboard Snapshots'
        ordering = ['-date']

    def __str__(self):
        return f"Dashboard Snapshot - {self.date}"

    @property
    def success_rate(self):
        total = self.successful_transactions + self.failed_transactions
        return (self.successful_transactions / total * 100) if total > 0 else 0

class MerchantAnalytics(models.Model):
    """
    Detailed analytics for individual merchants
    """

    merchant = models.ForeignKey('users.Merchant', on_delete=models.CASCADE, related_name='analytics')
    date = models.DateField()

    # Transaction metrics
    transaction_count = models.PositiveIntegerField(default=0)
    transaction_value = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    fee_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Customer metrics
    unique_customers = models.PositiveIntegerField(default=0)
    new_customers = models.PositiveIntegerField(default=0)

    # Performance metrics
    success_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    average_transaction_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Geographic breakdown
    transactions_by_country = models.JSONField(default=dict)

    # Payment methods used by merchant's customers
    payment_method_usage = models.JSONField(default=dict)

    # Risk metrics
    high_risk_transactions = models.PositiveIntegerField(default=0)
    kyc_pending_customers = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Merchant Analytics'
        verbose_name_plural = 'Merchant Analytics'
        ordering = ['-date', '-transaction_value']
        unique_together = ['merchant', 'date']
        indexes = [
            models.Index(fields=['merchant', 'date']),
            models.Index(fields=['date', 'transaction_value']),
        ]

    def __str__(self):
        return f"{self.merchant.business_name} - {self.date}"

class TransactionAnalytics(models.Model):
    """
    Detailed transaction-level analytics
    """

    TRANSACTION_TYPES = [
        ('payment', 'Payment'),
        ('transfer', 'Transfer'),
        ('remittance', 'Remittance'),
        ('bill_payment', 'Bill Payment'),
        ('airtime', 'Airtime Purchase'),
        ('data_bundle', 'Data Bundle Purchase'),
        ('merchant_service', 'Merchant Service'),
    ]

    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    transaction_id = models.CharField(max_length=100, unique=True)
    merchant = models.ForeignKey('users.Merchant', null=True, blank=True, on_delete=models.SET_NULL)
    customer = models.ForeignKey('users.Customer', null=True, blank=True, on_delete=models.SET_NULL)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    fee_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='USD')
    payment_method = models.CharField(max_length=50, blank=True)
    country_from = models.CharField(max_length=3, null=True, blank=True)
    country_to = models.CharField(max_length=3, null=True, blank=True)
    status = models.CharField(max_length=20)
    risk_score = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    processing_time_ms = models.PositiveIntegerField(null=True, blank=True)
    device_info = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField()

    class Meta:
        verbose_name = 'Transaction Analytics'
        verbose_name_plural = 'Transaction Analytics'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['transaction_type', 'created_at']),
            models.Index(fields=['merchant', 'created_at']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['country_from', 'country_to']),
            models.Index(fields=['created_at', 'amount']),
        ]

    def __str__(self):
        return f"{self.transaction_type} #{self.transaction_id}"

class PerformanceAlert(models.Model):
    """
    Automated alerts for performance issues and anomalies
    """

    ALERT_TYPES = [
        ('transaction_failure_rate', 'High Transaction Failure Rate'),
        ('merchant_performance_drop', 'Merchant Performance Drop'),
        ('unusual_transaction_volume', 'Unusual Transaction Volume'),
        ('geographic_anomaly', 'Geographic Anomaly'),
        ('payment_method_issue', 'Payment Method Issue'),
        ('regulatory_threshold', 'Regulatory Threshold Breach'),
        ('system_performance', 'System Performance Issue'),
        ('security_threat', 'Security Threat Detected'),
    ]

    SEVERITY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    alert_type = models.CharField(max_length=50, choices=ALERT_TYPES)
    severity = models.CharField(max_length=20, choices=SEVERITY_LEVELS, default='medium')
    title = models.CharField(max_length=200)
    description = models.TextField()
    affected_entities = models.JSONField(default=dict)  # merchants, customers, etc.
    metrics = models.JSONField(default=dict)  # relevant metrics data
    threshold_breached = models.CharField(max_length=100, blank=True)
    suggested_actions = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)
    acknowledged_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='acknowledged_alerts')
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Performance Alert'
        verbose_name_plural = 'Performance Alerts'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.alert_type} - {self.title}"

    def acknowledge(self, user):
        """Mark alert as acknowledged"""
        self.acknowledged_by = user
        self.acknowledged_at = timezone.now()
        self.save()

    def resolve(self):
        """Mark alert as resolved"""
        self.resolved_at = timezone.now()
        self.is_active = False
        self.save()
