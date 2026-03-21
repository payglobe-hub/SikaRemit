from django.db import models

class SimpleUSSDTransaction(models.Model):
    """Track USSD payment sessions and state"""
    NEW = 'new'
    AMOUNT_ENTERED = 'amount_entered'
    CONFIRMED = 'confirmed'
    COMPLETED = 'completed'
    FAILED = 'failed'

    STATUS_CHOICES = [
        (NEW, 'New Session'),
        (AMOUNT_ENTERED, 'Amount Entered'),
        (CONFIRMED, 'Confirmed'),
        (COMPLETED, 'Completed'),
        (FAILED, 'Failed')
    ]

    session_id = models.CharField(max_length=100, unique=True)
    phone_number = models.CharField(max_length=20)
    amount = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=NEW)
    transaction = models.ForeignKey('Payment', on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"USSD Session {self.session_id} - {self.status}"

    def get_next_menu(self):
        """Determine next USSD menu based on current state"""
        if self.status == self.NEW:
            return "Enter amount"
        elif self.status == self.AMOUNT_ENTERED:
            return f"Confirm payment of {self.amount}? 1. Yes 2. No"
        return None
