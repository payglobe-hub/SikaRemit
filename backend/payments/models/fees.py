from django.db import models
from django.conf import settings
from decimal import Decimal
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone

class FeeConfiguration(models.Model):
    """
    Dynamic fee configuration system for SikaRemit
    Supports platform-wide and merchant-specific fee structures
    """

    FEE_TYPES = [
        ('remittance', 'Cross-border Remittance'),
        ('domestic_transfer', 'Domestic Transfer'),
        ('payment', 'Payment Processing'),
        ('merchant_service', 'Merchant Service Fee'),
        ('platform_fee', 'Platform Fee'),
        ('withdrawal', 'Withdrawal Fee'),
        ('deposit', 'Deposit Fee'),
        ('bill_payment', 'Bill Payment'),
        ('airtime', 'Airtime Purchase'),
        ('data_bundle', 'Data Bundle Purchase'),
    ]

    CALCULATION_METHODS = [
        ('percentage', 'Percentage of Amount'),
        ('fixed', 'Fixed Amount'),
        ('tiered', 'Tiered Pricing'),
        ('volume_based', 'Volume Based'),
    ]

    # Basic Configuration
    name = models.CharField(max_length=100, help_text="Human-readable fee configuration name")
    fee_type = models.CharField(max_length=20, choices=FEE_TYPES, help_text="Type of fee this configuration applies to")
    description = models.TextField(blank=True, help_text="Description of this fee configuration")

    # Scope
    merchant = models.ForeignKey(
        'users.Merchant',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='fee_configurations',
        help_text="If set, this is a merchant-specific fee. If null, it's platform-wide."
    )
    is_platform_default = models.BooleanField(
        default=False,
        help_text="If true, this is the default fee for this type when no merchant-specific fee exists"
    )

    # Geographic Scope
    corridor_from = models.CharField(
        max_length=3,
        null=True,
        blank=True,
        help_text="Source country ISO code (e.g., 'USA'). Null means applies to all sources."
    )
    corridor_to = models.CharField(
        max_length=3,
        null=True,
        blank=True,
        help_text="Destination country ISO code (e.g., 'GHA'). Null means applies to all destinations."
    )

    # Currency
    currency = models.CharField(
        max_length=3,
        default='USD',
        help_text="Currency for this fee configuration"
    )

    # Fee Calculation
    calculation_method = models.CharField(
        max_length=20,
        choices=CALCULATION_METHODS,
        default='percentage',
        help_text="How to calculate the fee"
    )

    # Fixed Amount Fee
    fixed_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(Decimal('0'))],
        help_text="Fixed fee amount (used when calculation_method is 'fixed')"
    )

    # Percentage Fee
    percentage_fee = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=0,
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('1'))],
        help_text="Percentage fee as decimal (e.g., 0.025 for 2.5%)"
    )

    # Fee Limits
    min_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0'))],
        help_text="Minimum fee amount (optional)"
    )
    max_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0'))],
        help_text="Maximum fee amount (optional)"
    )

    # Amount-based Conditions
    min_transaction_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0'))],
        help_text="Minimum transaction amount for this fee to apply"
    )
    max_transaction_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0'))],
        help_text="Maximum transaction amount for this fee to apply"
    )

    # Time-based Validity
    effective_from = models.DateTimeField(
        default=timezone.now,
        help_text="When this fee configuration becomes effective"
    )
    effective_to = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this fee configuration expires (optional)"
    )

    # Status and Approval
    is_active = models.BooleanField(default=True, help_text="Whether this fee configuration is currently active")
    requires_approval = models.BooleanField(default=True, help_text="Whether fee changes require approval")

    # Audit Fields
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='created_fee_configurations'
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='approved_fee_configurations'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Fee Configuration'
        verbose_name_plural = 'Fee Configurations'
        ordering = ['-created_at']
        unique_together = [
            # Ensure no duplicate active configurations for same scope
            ['fee_type', 'merchant', 'corridor_from', 'corridor_to', 'is_active', 'effective_from']
        ]
        indexes = [
            models.Index(fields=['fee_type', 'is_active']),
            models.Index(fields=['merchant', 'fee_type', 'is_active']),
            models.Index(fields=['corridor_from', 'corridor_to', 'fee_type']),
            models.Index(fields=['effective_from', 'effective_to']),
        ]

    def __str__(self):
        scope = f"{self.merchant.business_name if self.merchant else 'Platform'}"
        corridor = f" ({self.corridor_from or 'ALL'} → {self.corridor_to or 'ALL'})"
        return f"{scope}: {self.get_fee_type_display()}{corridor}"

    def is_effective(self, check_time=None):
        """Check if this fee configuration is currently effective"""
        if check_time is None:
            check_time = timezone.now()

        if not self.is_active:
            return False

        if self.effective_from and check_time < self.effective_from:
            return False

        if self.effective_to and check_time > self.effective_to:
            return False

        return True

    def calculate_fee(self, amount, currency='USD'):
        """
        Calculate the fee for a given transaction amount
        Returns a FeeCalculationResult object
        """
        if not self.is_effective():
            return FeeCalculationResult(success=False, error="Fee configuration is not effective")

        if self.min_transaction_amount and amount < self.min_transaction_amount:
            return FeeCalculationResult(
                success=False,
                error=f"Amount below minimum ({self.min_transaction_amount})"
            )

        if self.max_transaction_amount and amount > self.max_transaction_amount:
            return FeeCalculationResult(
                success=False,
                error=f"Amount above maximum ({self.max_transaction_amount})"
            )

        fee_amount = Decimal('0')

        if self.calculation_method == 'fixed':
            fee_amount = self.fixed_fee
        elif self.calculation_method == 'percentage':
            fee_amount = amount * self.percentage_fee
        elif self.calculation_method == 'tiered':
            # Tiered: fixed_fee + percentage_fee applied together
            # The correct tier is selected by matching min/max_transaction_amount ranges
            # Each FeeConfiguration row represents one tier
            fee_amount = self.fixed_fee + (amount * self.percentage_fee)
        elif self.calculation_method == 'volume_based':
            # Volume-based: look up the user's/merchant's recent transaction count
            # and apply a discount multiplier for higher volumes
            base_fee = self.fixed_fee + (amount * self.percentage_fee)
            # Volume discount tiers based on monthly transaction count
            if self.merchant:
                from django.db.models import Count
                from datetime import timedelta
                month_ago = timezone.now() - timedelta(days=30)
                from payments.models.transactions import Transaction
                tx_count = Transaction.objects.filter(
                    merchant=self.merchant,
                    created_at__gte=month_ago,
                    status='completed'
                ).count()
                if tx_count > 1000:
                    fee_amount = base_fee * Decimal('0.70')   # 30% discount
                elif tx_count > 500:
                    fee_amount = base_fee * Decimal('0.80')   # 20% discount
                elif tx_count > 100:
                    fee_amount = base_fee * Decimal('0.90')   # 10% discount
                else:
                    fee_amount = base_fee
            else:
                fee_amount = base_fee

        # Apply min/max limits
        if self.min_fee is not None and fee_amount < self.min_fee:
            fee_amount = self.min_fee
        if self.max_fee is not None and fee_amount > self.max_fee:
            fee_amount = self.max_fee

        return FeeCalculationResult(
            success=True,
            fee_amount=fee_amount,
            breakdown={
                'calculation_method': self.calculation_method,
                'fixed_fee': self.fixed_fee,
                'percentage_fee': self.percentage_fee,
                'percentage_amount': amount * self.percentage_fee if self.calculation_method == 'percentage' else 0,
                'min_fee_applied': self.min_fee and fee_amount == self.min_fee,
                'max_fee_applied': self.max_fee and fee_amount == self.max_fee,
            }
        )

class FeeCalculationResult:
    """Result object for fee calculations"""

    def __init__(self, success, fee_amount=None, breakdown=None, error=None):
        self.success = success
        self.fee_amount = fee_amount or Decimal('0')
        self.breakdown = breakdown or {}
        self.error = error

    def to_dict(self):
        return {
            'success': self.success,
            'fee_amount': float(self.fee_amount),
            'breakdown': self.breakdown,
            'error': self.error,
        }

class FeeCalculationLog(models.Model):
    """
    Audit log for all fee calculations
    """

    transaction_type = models.CharField(max_length=50, help_text="Type of transaction")
    transaction_id = models.CharField(max_length=100, help_text="ID of the transaction")
    amount = models.DecimalField(max_digits=12, decimal_places=2, help_text="Transaction amount")
    fee_configuration = models.ForeignKey(
        FeeConfiguration,
        on_delete=models.SET_NULL,
        null=True,
        help_text="Fee configuration used for calculation"
    )
    calculated_fee = models.DecimalField(max_digits=10, decimal_places=2, help_text="Calculated fee amount")
    breakdown = models.JSONField(help_text="Detailed fee calculation breakdown")
    merchant = models.ForeignKey(
        'users.Merchant',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        help_text="Merchant involved (if applicable)"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        help_text="User who initiated the transaction"
    )
    corridor_from = models.CharField(max_length=3, null=True, blank=True)
    corridor_to = models.CharField(max_length=3, null=True, blank=True)
    currency = models.CharField(max_length=3, default='USD')
    calculated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Fee Calculation Log'
        verbose_name_plural = 'Fee Calculation Logs'
        ordering = ['-calculated_at']
        indexes = [
            models.Index(fields=['transaction_type', 'calculated_at']),
            models.Index(fields=['merchant', 'calculated_at']),
            models.Index(fields=['calculated_at']),
        ]

    def __str__(self):
        return f"{self.transaction_type} #{self.transaction_id}: {self.calculated_fee}"

class MerchantFeeOverride(models.Model):
    """
    Allows merchants to request custom fee structures
    """

    STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired'),
    ]

    merchant = models.ForeignKey('users.Merchant', on_delete=models.CASCADE, related_name='fee_overrides')
    fee_configuration = models.ForeignKey(FeeConfiguration, on_delete=models.CASCADE)
    proposed_fixed_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    proposed_percentage_fee = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    proposed_min_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    proposed_max_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    justification = models.TextField(help_text="Business justification for the fee override")

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='fee_override_requests')
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='fee_override_reviews')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Validity period for approved overrides
    effective_from = models.DateTimeField(null=True, blank=True)
    effective_to = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Merchant Fee Override'
        verbose_name_plural = 'Merchant Fee Overrides'
        ordering = ['-created_at']
        unique_together = ['merchant', 'fee_configuration', 'status']

    def __str__(self):
        return f"{self.merchant.business_name}: {self.fee_configuration.name} ({self.status})"
