from django.db import models
from .payment_method import PaymentMethod
from users.models import Customer, Merchant

class Transaction(models.Model):
    PENDING = 'pending'
    COMPLETED = 'completed'
    FAILED = 'failed'
    REFUNDED = 'refunded'
    
    STATUS_CHOICES = [
        (PENDING, 'Pending'),
        (COMPLETED, 'Completed'),
        (FAILED, 'Failed'),
        (REFUNDED, 'Refunded'),
    ]
    
    TRANSACTION_TYPES = [
        ('payment', 'Payment'),
        ('transfer', 'Transfer'),
        ('remittance', 'Remittance'),
        ('bill_payment', 'Bill Payment'),
        ('airtime', 'Airtime Purchase'),
        ('data_bundle', 'Data Bundle Purchase'),
        ('wallet_topup', 'Wallet Top-up'),
        ('merchant_payment', 'Merchant Payment'),
        ('refund', 'Refund'),
        ('fee', 'Fee Payment'),
    ]
    
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True)
    merchant = models.ForeignKey(Merchant, on_delete=models.PROTECT, null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=PENDING)
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES, default='payment')
    payment_method = models.ForeignKey(PaymentMethod, on_delete=models.PROTECT, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    description = models.CharField(max_length=255, null=True, blank=True)
    metadata = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['customer', 'status']),
            models.Index(fields=['merchant', 'status']),
            models.Index(fields=['transaction_type']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['transaction_type', 'status']),
        ]

    def __str__(self):
        return f"{self.amount} {self.currency} - {self.transaction_type} - {self.status}"
