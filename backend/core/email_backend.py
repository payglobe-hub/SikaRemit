"""
SendGrid Email Backend for SikaRemit
Production-ready email service using SendGrid API
"""
import os
import logging
from django.core.mail.backends.base import BaseEmailBackend
from django.core.mail import EmailMultiAlternatives
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
from django.conf import settings

logger = logging.getLogger(__name__)


class SendGridBackend(BaseEmailBackend):
    """
    SendGrid email backend for Django
    Uses SendGrid API v3 for reliable email delivery
    """
    
    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        self.api_key = getattr(settings, 'SENDGRID_API_KEY', None)
        
        if not self.api_key:
            logger.warning("SENDGRID_API_KEY not configured. Emails will not be sent.")
            self.client = None
        else:
            self.client = SendGridAPIClient(self.api_key)
    
    def send_messages(self, email_messages):
        """
        Send one or more EmailMessage objects and return the number of email
        messages sent.
        """
        if not self.client:
            if not self.fail_silently:
                raise ValueError("SendGrid API key not configured")
            return 0
        
        num_sent = 0
        for message in email_messages:
            try:
                sent = self._send(message)
                if sent:
                    num_sent += 1
            except Exception as e:
                logger.error(f"Failed to send email: {str(e)}")
                if not self.fail_silently:
                    raise
        
        return num_sent
    
    def _send(self, message):
        """Send a single email message"""
        if not message.recipients():
            return False
        
        try:
            # Build SendGrid message
            from_email = Email(message.from_email)
            to_emails = [To(email) for email in message.recipients()]
            subject = message.subject
            
            # Handle HTML and plain text content
            if isinstance(message, EmailMultiAlternatives):
                # Get HTML content if available
                html_content = None
                for content, mimetype in message.alternatives:
                    if mimetype == 'text/html':
                        html_content = content
                        break
                
                if html_content:
                    content = Content("text/html", html_content)
                else:
                    content = Content("text/plain", message.body)
            else:
                content = Content("text/plain", message.body)
            
            # Create mail object
            mail = Mail(
                from_email=from_email,
                to_emails=to_emails[0] if len(to_emails) == 1 else to_emails,
                subject=subject,
                plain_text_content=message.body if not isinstance(message, EmailMultiAlternatives) else None,
                html_content=content.value if content.type == 'text/html' else None
            )
            
            # Add CC and BCC if present
            if message.cc:
                mail.cc = [Email(email) for email in message.cc]
            if message.bcc:
                mail.bcc = [Email(email) for email in message.bcc]
            
            # Add reply-to if present
            if message.reply_to:
                mail.reply_to = Email(message.reply_to[0])
            
            # Send via SendGrid API
            response = self.client.send(mail)
            
            if response.status_code in [200, 201, 202]:
                logger.info(f"Email sent successfully to {message.recipients()}")
                return True
            else:
                logger.error(f"SendGrid API error: {response.status_code} - {response.body}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending email via SendGrid: {str(e)}")
            if not self.fail_silently:
                raise
            return False
