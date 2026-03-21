from django.db import models
from users.models import User

MOBILE_PROVIDERS = [
    ('mtn', 'MTN Mobile Money'),
    ('telecel', 'Telecel Cash'),
    ('airtel_tigo', 'AirtelTigo Money'),
    ('g_money', 'G-Money'),
]

class PaymentMethod(models.Model):
    CARD = 'card'
    BANK = 'bank'
    CRYPTO = 'crypto'
    MTN_MOMO = 'mtn_momo'
    TELECEL = 'telecel'
    AIRTEL_TIGO = 'airtel_tigo'
    G_MONEY = 'g_money'
    QR = 'qr'
    SIKAREMIT_BALANCE = 'sikaremit_balance'
    
    # All specific mobile money provider types for easy grouping
    MOBILE_MONEY_TYPES = [MTN_MOMO, TELECEL, AIRTEL_TIGO, G_MONEY]

    METHOD_CHOICES = [
        (CARD, 'Credit/Debit Card (Stripe/Paystack)'),
        (BANK, 'Bank Transfer'),
        (CRYPTO, 'Cryptocurrency'),
        (MTN_MOMO, 'MTN Mobile Money'),
        (TELECEL, 'Telecel Cash'),
        (AIRTEL_TIGO, 'AirtelTigo Money'),
        (G_MONEY, 'G-Money'),
        (QR, 'QR Payment'),
        (SIKAREMIT_BALANCE, 'SikaRemit Balance')
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    method_type = models.CharField(
        max_length=20,  # Increased with ample buffer
        choices=METHOD_CHOICES,
        db_index=True  # Index for filtering by payment method type
    )
    details = models.JSONField()
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_mobile_money(self):
        """Check if this payment method is any mobile money provider."""
        return self.method_type in self.MOBILE_MONEY_TYPES

    def __str__(self):
        return f"{self.get_method_type_display()} - {self.user.email}"
