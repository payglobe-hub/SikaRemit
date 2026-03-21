from celery import shared_task
from django.utils import timezone
from .models import Notification
from .services import NotificationService
import logging

logger = logging.getLogger(__name__)

@shared_task
def process_scheduled_notifications():
    """Task to deliver scheduled notifications that are ready"""
    now = timezone.now()
    notifications = Notification.objects.filter(
        category='scheduled',
        scheduled_for__lte=now,
        delivery_metrics__has_key='delivered_at',
    )
    
    for notification in notifications:
        NotificationService.deliver_with_retry(notification)

@shared_task
def cleanup_expired_notifications():
    """Task to remove expired notifications"""
    Notification.objects.filter(
        category='expiring',
        expires_at__lte=timezone.now()
    ).delete()
