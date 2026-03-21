from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator
from decimal import Decimal
from datetime import timedelta

User = get_user_model()

class SubscriptionPlan(models.Model):
    """
    Subscription plans with pricing and features
    """
    PLAN_TYPES = [
        ('personal', 'Personal'),
        ('business', 'Business'),
        ('enterprise', 'Enterprise'),
    ]

    BILLING_CYCLES = [
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('yearly', 'Yearly'),
    ]

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    plan_type = models.CharField(max_length=20, choices=PLAN_TYPES, default='personal')
    billing_cycle = models.CharField(max_length=20, choices=BILLING_CYCLES, default='monthly')

    # Pricing
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0'))])
    currency = models.CharField(max_length=3, default='USD')

    # Trial period
    trial_days = models.PositiveIntegerField(default=0)

    # Plan limits
    max_users = models.PositiveIntegerField(null=True, blank=True)  # For business plans
    max_transactions_per_month = models.PositiveIntegerField(null=True, blank=True)
    max_invoices_per_month = models.PositiveIntegerField(null=True, blank=True)
    max_storage_gb = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    # Feature flags
    features = models.JSONField(default=dict, help_text="JSON object with feature flags")

    # Status
    is_active = models.BooleanField(default=True)
    is_popular = models.BooleanField(default=False)  # Highlight in UI

    # Ordering
    display_order = models.PositiveIntegerField(default=0)

    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_order', 'price']

    def __str__(self):
        return f"{self.name} - {self.get_price_display()}"

    def get_price_display(self):
        """Format price with currency and billing cycle"""
        cycle_display = {
            'monthly': '/month',
            'quarterly': '/quarter',
            'yearly': '/year',
        }.get(self.billing_cycle, '')
        return f"{self.price} {self.currency}{cycle_display}"

    @property
    def has_trial(self):
        return self.trial_days > 0

    def get_annual_price(self):
        """Calculate annual equivalent price"""
        if self.billing_cycle == 'yearly':
            return self.price
        elif self.billing_cycle == 'quarterly':
            return self.price * 4
        else:  # monthly
            return self.price * 12

class SubscriptionFeature(models.Model):
    """
    Features available in subscription plans
    """
    FEATURE_TYPES = [
        ('boolean', 'Boolean (Enabled/Disabled)'),
        ('limit', 'Limit (Numeric)'),
        ('unlimited', 'Unlimited'),
    ]

    name = models.CharField(max_length=100, unique=True)
    display_name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    feature_type = models.CharField(max_length=20, choices=FEATURE_TYPES, default='boolean')

    # For limit type features
    default_limit = models.PositiveIntegerField(null=True, blank=True)

    # Icon and color for UI
    icon = models.CharField(max_length=50, blank=True)
    color = models.CharField(max_length=7, default='#2563eb')

    # Status
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.display_name

class PlanFeature(models.Model):
    """
    Features included in specific subscription plans
    """
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.CASCADE, related_name='plan_features')
    feature = models.ForeignKey(SubscriptionFeature, on_delete=models.CASCADE)

    # Feature value (depends on feature type)
    enabled = models.BooleanField(default=True)
    limit_value = models.PositiveIntegerField(null=True, blank=True)

    # Custom description for this plan
    custom_description = models.TextField(blank=True)

    class Meta:
        unique_together = ['plan', 'feature']

    def __str__(self):
        if self.feature.feature_type == 'boolean':
            return f"{self.plan.name}: {self.feature.display_name} ({'Enabled' if self.enabled else 'Disabled'})"
        elif self.feature.feature_type == 'limit':
            return f"{self.plan.name}: {self.feature.display_name} ({self.limit_value or 'Unlimited'})"
        else:
            return f"{self.plan.name}: {self.feature.display_name} (Unlimited)"

    @property
    def value(self):
        """Get the feature value based on type"""
        if self.feature.feature_type == 'boolean':
            return self.enabled
        elif self.feature.feature_type == 'limit':
            return self.limit_value
        else:  # unlimited
            return None

class Subscription(models.Model):
    """
    User subscriptions to plans
    """
    STATUS_CHOICES = [
        ('trial', 'Trial'),
        ('active', 'Active'),
        ('past_due', 'Past Due'),
        ('canceled', 'Canceled'),
        ('expired', 'Expired'),
        ('pending', 'Pending Activation'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='subscriptions')
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.CASCADE)

    # Subscription details
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Billing dates
    start_date = models.DateTimeField(default=timezone.now)
    current_period_start = models.DateTimeField(default=timezone.now)
    current_period_end = models.DateTimeField()
    trial_end = models.DateTimeField(null=True, blank=True)
    canceled_at = models.DateTimeField(null=True, blank=True)

    # Payment method
    payment_method_id = models.CharField(max_length=100, blank=True)

    # Cancellation
    cancel_at_period_end = models.BooleanField(default=False)
    cancellation_reason = models.TextField(blank=True)

    # Metadata
    metadata = models.JSONField(default=dict, blank=True)

    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['user', 'plan']  # One subscription per plan per user

    def __str__(self):
        return f"{self.user.username}'s {self.plan.name} subscription"

    def save(self, *args, **kwargs):
        # Set trial end date if trial days exist
        if not self.trial_end and self.plan.trial_days > 0:
            self.trial_end = self.start_date + timedelta(days=self.plan.trial_days)

        # Set initial period end
        if not self.current_period_end:
            if self.is_on_trial:
                self.current_period_end = self.trial_end
            else:
                self.set_next_billing_date()

        super().save(*args, **kwargs)

    @property
    def is_on_trial(self):
        """Check if subscription is currently in trial"""
        return self.trial_end and timezone.now() < self.trial_end and self.status == 'trial'

    @property
    def trial_days_remaining(self):
        """Get remaining trial days"""
        if not self.is_on_trial:
            return 0
        remaining = self.trial_end - timezone.now()
        return max(0, remaining.days)

    @property
    def days_until_next_billing(self):
        """Get days until next billing"""
        remaining = self.current_period_end - timezone.now()
        return max(0, remaining.days)

    def set_next_billing_date(self):
        """Set the next billing date based on plan cycle"""
        if self.plan.billing_cycle == 'monthly':
            self.current_period_end = self.current_period_start + timedelta(days=30)
        elif self.plan.billing_cycle == 'quarterly':
            self.current_period_end = self.current_period_start + timedelta(days=90)
        elif self.plan.billing_cycle == 'yearly':
            self.current_period_end = self.current_period_start + timedelta(days=365)

    def activate(self):
        """Activate the subscription"""
        if self.is_on_trial:
            self.status = 'trial'
        else:
            self.status = 'active'
        self.save()

    def cancel(self, reason='', cancel_immediately=False):
        """Cancel the subscription"""
        self.canceled_at = timezone.now()
        self.cancellation_reason = reason

        if cancel_immediately:
            self.status = 'canceled'
        else:
            self.cancel_at_period_end = True

        self.save()

    def reactivate(self):
        """Reactivate a canceled subscription"""
        if self.status == 'canceled':
            self.status = 'active'
            self.cancel_at_period_end = False
            self.canceled_at = None
            self.cancellation_reason = ''
            self.save()

    def process_billing_cycle(self):
        """Process end of billing cycle"""
        if self.cancel_at_period_end:
            self.status = 'canceled'
            self.save()
            return

        # Move to next billing cycle
        self.current_period_start = self.current_period_end
        self.set_next_billing_date()
        self.save()

        # Create payment record (this would trigger actual payment processing)
        self.create_payment_record()

    def create_payment_record(self):
        """Create a payment record for the billing cycle"""
        # This would integrate with the payment system
        SubscriptionPayment.objects.create(
            subscription=self,
            amount=self.plan.price,
            currency=self.plan.currency,
            billing_period_start=self.current_period_start,
            billing_period_end=self.current_period_end,
            status='pending'  # Would be updated when payment processes
        )

class SubscriptionPayment(models.Model):
    """
    Records of subscription payments
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]

    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name='payments')

    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')

    billing_period_start = models.DateTimeField()
    billing_period_end = models.DateTimeField()

    # Payment processing
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    transaction_id = models.CharField(max_length=100, blank=True)
    payment_method = models.CharField(max_length=50, blank=True)

    # Failure/retry information
    failure_reason = models.TextField(blank=True)
    retry_count = models.PositiveIntegerField(default=0)
    next_retry_date = models.DateTimeField(null=True, blank=True)

    # Refund information
    refunded_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    refund_reason = models.TextField(blank=True)

    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    processed_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Payment for {self.subscription} - {self.amount} {self.currency}"

    def mark_completed(self, transaction_id=''):
        """Mark payment as completed"""
        self.status = 'completed'
        self.transaction_id = transaction_id
        self.processed_at = timezone.now()
        self.save()

    def mark_failed(self, reason=''):
        """Mark payment as failed"""
        self.status = 'failed'
        self.failure_reason = reason

        # Schedule retry if under limit
        if self.retry_count < 3:  # Max 3 retries
            self.retry_count += 1
            self.next_retry_date = timezone.now() + timedelta(days=1)  # Retry after 1 day

        self.save()

    def refund(self, amount=None, reason=''):
        """Process a refund"""
        refund_amount = amount or self.amount
        if refund_amount > (self.amount - self.refunded_amount):
            raise ValueError("Refund amount exceeds available amount")

        self.refunded_amount += refund_amount
        self.refund_reason = reason

        if self.refunded_amount >= self.amount:
            self.status = 'refunded'

        self.save()

class SubscriptionUsage(models.Model):
    """
    Track usage against subscription limits
    """
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name='usage_records')
    feature = models.ForeignKey(SubscriptionFeature, on_delete=models.CASCADE)

    # Usage tracking
    current_usage = models.PositiveIntegerField(default=0)
    limit = models.PositiveIntegerField(null=True, blank=True)  # None = unlimited

    # Billing period
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()

    # Reset on period end
    auto_reset = models.BooleanField(default=True)

    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['subscription', 'feature', 'period_start']
        ordering = ['-period_start']

    def __str__(self):
        return f"{self.subscription.user.username} - {self.feature.name}: {self.current_usage}/{self.limit or '∞'}"

    @property
    def usage_percentage(self):
        """Calculate usage percentage"""
        if not self.limit:
            return 0  # Unlimited
        if self.limit == 0:
            return 100
        return min((self.current_usage / self.limit) * 100, 100)

    @property
    def is_over_limit(self):
        """Check if usage exceeds limit"""
        return self.limit and self.current_usage >= self.limit

    def increment_usage(self, amount=1):
        """Increment usage counter"""
        self.current_usage += amount
        self.save()

        # Check if over limit and trigger alerts
        if self.is_over_limit:
            self._trigger_over_limit_alert()

    def reset_usage(self):
        """Reset usage counter for new period"""
        self.current_usage = 0
        self.save()

    def _trigger_over_limit_alert(self):
        """Trigger alert when usage exceeds limit"""
        # This would create a notification or alert
        # For now, just log or could send email/SMS
        pass

class SubscriptionDiscount(models.Model):
    """
    Promotional discounts and coupons for subscriptions
    """
    DISCOUNT_TYPES = [
        ('percentage', 'Percentage'),
        ('fixed', 'Fixed Amount'),
        ('free_trial', 'Free Trial Extension'),
    ]

    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPES, default='percentage')
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)

    # Applicability
    applicable_plans = models.ManyToManyField(SubscriptionPlan, blank=True)
    first_time_only = models.BooleanField(default=False)
    max_uses = models.PositiveIntegerField(null=True, blank=True)

    # Validity
    valid_from = models.DateTimeField(default=timezone.now)
    valid_until = models.DateTimeField(null=True, blank=True)

    # Usage tracking
    total_uses = models.PositiveIntegerField(default=0)

    # Status
    is_active = models.BooleanField(default=True)

    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Discount: {self.code} ({self.discount_value}{'%' if self.discount_type == 'percentage' else ' ' + str(self.discount_value)})"

    @property
    def is_valid(self):
        """Check if discount is still valid"""
        now = timezone.now()
        return (
            self.is_active and
            self.valid_from <= now and
            (self.valid_until is None or self.valid_until >= now) and
            (self.max_uses is None or self.total_uses < self.max_uses)
        )

    def can_apply_to_plan(self, plan):
        """Check if discount can be applied to a plan"""
        if not self.applicable_plans.exists():
            return True  # Applies to all plans
        return self.applicable_plans.filter(id=plan.id).exists()

    def apply_discount(self, original_price):
        """Apply discount to a price"""
        if not self.is_valid:
            return original_price

        if self.discount_type == 'percentage':
            discount_amount = original_price * (self.discount_value / 100)
        elif self.discount_type == 'fixed':
            discount_amount = min(self.discount_value, original_price)
        else:  # free_trial - doesn't affect price
            return original_price

        return max(original_price - discount_amount, Decimal('0'))
