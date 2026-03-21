from django.db import models
from django.utils import timezone

class Webhook(models.Model):
    """Webhook configuration for external integrations"""
    url = models.URLField(max_length=500)
    events = models.JSONField(
        default=list,
        help_text="List of event types this webhook subscribes to"
    )
    is_active = models.BooleanField(default=True)
    secret = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    success_count = models.IntegerField(default=0)
    failure_count = models.IntegerField(default=0)
    last_triggered = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Webhook {self.id}: {self.url}"

class WebhookEvent(models.Model):
    """Log of webhook delivery attempts"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('delivered', 'Delivered'),
        ('failed', 'Failed'),
    ]
    
    webhook = models.ForeignKey(Webhook, on_delete=models.CASCADE, related_name='webhook_events')
    event_type = models.CharField(max_length=50)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payload = models.JSONField(default=dict)
    response_status = models.IntegerField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    retry_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.event_type} - {self.status}"
