from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.signals import user_logged_in, user_logged_out
from .models import PasswordResetToken, UserActivity

User = get_user_model()

@receiver(post_save, sender=User)
def send_welcome_email(sender, instance, created, **kwargs):
    if created and not getattr(settings, 'TESTING', False):
        subject = 'Welcome to SikaRemit'
        message = f'Hello {instance.email}, thank you for registering!'
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [instance.email],
            fail_silently=True  # Changed from False to True
        )

@receiver(post_save, sender=User)
def invalidate_reset_tokens(sender, instance, **kwargs):
    """Invalidate all reset tokens when password changes"""
    update_fields = kwargs.get('update_fields', []) or []
    if 'password' in update_fields:
        PasswordResetToken.objects.filter(user=instance).update(used=True)

# @receiver(user_logged_in)
# def log_user_login(sender, request, user, **kwargs):
#     UserActivity.objects.create(
#         user=user,
#         event_type='LOGIN',
#         ip_address=request.META.get('REMOTE_ADDR'),
#         metadata={
#             'user_agent': request.META.get('HTTP_USER_AGENT'),
#             'path': request.path
#         }
#     )

# @receiver(user_logged_out)
# def log_user_logout(sender, request, user, **kwargs):
#     UserActivity.objects.create(
#         user=user,
#         event_type='LOGOUT',
#         ip_address=request.META.get('REMOTE_ADDR'),
#         metadata={
#             'user_agent': request.META.get('HTTP_USER_AGENT'),
#             'path': request.path
#         }
#     )

# @receiver(post_save, sender=User)
# def log_profile_updates(sender, instance, created, **kwargs):
#     if not created:
#         UserActivity.objects.create(
#             user=instance,
#             event_type='PROFILE_UPDATE',
#             metadata={}
#         )
