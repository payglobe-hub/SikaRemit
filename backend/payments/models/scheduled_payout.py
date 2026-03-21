from django.db import models
import croniter
import datetime

class ScheduledPayout(models.Model):
    PENDING = 'pending'
    ACTIVE = 'active'
    PAUSED = 'paused'
    COMPLETED = 'completed'

    STATUS_CHOICES = [
        (PENDING, 'Pending'),
        (ACTIVE, 'Active'),
        (PAUSED, 'Paused'),
        (COMPLETED, 'Completed'),
    ]

    merchant = models.ForeignKey('users.Merchant', on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    schedule = models.CharField(max_length=100)  # cron expression
    next_execution = models.DateTimeField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def calculate_next_execution(self):
        """Calculate next execution time based on cron schedule"""
        base = datetime.datetime.now()
        iter = croniter.croniter(self.schedule, base)
        self.next_execution = iter.get_next(datetime.datetime)

    def __str__(self):
        return f"{self.merchant.business_name} - {self.amount} - {self.schedule}"
