"""
Merchant Onboarding Tests.

Tests merchant registration, profile creation (via signal), approval workflow,
customer onboarding to merchants, and merchant specialization fields.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone

from users.models import Customer, Merchant, MerchantCustomer
from users.services import KYCService
from shared.constants import (
    USER_TYPE_SUPER_ADMIN, USER_TYPE_BUSINESS_ADMIN,
    USER_TYPE_MERCHANT, USER_TYPE_CUSTOMER
)

User = get_user_model()

def _get_merchant(user, **kwargs):
    """Get the signal-created Merchant and update its fields."""
    merchant = Merchant.objects.get(user=user)
    for k, v in kwargs.items():
        setattr(merchant, k, v)
    if kwargs:
        merchant.save()
    return merchant

class MerchantRegistrationTests(TestCase):
    """Test merchant account creation and profile setup."""

    def test_signal_creates_merchant_profile(self):
        user = User.objects.create_user(
            username='newmerchant', email='newmerchant@test.com',
            password='testpass123', user_type=USER_TYPE_MERCHANT
        )
        merchant = _get_merchant(user, business_name='New Business LLC', tax_id='TAX-2024-001')
        self.assertEqual(merchant.user, user)
        self.assertEqual(merchant.business_name, 'New Business LLC')
        self.assertFalse(merchant.is_approved)

    def test_merchant_str_representation(self):
        user = User.objects.create_user(
            username='strmerch', email='str@test.com',
            password='testpass123', user_type=USER_TYPE_MERCHANT
        )
        merchant = _get_merchant(user, business_name='Str Test', tax_id='TAX1')
        self.assertEqual(str(merchant), 'Str Test')

    def test_merchant_one_to_one_enforced(self):
        """Signal already created the profile; a second create should fail."""
        user = User.objects.create_user(
            username='onetoone', email='onetoone@test.com',
            password='testpass123', user_type=USER_TYPE_MERCHANT
        )
        # Signal already created one
        self.assertTrue(Merchant.objects.filter(user=user).exists())
        with self.assertRaises(Exception):
            Merchant.objects.create(user=user, business_name='Two', tax_id='TX2')

class MerchantApprovalTests(TestCase):
    """Test merchant approval workflow."""

    def setUp(self):
        self.merchant_user = User.objects.create_user(
            username='pendmerch', email='pend@test.com',
            password='testpass123', user_type=USER_TYPE_MERCHANT
        )
        self.admin_user = User.objects.create_user(
            username='approver', email='approver@test.com',
            password='testpass123', user_type=USER_TYPE_BUSINESS_ADMIN
        )
        self.merchant = _get_merchant(
            self.merchant_user, business_name='Pending Corp', tax_id='TAX-PEND'
        )

    def test_merchant_starts_unapproved(self):
        self.assertFalse(self.merchant.is_approved)
        self.assertIsNone(self.merchant.approved_by)
        self.assertIsNone(self.merchant.approved_at)

    def test_approve_merchant(self):
        now = timezone.now()
        self.merchant.is_approved = True
        self.merchant.approved_by = self.admin_user
        self.merchant.approved_at = now
        self.merchant.save()

        self.merchant.refresh_from_db()
        self.assertTrue(self.merchant.is_approved)
        self.assertEqual(self.merchant.approved_by, self.admin_user)
        self.assertIsNotNone(self.merchant.approved_at)

    def test_unapprove_merchant(self):
        self.merchant.is_approved = True
        self.merchant.approved_by = self.admin_user
        self.merchant.approved_at = timezone.now()
        self.merchant.save()

        self.merchant.is_approved = False
        self.merchant.save()
        self.merchant.refresh_from_db()
        self.assertFalse(self.merchant.is_approved)

class MerchantSpecializationTests(TestCase):
    """Test merchant specialization fields."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='specmerch', email='spec@test.com',
            password='testpass123', user_type=USER_TYPE_MERCHANT
        )

    def test_merchant_biller_setup(self):
        merchant = _get_merchant(
            self.user, business_name='Utility Co', tax_id='TX-BILL',
            is_biller=True, biller_code='UTIL001', biller_category='utilities'
        )
        self.assertTrue(merchant.is_biller)
        self.assertEqual(merchant.biller_code, 'UTIL001')

    def test_merchant_subscription_provider(self):
        merchant = _get_merchant(
            self.user, business_name='SaaS Corp', tax_id='TX-SUB',
            is_subscription_provider=True,
            subscription_terms='Monthly billing, cancel anytime'
        )
        self.assertTrue(merchant.is_subscription_provider)

    def test_merchant_remittance_agent(self):
        merchant = _get_merchant(
            self.user, business_name='Remit Agent', tax_id='TX-REM',
            is_remittance_agent=True,
            remittance_license='REM-LIC-001',
            supported_countries=['GH', 'NG', 'KE']
        )
        self.assertTrue(merchant.is_remittance_agent)
        self.assertIn('GH', merchant.supported_countries)

class MerchantCustomerOnboardingTests(TestCase):
    """Test merchant onboarding customers."""

    def setUp(self):
        self.merchant_user = User.objects.create_user(
            username='onbmerch', email='onbmerch@test.com',
            password='testpass123', user_type=USER_TYPE_MERCHANT
        )
        self.customer_user1 = User.objects.create_user(
            username='onbcust1', email='onbcust1@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )
        self.customer_user2 = User.objects.create_user(
            username='onbcust2', email='onbcust2@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )
        self.merchant = _get_merchant(
            self.merchant_user, business_name='Onboard Corp', tax_id='TX-ONB'
        )
        self.customer1 = Customer.objects.get(user=self.customer_user1)
        self.customer2 = Customer.objects.get(user=self.customer_user2)

    def test_onboard_single_customer(self):
        mc = KYCService.onboard_merchant_customer(
            merchant=self.merchant,
            customer=self.customer1,
            kyc_required=True
        )
        self.assertEqual(mc.merchant, self.merchant)
        self.assertEqual(mc.customer, self.customer1)

    def test_onboard_multiple_customers(self):
        KYCService.onboard_merchant_customer(
            merchant=self.merchant, customer=self.customer1
        )
        KYCService.onboard_merchant_customer(
            merchant=self.merchant, customer=self.customer2
        )
        mc_count = MerchantCustomer.objects.filter(merchant=self.merchant).count()
        self.assertEqual(mc_count, 2)

    def test_cannot_onboard_same_customer_twice(self):
        KYCService.onboard_merchant_customer(
            merchant=self.merchant, customer=self.customer1
        )
        with self.assertRaises(ValueError):
            KYCService.onboard_merchant_customer(
                merchant=self.merchant, customer=self.customer1
            )

    def test_customer_cannot_be_onboarded_to_multiple_merchants(self):
        """Customer uses OneToOneField so can only belong to one merchant."""
        merchant2_user = User.objects.create_user(
            username='merch2', email='merch2@test.com',
            password='testpass123', user_type=USER_TYPE_MERCHANT
        )
        merchant2 = _get_merchant(merchant2_user, business_name='Corp2', tax_id='TX-2')
        KYCService.onboard_merchant_customer(
            merchant=self.merchant, customer=self.customer1
        )
        with self.assertRaises(Exception):
            KYCService.onboard_merchant_customer(
                merchant=merchant2, customer=self.customer1
            )

    def test_onboard_with_notes(self):
        mc = KYCService.onboard_merchant_customer(
            merchant=self.merchant,
            customer=self.customer1,
            notes='VIP customer, priority service'
        )
        self.assertEqual(mc.notes, 'VIP customer, priority service')
