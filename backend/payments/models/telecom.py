from django.db import models
from django.core.validators import RegexValidator
from django.utils import timezone
from .country import Country
from .currency import Currency


class TelecomProvider(models.Model):
    """
    Telecom provider (MTN, Telecel, AirtelTigo, Glo, etc.)
    """
    name = models.CharField(max_length=100, unique=True, help_text="Provider name (e.g., MTN, Telecel)")
    code = models.CharField(
        max_length=20,
        unique=True,
        validators=[RegexValidator(r'^[A-Z0-9_]+$', 'Code must contain only uppercase letters, numbers, and underscores')],
        help_text="Unique code for the provider (e.g., MTN, TELECEL)"
    )
    country = models.ForeignKey(
        Country,
        on_delete=models.CASCADE,
        related_name='telecom_providers',
        help_text="Country where this provider operates"
    )
    logo_url = models.URLField(blank=True, help_text="Provider logo URL")
    website = models.URLField(blank=True, help_text="Provider website")
    api_endpoint = models.URLField(blank=True, help_text="API endpoint for real-time data")
    api_key = models.CharField(max_length=255, blank=True, help_text="API key for provider integration")
    is_active = models.BooleanField(default=True, help_text="Whether this provider is available")
    supports_data = models.BooleanField(default=True, help_text="Whether provider supports data packages")
    supports_airtime = models.BooleanField(default=True, help_text="Whether provider supports airtime top-up")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Telecom Provider"
        verbose_name_plural = "Telecom Providers"
        ordering = ['country__name', 'name']
        unique_together = ['code', 'country']

    def __str__(self):
        return f"{self.name} ({self.country.code})"


class TelecomPackage(models.Model):
    """
    Data/Airtime packages offered by telecom providers
    """

    PACKAGE_TYPES = [
        ('data', 'Data Package'),
        ('airtime', 'Airtime Package'),
        ('bundle', 'Data + Airtime Bundle'),
    ]

    package_id = models.CharField(
        max_length=100,
        help_text="Provider's internal package ID/code"
    )
    name = models.CharField(max_length=200, help_text="Package display name")
    description = models.TextField(blank=True, help_text="Package description")
    provider = models.ForeignKey(
        TelecomProvider,
        on_delete=models.CASCADE,
        related_name='packages',
        help_text="Telecom provider offering this package"
    )
    package_type = models.CharField(
        max_length=20,
        choices=PACKAGE_TYPES,
        default='data',
        help_text="Type of package"
    )

    # Pricing
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Package price in local currency"
    )
    currency = models.ForeignKey(
        Currency,
        on_delete=models.PROTECT,
        related_name='telecom_packages',
        help_text="Currency for the package price"
    )

    # Package specifications
    data_amount = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Data amount (e.g., 1GB, 500MB, Unlimited)"
    )
    validity_days = models.PositiveIntegerField(
        default=30,
        help_text="Package validity in days"
    )
    airtime_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Airtime amount if applicable"
    )

    # Availability
    is_active = models.BooleanField(default=True, help_text="Whether package is available")
    is_featured = models.BooleanField(default=False, help_text="Whether to feature this package")
    sort_order = models.PositiveIntegerField(default=0, help_text="Display order")

    # Provider integration
    provider_package_id = models.CharField(
        max_length=100,
        blank=True,
        help_text="Provider's specific package identifier"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Telecom Package"
        verbose_name_plural = "Telecom Packages"
        ordering = ['provider__country__name', 'provider__name', 'sort_order', 'price']
        unique_together = ['provider', 'package_id']

    def __str__(self):
        return f"{self.provider.name} - {self.name} ({self.data_amount})"

    @property
    def formatted_price(self):
        """Return formatted price with currency symbol"""
        return f"{self.currency.symbol}{self.price}"

    @property
    def validity_text(self):
        """Return human-readable validity period"""
        if self.validity_days == 1:
            return "1 day"
        elif self.validity_days < 30:
            return f"{self.validity_days} days"
        elif self.validity_days == 30:
            return "1 month"
        elif self.validity_days == 365:
            return "1 year"
        else:
            months = self.validity_days // 30
            return f"{months} months"

    @property
    def country_code(self):
        """Get country code for this package"""
        return self.provider.country.code


class BusinessRule(models.Model):
    """
    Configurable business rules for fees, limits, and commissions
    """

    RULE_TYPES = [
        ('transaction_fee', 'Transaction Fee'),
        ('commission', 'Commission Rate'),
        ('daily_limit', 'Daily Transaction Limit'),
        ('monthly_limit', 'Monthly Transaction Limit'),
        ('min_amount', 'Minimum Transaction Amount'),
        ('max_amount', 'Maximum Transaction Amount'),
        ('markup_percentage', 'Markup Percentage'),
    ]

    RULE_SCOPES = [
        ('global', 'Global (All Transactions)'),
        ('country', 'Country Specific'),
        ('provider', 'Provider Specific'),
        ('package', 'Package Specific'),
        ('currency', 'Currency Specific'),
    ]

    name = models.CharField(max_length=100, help_text="Rule name for identification")
    description = models.TextField(blank=True, help_text="Rule description")
    rule_type = models.CharField(
        max_length=20,
        choices=RULE_TYPES,
        help_text="Type of business rule"
    )
    scope = models.CharField(
        max_length=20,
        choices=RULE_SCOPES,
        default='global',
        help_text="Scope of application"
    )

    # Scope references (nullable for global rules)
    country = models.ForeignKey(
        Country,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='business_rules',
        help_text="Country this rule applies to (for country scope)"
    )
    telecom_provider = models.ForeignKey(
        TelecomProvider,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='business_rules',
        help_text="Provider this rule applies to (for provider scope)"
    )
    currency = models.ForeignKey(
        Currency,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='business_rules',
        help_text="Currency this rule applies to (for currency scope)"
    )

    # Rule values
    percentage_value = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Percentage value (for commission, markup rules)"
    )
    fixed_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Fixed amount value (for fees, limits)"
    )

    # Rule settings
    is_active = models.BooleanField(default=True, help_text="Whether this rule is active")
    priority = models.PositiveIntegerField(
        default=0,
        help_text="Rule priority (higher numbers take precedence)"
    )

    # Validity period
    valid_from = models.DateTimeField(null=True, blank=True, help_text="Rule valid from date")
    valid_until = models.DateTimeField(null=True, blank=True, help_text="Rule valid until date")

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Business Rule"
        verbose_name_plural = "Business Rules"
        ordering = ['-priority', 'scope', 'rule_type']

    def __str__(self):
        scope_info = ""
        if self.scope == 'country' and self.country:
            scope_info = f" ({self.country.name})"
        elif self.scope == 'provider' and self.telecom_provider:
            scope_info = f" ({self.telecom_provider.name})"
        elif self.scope == 'currency' and self.currency:
            scope_info = f" ({self.currency.code})"

        return f"{self.name}{scope_info} - {self.rule_type}"

    def is_applicable(self, context=None):
        """
        Check if this rule applies to the given context
        Context should contain: country, provider, currency, package, etc.
        """
        if not self.is_active:
            return False

        # Check validity period
        now = timezone.now()
        if self.valid_from and now < self.valid_from:
            return False
        if self.valid_until and now > self.valid_until:
            return False

        # Check scope-specific conditions
        if self.scope == 'global':
            return True
        elif self.scope == 'country' and context and context.get('country') == self.country:
            return True
        elif self.scope == 'provider' and context and context.get('provider') == self.telecom_provider:
            return True
        elif self.scope == 'currency' and context and context.get('currency') == self.currency:
            return True
        elif self.scope == 'package' and context and context.get('package'):
            # Would need package relationship for package-specific rules
            return False

        return False
