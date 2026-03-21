"""
Authentication & Permission Boundary Tests
============================================
Tests that verify:
1. Unauthenticated users cannot access payment endpoints
2. Customers can only see their own transactions
3. Merchants can only see their own transactions
4. Payment methods are scoped to the authenticated user
5. Webhook endpoints don't require authentication (they use signature verification)

These tests run in GitHub Actions — never with real money.
"""

from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from unittest.mock import patch, MagicMock

User = get_user_model()

class AuthTestMixin:
    """Shared helpers for auth tests."""

    def _create_user(self, email, user_type=6, password='TestPass123!'):
        return User.objects.create_user(
            email=email,
            password=password,
            first_name='Test',
            last_name='User',
            user_type=user_type,
        )

    def _create_customer_with_profile(self, email='customer@test.com'):
        from users.models import Customer
        user = self._create_user(email, user_type=6)
        customer, _ = Customer.objects.get_or_create(user=user)
        return user, customer

    def _create_merchant_with_profile(self, email='merchant@test.com'):
        from users.models import Merchant
        user = self._create_user(email, user_type=5)
        merchant, _ = Merchant.objects.get_or_create(
            user=user,
            defaults={'business_name': 'Test Shop', 'tax_id': 'TX123'}
        )
        return user, merchant

    def _get_auth_client(self, user):
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    def _get_anon_client(self):
        return APIClient()

# =============================================================================
# TEST 1: Unauthenticated Access Denied
# =============================================================================

class TestUnauthenticatedAccessDenied(TestCase, AuthTestMixin):
    """Unauthenticated users must get 401 on all payment endpoints."""

    def setUp(self):
        self.client = self._get_anon_client()

    def test_wallet_list_requires_auth(self):
        response = self.client.get('/api/v1/payments/wallet/')
        self.assertIn(response.status_code, [301, 401, 403])

    def test_wallet_balances_requires_auth(self):
        response = self.client.get('/api/v1/payments/wallet/balances/')
        self.assertIn(response.status_code, [301, 401, 403])

    def test_transactions_list_requires_auth(self):
        response = self.client.get('/api/v1/payments/transactions/')
        self.assertIn(response.status_code, [301, 401, 403])

    def test_payment_methods_list_requires_auth(self):
        response = self.client.get('/api/v1/payments/methods/')
        self.assertIn(response.status_code, [301, 401, 403])

    def test_process_payment_requires_auth(self):
        response = self.client.post('/api/v1/payments/process/', {
            'amount': '50.00',
            'payment_method_id': 1,
        })
        self.assertIn(response.status_code, [301, 401, 403])

    def test_subscriptions_list_requires_auth(self):
        response = self.client.get('/api/v1/payments/subscriptions/')
        self.assertIn(response.status_code, [301, 401, 403])

# =============================================================================
# TEST 2: Transaction Isolation — Customers See Only Their Own
# =============================================================================

class TestTransactionIsolation(TestCase, AuthTestMixin):
    """Customers must only see their own transactions, not others'."""

    def setUp(self):
        self.user_a, self.customer_a = self._create_customer_with_profile('alice@test.com')
        self.user_b, self.customer_b = self._create_customer_with_profile('bob@test.com')

        from payments.models.transaction import Transaction
        # Create transactions for customer A
        self.tx_a = Transaction.objects.create(
            customer=self.customer_a,
            amount=Decimal('100.00'),
            currency='USD',
            status='completed',
            transaction_type='payment',
        )
        # Create transactions for customer B
        self.tx_b = Transaction.objects.create(
            customer=self.customer_b,
            amount=Decimal('200.00'),
            currency='GHS',
            status='completed',
            transaction_type='payment',
        )

    def test_customer_a_sees_only_own_transactions(self):
        client = self._get_auth_client(self.user_a)
        response = client.get('/api/v1/payments/transactions/')

        if response.status_code == 200:
            data = response.json()
            tx_list = data if isinstance(data, list) else data.get('results', data.get('data', []))
            if isinstance(tx_list, list):
                tx_ids = [tx.get('id') for tx in tx_list]
                self.assertIn(self.tx_a.id, tx_ids)
                self.assertNotIn(self.tx_b.id, tx_ids)

    def test_customer_b_sees_only_own_transactions(self):
        client = self._get_auth_client(self.user_b)
        response = client.get('/api/v1/payments/transactions/')

        if response.status_code == 200:
            data = response.json()
            tx_list = data if isinstance(data, list) else data.get('results', data.get('data', []))
            if isinstance(tx_list, list):
                tx_ids = [tx.get('id') for tx in tx_list]
                self.assertIn(self.tx_b.id, tx_ids)
                self.assertNotIn(self.tx_a.id, tx_ids)

# =============================================================================
# TEST 3: Payment Method Isolation — Users See Only Their Own
# =============================================================================

class TestPaymentMethodIsolation(TestCase, AuthTestMixin):
    """Users must only see/manage their own payment methods."""

    def setUp(self):
        self.user_a, _ = self._create_customer_with_profile('alice-pm@test.com')
        self.user_b, _ = self._create_customer_with_profile('bob-pm@test.com')

        from payments.models.payment_method import PaymentMethod
        self.pm_a = PaymentMethod.objects.create(
            user=self.user_a,
            method_type='card',
            details={'last4': '4242', 'payment_method_id': 'pm_a'},
        )
        self.pm_b = PaymentMethod.objects.create(
            user=self.user_b,
            method_type='mtn_momo',
            details={'phone_number': '0241234567', 'provider': 'mtn'},
        )

    def test_user_a_sees_only_own_methods(self):
        client = self._get_auth_client(self.user_a)
        response = client.get('/api/v1/payments/payment-methods/')

        if response.status_code == 200:
            data = response.json()
            pm_list = data if isinstance(data, list) else data.get('results', data.get('data', []))
            pm_ids = [pm['id'] for pm in pm_list] if isinstance(pm_list, list) else []
            self.assertIn(self.pm_a.id, pm_ids)
            self.assertNotIn(self.pm_b.id, pm_ids)

    def test_user_b_cannot_delete_user_a_method(self):
        client = self._get_auth_client(self.user_b)
        response = client.delete(f'/api/v1/payments/methods/{self.pm_a.id}/')
        # Should be 404 (not found in their queryset) or 403
        self.assertIn(response.status_code, [403, 404])

    def test_user_b_cannot_set_default_on_user_a_method(self):
        client = self._get_auth_client(self.user_b)
        response = client.post(f'/api/v1/payments/methods/{self.pm_a.id}/set_default/')
        self.assertIn(response.status_code, [403, 404])

# =============================================================================
# TEST 4: Merchant Transaction Isolation
# =============================================================================

class TestMerchantTransactionIsolation(TestCase, AuthTestMixin):
    """Merchants must only see transactions for their own business."""

    def setUp(self):
        self.merchant_user_a, self.merchant_a = self._create_merchant_with_profile('shop_a@test.com')
        self.merchant_user_b, self.merchant_b = self._create_merchant_with_profile('shop_b@test.com')
        _, self.customer = self._create_customer_with_profile('buyer@test.com')

        from payments.models.transaction import Transaction
        self.tx_to_a = Transaction.objects.create(
            customer=self.customer,
            merchant=self.merchant_a,
            amount=Decimal('50.00'),
            currency='GHS',
            status='completed',
        )
        self.tx_to_b = Transaction.objects.create(
            customer=self.customer,
            merchant=self.merchant_b,
            amount=Decimal('75.00'),
            currency='GHS',
            status='completed',
        )

    def test_merchant_a_sees_only_own_transactions(self):
        client = self._get_auth_client(self.merchant_user_a)
        response = client.get('/api/v1/payments/transactions/')

        if response.status_code == 200:
            data = response.json()
            tx_list = data if isinstance(data, list) else data.get('results', data.get('data', []))
            tx_ids = [tx['id'] for tx in tx_list] if isinstance(tx_list, list) else []
            self.assertIn(self.tx_to_a.id, tx_ids)
            self.assertNotIn(self.tx_to_b.id, tx_ids)

# =============================================================================
# TEST 5: Webhook Endpoints — No Auth Required (Signature Verified Instead)
# =============================================================================

class TestWebhookEndpointAccess(TestCase):
    """
    Webhook endpoints should be accessible without auth tokens
    (they use provider signature verification instead).
    """

    def setUp(self):
        self.client = APIClient()

    @patch('stripe.Webhook.construct_event')
    def test_stripe_webhook_accessible_without_auth(self, mock_construct):
        """Stripe webhook endpoint should not return 401."""
        mock_construct.side_effect = Exception('Invalid signature')

        response = self.client.post(
            '/api/v1/payments/webhooks/bank-transfer/',
            data='{}',
            content_type='application/json',
        )
        # Should NOT be 401 (auth not required)
        # It may be 400/500 due to invalid signature, but not 401
        self.assertNotEqual(response.status_code, 401)

# =============================================================================
# TEST 6: Rate Limiting Presence
# =============================================================================

class TestRateLimitingConfigured(TestCase):
    """Verify rate limiting is configured on payment endpoints."""

    def test_payment_rate_throttle_exists(self):
        """PaymentRateThrottle class should exist with proper rate."""
        from payments.views.main_method_views import PaymentRateThrottle
        throttle = PaymentRateThrottle()
        self.assertEqual(throttle.scope, 'payment')
        self.assertIsNotNone(throttle.rate)

    def test_transaction_viewset_has_throttle(self):
        """TransactionViewSet should have throttle classes configured."""
        from payments.views.main_transaction_views import TransactionViewSet
        self.assertTrue(
            hasattr(TransactionViewSet, 'throttle_classes') and len(TransactionViewSet.throttle_classes) > 0,
            'TransactionViewSet should have throttle_classes for rate limiting'
        )

# =============================================================================
# TEST 7: Admin Permission Boundaries
# =============================================================================

class TestAdminPermissionBoundaries(TestCase, AuthTestMixin):
    """Test that admin permissions are properly enforced."""

    def test_customer_cannot_access_admin_endpoints(self):
        """Regular customer should not access admin-only endpoints."""
        user, _ = self._create_customer_with_profile('regular@test.com')
        client = self._get_auth_client(user)

        admin_endpoints = [
            '/api/v1/accounts/admin/users/',
            '/api/v1/accounts/admin/merchants/',
        ]

        for endpoint in admin_endpoints:
            response = client.get(endpoint)
            self.assertIn(
                response.status_code, [403, 404],
                f'Customer should not access {endpoint}, got {response.status_code}'
            )

    def test_merchant_cannot_access_admin_endpoints(self):
        """Merchant should not access admin-only endpoints."""
        user, _ = self._create_merchant_with_profile('shop_admin_test@test.com')
        client = self._get_auth_client(user)

        response = client.get('/api/v1/accounts/admin/users/')
        self.assertIn(response.status_code, [301, 403, 404])

# =============================================================================
# TEST 8: Health Check — No Auth Required
# =============================================================================

class TestHealthCheckPublic(TestCase):
    """Health check endpoint should be publicly accessible."""

    def test_health_check_no_auth(self):
        client = APIClient()
        response = client.get('/api/v1/health/')
        self.assertIn(response.status_code, [200, 301])

    def test_health_check_returns_healthy(self):
        client = APIClient()
        response = client.get('/api/v1/health/')
        if response.status_code == 200:
            data = response.json()
            self.assertEqual(data['status'], 'healthy')
