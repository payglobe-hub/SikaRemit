from django.db import models
from django.core.validators import RegexValidator
from .currency import Currency

class Country(models.Model):
    """
    Country model for geographic location data
    """
    code = models.CharField(
        max_length=3,
        unique=True,
        validators=[RegexValidator(r'^[A-Z]{2,3}$', 'Country code must be 2-3 uppercase letters')],
        help_text="ISO 3166-1 alpha-2 or alpha-3 country code (e.g., US, USA, GB, GBR)"
    )
    name = models.CharField(max_length=100, unique=True, help_text="Full country name")
    flag_emoji = models.CharField(max_length=10, blank=True, help_text="Unicode flag emoji")
    phone_code = models.CharField(max_length=5, blank=True, help_text="International phone code (e.g., +1, +233)")
    currency = models.ForeignKey(
        Currency,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='countries',
        help_text="Primary currency used in this country"
    )
    is_active = models.BooleanField(default=True, help_text="Whether this country is available for use")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Country"
        verbose_name_plural = "Countries"
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"

    @property
    def phone_code_formatted(self):
        """Return formatted phone code with + prefix"""
        if self.phone_code:
            return f"+{self.phone_code}"
        return ""

    @property
    def currency_code(self):
        """Get currency code for this country"""
        return self.currency.code if self.currency else None

    @property
    def currency_symbol(self):
        """Get currency symbol for this country"""
        return self.currency.symbol if self.currency else None
