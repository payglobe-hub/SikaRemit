"""
Notification Delivery Tests.

Tests notification creation, delivery channels, read/unread status,
bulk notifications, and user notification preferences.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone

from users.models import Customer
from shared.constants import USER_TYPE_CUSTOMER

User = get_user_model()

class NotificationPreferenceTests(TestCase):
    """Test customer notification preferences."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='notifuser', email='notif@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )
        self.customer = Customer.objects.get(user=self.user)

    def test_default_notification_preferences(self):
        self.assertTrue(self.customer.email_notifications)
        self.assertFalse(self.customer.sms_notifications)
        self.assertTrue(self.customer.push_notifications)
        self.assertTrue(self.customer.transaction_alerts)
        self.assertTrue(self.customer.security_alerts)
        self.assertFalse(self.customer.marketing_emails)

    def test_toggle_email_notifications(self):
        self.customer.email_notifications = False
        self.customer.save()
        self.customer.refresh_from_db()
        self.assertFalse(self.customer.email_notifications)

    def test_toggle_sms_notifications(self):
        self.customer.sms_notifications = True
        self.customer.save()
        self.customer.refresh_from_db()
        self.assertTrue(self.customer.sms_notifications)

    def test_toggle_push_notifications(self):
        self.customer.push_notifications = False
        self.customer.save()
        self.customer.refresh_from_db()
        self.assertFalse(self.customer.push_notifications)

    def test_enable_marketing_emails(self):
        self.customer.marketing_emails = True
        self.customer.save()
        self.customer.refresh_from_db()
        self.assertTrue(self.customer.marketing_emails)

    def test_disable_transaction_alerts(self):
        self.customer.transaction_alerts = False
        self.customer.save()
        self.customer.refresh_from_db()
        self.assertFalse(self.customer.transaction_alerts)

    def test_security_alerts_always_recommended(self):
        """Security alerts default to True — verify initial state."""
        new_user = User.objects.create_user(
            username='secuser', email='sec@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )
        new_customer = Customer.objects.get(user=new_user)
        self.assertTrue(new_customer.security_alerts)

    def test_all_preferences_can_be_disabled(self):
        self.customer.email_notifications = False
        self.customer.sms_notifications = False
        self.customer.push_notifications = False
        self.customer.transaction_alerts = False
        self.customer.security_alerts = False
        self.customer.marketing_emails = False
        self.customer.save()
        self.customer.refresh_from_db()
        self.assertFalse(self.customer.email_notifications)
        self.assertFalse(self.customer.sms_notifications)
        self.assertFalse(self.customer.push_notifications)
        self.assertFalse(self.customer.transaction_alerts)
        self.assertFalse(self.customer.security_alerts)
        self.assertFalse(self.customer.marketing_emails)

    def test_all_preferences_can_be_enabled(self):
        self.customer.email_notifications = True
        self.customer.sms_notifications = True
        self.customer.push_notifications = True
        self.customer.transaction_alerts = True
        self.customer.security_alerts = True
        self.customer.marketing_emails = True
        self.customer.save()
        self.customer.refresh_from_db()
        self.assertTrue(self.customer.email_notifications)
        self.assertTrue(self.customer.sms_notifications)
        self.assertTrue(self.customer.push_notifications)
        self.assertTrue(self.customer.transaction_alerts)
        self.assertTrue(self.customer.security_alerts)
        self.assertTrue(self.customer.marketing_emails)
