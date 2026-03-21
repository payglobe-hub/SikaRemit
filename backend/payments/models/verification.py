from django.db import models
from django.utils import timezone
from django.conf import settings
from django.db.models import Count, Avg

class VerificationLog(models.Model):
    """
    Tracks all verification attempts for analytics
    """
    PROVIDER_CHOICES = [
        ('africastalking', 'Africa\'s Talking'),
        ('twilio', 'Twilio'),
        ('nexmo', 'Nexmo'),
        ('fallback', 'Fallback')
    ]
    
    phone_number = models.CharField(max_length=20)
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES)
    success = models.BooleanField()
    response_time = models.FloatField(help_text="Response time in seconds")
    created_at = models.DateTimeField(default=timezone.now)
    error_message = models.TextField(blank=True, null=True)
    
    # Analytics fields
    is_retry = models.BooleanField(default=False)
    from_country = models.CharField(max_length=3, default=settings.BASE_COUNTRY)
    country_code = models.CharField(max_length=3, default='GH')
    region = models.CharField(max_length=50, blank=True)
    
    def __str__(self):
        return f"{self.phone_number} - {self.get_provider_display()} ({'✓' if self.success else '✗'})"
    
    @classmethod
    def geographic_stats(cls):
        """Get verification stats by country/region"""
        return cls.objects.values('country_code', 'region').annotate(
            total=Count('id'),
            success_rate=Avg('success'),
            avg_time=Avg('response_time')
        ).order_by('-total')
    
    class Meta:
        indexes = [
            models.Index(fields=['provider']),
            models.Index(fields=['success']),
            models.Index(fields=['created_at']),
            models.Index(fields=['phone_number']),
        ]
        ordering = ['-created_at']

class VerificationTrend(models.Model):
    """Daily verification trends"""
    date = models.DateField(unique=True)
    total_attempts = models.IntegerField()
    success_rate = models.FloatField()
    avg_response_time = models.FloatField()
    
    @classmethod
    def update_trends(cls):
        """Calculate daily trends"""
        from django.db.models import Avg, Count
        from django.utils import timezone
        
        today = timezone.now().date()
        stats = VerificationLog.objects.filter(
            created_at__date=today
        ).aggregate(
            total=Count('id'),
            success_rate=Avg('success'),
            avg_time=Avg('response_time')
        )
        
        cls.objects.update_or_create(
            date=today,
            defaults={
                'total_attempts': stats['total'],
                'success_rate': stats['success_rate'] or 0,
                'avg_response_time': stats['avg_time'] or 0
            }
        )

class ProviderHealth(models.Model):
    """
    Tracks provider health status over time
    """
    provider = models.CharField(max_length=20, choices=VerificationLog.PROVIDER_CHOICES)
    is_healthy = models.BooleanField()
    last_checked = models.DateTimeField()
    response_time = models.FloatField()
    success_rate = models.FloatField(help_text="Last 100 attempts")
    
    def __str__(self):
        return f"{self.get_provider_display()} - {'Healthy' if self.is_healthy else 'Unhealthy'}"
    
    class Meta:
        verbose_name_plural = "Provider Health"
