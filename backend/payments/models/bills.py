from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Bill(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('cancelled', 'Cancelled'),
    ]

    BILL_TYPES = [
        ('utility', 'Utility Bill'),
        ('tax', 'Tax Bill'),
        ('loan', 'Loan Payment'),
        ('insurance', 'Insurance'),
        ('subscription', 'Subscription'),
        ('other', 'Other'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bills')
    bill_issuer = models.CharField(max_length=255)  # e.g., ECG, Ghana Water, etc.
    bill_reference = models.CharField(max_length=100, unique=True)
    bill_type = models.CharField(max_length=20, choices=BILL_TYPES, default='other')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='GHS')
    due_date = models.DateField()
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    late_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_overdue = models.BooleanField(default=False)
    days_overdue = models.IntegerField(default=0)
    
    # Payment details
    payment_method = models.ForeignKey('PaymentMethod', on_delete=models.SET_NULL, null=True, blank=True)
    transaction = models.ForeignKey('Transaction', on_delete=models.SET_NULL, null=True, blank=True, related_name='bill_payments')
    paid_at = models.DateTimeField(null=True, blank=True)
    external_transaction_id = models.CharField(max_length=100, blank=True, null=True)  # Renamed to avoid clash
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-due_date']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['bill_reference']),
            models.Index(fields=['due_date']),
        ]

    def __str__(self):
        return f"{self.bill_issuer} - {self.bill_reference}"

    def save(self, *args, **kwargs):
        from django.utils import timezone
        today = timezone.now().date()
        
        if self.due_date < today and self.status == 'pending':
            self.is_overdue = True
            self.days_overdue = (today - self.due_date).days
        else:
            self.is_overdue = False
            self.days_overdue = 0
            
        super().save(*args, **kwargs)
