from django.db import models
from users.models import User

class DashboardStats(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    total_transactions = models.PositiveIntegerField(default=0)
    total_volume = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Stats for {self.user.email}"
