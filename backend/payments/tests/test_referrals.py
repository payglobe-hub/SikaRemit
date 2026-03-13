"""
Referral System Tests.

Tests referral code generation, referral tracking,
qualification criteria, success rates, and status transitions.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

from payments.models.referrals import ReferralCode, Referral
from shared.constants import USER_TYPE_CUSTOMER

User = get_user_model()


class ReferralCodeTests(TestCase):
    """Test referral code creation and usage tracking."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='referrer', email='referrer@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )

    def test_create_referral_code(self):
        code = ReferralCode.objects.create(user=self.user)
        self.assertIsNotNone(code.code)
        self.assertTrue(len(code.code) > 0)
        self.assertTrue(code.is_active)
        self.assertEqual(code.total_uses, 0)

    def test_auto_generates_unique_code(self):
        code = ReferralCode.objects.create(user=self.user)
        self.assertEqual(len(code.code), 8)

    def test_custom_code(self):
        code = ReferralCode.objects.create(
            user=self.user, code='MYCODE01'
        )
        self.assertEqual(code.code, 'MYCODE01')

    def test_one_code_per_user(self):
        ReferralCode.objects.create(user=self.user)
        with self.assertRaises(Exception):
            ReferralCode.objects.create(user=self.user)

    def test_increment_uses(self):
        code = ReferralCode.objects.create(user=self.user)
        code.increment_uses()
        code.refresh_from_db()
        self.assertEqual(code.total_uses, 1)

    def test_increment_successful_referrals(self):
        code = ReferralCode.objects.create(user=self.user)
        code.increment_successful_referrals()
        code.refresh_from_db()
        self.assertEqual(code.successful_referrals, 1)

    def test_success_rate_zero_uses(self):
        code = ReferralCode.objects.create(user=self.user)
        self.assertEqual(code.success_rate, 0)

    def test_success_rate_with_data(self):
        code = ReferralCode.objects.create(
            user=self.user, total_uses=10, successful_referrals=3
        )
        self.assertEqual(code.success_rate, 30)

    def test_unique_code_constraint(self):
        user2 = User.objects.create_user(
            username='referrer2', email='ref2@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )
        ReferralCode.objects.create(user=self.user, code='SAME1234')
        with self.assertRaises(Exception):
            ReferralCode.objects.create(user=user2, code='SAME1234')


class ReferralTests(TestCase):
    """Test referral tracking and qualification."""

    def setUp(self):
        self.referrer = User.objects.create_user(
            username='referrer', email='referrer@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )
        self.referee = User.objects.create_user(
            username='referee', email='referee@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )
        self.code = ReferralCode.objects.create(user=self.referrer)

    def test_create_referral(self):
        referral = Referral.objects.create(
            referrer=self.referrer,
            referee=self.referee,
            referral_code=self.code
        )
        self.assertEqual(referral.status, 'pending')
        self.assertFalse(referral.has_completed_kyc)
        self.assertFalse(referral.has_made_first_transaction)

    def test_referral_status_transitions(self):
        referral = Referral.objects.create(
            referrer=self.referrer,
            referee=self.referee,
            referral_code=self.code
        )
        for status in ['qualified', 'rewarded']:
            referral.status = status
            referral.save()
            referral.refresh_from_db()
            self.assertEqual(referral.status, status)

    def test_referral_qualification_tracking(self):
        referral = Referral.objects.create(
            referrer=self.referrer,
            referee=self.referee,
            referral_code=self.code
        )
        referral.has_completed_kyc = True
        referral.has_made_first_transaction = True
        referral.has_reached_transaction_threshold = True
        referral.save()
        self.assertTrue(referral.is_qualified)

    def test_referral_not_qualified_partial(self):
        referral = Referral.objects.create(
            referrer=self.referrer,
            referee=self.referee,
            referral_code=self.code,
            has_completed_kyc=True,
            has_made_first_transaction=False
        )
        self.assertFalse(referral.is_qualified)

    def test_unique_referrer_referee_pair(self):
        Referral.objects.create(
            referrer=self.referrer,
            referee=self.referee,
            referral_code=self.code
        )
        with self.assertRaises(Exception):
            Referral.objects.create(
                referrer=self.referrer,
                referee=self.referee,
                referral_code=self.code
            )

    def test_referral_sources(self):
        for source, _ in [('link', 'Referral Link'), ('code', 'Referral Code'),
                          ('social', 'Social Media'), ('email', 'Email'), ('sms', 'SMS')]:
            referee = User.objects.create_user(
                username=f'ref_{source}', email=f'{source}@test.com',
                password='testpass123', user_type=USER_TYPE_CUSTOMER
            )
            referral = Referral.objects.create(
                referrer=self.referrer,
                referee=referee,
                referral_code=self.code,
                referral_source=source
            )
            self.assertEqual(referral.referral_source, source)

    def test_expired_referral(self):
        referral = Referral.objects.create(
            referrer=self.referrer,
            referee=self.referee,
            referral_code=self.code,
            status='expired'
        )
        self.assertEqual(referral.status, 'expired')

    def test_cancelled_referral(self):
        referral = Referral.objects.create(
            referrer=self.referrer,
            referee=self.referee,
            referral_code=self.code
        )
        referral.status = 'cancelled'
        referral.save()
        referral.refresh_from_db()
        self.assertEqual(referral.status, 'cancelled')
