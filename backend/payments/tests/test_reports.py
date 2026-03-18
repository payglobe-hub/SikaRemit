"""
Reports & Statements Tests.

Tests analytics model creation, wallet balance reporting accuracy,
and currency model integrity used in financial statements.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal

from payments.models.currency import Currency, WalletBalance
from users.models import Customer
from shared.constants import USER_TYPE_CUSTOMER, USER_TYPE_MERCHANT

User = get_user_model()

class WalletReportingTests(TestCase):
    """Test wallet balance accuracy for reporting/statements."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='reportuser', email='report@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )
        self.customer = Customer.objects.get(user=self.user)
        self.ghs = Currency.objects.create(
            code='GHS', name='Ghana Cedi', symbol='GH₵',
            decimal_places=2, is_active=True
        )
        self.usd = Currency.objects.create(
            code='USD', name='US Dollar', symbol='$',
            decimal_places=2, is_active=True
        )

    def test_single_currency_balance_report(self):
        wallet = WalletBalance.objects.create(
            user=self.user, currency=self.ghs,
            available_balance=Decimal('5000.00'),
            pending_balance=Decimal('200.00'),
            reserved_balance=Decimal('100.00')
        )
        self.assertEqual(wallet.total_balance, Decimal('5300.00'))

    def test_multi_currency_balances_report(self):
        WalletBalance.objects.create(
            user=self.user, currency=self.ghs,
            available_balance=Decimal('5000.00')
        )
        WalletBalance.objects.create(
            user=self.user, currency=self.usd,
            available_balance=Decimal('500.00')
        )
        wallets = WalletBalance.objects.filter(user=self.user)
        self.assertEqual(wallets.count(), 2)
        ghs_wallet = wallets.get(currency=self.ghs)
        usd_wallet = wallets.get(currency=self.usd)
        self.assertEqual(ghs_wallet.available_balance, Decimal('5000.00'))
        self.assertEqual(usd_wallet.available_balance, Decimal('500.00'))

    def test_balance_after_operations_matches_report(self):
        wallet = WalletBalance.objects.create(
            user=self.user, currency=self.ghs,
            available_balance=Decimal('1000.00')
        )
        wallet.add_balance(Decimal('500.00'), 'available')
        wallet.deduct_balance(Decimal('200.00'), 'available')
        wallet.add_balance(Decimal('100.00'), 'pending')
        wallet.refresh_from_db()
        self.assertEqual(wallet.available_balance, Decimal('1300.00'))
        self.assertEqual(wallet.pending_balance, Decimal('100.00'))
        self.assertEqual(wallet.total_balance, Decimal('1400.00'))

    def test_zero_balance_report(self):
        wallet = WalletBalance.objects.create(
            user=self.user, currency=self.ghs,
            available_balance=Decimal('0'),
            pending_balance=Decimal('0'),
            reserved_balance=Decimal('0')
        )
        self.assertEqual(wallet.total_balance, Decimal('0'))

    def test_balance_precision(self):
        wallet = WalletBalance.objects.create(
            user=self.user, currency=self.ghs,
            available_balance=Decimal('1234.567890')
        )
        wallet.refresh_from_db()
        self.assertEqual(wallet.available_balance, Decimal('1234.567890'))

class CurrencyReportTests(TestCase):
    """Test currency model for accurate financial reporting."""

    def test_active_currencies_list(self):
        Currency.objects.create(code='GHS', name='Ghana Cedi', symbol='GH₵', is_active=True)
        Currency.objects.create(code='USD', name='US Dollar', symbol='$', is_active=True)
        Currency.objects.create(code='XOF', name='CFA Franc', symbol='CFA', is_active=False)
        active = Currency.objects.filter(is_active=True)
        self.assertEqual(active.count(), 2)

    def test_currency_uniqueness(self):
        Currency.objects.create(code='GHS', name='Ghana Cedi', symbol='GH₵')
        with self.assertRaises(Exception):
            Currency.objects.create(code='GHS', name='Duplicate', symbol='X')

    def test_currency_decimal_places(self):
        ghs = Currency.objects.create(code='GHS', name='Ghana Cedi', symbol='GH₵', decimal_places=2)
        self.assertEqual(ghs.decimal_places, 2)

class MultiUserBalanceReportTests(TestCase):
    """Test balance reporting across multiple users."""

    def setUp(self):
        self.ghs = Currency.objects.create(
            code='GHS', name='Ghana Cedi', symbol='GH₵',
            decimal_places=2, is_active=True
        )

    def test_total_platform_balance(self):
        users = []
        for i in range(5):
            user = User.objects.create_user(
                username=f'rptuser{i}', email=f'rpt{i}@test.com',
                password='testpass123', user_type=USER_TYPE_CUSTOMER
            )
            WalletBalance.objects.create(
                user=user, currency=self.ghs,
                available_balance=Decimal('1000.00')
            )
            users.append(user)
        total = sum(
            wb.available_balance
            for wb in WalletBalance.objects.filter(currency=self.ghs)
        )
        self.assertEqual(total, Decimal('5000.00'))

    def test_individual_balances_independent(self):
        user1 = User.objects.create_user(
            username='indep1', email='indep1@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )
        user2 = User.objects.create_user(
            username='indep2', email='indep2@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )
        w1 = WalletBalance.objects.create(
            user=user1, currency=self.ghs,
            available_balance=Decimal('1000.00')
        )
        w2 = WalletBalance.objects.create(
            user=user2, currency=self.ghs,
            available_balance=Decimal('2000.00')
        )
        w1.deduct_balance(Decimal('500.00'), 'available')
        w2.refresh_from_db()
        self.assertEqual(w1.available_balance, Decimal('500.00'))
        self.assertEqual(w2.available_balance, Decimal('2000.00'))
