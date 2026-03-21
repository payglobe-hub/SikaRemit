from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from celery import shared_task
from .models import User
import requests
from django.utils import timezone
from .models import KYCDocument

@shared_task
def send_verification_email(user_id):
    user = User.objects.get(pk=user_id)
    subject = "Verify your SikaRemit account"
    message = render_to_string('users/verification_email.html', {
        'user': user,
        'verification_url': f"{settings.FRONTEND_URL}/verify-email/{user.verification_token}/"
    })
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        html_message=message
    )

@shared_task
def send_merchant_approval_email(user_id, approved_by_id):
    user = User.objects.get(pk=user_id)
    approved_by = User.objects.get(pk=approved_by_id)
    subject = "Your merchant account has been approved"
    message = render_to_string('users/merchant_approved_email.html', {
        'user': user,
        'approved_by': approved_by
    })
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        html_message=message
    )

@shared_task(bind=True, max_retries=3)
def send_kyc_webhook(document_id, event_type):
    document = KYCDocument.objects.get(pk=document_id)
    webhook_url = settings.KYC_WEBHOOK_URL
    
    payload = {
        'event': event_type,
        'document_id': str(document.id),
        'user_id': str(document.user.id),
        'status': document.status,
        'timestamp': timezone.now().isoformat()
    }
    
    try:
        response = requests.post(
            webhook_url,
            json=payload,
            headers={'Authorization': f'Bearer {settings.KYC_WEBHOOK_SECRET}'},
            timeout=10
        )
        response.raise_for_status()
        return True
    except Exception as e:
        self.retry(exc=e, countdown=60)
