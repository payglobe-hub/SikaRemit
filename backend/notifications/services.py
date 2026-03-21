from django.conf import settings
from django.core.mail import send_mail
from twilio.rest import Client
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Notification, NotificationPreferences
import logging
from django.utils import timezone

logger = logging.getLogger(__name__)

class NotificationService:
    @staticmethod
    def send_email_notification_to_address(email, subject, message):
        """Send email notification to any email address"""
        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )
            return True
        except Exception as e:
            logger.error(f"Email send to {email} failed: {str(e)}")
            return False

    @staticmethod
    def send_sms_notification(user, message):
        if not user.phone:
            return False
            
        try:
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            client.messages.create(
                body=message,
                from_=settings.TWILIO_PHONE_NUMBER,
                to=user.phone
            )
            return True
        except Exception as e:
            logger.error(f"SMS send failed: {str(e)}")
            return False

    @classmethod
    def create_notification(cls, user, title, message, level='info', notification_type=None, metadata=None):
        notification = Notification.objects.create(
            user=user,
            title=title,
            message=message,
            level=level,
            notification_type=notification_type,
            metadata=metadata or {}
        )
        
        # Send email for important notifications
        if level in ['warning', 'error', 'payment', 'security']:
            cls.send_email_notification(user, title, message)
            
        # Send SMS for critical notifications
        if level in ['error', 'security']:
            cls.send_sms_notification(user, f"{title}: {message}")
            
        # Send web notification
        cls.send_web_notification(user, notification)
        
        # Send push notification
        cls.send_push_notification(user, notification)
        
        return notification

    @classmethod
    def send_web_notification(cls, user, notification):
        channel_layer = get_channel_layer()
        try:
            async_to_sync(channel_layer.group_send)(
                f"notifications_{user.id}",
                {
                    "type": "notification.message",
                    "notification": {
                        "id": notification.id,
                        "title": notification.title,
                        "message": notification.message,
                        "created_at": notification.created_at.isoformat()
                    }
                }
            )
            return True
        except Exception as e:
            logger.error(f"Web notification failed: {str(e)}")
            return False
            
    @classmethod
    def send_push_notification(cls, user, notification):
        try:
            # Get or create notification preferences
            prefs, created = NotificationPreferences.objects.get_or_create(
                user=user,
                defaults={
                    'email_enabled': True,
                    'sms_enabled': False,
                    'push_enabled': True,
                    'web_enabled': True
                }
            )
            
            if not prefs.push_enabled:
                return False
                
            # Implementation would use Firebase Cloud Messaging or similar
            # This is a placeholder for the actual push notification logic
            return cls._send_fcm_push(user, notification)
        except Exception as e:
            logger.error(f"Push notification failed: {str(e)}")
            return False
            
    @classmethod
    def _send_fcm_push(cls, user, notification):
        try:
            from fcm_django.models import FCMDevice
            device = FCMDevice.objects.filter(user=user).first()
            
            if not device:
                return False
                
            result = device.send_message(
                title=notification.title,
                body=notification.message,
                data={
                    'notification_id': str(notification.id),
                    'type': notification.notification_type,
                    **notification.metadata
                }
            )
            
            notification.push_sent = True
            notification.delivery_metrics['fcm'] = {
                'sent_at': timezone.now().isoformat(),
                'message_id': getattr(result, 'message_id', None)
            }
            notification.save()
            return True
            
        except Exception as e:
            logger.error(f"FCM push failed: {str(e)}")
            return False

    @classmethod
    def mark_as_read(cls, notification_id):
        try:
            notification = Notification.objects.get(id=notification_id)
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save()
            return True
        except Notification.DoesNotExist:
            return False

    @classmethod
    def create_bulk_notifications(cls, users, title, message, **kwargs):
        notifications = []
        for user in users:
            notification = cls.create_notification(user, title, message, **kwargs)
            notifications.append(notification)
        return notifications

    @classmethod
    def notify_admins(cls, title, message, level='info', notification_type=None, metadata=None):
        """
        Send notification to all admin users.
        Used for system events like KYC submissions, failed transactions, security alerts.
        """
        from django.contrib.auth import get_user_model
        from django.db.models import Q
        
        User = get_user_model()
        # Get all admin users (user_type=1 OR is_staff=True OR is_superuser=True)
        admin_users = User.objects.filter(
            Q(user_type=1) | Q(is_staff=True) | Q(is_superuser=True),
            is_active=True
        ).distinct()
        
        notifications = []
        for admin in admin_users:
            notification = cls.create_notification(
                user=admin,
                title=title,
                message=message,
                level=level,
                notification_type=notification_type,
                metadata=metadata
            )
            notifications.append(notification)
        
        logger.info(f"Sent admin notification '{title}' to {len(notifications)} admins")
        return notifications

    @classmethod
    def notify_kyc_submission(cls, customer, document_type):
        """Notify admins when a new KYC document is submitted"""
        return cls.notify_admins(
            title="New KYC Submission",
            message=f"Customer {customer.user.email} submitted {document_type} for verification.",
            level='info',
            notification_type='kyc_submitted',
            metadata={
                'customer_id': customer.id,
                'customer_email': customer.user.email,
                'document_type': document_type
            }
        )

    @classmethod
    def notify_failed_transaction(cls, transaction):
        """Notify admins about failed transactions"""
        return cls.notify_admins(
            title="Transaction Failed",
            message=f"Transaction #{transaction.id} failed. Amount: {transaction.amount} {transaction.currency}",
            level='warning',
            notification_type='payment_failed',
            metadata={
                'transaction_id': transaction.id,
                'amount': str(transaction.amount),
                'currency': transaction.currency
            }
        )

    @classmethod
    def notify_suspicious_activity(cls, user, activity_type, details):
        """Notify admins about suspicious activity"""
        return cls.notify_admins(
            title="Suspicious Activity Detected",
            message=f"Suspicious {activity_type} detected for user {user.email}. {details}",
            level='security',
            notification_type='security_suspicious_activity',
            metadata={
                'user_id': user.id,
                'user_email': user.email,
                'activity_type': activity_type,
                'details': details
            }
        )

    @classmethod
    def notify_new_merchant_application(cls, merchant):
        """Notify admins when a new merchant applies"""
        return cls.notify_admins(
            title="New Merchant Application",
            message=f"New merchant application from {merchant.business_name} ({merchant.user.email}).",
            level='info',
            notification_type='merchant_application_submitted',
            metadata={
                'merchant_id': merchant.id,
                'business_name': merchant.business_name,
                'user_email': merchant.user.email
            }
        )

    @classmethod  
    def notify_large_transaction(cls, transaction, threshold=10000):
        """Notify admins about large transactions"""
        if float(transaction.amount) >= threshold:
            return cls.notify_admins(
                title="Large Transaction Alert",
                message=f"Large transaction detected: {transaction.amount} {transaction.currency}",
                level='warning',
                notification_type='payment_pending',
                metadata={
                    'transaction_id': transaction.id,
                    'amount': str(transaction.amount),
                    'currency': transaction.currency,
                    'threshold': threshold
                }
            )
        return []

    @classmethod
    def deliver_with_retry(cls, notification, max_attempts=3):
        if notification.delivery_attempts >= max_attempts:
            return False
            
        try:
            notification.delivery_attempts += 1
            notification.last_attempt = timezone.now()
            notification.save()
            
            # Exponential backoff
            delay = min(60 * (2 ** (notification.delivery_attempts - 1)), 3600)
            
            if notification.category == 'scheduled' and notification.scheduled_for > timezone.now():
                return True  # Will be handled by scheduler
                
            success = cls._deliver_notification(notification)
            
            if success:
                notification.delivery_metrics['delivered_at'] = timezone.now().isoformat()
                notification.save()
                return True
                
            return False
        except Exception as e:
            logger.error(f"Notification delivery failed: {str(e)}")
            return False
    
    @classmethod
    def _deliver_notification(cls, notification):
        # Actual delivery logic for all channels
        # Send email for important notifications
        if notification.level in ['warning', 'error', 'payment', 'security']:
            cls.send_email_notification(notification.user, notification.title, notification.message)
            
        # Send SMS for critical notifications
        if notification.level in ['error', 'security']:
            cls.send_sms_notification(notification.user, f"{notification.title}: {notification.message}")
            
        # Send web notification
        cls.send_web_notification(notification.user, notification)
        
        # Send push notification
        cls.send_push_notification(notification.user, notification)
        
        return True
