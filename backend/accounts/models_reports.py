from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
import uuid

User = get_user_model()


class CustomerStatement(models.Model):
    """Customer account statements"""
    STATUS_CHOICES = [
        ('generating', 'Generating'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    FORMAT_CHOICES = [
        ('pdf', 'PDF'),
        ('excel', 'Excel'),
        ('csv', 'CSV'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey('users.Customer', on_delete=models.CASCADE, related_name='statements')
    period_name = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    format = models.CharField(max_length=10, choices=FORMAT_CHOICES, default='pdf')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='generating')
    
    # Statement data
    opening_balance = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    closing_balance = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    transaction_count = models.IntegerField(default=0)
    
    # File information
    file_url = models.URLField(blank=True, null=True)
    file_size = models.IntegerField(null=True, blank=True)
    
    # Generation settings
    include_charts = models.BooleanField(default=True)
    include_summary = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    generated_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['customer', '-created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['start_date', 'end_date']),
        ]

    def __str__(self):
        return f"{self.customer.user.email} - {self.period_name}"


class MerchantReport(models.Model):
    """Merchant-generated reports"""
    STATUS_CHOICES = [
        ('generating', 'Generating'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    FORMAT_CHOICES = [
        ('pdf', 'PDF'),
        ('excel', 'Excel'),
        ('csv', 'CSV'),
        ('json', 'JSON'),
    ]

    REPORT_TYPES = [
        ('transaction', 'Transaction Summary'),
        ('revenue', 'Revenue Report'),
        ('customer', 'Customer Analysis'),
        ('payment_methods', 'Payment Methods'),
        ('geographic', 'Geographic Distribution'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    merchant = models.ForeignKey('users.Merchant', on_delete=models.CASCADE, related_name='reports')
    template = models.ForeignKey('merchants.ReportTemplate', on_delete=models.SET_NULL, null=True)
    
    report_type = models.CharField(max_length=20, choices=REPORT_TYPES)
    format = models.CharField(max_length=10, choices=FORMAT_CHOICES, default='pdf')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='generating')
    
    # Date range
    start_date = models.DateField()
    end_date = models.DateField()
    
    # Report data
    total_records = models.IntegerField(null=True, blank=True)
    file_url = models.URLField(blank=True, null=True)
    file_size = models.IntegerField(null=True, blank=True)
    
    # Generation progress
    progress = models.IntegerField(default=0)
    error_message = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['merchant', '-created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['report_type']),
        ]

    def __str__(self):
        return f"{self.merchant.business_name} - {self.get_report_type_display()}"


class ReportTemplate(models.Model):
    """Report templates for merchants"""
    REPORT_TYPES = [
        ('transaction', 'Transaction Summary'),
        ('revenue', 'Revenue Report'),
        ('customer', 'Customer Analysis'),
        ('payment_methods', 'Payment Methods'),
        ('geographic', 'Geographic Distribution'),
    ]

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    report_type = models.CharField(max_length=20, choices=REPORT_TYPES)
    
    # Template configuration
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    config = models.JSONField(default=dict)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Report Template'
        verbose_name_plural = 'Report Templates'

    def __str__(self):
        return self.name


class ScheduledReport(models.Model):
    """Scheduled reports for automated generation"""
    FREQUENCY_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('expired', 'Expired'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    
    # Report configuration
    template = models.ForeignKey(ReportTemplate, on_delete=models.CASCADE)
    frequency = models.CharField(max_length=10, choices=FREQUENCY_CHOICES)
    format = models.CharField(max_length=10, choices=MerchantReport.FORMAT_CHOICES, default='pdf')
    
    # Owner (can be merchant or admin)
    merchant = models.ForeignKey('users.Merchant', on_delete=models.CASCADE, null=True, blank=True, related_name='admin_scheduled_reports')
    admin_user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='admin_scheduled_reports')
    
    # Scheduling
    next_run = models.DateTimeField()
    last_run = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    
    # Email recipients
    email_recipients = models.JSONField(default=list)
    
    # Report settings
    include_charts = models.BooleanField(default=True)
    include_summary = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'next_run']),
            models.Index(fields=['merchant']),
            models.Index(fields=['admin_user']),
        ]

    def __str__(self):
        return self.name


class AdminReport(models.Model):
    """Admin-generated reports"""
    STATUS_CHOICES = [
        ('generating', 'Generating'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    FORMAT_CHOICES = [
        ('pdf', 'PDF'),
        ('excel', 'Excel'),
        ('csv', 'CSV'),
        ('json', 'JSON'),
        ('xml', 'XML'),
    ]

    REPORT_TYPES = [
        ('transactions', 'Transactions'),
        ('users', 'Users'),
        ('revenue', 'Revenue'),
        ('payments', 'Payments'),
        ('merchants', 'Merchants'),
        ('compliance', 'Compliance'),
        ('customers', 'Customers'),
        ('disputes', 'Disputes'),
        ('audit', 'Audit Trail'),
        ('performance', 'Performance'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    admin_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='generated_reports')
    
    report_type = models.CharField(max_length=20, choices=REPORT_TYPES)
    format = models.CharField(max_length=10, choices=FORMAT_CHOICES, default='pdf')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='generating')
    
    # Date range
    date_from = models.DateField(null=True, blank=True)
    date_to = models.DateField(null=True, blank=True)
    
    # Report data
    total_records = models.IntegerField(null=True, blank=True)
    file_url = models.URLField(blank=True, null=True)
    file_size = models.IntegerField(null=True, blank=True)
    
    # Generation settings
    include_charts = models.BooleanField(default=True)
    include_summary = models.BooleanField(default=True)
    filters = models.JSONField(default=dict)
    
    # Generation progress
    progress = models.IntegerField(default=0)
    error_message = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['admin_user', '-created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['report_type']),
        ]

    def __str__(self):
        return f"{self.admin_user.email} - {self.get_report_type_display()}"


class ReportGenerationJob(models.Model):
    """Background job for report generation"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Job details
    job_type = models.CharField(max_length=20)  # customer_statement, merchant_report, admin_report
    object_id = models.UUIDField()  # ID of the report object
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Progress tracking
    progress = models.IntegerField(default=0)
    current_step = models.CharField(max_length=100, blank=True)
    
    # Error handling
    error_message = models.TextField(blank=True)
    retry_count = models.IntegerField(default=0)
    max_retries = models.IntegerField(default=3)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['job_type', 'object_id']),
        ]

    def __str__(self):
        return f"{self.job_type} - {self.object_id}"


class ReportCache(models.Model):
    """Cache for frequently accessed report data"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Cache key
    cache_key = models.CharField(max_length=255, unique=True)
    
    # Cached data
    data = models.JSONField()
    
    # Cache metadata
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    hit_count = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['cache_key']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return self.cache_key

    def is_expired(self):
        """Check if cache is expired"""
        return timezone.now() > self.expires_at
