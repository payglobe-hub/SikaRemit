"""
User Registration & Authentication Tests.

Tests user creation for all 6 user types, login, password validation,
user type properties, and profile auto-creation via signals.
"""
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.backends import ModelBackend
from django.utils import timezone
from users.models import Customer, Merchant
from shared.constants import (
    USER_TYPE_SUPER_ADMIN, USER_TYPE_BUSINESS_ADMIN,
    USER_TYPE_OPERATIONS_ADMIN, USER_TYPE_VERIFICATION_ADMIN,
    USER_TYPE_MERCHANT, USER_TYPE_CUSTOMER,
    USER_TYPE_CHOICES
)

User = get_user_model()


class UserCreationTests(TestCase):
    """Test user creation for all types."""

    def test_create_customer_user(self):
        user = User.objects.create_user(
            username='customer1', email='customer1@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )
        self.assertEqual(user.user_type, USER_TYPE_CUSTOMER)
        self.assertTrue(user.check_password('testpass123'))
        self.assertTrue(user.is_active)

    def test_create_merchant_user(self):
        user = User.objects.create_user(
            username='merchant1', email='merchant1@test.com',
            password='testpass123', user_type=USER_TYPE_MERCHANT
        )
        self.assertEqual(user.user_type, USER_TYPE_MERCHANT)

    def test_create_super_admin(self):
        user = User.objects.create_user(
            username='superadmin1', email='super@test.com',
            password='testpass123', user_type=USER_TYPE_SUPER_ADMIN
        )
        self.assertEqual(user.user_type, USER_TYPE_SUPER_ADMIN)

    def test_create_business_admin(self):
        user = User.objects.create_user(
            username='bizadmin1', email='biz@test.com',
            password='testpass123', user_type=USER_TYPE_BUSINESS_ADMIN
        )
        self.assertEqual(user.user_type, USER_TYPE_BUSINESS_ADMIN)

    def test_create_operations_admin(self):
        user = User.objects.create_user(
            username='opsadmin1', email='ops@test.com',
            password='testpass123', user_type=USER_TYPE_OPERATIONS_ADMIN
        )
        self.assertEqual(user.user_type, USER_TYPE_OPERATIONS_ADMIN)

    def test_create_verification_admin(self):
        user = User.objects.create_user(
            username='veradmin1', email='ver@test.com',
            password='testpass123', user_type=USER_TYPE_VERIFICATION_ADMIN
        )
        self.assertEqual(user.user_type, USER_TYPE_VERIFICATION_ADMIN)

    def test_all_user_type_choices_valid(self):
        for type_value, type_label in USER_TYPE_CHOICES:
            user = User.objects.create_user(
                username=f'user_{type_label}', email=f'{type_label}@test.com',
                password='testpass123', user_type=type_value
            )
            self.assertEqual(user.user_type, type_value)

    def test_duplicate_email_rejected(self):
        User.objects.create_user(
            username='user1', email='dupe@test.com', password='testpass123'
        )
        with self.assertRaises(Exception):
            User.objects.create_user(
                username='user2', email='dupe@test.com', password='testpass123'
            )

    def test_duplicate_username_rejected(self):
        User.objects.create_user(
            username='dupeuser', email='a@test.com', password='testpass123'
        )
        with self.assertRaises(Exception):
            User.objects.create_user(
                username='dupeuser', email='b@test.com', password='testpass123'
            )


class AuthenticationTests(TestCase):
    """Test authentication flows."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='authuser', email='auth@test.com',
            password='correct_password', user_type=USER_TYPE_CUSTOMER
        )
        self.backend = ModelBackend()

    def test_authenticate_with_correct_credentials(self):
        user = self.backend.authenticate(
            None, username='auth@test.com', password='correct_password'
        )
        self.assertIsNotNone(user)
        self.assertEqual(user.id, self.user.id)

    def test_authenticate_with_wrong_password_fails(self):
        user = self.backend.authenticate(
            None, username='auth@test.com', password='wrong_password'
        )
        self.assertIsNone(user)

    def test_authenticate_with_nonexistent_user_fails(self):
        user = self.backend.authenticate(
            None, username='nonexistent@test.com', password='testpass123'
        )
        self.assertIsNone(user)

    def test_password_is_hashed(self):
        self.assertNotEqual(self.user.password, 'correct_password')
        self.assertTrue(self.user.password.startswith('pbkdf2_sha256$'))

    def test_set_password_changes_password(self):
        self.user.set_password('new_password')
        self.user.save()
        self.assertTrue(self.user.check_password('new_password'))
        self.assertFalse(self.user.check_password('correct_password'))


class CustomerProfileTests(TestCase):
    """Test customer profile auto-creation via signal and fields."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='custprofile', email='cust@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )

    def test_signal_auto_creates_customer_profile(self):
        """Signal should auto-create Customer when user_type=CUSTOMER."""
        customer = Customer.objects.get(user=self.user)
        self.assertEqual(customer.user, self.user)
        self.assertFalse(customer.kyc_verified)
        self.assertEqual(customer.kyc_status, 'not_started')

    def test_customer_default_notification_preferences(self):
        customer = Customer.objects.get(user=self.user)
        self.assertTrue(customer.email_notifications)
        self.assertFalse(customer.sms_notifications)
        self.assertTrue(customer.push_notifications)
        self.assertTrue(customer.transaction_alerts)
        self.assertTrue(customer.security_alerts)
        self.assertFalse(customer.marketing_emails)


class MerchantProfileTests(TestCase):
    """Test merchant profile auto-creation via signal and fields."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='merchprofile', email='merch@test.com',
            password='testpass123', user_type=USER_TYPE_MERCHANT
        )

    def test_signal_auto_creates_merchant_profile(self):
        """Signal should auto-create Merchant when user_type=MERCHANT."""
        merchant = Merchant.objects.get(user=self.user)
        self.assertEqual(merchant.user, self.user)
        self.assertFalse(merchant.is_approved)
        self.assertIsNone(merchant.approved_by)

    def test_merchant_update_business_details(self):
        merchant = Merchant.objects.get(user=self.user)
        merchant.business_name = 'Test Store'
        merchant.tax_id = 'TAX123456'
        merchant.save()
        merchant.refresh_from_db()
        self.assertEqual(merchant.business_name, 'Test Store')

    def test_merchant_specialization_defaults(self):
        merchant = Merchant.objects.get(user=self.user)
        self.assertFalse(merchant.is_biller)
        self.assertFalse(merchant.is_subscription_provider)
        self.assertFalse(merchant.is_remittance_agent)

    def test_merchant_approval(self):
        admin = User.objects.create_user(
            username='approver', email='approver@test.com',
            password='testpass123', user_type=USER_TYPE_BUSINESS_ADMIN
        )
        merchant = Merchant.objects.get(user=self.user)
        merchant.business_name = 'Test'
        merchant.tax_id = 'TX1'
        merchant.is_approved = True
        merchant.approved_by = admin
        merchant.approved_at = timezone.now()
        merchant.save()

        merchant.refresh_from_db()
        self.assertTrue(merchant.is_approved)
        self.assertEqual(merchant.approved_by, admin)
        self.assertIsNotNone(merchant.approved_at)
