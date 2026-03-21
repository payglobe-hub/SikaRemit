from django.db import models
from users.models import User

class PaymentLog(models.Model):
    """Tracks all payment transactions for auditing"""
    PAYMENT_TYPES = [
        ('subscription', 'Subscription'),
        ('remittance', 'Remittance'),
        ('bill', 'Bill Payment'),
        ('other', 'Other')
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments_paymentlog_set')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPES, default='other')
    plan = models.CharField(max_length=20, blank=True, null=True)
    
    # Payment provider references
    stripe_charge_id = models.CharField(max_length=100, blank=True, null=True)
    stripe_payment_intent_id = models.CharField(max_length=100, blank=True, null=True)
    
    # Remittance specific fields
    recipient_name = models.CharField(max_length=255, blank=True, null=True)
    recipient_account = models.CharField(max_length=255, blank=True, null=True)
    recipient_bank = models.CharField(max_length=255, blank=True, null=True)
    
    # Bill payment specific fields
    biller_name = models.CharField(max_length=255, blank=True, null=True)
    bill_reference = models.CharField(max_length=255, blank=True, null=True)
    bill_due_date = models.DateField(blank=True, null=True)
    
    # Mobile Money specific fields
    mobile_money_provider = models.CharField(max_length=50, blank=True, null=True)
    mobile_money_number = models.CharField(max_length=20, blank=True, null=True)
    provider_reference = models.CharField(max_length=100, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.amount} - {self.get_payment_type_display()}"
