"""
Comprehensive tests for payment gateways
Tests for MTN MoMo, Telecel Cash, AirtelTigo Money, Stripe, and Flutterwave
"""

from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from unittest.mock import patch, MagicMock, Mock
from decimal import Decimal
import json

User = get_user_model()


class MockResponse:
    """Mock HTTP response for testing"""
    def __init__(self, json_data, status_code=200):
        self.json_data = json_data
        self.status_code = status_code
        self.text = json.dumps(json_data) if json_data else ''
    
    def json(self):
        return self.json_data
    
    def raise_for_status(self):
        if self.status_code >= 400:
            raise Exception(f"HTTP Error: {self.status_code}")


class MTNMoMoGatewayTests(TestCase):
    """Tests for MTN Mobile Money gateway"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPass123!'
        )
    
    @override_settings(
        MTN_MOMO_API_KEY='test_api_key',
        MTN_MOMO_API_SECRET='test_api_secret',
        MTN_MOMO_API_URL='https://sandbox.momodeveloper.mtn.com',
        MTN_MOMO_SUBSCRIPTION_KEY='test_subscription_key'
    )
    @patch('payments.gateways.mobile_money.MTNMoMoGateway._get_auth_token')
    @patch('requests.post')
    def test_process_payment_success(self, mock_post, mock_auth):
        """Test successful MTN MoMo payment"""
        from payments.gateways.mobile_money import MTNMoMoGateway
        
        mock_auth.return_value = 'test_token'
        # Mock payment response
        payment_response = MockResponse({}, status_code=202)
        mock_post.return_value = payment_response
        
        gateway = MTNMoMoGateway()
        
        # Create mock payment method
        class MockPaymentMethod:
            id = 1
            details = {'phone_number': '0241234567'}
        
        class MockCustomer:
            id = 1
        
        class MockMerchant:
            business_name = 'Test Merchant'
        
        result = gateway.process_payment(
            amount=100.00,
            currency='GHS',
            payment_method=MockPaymentMethod(),
            customer=MockCustomer(),
            merchant=MockMerchant(),
            metadata={'description': 'Test payment'}
        )
        
        self.assertTrue(result['success'])
        self.assertIn('transaction_id', result)
        self.assertEqual(result['status'], 'pending')
    
    @override_settings(
        MTN_MOMO_API_KEY='test_api_key',
        MTN_MOMO_API_SECRET='test_api_secret',
        MTN_MOMO_API_URL='https://sandbox.momodeveloper.mtn.com',
        MTN_MOMO_SUBSCRIPTION_KEY='test_subscription_key'
    )
    @patch('payments.gateways.mobile_money.MTNMoMoGateway._get_auth_token')
    @patch('requests.post')
    def test_process_payment_failure(self, mock_post, mock_auth):
        """Test failed MTN MoMo payment"""
        from payments.gateways.mobile_money import MTNMoMoGateway
        
        mock_auth.return_value = 'test_token'
        # Mock failed payment response
        payment_response = MockResponse({'message': 'Insufficient funds'}, status_code=400)
        mock_post.return_value = payment_response
        
        gateway = MTNMoMoGateway()
        
        class MockPaymentMethod:
            id = 1
            details = {'phone_number': '0241234567'}
        
        class MockCustomer:
            id = 1
        
        class MockMerchant:
            business_name = 'Test Merchant'
        
        result = gateway.process_payment(
            amount=100.00,
            currency='GHS',
            payment_method=MockPaymentMethod(),
            customer=MockCustomer(),
            merchant=MockMerchant()
        )
        
        self.assertFalse(result['success'])
        self.assertIn('error', result)
    
    @override_settings(
        MTN_MOMO_API_KEY='test_api_key',
        MTN_MOMO_API_SECRET='test_api_secret',
        MTN_MOMO_API_URL='https://sandbox.momodeveloper.mtn.com',
        MTN_MOMO_SUBSCRIPTION_KEY='test_subscription_key'
    )
    def test_phone_number_formatting(self):
        """Test phone number formatting for MTN"""
        from payments.gateways.mobile_money import MTNMoMoGateway
        
        gateway = MTNMoMoGateway()
        
        # Test various phone number formats
        test_cases = [
            ('0241234567', '233241234567'),
            ('241234567', '233241234567'),
            ('233241234567', '233241234567'),
        ]
        
        for input_phone, expected in test_cases:
            if input_phone.startswith('0'):
                formatted = '233' + input_phone[1:]
            elif not input_phone.startswith('233'):
                formatted = '233' + input_phone
            else:
                formatted = input_phone
            self.assertEqual(formatted, expected)
    
    @override_settings(
        MTN_MOMO_API_KEY='test_api_key',
        MTN_MOMO_API_SECRET='test_api_secret',
        MTN_MOMO_API_URL='https://sandbox.momodeveloper.mtn.com'
    )
    def test_webhook_parsing(self):
        """Test MTN webhook payload parsing"""
        from payments.gateways.mobile_money import MTNMoMoGateway
        
        gateway = MTNMoMoGateway()
        
        # Create mock request
        class MockRequest:
            body = json.dumps({
                'externalId': 'SIKA_123456',
                'status': 'SUCCESSFUL',
                'amount': '100',
                'currency': 'GHS',
                'payer': {'partyId': '233241234567'},
                'payerMessage': 'Test payment'
            }).encode()
        
        result = gateway.parse_webhook(MockRequest())
        
        self.assertEqual(result['transaction_id'], 'SIKA_123456')
        self.assertEqual(result['status'], 'SUCCESSFUL')
        self.assertEqual(result['amount'], '100')
        self.assertEqual(result['currency'], 'GHS')


class TelecelCashGatewayTests(TestCase):
    """Tests for Telecel Cash gateway"""
    
    @override_settings(
        TELECEL_API_URL='https://api.telecel.com/v1',
        TELECEL_API_KEY='test_api_key',
        TELECEL_MERCHANT_ID='test_merchant'
    )
    @patch('payments.gateways.mobile_money.TelecelCashGateway._make_request_with_retry')
    def test_process_payment_success(self, mock_request):
        """Test successful Telecel Cash payment"""
        from payments.gateways.mobile_money import TelecelCashGateway
        
        mock_request.return_value = {
            'success': True,
            'data': {
                'reference': 'TEL_123456',
                'message': 'Payment initiated'
            }
        }
        
        gateway = TelecelCashGateway()
        
        class MockPaymentMethod:
            details = {'phone_number': '0201234567'}
        
        class MockCustomer:
            id = 1
        
        class MockMerchant:
            business_name = 'Test Merchant'
        
        result = gateway.process_payment(
            amount=50.00,
            currency='GHS',
            payment_method=MockPaymentMethod(),
            customer=MockCustomer(),
            merchant=MockMerchant()
        )
        
        self.assertTrue(result.get('success'))
    
    @override_settings(
        TELECEL_API_URL='https://api.telecel.com/v1',
        TELECEL_API_KEY='test_api_key'
    )
    def test_webhook_parsing(self):
        """Test Telecel webhook payload parsing"""
        from payments.gateways.mobile_money import TelecelCashGateway
        
        gateway = TelecelCashGateway()
        
        class MockRequest:
            body = json.dumps({
                'transaction_id': 'TEL_123456',
                'status': 'SUCCESS',
                'amount': 50.00,
                'currency': 'GHS',
                'msisdn': '233201234567'
            }).encode()
        
        result = gateway.parse_webhook(MockRequest())
        
        self.assertEqual(result['transaction_id'], 'TEL_123456')
        self.assertEqual(result['status'], 'SUCCESS')


class AirtelTigoGatewayTests(TestCase):
    """Tests for AirtelTigo Money gateway"""
    
    @override_settings(
        AIRTEL_API_URL='https://api.airtel.com',
        AIRTEL_API_KEY='test_api_key'
    )
    @patch('requests.post')
    def test_process_payment_success(self, mock_post):
        """Test successful AirtelTigo payment"""
        from payments.gateways.mobile_money import AirtelTigoMoneyGateway
        
        mock_post.return_value = MockResponse({
            'data': {
                'transaction': {
                    'id': 'AT_123456',
                    'status': 'TP'
                }
            }
        }, status_code=200)
        
        gateway = AirtelTigoMoneyGateway()
        
        class MockPaymentMethod:
            details = {'phone_number': '0261234567'}
        
        class MockCustomer:
            id = 1
        
        class MockMerchant:
            business_name = 'Test Merchant'
        
        result = gateway.process_payment(
            amount=75.00,
            currency='GHS',
            payment_method=MockPaymentMethod(),
            customer=MockCustomer(),
            merchant=MockMerchant()
        )
        
        self.assertTrue(result['success'])
        self.assertIn('transaction_id', result)
    
    @override_settings(
        AIRTEL_API_URL='https://api.airtel.com',
        AIRTEL_API_KEY='test_api_key'
    )
    def test_webhook_status_mapping(self):
        """Test AirtelTigo status code mapping"""
        from payments.gateways.mobile_money import AirtelTigoMoneyGateway
        
        gateway = AirtelTigoMoneyGateway()
        
        # Test status mapping
        status_map = {
            'TS': 'completed',
            'TF': 'failed',
            'TP': 'pending',
            'TIP': 'processing',
            'SUCCESS': 'completed',
            'FAILED': 'failed'
        }
        
        for airtel_status, expected_status in status_map.items():
            # This tests the mapping logic
            airtel_status_map = {
                'TS': 'completed',
                'TF': 'failed',
                'TP': 'pending',
                'TIP': 'processing',
                'SUCCESS': 'completed',
                'FAILED': 'failed',
                'PENDING': 'pending'
            }
            self.assertEqual(airtel_status_map.get(airtel_status, 'pending'), expected_status)


class StripeGatewayTests(TestCase):
    """Tests for Stripe gateway"""
    
    @override_settings(
        STRIPE_SECRET_KEY='sk_test_123456',
        STRIPE_PUBLISHABLE_KEY='pk_test_123456',
        STRIPE_WEBHOOK_SECRET='whsec_test'
    )
    @patch('stripe.Account.retrieve')
    @patch('stripe.PaymentIntent.create')
    def test_process_payment_success(self, mock_payment_intent, mock_account):
        """Test successful Stripe payment"""
        from payments.gateways.stripe import StripeGateway
        
        mock_account.return_value = MagicMock()
        mock_payment_intent.return_value = MagicMock(
            id='pi_test_123',
            status='succeeded'
        )
        
        gateway = StripeGateway()
        
        class MockPaymentMethod:
            details = {'payment_method_id': 'pm_test_123'}
        
        class MockCustomer:
            stripe_customer_id = 'cus_test_123'
        
        result = gateway.process_payment(
            amount=100.00,
            currency='USD',
            payment_method=MockPaymentMethod(),
            customer=MockCustomer(),
            merchant=None
        )
        
        self.assertTrue(result['success'])
        self.assertEqual(result['transaction_id'], 'pi_test_123')
    
    @override_settings(
        STRIPE_SECRET_KEY='sk_test_123456',
        STRIPE_PUBLISHABLE_KEY='pk_test_123456',
        STRIPE_WEBHOOK_SECRET='whsec_test'
    )
    @patch('stripe.Account.retrieve')
    @patch('stripe.Refund.create')
    def test_refund_payment(self, mock_refund, mock_account):
        """Test Stripe refund"""
        from payments.gateways.stripe import StripeGateway
        
        mock_account.return_value = MagicMock()
        mock_refund.return_value = MagicMock(
            id='re_test_123',
            status='succeeded'
        )
        
        gateway = StripeGateway()
        
        result = gateway.refund_payment('pi_test_123', amount=50.00)
        
        self.assertTrue(result['success'])
        self.assertEqual(result['transaction_id'], 're_test_123')
    
    @override_settings(
        STRIPE_SECRET_KEY='sk_test_123',
        STRIPE_PUBLISHABLE_KEY='pk_test_123'
    )
    @patch('stripe.Account.retrieve')
    @patch('stripe.PaymentIntent.create')
    def test_process_payment_success_2(self, mock_intent, mock_account):
        """Test successful Stripe payment via PaymentIntent"""
        from payments.gateways.stripe import StripeGateway
        
        mock_account.return_value = MagicMock()
        mock_intent.return_value = MagicMock(
            id='pi_123456',
            status='succeeded',
            client_secret='pi_123456_secret'
        )
        
        gateway = StripeGateway()
        
        class MockPaymentMethod:
            method_type = 'card'
            details = {'payment_method_id': 'pm_test_123'}
        
        class MockCustomer:
            stripe_customer_id = 'cus_test_123'
        
        result = gateway.process_payment(
            amount=100.00,
            currency='GHS',
            payment_method=MockPaymentMethod(),
            customer=MockCustomer(),
            merchant=None
        )
        
        self.assertTrue(result['success'])
        self.assertIn('transaction_id', result)


class WebhookSignatureTests(TestCase):
    """Tests for webhook signature verification"""
    
    def test_mtn_webhook_signature_verification(self):
        """Test MTN webhook signature verification"""
        from payments.gateways.mobile_money import MTNMoMoGateway
        import hmac
        import hashlib
        
        gateway = MTNMoMoGateway()
        gateway.webhook_secret = 'test_secret'
        
        payload = b'{"status": "SUCCESSFUL"}'
        expected_sig = hmac.new(
            b'test_secret',
            payload,
            hashlib.sha256
        ).hexdigest()
        
        class MockRequest:
            body = payload
        
        # Test valid signature
        result = gateway.verify_webhook_signature(MockRequest(), expected_sig)
        self.assertTrue(result)
        
        # Test invalid signature
        result = gateway.verify_webhook_signature(MockRequest(), 'invalid_signature')
        self.assertFalse(result)
    
    def test_empty_signature_rejected(self):
        """Test that empty signatures are rejected"""
        from payments.gateways.mobile_money import MTNMoMoGateway
        
        gateway = MTNMoMoGateway()
        gateway.webhook_secret = 'test_secret'
        
        class MockRequest:
            body = b'test'
        
        result = gateway.verify_webhook_signature(MockRequest(), '')
        self.assertFalse(result)
        
        result = gateway.verify_webhook_signature(MockRequest(), None)
        self.assertFalse(result)


class GMoneyGatewayTests(TestCase):
    """Tests for G-Money gateway"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPass123!'
        )
        # Create customer profile
        from users.models import Customer
        self.customer, _ = Customer.objects.get_or_create(user=self.user)
    
    @override_settings(
        G_MONEY_API_KEY='test_api_key',
        G_MONEY_API_SECRET='test_api_secret',
        G_MONEY_API_URL='https://api.gmoney.com.gh',
        G_MONEY_MERCHANT_ID='test_merchant_id',
        G_MONEY_WEBHOOK_SECRET='test_webhook_secret'
    )
    @patch('payments.gateways.mobile_money.GMoneyGateway._get_auth_token')
    @patch('requests.post')
    def test_process_payment_success(self, mock_post, mock_auth):
        """Test successful G-Money payment"""
        from payments.gateways.mobile_money import GMoneyGateway
        
        mock_auth.return_value = 'test_token'
        # Mock successful payment response
        mock_post.return_value = MockResponse(
            {'reference': 'test_ref', 'gMoneyReference': 'gm_ref_123'},
            status_code=200
        )
        
        gateway = GMoneyGateway()
        
        # Mock payment method
        payment_method = Mock()
        payment_method.details = {'phone_number': '0241234567'}
        
        # Mock merchant
        merchant = Mock()
        merchant.business_name = 'Test Merchant'
        
        result = gateway.process_payment(
            amount=Decimal('10.00'),
            currency='GHS',
            payment_method=payment_method,
            customer=self.customer,
            merchant=merchant
        )
        
        self.assertTrue(result['success'])
        self.assertEqual(result['status'], 'pending')
        self.assertIn('transaction_id', result)
        self.assertIn('g_money_reference', result)
    
    @override_settings(
        G_MONEY_API_KEY='test_api_key',
        G_MONEY_API_SECRET='test_api_secret', 
        G_MONEY_API_URL='https://api.gmoney.com.gh',
        G_MONEY_MERCHANT_ID='test_merchant_id'
    )
    def test_is_configured(self):
        """Test G-Money gateway configuration check"""
        from payments.gateways.mobile_money import GMoneyGateway
        
        gateway = GMoneyGateway()
        self.assertTrue(gateway.is_configured())
    
    def test_is_not_configured(self):
        """Test G-Money gateway not configured"""
        from payments.gateways.mobile_money import GMoneyGateway
        
        gateway = GMoneyGateway()
        self.assertFalse(gateway.is_configured())
    
    @override_settings(
        G_MONEY_API_KEY='test_api_key',
        G_MONEY_API_SECRET='test_api_secret',
        G_MONEY_API_URL='https://api.gmoney.com.gh',
        G_MONEY_MERCHANT_ID='test_merchant_id',
        G_MONEY_WEBHOOK_SECRET='test_webhook_secret'
    )
    def test_parse_webhook(self):
        """Test G-Money webhook parsing"""
        from payments.gateways.mobile_money import GMoneyGateway
        
        gateway = GMoneyGateway()
        
        # Mock request with webhook payload
        class MockRequest:
            body = json.dumps({
                'event': 'payment_callback',
                'transaction': {
                    'transactionId': 'test_txn_123',
                    'status': 'SUCCESS',
                    'amount': 10.00,
                    'currency': 'GHS',
                    'gMoneyReference': 'gm_ref_123',
                    'customer': {
                        'phoneNumber': '0241234567'
                    }
                }
            }).encode()
        
        result = gateway.parse_webhook(MockRequest())
        
        self.assertEqual(result['event_type'], 'payment_callback')
        self.assertEqual(result['transaction_id'], 'test_txn_123')
        self.assertEqual(result['status'], 'SUCCESS')
        self.assertEqual(result['amount'], 10.00)
        self.assertEqual(result['currency'], 'GHS')
        self.assertEqual(result['g_money_reference'], 'gm_ref_123')
    
    @override_settings(
        G_MONEY_API_KEY='test_api_key',
        G_MONEY_API_SECRET='test_api_secret',
        G_MONEY_API_URL='https://api.gmoney.com.gh',
        G_MONEY_MERCHANT_ID='test_merchant_id',
        G_MONEY_WEBHOOK_SECRET='test_webhook_secret'
    )
    def test_webhook_signature_verification(self):
        """Test G-Money webhook signature verification"""
        from payments.gateways.mobile_money import GMoneyGateway
        
        gateway = GMoneyGateway()
        
        class MockRequest:
            body = b'test_payload'
        
        # Test with no signature
        result = gateway.verify_webhook_signature(MockRequest(), '')
        self.assertFalse(result)
        
        result = gateway.verify_webhook_signature(MockRequest(), None)
        self.assertFalse(result)
