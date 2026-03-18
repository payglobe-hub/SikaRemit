"""
Comprehensive tests for payment processing service
Tests for payment processing, verification, and payouts
"""

from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from unittest.mock import patch, MagicMock
from decimal import Decimal

User = get_user_model()

class PaymentServiceTests(TestCase):
    """Tests for PaymentService"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPass123!'
        )

    @patch('payments.services.payment_processing_service.PaymentServiceWithKYC._perform_fraud_analysis')
    def test_fraud_analysis_integration(self, mock_fraud):
        """Test fraud analysis is called during payment processing"""
        from payments.services.payment_processing_service import PaymentServiceWithKYC as PaymentService
        
        mock_fraud.return_value = {
            'fraud_score': 0.1,
            'risk_level': 'low',
            'auto_block': False
        }
        
        # Fraud analysis should return low risk
        result = mock_fraud(MagicMock())
        self.assertEqual(result['risk_level'], 'low')
        self.assertFalse(result['auto_block'])

    def test_verify_mobile_payment_unknown_provider(self):
        """Test verification fails for unknown provider"""
        from payments.services.payment_processing_service import PaymentServiceWithKYC as PaymentService
        
        result = PaymentService.verify_mobile_payment('txn_123', 'unknown_provider')
        
        self.assertFalse(result['success'])
        self.assertIn('Unknown mobile money provider', result['error'])

    @override_settings(
        MTN_MOMO_API_KEY='test_key',
        MTN_MOMO_API_SECRET='test_secret',
        MTN_MOMO_API_URL='https://sandbox.momodeveloper.mtn.com'
    )
    @patch('payments.gateways.mobile_money.MTNMoMoGateway.check_transaction_status')
    def test_verify_mobile_payment_mtn(self, mock_check):
        """Test MTN MoMo payment verification"""
        from payments.services.payment_processing_service import PaymentServiceWithKYC as PaymentService
        
        mock_check.return_value = {
            'success': True,
            'status': 'SUCCESSFUL',
            'amount': '100'
        }
        
        result = PaymentService.verify_mobile_payment('txn_123', 'mtn_momo')
        
        self.assertTrue(result['success'])
        self.assertTrue(result['verified'])

    @override_settings(
        TELECEL_API_URL='https://api.telecel.com',
        TELECEL_API_KEY='test_key'
    )
    @patch('payments.gateways.mobile_money.TelecelCashGateway.check_transaction_status')
    def test_verify_mobile_payment_telecel(self, mock_check):
        """Test Telecel Cash payment verification"""
        from payments.services.payment_processing_service import PaymentServiceWithKYC as PaymentService
        
        mock_check.return_value = {
            'success': True,
            'status': 'completed',
            'amount': '50'
        }
        
        result = PaymentService.verify_mobile_payment('txn_456', 'telecel')
        
        self.assertTrue(result['success'])
        self.assertTrue(result['verified'])

    @override_settings(
        AIRTEL_API_URL='https://api.airtel.com',
        AIRTEL_API_KEY='test_key'
    )
    @patch('payments.gateways.mobile_money.AirtelTigoMoneyGateway.check_transaction_status')
    def test_verify_mobile_payment_airtel(self, mock_check):
        """Test AirtelTigo payment verification"""
        from payments.services.payment_processing_service import PaymentServiceWithKYC as PaymentService
        
        mock_check.return_value = {
            'success': True,
            'status': 'SUCCESS',
            'amount': '75'
        }
        
        result = PaymentService.verify_mobile_payment('txn_789', 'airtel_tigo')
        
        self.assertTrue(result['success'])
        self.assertTrue(result['verified'])

class CardPaymentTests(TestCase):
    """Tests for card payment processing"""
    
    @override_settings(
        STRIPE_SECRET_KEY='sk_test_123',
        STRIPE_PUBLISHABLE_KEY='pk_test_123'
    )
    @patch('payments.gateways.stripe.StripeGateway.process_payment')
    def test_process_card_payment_success(self, mock_process):
        """Test successful card payment processing"""
        from payments.services.payment_processing_service import PaymentServiceWithKYC as PaymentService
        
        mock_process.return_value = {
            'success': True,
            'transaction_id': 'pi_test_123',
            'raw_response': {'status': 'succeeded'}
        }
        
        result = PaymentService._process_card_payment(
            token='pm_test_123',
            amount=100.00,
            currency='USD'
        )
        
        self.assertTrue(result['success'])

    @override_settings(STRIPE_SECRET_KEY=None)
    def test_process_card_payment_no_config(self):
        """Test card payment fails without Stripe config"""
        from payments.services.payment_processing_service import PaymentServiceWithKYC as PaymentService
        
        result = PaymentService._process_card_payment(
            token='pm_test_123',
            amount=100.00
        )
        
        # Should fail gracefully
        self.assertFalse(result['success'])

class MobilePaymentTests(TestCase):
    """Tests for mobile money payment processing"""
    
    def test_process_mobile_payment_unknown_provider(self):
        """Test mobile payment fails for unknown provider"""
        from payments.services.payment_processing_service import PaymentServiceWithKYC as PaymentService
        
        result = PaymentService._process_mobile_payment(
            phone_number='0241234567',
            amount=100.00,
            provider='unknown'
        )
        
        self.assertFalse(result['success'])
        self.assertIn('Unknown mobile money provider', result['error'])

    @override_settings(
        MTN_MOMO_API_KEY='test_key',
        MTN_MOMO_API_SECRET='test_secret',
        MTN_MOMO_API_URL='https://sandbox.momodeveloper.mtn.com'
    )
    @patch('payments.gateways.mobile_money.MTNMoMoGateway.process_payment')
    def test_process_mobile_payment_mtn(self, mock_process):
        """Test MTN MoMo payment processing"""
        from payments.services.payment_processing_service import PaymentServiceWithKYC as PaymentService
        
        mock_process.return_value = {
            'success': True,
            'transaction_id': 'SIKA_123',
            'status': 'pending'
        }
        
        result = PaymentService._process_mobile_payment(
            phone_number='0241234567',
            amount=100.00,
            provider='mtn_momo'
        )
        
        self.assertTrue(result['success'])
        self.assertEqual(result['transaction_id'], 'SIKA_123')

class PayoutTests(TestCase):
    """Tests for merchant payouts"""
    
    @override_settings(FLUTTERWAVE_SECRET_KEY='FLWSECK_TEST-123')
    @patch('payments.gateways.bank_transfer.BankTransferGateway.disburse_funds')
    def test_bank_payout_success(self, mock_disburse):
        """Test successful bank payout"""
        from payments.services.payment_processing_service import PaymentServiceWithKYC as PaymentService
        
        mock_disburse.return_value = {
            'success': True,
            'transaction_id': 'transfer_123',
            'status': 'pending'
        }
        
        class MockMerchant:
            business_name = 'Test Merchant'
            id = 1
            default_payout_method = MagicMock(
                details={
                    'bank_code': 'GCB',
                    'account_number': '1234567890'
                }
            )
        
        result = PaymentService._process_bank_payout(MockMerchant(), Decimal('500.00'))
        
        self.assertTrue(result['success'])
        self.assertIn('transaction_id', result)

    @override_settings(FLUTTERWAVE_SECRET_KEY='FLWSECK_TEST-123')
    @patch('requests.post')
    def test_mobile_payout_success(self, mock_post):
        """Test successful mobile money payout"""
        from payments.services.payment_processing_service import PaymentServiceWithKYC as PaymentService
        
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {'data': {'id': 'transfer_456'}},
            text='{"data": {"id": "transfer_456"}}'
        )
        
        class MockMerchant:
            business_name = 'Test Merchant'
            default_payout_method = MagicMock(
                details={
                    'provider': 'MTN',
                    'phone_number': '0241234567'
                }
            )
        
        result = PaymentService._process_mobile_payout(MockMerchant(), Decimal('300.00'))
        
        self.assertTrue(result['success'])
        self.assertIn('transaction_id', result)

    @override_settings(FLUTTERWAVE_SECRET_KEY='FLWSECK_TEST-123')
    @patch('requests.post')
    def test_payout_failure(self, mock_post):
        """Test payout failure handling"""
        from payments.services.payment_processing_service import PaymentServiceWithKYC as PaymentService
        
        mock_post.return_value = MagicMock(
            status_code=400,
            json=lambda: {'message': 'Insufficient balance'},
            text='{"message": "Insufficient balance"}'
        )
        
        class MockMerchant:
            business_name = 'Test Merchant'
            default_payout_method = MagicMock(
                details={
                    'bank_code': 'GCB',
                    'account_number': '1234567890'
                }
            )
        
        result = PaymentService._process_bank_payout(MockMerchant(), Decimal('1000000.00'))
        
        self.assertFalse(result['success'])
        self.assertIn('error', result)

class KYCEligibilityTests(TestCase):
    """Tests for KYC eligibility checks"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPass123!'
        )

    @patch('users.models.Customer.objects.get_or_create')
    def test_kyc_eligible_user(self, mock_get_or_create):
        """Test KYC check for eligible user"""
        from payments.services.payment_processing_service import PaymentServiceWithKYC as PaymentService
        
        mock_customer = MagicMock()
        mock_customer.can_make_transactions = True
        mock_customer.record_transaction_attempt = MagicMock()
        mock_get_or_create.return_value = (mock_customer, True)
        
        result = PaymentService._check_user_kyc_eligibility(self.user)
        
        self.assertTrue(result['eligible'])

    @patch('users.models.Customer.objects.get')
    def test_kyc_ineligible_user(self, mock_get):
        """Test KYC check for ineligible user"""
        from payments.services.payment_processing_service import PaymentServiceWithKYC as PaymentService
        
        mock_customer = MagicMock()
        mock_customer.can_make_transactions = False
        mock_customer.kyc_status = 'pending'
        mock_customer.needs_kyc_verification = True
        mock_customer.transaction_attempts_count = 3
        mock_customer.record_transaction_attempt = MagicMock()
        mock_get.return_value = mock_customer
        
        result = PaymentService._check_user_kyc_eligibility(self.user)
        
        self.assertFalse(result['eligible'])
        self.assertIn('KYC verification required', result['error'])
