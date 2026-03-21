"""
Comprehensive Notification Service
Handles email and SMS notifications for various system events
"""
import logging
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.core.exceptions import ValidationError
from typing import Dict, List, Any, Optional
import requests
import json

logger = logging.getLogger(__name__)

class NotificationService:
    """Centralized notification service for email and SMS"""

    # Notification types
    PAYMENT_COMPLETED = 'payment_completed'
    PAYMENT_FAILED = 'payment_failed'
    REFUND_PROCESSED = 'refund_processed'
    REMITTANCE_INITIATED = 'remittance_initiated'
    REMITTANCE_COMPLETED = 'remittance_completed'
    REMITTANCE_FAILED = 'remittance_failed'
    KYC_APPROVED = 'kyc_approved'
    KYC_REJECTED = 'kyc_rejected'
    MERCHANT_INVITATION = 'merchant_invitation'
    PASSWORD_RESET = 'password_reset'
    SECURITY_ALERT = 'security_alert'
    
    # Dispute notification types
    DISPUTE_CREATED = 'dispute_created'
    DISPUTE_CONFIRMATION = 'dispute_confirmation'
    DISPUTE_RESPONSE = 'dispute_response'
    DISPUTE_RESOLUTION = 'dispute_resolution'
    DISPUTE_ESCALATION = 'dispute_escalation'
    DISPUTE_ESCALATED_TO_ADMIN = 'dispute_escalated_to_admin'
    DISPUTE_POSITIVE_FEEDBACK = 'dispute_positive_feedback'

    # SMS providers
    AFRICASTALKING = 'africastalking'
    TWILIO = 'twilio'

    @staticmethod
    def send_notification(
        notification_type: str,
        recipient_email: str = None,
        recipient_phone: str = None,
        context: Dict[str, Any] = None,
        channels: List[str] = None
    ) -> Dict[str, bool]:
        """
        Send notification via specified channels
        """
        context = context or {}
        channels = channels or ['email']  # Default to email

        results = {}

        if 'email' in channels and recipient_email:
            results['email'] = NotificationService._send_email_notification(
                notification_type, recipient_email, context
            )

        if 'sms' in channels and recipient_phone:
            results['sms'] = NotificationService._send_sms_notification(
                notification_type, recipient_phone, context
            )

        logger.info(f"Notification sent: {notification_type} to {recipient_email or recipient_phone}, results: {results}")

        return results

    @staticmethod
    def _send_email_notification(notification_type: str, recipient_email: str, context: Dict[str, Any]) -> bool:
        """
        Send email notification
        """
        try:
            # Get email template and subject
            template_name, subject = NotificationService._get_email_template(notification_type)

            # Render email content
            html_content = render_to_string(f'notifications/{template_name}.html', context)
            text_content = render_to_string(f'notifications/{template_name}.txt', context)

            # Send email
            send_mail(
                subject=subject,
                message=text_content,
                html_message=html_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient_email],
                fail_silently=False
            )

            logger.info(f"Email sent successfully: {notification_type} to {recipient_email}")
            return True

        except Exception as e:
            logger.error(f"Email sending failed: {notification_type} to {recipient_email}, error: {str(e)}")
            return False

    @staticmethod
    def _send_sms_notification(notification_type: str, recipient_phone: str, context: Dict[str, Any]) -> bool:
        """
        Send SMS notification
        """
        try:
            message = NotificationService._get_sms_message(notification_type, context)

            # Use configured SMS provider
            if hasattr(settings, 'SMS_PROVIDER') and settings.SMS_PROVIDER == NotificationService.TWILIO:
                return NotificationService._send_twilio_sms(recipient_phone, message)
            else:
                # Default to AfricasTalking
                return NotificationService._send_africastalking_sms(recipient_phone, message)

        except Exception as e:
            logger.error(f"SMS sending failed: {notification_type} to {recipient_phone}, error: {str(e)}")
            return False

    @staticmethod
    def _get_email_template(notification_type: str) -> tuple[str, str]:
        """
        Get email template name and subject for notification type
        """
        templates = {
            NotificationService.PAYMENT_COMPLETED: ('payment_completed', 'Payment Completed - SikaRemit'),
            NotificationService.PAYMENT_FAILED: ('payment_failed', 'Payment Failed - SikaRemit'),
            NotificationService.REFUND_PROCESSED: ('refund_processed', 'Refund Processed - SikaRemit'),
            NotificationService.REMITTANCE_INITIATED: ('remittance_initiated', 'Remittance Initiated - SikaRemit'),
            NotificationService.REMITTANCE_COMPLETED: ('remittance_completed', 'Remittance Completed - SikaRemit'),
            NotificationService.REMITTANCE_FAILED: ('remittance_failed', 'Remittance Failed - SikaRemit'),
            NotificationService.KYC_APPROVED: ('kyc_approved', 'KYC Approved - SikaRemit'),
            NotificationService.KYC_REJECTED: ('kyc_rejected', 'KYC Rejected - SikaRemit'),
            NotificationService.MERCHANT_INVITATION: ('merchant_invitation', 'Merchant Invitation - SikaRemit'),
            NotificationService.PASSWORD_RESET: ('password_reset', 'Password Reset - SikaRemit'),
            NotificationService.SECURITY_ALERT: ('security_alert', 'Security Alert - SikaRemit'),
            
            # Dispute notification templates
            NotificationService.DISPUTE_CREATED: ('dispute_created', 'New Dispute Filed - SikaRemit'),
            NotificationService.DISPUTE_CONFIRMATION: ('dispute_confirmation', 'Dispute Filed Successfully - SikaRemit'),
            NotificationService.DISPUTE_RESPONSE: ('dispute_response', 'Dispute Response Received - SikaRemit'),
            NotificationService.DISPUTE_RESOLUTION: ('dispute_resolution', 'Dispute Resolved - SikaRemit'),
            NotificationService.DISPUTE_ESCALATION: ('dispute_escalation', 'Dispute Escalated to Admin - SikaRemit'),
            NotificationService.DISPUTE_ESCALATED_TO_ADMIN: ('dispute_escalated_to_admin', 'Your Dispute Has Been Escalated - SikaRemit'),
            NotificationService.DISPUTE_POSITIVE_FEEDBACK: ('dispute_positive_feedback', 'Positive Dispute Feedback - SikaRemit'),
        }

        return templates.get(notification_type, ('default', 'Notification - SikaRemit'))

    @staticmethod
    def _get_sms_message(notification_type: str, context: Dict[str, Any]) -> str:
        """
        Get SMS message content for notification type
        """
        messages = {
            NotificationService.PAYMENT_COMPLETED: f"Payment of ${context.get('amount', 'N/A')} completed successfully. Ref: {context.get('reference', 'N/A')}",
            NotificationService.PAYMENT_FAILED: f"Payment failed. Please try again or contact support. Ref: {context.get('reference', 'N/A')}",
            NotificationService.REFUND_PROCESSED: f"Refund of ${context.get('amount', 'N/A')} processed successfully. Ref: {context.get('reference', 'N/A')}",
            NotificationService.REMITTANCE_INITIATED: f"Remittance of ${context.get('amount', 'N/A')} initiated to {context.get('recipient', 'N/A')}. Ref: {context.get('reference', 'N/A')}",
            NotificationService.REMITTANCE_COMPLETED: f"Remittance of ${context.get('amount', 'N/A')} completed successfully. Ref: {context.get('reference', 'N/A')}",
            NotificationService.REMITTANCE_FAILED: f"Remittance failed. Please contact support. Ref: {context.get('reference', 'N/A')}",
            NotificationService.KYC_APPROVED: "Your KYC verification has been approved. You can now make international transfers.",
            NotificationService.KYC_REJECTED: "Your KYC verification was rejected. Please check your documents and try again.",
            NotificationService.SECURITY_ALERT: f"Security alert: {context.get('message', 'Unusual activity detected')}",
            
            # Dispute SMS messages
            NotificationService.DISPUTE_CREATED: f"New dispute filed for transaction {context.get('transaction_id', 'N/A')}. Amount: {context.get('amount', 'N/A')} {context.get('currency', 'N/A')}. Please respond within 48 hours.",
            NotificationService.DISPUTE_CONFIRMATION: f"Your dispute for transaction {context.get('transaction_id', 'N/A')} has been filed successfully. We'll notify you of updates.",
            NotificationService.DISPUTE_RESPONSE: f"Response received for your dispute {context.get('dispute_id', 'N/A')}. Check your email for details.",
            NotificationService.DISPUTE_RESOLUTION: f"Your dispute {context.get('dispute_id', 'N/A')} has been resolved. Check your email for resolution details.",
            NotificationService.DISPUTE_ESCALATION: f"Dispute {context.get('dispute_id', 'N/A')} escalated to admin for review.",
            NotificationService.DISPUTE_ESCALATED_TO_ADMIN: f"Your dispute {context.get('dispute_id', 'N/A')} has been escalated to SikaRemit admin team for resolution.",
            NotificationService.DISPUTE_POSITIVE_FEEDBACK: f"Customer provided positive feedback for resolved dispute {context.get('dispute_id', 'N/A')}. Great job!",
            
            NotificationService.USSD_APPROVAL: f"Your USSD transaction has been APPROVED!\nAmount: GHS {context.get('amount', 'N/A')}\nType: {context.get('type', 'N/A')}\nID: {context.get('transaction_id', 'N/A')}\nRecipient: {context.get('recipient', 'N/A')}\nStatus: ✅ Approved",
            NotificationService.USSD_REJECTION: f"Your USSD transaction has been REJECTED.\nAmount: GHS {context.get('amount', 'N/A')}\nType: {context.get('type', 'N/A')}\nID: {context.get('transaction_id', 'N/A')}\nReason: {context.get('reason', 'N/A')}\nStatus: ❌ Rejected",
            NotificationService.USSD_STATUS_UPDATE: f"SikaRemit Transaction Update:\nAmount: GHS {context.get('amount', 'N/A')}\nType: {context.get('type', 'N/A')}\nID: {context.get('transaction_id', 'N/A')}\nStatus: {context.get('status', 'N/A')}",
        }

        return messages.get(notification_type, f"Notification from SikaRemit: {context.get('message', 'Check your account for updates')}")

    @staticmethod
    def _send_africastalking_sms(phone_number: str, message: str) -> bool:
        """
        Send SMS via AfricasTalking
        """
        try:
            if not hasattr(settings, 'AFRICASTALKING_USERNAME') or not hasattr(settings, 'AFRICASTALKING_API_KEY'):
                logger.error("AfricasTalking credentials not configured")
                return False

            # Format phone number (ensure international format)
            if not phone_number.startswith('+'):
                # Assume Ghana format if no country code
                if phone_number.startswith('0'):
                    phone_number = f"+233{phone_number[1:]}"
                else:
                    phone_number = f"+{phone_number}"

            url = "https://api.africastalking.com/version1/messaging"
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'apiKey': settings.AFRICASTALKING_API_KEY
            }

            data = {
                'username': settings.AFRICASTALKING_USERNAME,
                'to': phone_number,
                'message': message,
                'from': getattr(settings, 'AFRICASTALKING_SENDER_ID', 'SikaRemit')
            }

            response = requests.post(url, headers=headers, data=data)

            if response.status_code == 201:
                result = response.json()
                if result.get('SMSMessageData', {}).get('Recipients', [{}])[0].get('status') == 'Success':
                    logger.info(f"SMS sent via AfricasTalking to {phone_number}")
                    return True

            logger.error(f"AfricasTalking SMS failed: {response.text}")
            return False

        except Exception as e:
            logger.error(f"AfricasTalking SMS error: {str(e)}")
            return False

    @staticmethod
    def _send_twilio_sms(phone_number: str, message: str) -> bool:
        """
        Send SMS via Twilio
        """
        try:
            if not hasattr(settings, 'TWILIO_ACCOUNT_SID') or not hasattr(settings, 'TWILIO_AUTH_TOKEN'):
                logger.error("Twilio credentials not configured")
                return False

            from twilio.rest import Client

            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

            # Format phone number
            if not phone_number.startswith('+'):
                if phone_number.startswith('0'):
                    phone_number = f"+233{phone_number[1:]}"
                else:
                    phone_number = f"+{phone_number}"

            message = client.messages.create(
                body=message,
                from_=settings.TWILIO_PHONE_NUMBER,
                to=phone_number
            )

            logger.info(f"SMS sent via Twilio to {phone_number}, SID: {message.sid}")
            return True

        except Exception as e:
            logger.error(f"Twilio SMS error: {str(e)}")
            return False

    @staticmethod
    def send_bulk_notifications(
        notifications: List[Dict[str, Any]],
        channels: List[str] = None
    ) -> Dict[str, int]:
        """
        Send bulk notifications efficiently
        """
        channels = channels or ['email']
        results = {'success': 0, 'failed': 0}

        for notification in notifications:
            result = NotificationService.send_notification(
                notification_type=notification['type'],
                recipient_email=notification.get('email'),
                recipient_phone=notification.get('phone'),
                context=notification.get('context', {}),
                channels=channels
            )

            if any(result.values()):
                results['success'] += 1
            else:
                results['failed'] += 1

        logger.info(f"Bulk notifications completed: {results['success']} successful, {results['failed']} failed")
        return results

    @staticmethod
    def notify_transaction_event(transaction, event_type: str, user=None):
        """
        Send notifications for transaction events
        """
        user = user or transaction.customer.user

        context = {
            'user_name': f"{user.first_name} {user.last_name}",
            'amount': float(transaction.amount),
            'currency': transaction.currency,
            'reference': transaction.transaction_id or transaction.id,
            'date': transaction.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'transaction': transaction
        }

        # Determine notification type
        notification_type_map = {
            'completed': NotificationService.PAYMENT_COMPLETED,
            'failed': NotificationService.PAYMENT_FAILED,
            'refunded': NotificationService.REFUND_PROCESSED,
        }

        notification_type = notification_type_map.get(event_type, event_type)

        # Send via both email and SMS for important events
        channels = ['email', 'sms'] if event_type in ['completed', 'failed'] else ['email']

        NotificationService.send_notification(
            notification_type=notification_type,
            recipient_email=user.email,
            recipient_phone=getattr(user, 'phone', None),
            context=context,
            channels=channels
        )

    @staticmethod
    def notify_remittance_event(remittance, event_type: str):
        """
        Send notifications for remittance events
        """
        sender = remittance.sender.user

        context = {
            'user_name': f"{sender.first_name} {sender.last_name}",
            'amount': float(remittance.amount_sent),
            'recipient_name': remittance.recipient_name,
            'recipient_country': remittance.recipient_country,
            'reference': remittance.reference_number,
            'exchange_rate': float(remittance.exchange_rate),
            'fee': float(remittance.fee),
            'amount_received': float(remittance.amount_received),
            'date': remittance.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'remittance': remittance
        }

        # Determine notification type
        notification_type_map = {
            'initiated': NotificationService.REMITTANCE_INITIATED,
            'completed': NotificationService.REMITTANCE_COMPLETED,
            'failed': NotificationService.REMITTANCE_FAILED,
        }

        notification_type = notification_type_map.get(event_type, event_type)

        NotificationService.send_notification(
            notification_type=notification_type,
            recipient_email=sender.email,
            recipient_phone=getattr(sender, 'phone', None),
            context=context,
            channels=['email', 'sms']  # Always send both for remittances
        )

    @staticmethod
    def send_raw_sms(phone_number: str, message: str) -> bool:
        """
        Send raw SMS message without notification formatting
        Used by other services that need direct SMS sending
        """
        # Use configured SMS provider
        if hasattr(settings, 'SMS_PROVIDER') and settings.SMS_PROVIDER == NotificationService.TWILIO:
            return NotificationService._send_twilio_sms(phone_number, message)
        else:
            # Default to AfricasTalking
            return NotificationService._send_africastalking_sms(phone_number, message)

    @staticmethod
    def notify_security_event(user, event_type: str, details: Dict[str, Any] = None):
        """
        Send security-related notifications
        """
        context = {
            'user_name': f"{user.first_name} {user.last_name}",
            'event_type': event_type,
            'timestamp': timezone.now().strftime('%Y-%m-%d %H:%M:%S'),
            'ip_address': details.get('ip_address') if details else None,
            'user_agent': details.get('user_agent') if details else None,
            'details': details or {}
        }

        NotificationService.send_notification(
            notification_type=NotificationService.SECURITY_ALERT,
            recipient_email=user.email,
            recipient_phone=getattr(user, 'phone', None),
            context=context,
            channels=['email', 'sms']  # Security alerts via both channels
        )
