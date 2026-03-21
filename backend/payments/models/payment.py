from django.db import models
from .payment_method import PaymentMethod
from users.models import Customer, Merchant

class Payment(models.Model):
    BILL = 'bill'
    SUBSCRIPTION = 'subscription'
    PURCHASE = 'purchase'
    REMITTANCE = 'remittance'
    
    PAYMENT_TYPE_CHOICES = [
        (BILL, 'Bill Payment'),
        (SUBSCRIPTION, 'Subscription'),
        (PURCHASE, 'Purchase'),
        (REMITTANCE, 'Remittance'),
    ]
    
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
    
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT)
    merchant = models.ForeignKey(Merchant, on_delete=models.PROTECT, null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=PENDING, db_index=True)
    payment_method = models.ForeignKey(PaymentMethod, on_delete=models.PROTECT)
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE_CHOICES, default=PURCHASE)
    bill_issuer = models.CharField(max_length=100, null=True, blank=True)
    bill_reference = models.CharField(max_length=100, null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    reference = models.CharField(max_length=100, unique=True, null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.amount} {self.currency} - {self.status}"
