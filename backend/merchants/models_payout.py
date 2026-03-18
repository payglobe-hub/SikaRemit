"""
Merchant Revenue Settlement and Payout System - Real financial processing
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
from merchants.models import Store
from ecommerce.models import Order, OrderItem

User = get_user_model()

class MerchantRevenue(models.Model):
    """
    Tracks revenue earned by merchants from orders
    """
    merchant = models.ForeignKey(User, on_delete=models.CASCADE, related_name='merchant_revenue')
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='revenue_records')

    # Order information
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='merchant_revenue')
    order_item = models.ForeignKey(OrderItem, on_delete=models.CASCADE, related_name='revenue')

    # Financial details
    gross_amount = models.DecimalField(max_digits=10, decimal_places=2)  # Full item price
    platform_fee = models.DecimalField(max_digits=10, decimal_places=2)  # Platform commission
    net_amount = models.DecimalField(max_digits=10, decimal_places=2)  # Amount merchant receives

    # Settlement status
    is_settled = models.BooleanField(default=False)
    settled_at = models.DateTimeField(null=True, blank=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['order', 'order_item']  # One revenue record per order item

    def __str__(self):
        return f"Revenue for {self.merchant.get_full_name()} - Order {self.order.order_number}"

    @property
    def platform_fee_percentage(self):
        """Calculate platform fee percentage"""
        if self.gross_amount > 0:
            return round((self.platform_fee / self.gross_amount) * 100, 2)
        return 0

class MerchantPayout(models.Model):
    """
    Payout batches for settling merchant revenue
    """
    PAYOUT_STATUS = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]

    PAYOUT_METHODS = [
        ('bank_transfer', 'Bank Transfer'),
        ('mobile_money', 'Mobile Money'),
        ('wallet', 'Platform Wallet'),
    ]

    # Merchant information
    merchant = models.ForeignKey(User, on_delete=models.CASCADE, related_name='merchant_payouts')

    # Payout details
    payout_reference = models.CharField(max_length=50, unique=True)
    payout_method = models.CharField(max_length=20, choices=PAYOUT_METHODS)

    # Financial amounts
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    fee_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    net_amount = models.DecimalField(max_digits=10, decimal_places=2)

    # Revenue records included in this payout
    revenue_records = models.ManyToManyField(MerchantRevenue, related_name='payouts')

    # Status and processing
    status = models.CharField(max_length=20, choices=PAYOUT_STATUS, default='pending')
    processed_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    # Bank/Mobile Money details
    bank_name = models.CharField(max_length=100, blank=True)
    account_number = models.CharField(max_length=50, blank=True)
    account_holder_name = models.CharField(max_length=100, blank=True)
    mobile_number = models.CharField(max_length=20, blank=True)

    # Processing information
    transaction_id = models.CharField(max_length=100, blank=True)
    failure_reason = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Payout {self.payout_reference} - {self.merchant.get_full_name()}"

    def save(self, *args, **kwargs):
        if not self.payout_reference:
            import uuid
            self.payout_reference = f"PAYOUT-{timezone.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
        super().save(*args, **kwargs)

    @property
    def revenue_count(self):
        """Number of revenue records in this payout"""
        return self.revenue_records.count()

    def mark_completed(self, transaction_id=None):
        """Mark payout as completed"""
        self.status = 'completed'
        self.completed_at = timezone.now()
        if transaction_id:
            self.transaction_id = transaction_id
        self.save()

    def mark_failed(self, reason=None):
        """Mark payout as failed"""
        self.status = 'failed'
        if reason:
            self.failure_reason = reason
        self.save()

class MerchantSettlementSettings(models.Model):
    """
    Merchant payout preferences and settings
    """
    merchant = models.OneToOneField(User, on_delete=models.CASCADE, related_name='settlement_settings')

    # Payout preferences
    default_payout_method = models.CharField(
        max_length=20,
        choices=MerchantPayout.PAYOUT_METHODS,
        default='bank_transfer'
    )

    # Automatic payout settings
    auto_payout_enabled = models.BooleanField(default=False)
    minimum_payout_amount = models.DecimalField(max_digits=10, decimal_places=2, default=100.00)
    payout_schedule = models.CharField(
        max_length=20,
        choices=[
            ('weekly', 'Weekly'),
            ('biweekly', 'Bi-weekly'),
            ('monthly', 'Monthly'),
            ('manual', 'Manual Only'),
        ],
        default='manual'
    )

    # Bank account details
    bank_name = models.CharField(max_length=100, blank=True)
    account_number = models.CharField(max_length=50, blank=True)
    account_holder_name = models.CharField(max_length=100, blank=True)
    routing_number = models.CharField(max_length=50, blank=True)  # For international transfers

    # Mobile money details
    mobile_money_provider = models.CharField(max_length=50, blank=True)
    mobile_money_number = models.CharField(max_length=20, blank=True)

    # Tax information
    tax_id = models.CharField(max_length=50, blank=True)
    tax_withholding_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Settlement settings for {self.merchant.get_full_name()}"

class MerchantRevenueSummary(models.Model):
    """
    Daily/weekly/monthly revenue summaries for merchants
    """
    merchant = models.ForeignKey(User, on_delete=models.CASCADE, related_name='revenue_summaries')
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='revenue_summaries')

    # Time period
    period_start = models.DateField()
    period_end = models.DateField()
    period_type = models.CharField(
        max_length=20,
        choices=[
            ('daily', 'Daily'),
            ('weekly', 'Weekly'),
            ('monthly', 'Monthly'),
        ]
    )

    # Financial summary
    gross_revenue = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    platform_fees = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    net_revenue = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    # Order statistics
    order_count = models.PositiveIntegerField(default=0)
    item_count = models.PositiveIntegerField(default=0)

    # Settlement status
    is_settled = models.BooleanField(default=False)
    settled_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-period_end', '-period_start']
        unique_together = ['merchant', 'store', 'period_start', 'period_end', 'period_type']

    def __str__(self):
        return f"{self.merchant.get_full_name()} - {self.period_type} summary ({self.period_start} to {self.period_end})"
