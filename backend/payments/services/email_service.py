# ====================================================================================
# SikaRemit Professional Email Templates
# Transactional communications with professional HTML templates
# ====================================================================================

from django.template.loader import render_to_string
from django.core.mail import EmailMessage
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class EmailService:
    """
    Professional email service for transactional communications
    """

    def __init__(self):
        self.from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@sikaremit.com')
        self.company_name = getattr(settings, 'COMPANY_NAME', 'SikaRemit')
        self.support_email = getattr(settings, 'SUPPORT_EMAIL', 'support@sikaremit.com')

    def send_payment_confirmation(self, transaction, customer, merchant):
        """
        Send payment confirmation email

        Args:
            transaction: Transaction model instance
            customer: Customer model instance
            merchant: Merchant model instance

        Returns:
            bool: Success status
        """
        try:
            subject = f"Payment Confirmation - {transaction.reference}"

            context = {
                'customer': customer,
                'merchant': merchant,
                'transaction': transaction,
                'company_name': self.company_name,
                'support_email': self.support_email,
                'amount': f"{transaction.currency} {transaction.amount:,.2f}",
                'date': transaction.created_at.strftime('%B %d, %Y at %I:%M %p'),
            }

            html_content = render_to_string('payments/payment_confirmation.html', context)

            email = EmailMessage(
                subject=subject,
                body=html_content,
                from_email=self.from_email,
                to=[customer.user.email]
            )
            email.content_subtype = 'html'
            email.send()

            logger.info(f"Payment confirmation email sent to {customer.user.email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send payment confirmation: {str(e)}")
            return False

    def send_payment_failed(self, transaction, customer, merchant, error_message):
        """
        Send payment failed notification

        Args:
            transaction: Transaction model instance
            customer: Customer model instance
            merchant: Merchant model instance
            error_message: Failure reason

        Returns:
            bool: Success status
        """
        try:
            subject = f"Payment Failed - {transaction.reference}"

            context = {
                'customer': customer,
                'merchant': merchant,
                'transaction': transaction,
                'company_name': self.company_name,
                'support_email': self.support_email,
                'error_message': error_message,
                'amount': f"{transaction.currency} {transaction.amount:,.2f}",
            }

            html_content = render_to_string('payments/payment_failed.html', context)

            email = EmailMessage(
                subject=subject,
                body=html_content,
                from_email=self.from_email,
                to=[customer.user.email]
            )
            email.content_subtype = 'html'
            email.send()

            logger.info(f"Payment failed email sent to {customer.user.email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send payment failed email: {str(e)}")
            return False

    def send_refund_confirmation(self, transaction, original_transaction, customer, merchant):
        """
        Send refund confirmation email

        Args:
            transaction: Refund transaction instance
            original_transaction: Original transaction instance
            customer: Customer model instance
            merchant: Merchant model instance

        Returns:
            bool: Success status
        """
        try:
            subject = f"Refund Processed - {transaction.reference}"

            context = {
                'customer': customer,
                'merchant': merchant,
                'transaction': transaction,
                'original_transaction': original_transaction,
                'company_name': self.company_name,
                'support_email': self.support_email,
                'refund_amount': f"{transaction.currency} {transaction.amount:,.2f}",
                'date': transaction.created_at.strftime('%B %d, %Y at %I:%M %p'),
            }

            html_content = render_to_string('payments/refund_confirmation.html', context)

            email = EmailMessage(
                subject=subject,
                body=html_content,
                from_email=self.from_email,
                to=[customer.user.email]
            )
            email.content_subtype = 'html'
            email.send()

            logger.info(f"Refund confirmation email sent to {customer.user.email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send refund confirmation: {str(e)}")
            return False

    def send_merchant_settlement(self, merchant, settlement_amount, settlement_date):
        """
        Send merchant settlement notification

        Args:
            merchant: Merchant model instance
            settlement_amount: Settlement amount
            settlement_date: Settlement date

        Returns:
            bool: Success status
        """
        try:
            subject = f"Merchant Settlement - {settlement_date.strftime('%B %Y')}"

            context = {
                'merchant': merchant,
                'settlement_amount': f"GHS {settlement_amount:,.2f}",
                'settlement_date': settlement_date.strftime('%B %d, %Y'),
                'company_name': self.company_name,
                'support_email': self.support_email,
            }

            html_content = render_to_string('payments/merchant_settlement.html', context)

            email = EmailMessage(
                subject=subject,
                body=html_content,
                from_email=self.from_email,
                to=[merchant.user.email]
            )
            email.content_subtype = 'html'
            email.send()

            logger.info(f"Merchant settlement email sent to {merchant.user.email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send merchant settlement email: {str(e)}")
            return False

    def send_security_alert(self, user, alert_type, details):
        """
        Send security alert email

        Args:
            user: User model instance
            alert_type: Type of security alert
            details: Alert details

        Returns:
            bool: Success status
        """
        try:
            subject = f"Security Alert - {alert_type}"

            context = {
                'user': user,
                'alert_type': alert_type,
                'details': details,
                'company_name': self.company_name,
                'support_email': self.support_email,
                'timestamp': timezone.now().strftime('%B %d, %Y at %I:%M %p'),
            }

            html_content = render_to_string('payments/security_alert.html', context)

            email = EmailMessage(
                subject=subject,
                body=html_content,
                from_email=self.from_email,
                to=[user.email]
            )
            email.content_subtype = 'html'
            email.send()

            logger.info(f"Security alert email sent to {user.email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send security alert email: {str(e)}")
            return False
