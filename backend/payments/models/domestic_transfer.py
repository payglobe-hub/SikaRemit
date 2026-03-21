from django.db import models
from users.models import Customer
from accounts.models import Recipient
from .payment_method import PaymentMethod
import datetime

class DomesticTransfer(models.Model):
    """Model for domestic P2P money transfers"""
    PENDING = 'pending'
    PROCESSING = 'processing'
    COMPLETED = 'completed'
    FAILED = 'failed'
    CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (PENDING, 'Pending'),
        (PROCESSING, 'Processing'),
        (COMPLETED, 'Completed'),
        (FAILED, 'Failed'),
        (CANCELLED, 'Cancelled'),
    ]

    sender = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, related_name='sent_domestic_transfers')
    recipient = models.ForeignKey(Recipient, on_delete=models.PROTECT, related_name='received_domestic_transfers')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='GHS')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=PENDING)
    reference_number = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    payment_method = models.ForeignKey(PaymentMethod, on_delete=models.PROTECT, null=True, blank=True)
    fee = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Domestic Transfer {self.reference_number}: {self.amount} {self.currency}"

    class Meta:
        verbose_name = 'Domestic Transfer'
        verbose_name_plural = 'Domestic Transfers'
        ordering = ['-created_at']
