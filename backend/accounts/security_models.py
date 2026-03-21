from django.db import models
from django.conf import settings

class AuthLog(models.Model):
    """Tracks all authentication attempts"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    ip_address = models.GenericIPAddressField()
    device_id = models.CharField(max_length=32)  # Device fingerprint
    success = models.BooleanField(default=False)
    reason = models.CharField(max_length=255, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['device_id']),
            models.Index(fields=['ip_address']),
            models.Index(fields=['user']),
        ]
        ordering = ['-timestamp']

    def __str__(self):
        return f"{'Success' if self.success else 'Failed'} auth for {self.user or 'anonymous'} from {self.ip_address}"
