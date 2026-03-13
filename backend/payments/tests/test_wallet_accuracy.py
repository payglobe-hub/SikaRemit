"""
Wallet Balance Accuracy Tests.

Tests wallet balance operations: add, deduct, overdraft protection,
multi-currency, transfers between wallets, and P2P transfers.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal

from payments.models.currency import Currency, WalletBalance
from users.models import Customer
from shared.constants import USER_TYPE_CUSTOMER

User = get_user_model()


class WalletBalanceModelTests(TestCase):
    """Test WalletBalance model operations directly."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='walletuser', email='wallet@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )
        self.customer = Customer.objects.get(user=self.user)
        self.currency = Currency.objects.create(
            code='GHS', name='Ghana Cedi', symbol='GH₵',
            decimal_places=2, is_active=True
        )
        self.wallet = WalletBalance.objects.create(
            user=self.user, currency=self.currency,
            available_balance=Decimal('1000.00'),
            pending_balance=Decimal('200.00'),
            reserved_balance=Decimal('50.00')
        )

    def test_initial_balances(self):
        self.assertEqual(self.wallet.available_balance, Decimal('1000.00'))
        self.assertEqual(self.wallet.pending_balance, Decimal('200.00'))
        self.assertEqual(self.wallet.reserved_balance, Decimal('50.00'))

    def test_total_balance_property(self):
        expected_total = Decimal('1000.00') + Decimal('200.00') + Decimal('50.00')
        self.assertEqual(self.wallet.total_balance, expected_total)

    def test_add_available_balance(self):
        self.wallet.add_balance(Decimal('500.00'), 'available')
        self.assertEqual(self.wallet.available_balance, Decimal('1500.00'))

    def test_add_pending_balance(self):
        self.wallet.add_balance(Decimal('100.00'), 'pending')
        self.assertEqual(self.wallet.pending_balance, Decimal('300.00'))

    def test_add_reserved_balance(self):
        self.wallet.add_balance(Decimal('25.00'), 'reserved')
        self.assertEqual(self.wallet.reserved_balance, Decimal('75.00'))

    def test_deduct_available_balance_success(self):
        result = self.wallet.deduct_balance(Decimal('300.00'), 'available')
        self.assertTrue(result)
        self.assertEqual(self.wallet.available_balance, Decimal('700.00'))

    def test_deduct_exact_available_balance(self):
        result = self.wallet.deduct_balance(Decimal('1000.00'), 'available')
        self.assertTrue(result)
        self.assertEqual(self.wallet.available_balance, Decimal('0.00'))

    def test_deduct_available_balance_insufficient_funds(self):
        result = self.wallet.deduct_balance(Decimal('1500.00'), 'available')
        self.assertFalse(result)
        self.assertEqual(self.wallet.available_balance, Decimal('1000.00'))

    def test_deduct_pending_balance_success(self):
        result = self.wallet.deduct_balance(Decimal('100.00'), 'pending')
        self.assertTrue(result)
        self.assertEqual(self.wallet.pending_balance, Decimal('100.00'))

    def test_deduct_pending_balance_insufficient(self):
        result = self.wallet.deduct_balance(Decimal('300.00'), 'pending')
        self.assertFalse(result)
        self.assertEqual(self.wallet.pending_balance, Decimal('200.00'))

    def test_deduct_reserved_balance_success(self):
        result = self.wallet.deduct_balance(Decimal('50.00'), 'reserved')
        self.assertTrue(result)
        self.assertEqual(self.wallet.reserved_balance, Decimal('0.00'))

    def test_deduct_reserved_balance_insufficient(self):
        result = self.wallet.deduct_balance(Decimal('100.00'), 'reserved')
        self.assertFalse(result)
        self.assertEqual(self.wallet.reserved_balance, Decimal('50.00'))

    def test_balance_persists_after_refresh(self):
        self.wallet.add_balance(Decimal('100.00'), 'available')
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.available_balance, Decimal('1100.00'))

    def test_unique_user_currency_constraint(self):
        with self.assertRaises(Exception):
            WalletBalance.objects.create(
                user=self.user, currency=self.currency,
                available_balance=Decimal('500.00')
            )

    def test_zero_deduction_succeeds(self):
        result = self.wallet.deduct_balance(Decimal('0.00'), 'available')
        self.assertTrue(result)
        self.assertEqual(self.wallet.available_balance, Decimal('1000.00'))


class MultiCurrencyWalletTests(TestCase):
    """Test multi-currency wallet operations."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='multicurrency', email='multi@test.com',
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
        self.eur = Currency.objects.create(
            code='EUR', name='Euro', symbol='€',
            decimal_places=2, is_active=True
        )

    def test_user_can_have_multiple_currency_wallets(self):
        WalletBalance.objects.create(
            user=self.user, currency=self.ghs,
            available_balance=Decimal('1000.00')
        )
        WalletBalance.objects.create(
            user=self.user, currency=self.usd,
            available_balance=Decimal('500.00')
        )
        WalletBalance.objects.create(
            user=self.user, currency=self.eur,
            available_balance=Decimal('300.00')
        )
        wallets = WalletBalance.objects.filter(user=self.user)
        self.assertEqual(wallets.count(), 3)

    def test_deducting_one_currency_doesnt_affect_others(self):
        ghs_wallet = WalletBalance.objects.create(
            user=self.user, currency=self.ghs,
            available_balance=Decimal('1000.00')
        )
        usd_wallet = WalletBalance.objects.create(
            user=self.user, currency=self.usd,
            available_balance=Decimal('500.00')
        )
        ghs_wallet.deduct_balance(Decimal('200.00'), 'available')

        usd_wallet.refresh_from_db()
        self.assertEqual(usd_wallet.available_balance, Decimal('500.00'))
        self.assertEqual(ghs_wallet.available_balance, Decimal('800.00'))

    def test_total_balance_per_currency_independent(self):
        ghs_wallet = WalletBalance.objects.create(
            user=self.user, currency=self.ghs,
            available_balance=Decimal('1000.00'),
            pending_balance=Decimal('100.00'),
            reserved_balance=Decimal('50.00')
        )
        usd_wallet = WalletBalance.objects.create(
            user=self.user, currency=self.usd,
            available_balance=Decimal('500.00'),
            pending_balance=Decimal('0.00'),
            reserved_balance=Decimal('0.00')
        )
        self.assertEqual(ghs_wallet.total_balance, Decimal('1150.00'))
        self.assertEqual(usd_wallet.total_balance, Decimal('500.00'))


class WalletTransferTests(TestCase):
    """Test wallet-to-wallet transfers between users."""

    def setUp(self):
        self.sender = User.objects.create_user(
            username='sender', email='sender@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )
        self.recipient = User.objects.create_user(
            username='recipient', email='recipient@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )
        # Profiles auto-created by signal
        self.sender_customer = Customer.objects.get(user=self.sender)
        self.recipient_customer = Customer.objects.get(user=self.recipient)
        self.currency = Currency.objects.create(
            code='GHS', name='Ghana Cedi', symbol='GH₵',
            decimal_places=2, is_active=True
        )
        self.sender_wallet = WalletBalance.objects.create(
            user=self.sender, currency=self.currency,
            available_balance=Decimal('1000.00')
        )
        self.recipient_wallet = WalletBalance.objects.create(
            user=self.recipient, currency=self.currency,
            available_balance=Decimal('200.00')
        )

    def test_transfer_deducts_from_sender(self):
        self.sender_wallet.deduct_balance(Decimal('300.00'), 'available')
        self.assertEqual(self.sender_wallet.available_balance, Decimal('700.00'))

    def test_transfer_credits_recipient(self):
        self.recipient_wallet.add_balance(Decimal('300.00'), 'available')
        self.assertEqual(self.recipient_wallet.available_balance, Decimal('500.00'))

    def test_transfer_preserves_total_money(self):
        """Total money in system should remain constant after transfer."""
        total_before = self.sender_wallet.available_balance + self.recipient_wallet.available_balance
        amount = Decimal('300.00')
        self.sender_wallet.deduct_balance(amount, 'available')
        self.recipient_wallet.add_balance(amount, 'available')
        total_after = self.sender_wallet.available_balance + self.recipient_wallet.available_balance
        self.assertEqual(total_before, total_after)

    def test_overdraft_protection_on_transfer(self):
        result = self.sender_wallet.deduct_balance(Decimal('1500.00'), 'available')
        self.assertFalse(result)
        self.assertEqual(self.sender_wallet.available_balance, Decimal('1000.00'))

    def test_multiple_sequential_transfers(self):
        for _ in range(5):
            self.sender_wallet.deduct_balance(Decimal('100.00'), 'available')
            self.recipient_wallet.add_balance(Decimal('100.00'), 'available')
        self.assertEqual(self.sender_wallet.available_balance, Decimal('500.00'))
        self.assertEqual(self.recipient_wallet.available_balance, Decimal('700.00'))
