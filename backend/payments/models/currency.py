from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
import uuid

class Currency(models.Model):
    """
    Supported currencies in the system
    """
    CURRENCY_CHOICES = [
        ('USD', 'US Dollar'),
        ('EUR', 'Euro'),
        ('GBP', 'British Pound'),
        ('GHS', 'Ghanaian Cedi'),
        ('NGN', 'Nigerian Naira'),
        ('KES', 'Kenyan Shilling'),
        ('ZAR', 'South African Rand'),
        ('UGX', 'Ugandan Shilling'),
        ('TZS', 'Tanzanian Shilling'),
        ('RWF', 'Rwandan Franc'),
        ('ETB', 'Ethiopian Birr'),
        ('XOF', 'West African CFA Franc'),
        ('CAD', 'Canadian Dollar'),
        ('AUD', 'Australian Dollar'),
        ('JPY', 'Japanese Yen'),
        ('CNY', 'Chinese Yuan'),
        ('INR', 'Indian Rupee'),
        ('BRL', 'Brazilian Real'),
        ('MXN', 'Mexican Peso'),
    ]

    code = models.CharField(max_length=3, unique=True, choices=CURRENCY_CHOICES)
    name = models.CharField(max_length=50)
    symbol = models.CharField(max_length=5, default='$')
    decimal_places = models.PositiveIntegerField(default=2)
    is_active = models.BooleanField(default=True)
    is_base_currency = models.BooleanField(default=False)
    flag_emoji = models.CharField(max_length=10, blank=True)

    # Exchange rate settings
    exchange_api_supported = models.BooleanField(default=True)
    minimum_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.01)
    maximum_amount = models.DecimalField(max_digits=12, decimal_places=2, default=1000000.00)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Currency'
        verbose_name_plural = 'Currencies'
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.name}"

    @property
    def display_name(self):
        return f"{self.flag_emoji} {self.name} ({self.code})" if self.flag_emoji else f"{self.name} ({self.code})"

class ExchangeRate(models.Model):
    """
    Historical exchange rates between currencies
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Currency pair
    from_currency = models.ForeignKey(
        Currency,
        on_delete=models.CASCADE,
        related_name='rates_from'
    )
    to_currency = models.ForeignKey(
        Currency,
        on_delete=models.CASCADE,
        related_name='rates_to'
    )

    # Rate data
    rate = models.DecimalField(max_digits=12, decimal_places=6, validators=[MinValueValidator(0.000001)])
    inverse_rate = models.DecimalField(max_digits=12, decimal_places=6, validators=[MinValueValidator(0.000001)])

    # Metadata
    source = models.CharField(max_length=50, default='api')  # api, manual, fallback
    timestamp = models.DateTimeField(default=timezone.now)

    # Validity period
    is_latest = models.BooleanField(default=True)
    valid_from = models.DateTimeField(default=timezone.now)
    valid_to = models.DateTimeField(null=True, blank=True)

    # Additional data
    spread = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)  # For buy/sell spread
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = 'Exchange Rate'
        verbose_name_plural = 'Exchange Rates'
        unique_together = [['from_currency', 'to_currency', 'timestamp']]
        indexes = [
            models.Index(fields=['from_currency', 'to_currency', 'timestamp']),
            models.Index(fields=['is_latest']),
            models.Index(fields=['timestamp']),
        ]
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.from_currency.code} → {self.to_currency.code}: {self.rate}"

    def save(self, *args, **kwargs):
        # Calculate inverse rate
        if self.rate and self.rate != 0:
            self.inverse_rate = 1 / self.rate

        # Mark previous rates as not latest
        if self.is_latest:
            ExchangeRate.objects.filter(
                from_currency=self.from_currency,
                to_currency=self.to_currency,
                is_latest=True
            ).exclude(pk=self.pk).update(is_latest=False)

        super().save(*args, **kwargs)

    @classmethod
    def get_latest_rate(cls, from_currency, to_currency):
        """
        Get the latest exchange rate between two currencies
        """
        try:
            return cls.objects.filter(
                from_currency=from_currency,
                to_currency=to_currency,
                is_latest=True
            ).first()
        except:
            return None

    @classmethod
    def convert_amount(cls, amount, from_currency, to_currency, timestamp=None):
        """
        Convert amount between currencies
        """
        if from_currency == to_currency:
            return amount

        # Get rate at specific timestamp or latest
        rate_obj = None
        if timestamp:
            rate_obj = cls.objects.filter(
                from_currency=from_currency,
                to_currency=to_currency,
                timestamp__lte=timestamp
            ).order_by('-timestamp').first()
        else:
            rate_obj = cls.get_latest_rate(from_currency, to_currency)

        if rate_obj:
            return amount * rate_obj.rate

        return None

class CurrencyPreference(models.Model):
    """
    User currency preferences
    """
    user = models.OneToOneField('users.User', on_delete=models.CASCADE)
    base_currency = models.ForeignKey(Currency, on_delete=models.CASCADE, related_name='base_for_users')
    display_currency = models.ForeignKey(Currency, on_delete=models.CASCADE, related_name='display_for_users')

    # Formatting preferences
    show_symbol = models.BooleanField(default=True)
    show_code = models.BooleanField(default=False)
    decimal_places = models.PositiveIntegerField(default=2)

    # Rate update preferences
    auto_update_rates = models.BooleanField(default=True)
    notification_threshold = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)  # % change threshold

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Currency Preference'
        verbose_name_plural = 'Currency Preferences'

    def __str__(self):
        return f"{self.user.email} - {self.display_currency.code}"

class WalletBalance(models.Model):
    """
    Multi-currency wallet balances for users
    """
    user = models.ForeignKey('users.User', on_delete=models.CASCADE)
    currency = models.ForeignKey(Currency, on_delete=models.CASCADE)

    available_balance = models.DecimalField(max_digits=15, decimal_places=6, default=0)
    pending_balance = models.DecimalField(max_digits=15, decimal_places=6, default=0)
    reserved_balance = models.DecimalField(max_digits=15, decimal_places=6, default=0)  # For holds/escrows

    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Wallet Balance'
        verbose_name_plural = 'Wallet Balances'
        unique_together = ['user', 'currency']

    def __str__(self):
        return f"{self.user.email} - {self.currency.code}: {self.available_balance}"

    @property
    def total_balance(self):
        return self.available_balance + self.pending_balance + self.reserved_balance

    def add_balance(self, amount, balance_type='available'):
        """
        Add amount to specific balance type
        """
        if balance_type == 'available':
            self.available_balance += amount
        elif balance_type == 'pending':
            self.pending_balance += amount
        elif balance_type == 'reserved':
            self.reserved_balance += amount
        self.save()

    def deduct_balance(self, amount, balance_type='available'):
        """
        Deduct amount from specific balance type
        """
        if balance_type == 'available':
            if self.available_balance >= amount:
                self.available_balance -= amount
                self.save()
                return True
        elif balance_type == 'pending':
            if self.pending_balance >= amount:
                self.pending_balance -= amount
                self.save()
                return True
        elif balance_type == 'reserved':
            if self.reserved_balance >= amount:
                self.reserved_balance -= amount
                self.save()
                return True
        return False
