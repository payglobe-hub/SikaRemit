"""
Comprehensive tests for cross-border remittance service
Tests for fee calculation, compliance checks, and delivery methods
"""

from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from unittest.mock import patch, MagicMock
from decimal import Decimal
import json

User = get_user_model()


class CrossBorderRemittanceServiceTests(TestCase):
    """Tests for CrossBorderRemittanceService"""
    
    def setUp(self):
        from shared.constants import USER_TYPE_CUSTOMER
        # Disable signals to avoid automatic Customer creation
        from django.db.models.signals import post_save
        from users.signals import create_user_profile, sync_customer_user_type
        post_save.disconnect(create_user_profile, sender=User)
        post_save.disconnect(sync_customer_user_type, sender=Customer)
        
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPass123!',
            first_name='Test',
            last_name='User',
            user_type=USER_TYPE_CUSTOMER
        )
        
        # Manually create Customer with approved KYC (or update existing)
        from users.models import Customer
        self.customer, created = Customer.objects.get_or_create(
            user=self.user,
            defaults={'kyc_status': 'approved'}
        )
        print(f"After get_or_create: created={created}, kyc_status={self.customer.kyc_status}")
        
        # Force approved KYC status regardless of what was set
        Customer.objects.filter(user=self.user).update(kyc_status='approved')
        self.customer.refresh_from_db()
        print(f"After update and refresh: kyc_status={self.customer.kyc_status}")
        
        # Reconnect signals
        post_save.connect(create_user_profile, sender=User)
        post_save.connect(sync_customer_user_type, sender=Customer)
    
    def test_fee_calculation_mobile_money(self):
        """Test fee calculation for mobile money delivery"""
        from payments.services.cross_border_remittance_service import CrossBorderRemittanceService
        
        service = CrossBorderRemittanceService()
        
        result = service.calculate_fees(
            amount=Decimal('1000.00'),
            delivery_method='mobile_money',
            source_currency='GHS',
            destination_currency='GHS'
        )
        
        self.assertEqual(result['send_amount'], 1000.00)
        self.assertEqual(result['source_currency'], 'GHS')
        # 1.5% + 2.00 fixed = 15 + 2 = 17
        self.assertEqual(result['total_fee'], 17.00)
        self.assertEqual(result['recipient_amount'], 983.00)  # 1000 - 17
        self.assertEqual(result['delivery_time'], 'Instant - 30 minutes')
    
    def test_fee_calculation_bank_transfer(self):
        """Test fee calculation for bank transfer delivery"""
        from payments.services.cross_border_remittance_service import CrossBorderRemittanceService
        
        service = CrossBorderRemittanceService()
        
        result = service.calculate_fees(
            amount=Decimal('1000.00'),
            delivery_method='bank_transfer',
            source_currency='GHS',
            destination_currency='GHS'
        )
        
        # 2.0% + 5.00 fixed = 20 + 5 = 25
        self.assertEqual(result['total_fee'], 25.00)
        self.assertEqual(result['recipient_amount'], 975.00)
        self.assertEqual(result['delivery_time'], '1-3 business days')
    
    def test_fee_calculation_cash_pickup(self):
        """Test fee calculation for cash pickup delivery"""
        from payments.services.cross_border_remittance_service import CrossBorderRemittanceService
        
        service = CrossBorderRemittanceService()
        
        result = service.calculate_fees(
            amount=Decimal('500.00'),
            delivery_method='cash_pickup',
            source_currency='GHS',
            destination_currency='GHS'
        )
        
        # 2.5% + 3.00 fixed = 12.5 + 3 = 15.5
        self.assertEqual(result['total_fee'], 15.50)
        self.assertEqual(result['recipient_amount'], 484.50)
    
    def test_fee_calculation_sikaremit_user(self):
        """Test fee calculation for SikaRemit user transfer"""
        from payments.services.cross_border_remittance_service import CrossBorderRemittanceService
        
        service = CrossBorderRemittanceService()
        
        result = service.calculate_fees(
            amount=Decimal('1000.00'),
            delivery_method='sikaremit_user',
            source_currency='GHS',
            destination_currency='GHS'
        )
        
        # 0.5% + 0.00 fixed = 5 + 0 = 5
        self.assertEqual(result['total_fee'], 5.00)
        self.assertEqual(result['recipient_amount'], 995.00)
        self.assertEqual(result['delivery_time'], 'Instant')
    
    def test_fee_calculation_with_exchange_rate(self):
        """Test fee calculation with currency conversion"""
        from payments.services.cross_border_remittance_service import CrossBorderRemittanceService
        
        service = CrossBorderRemittanceService()
        
        result = service.calculate_fees(
            amount=Decimal('1000.00'),
            delivery_method='mobile_money',
            source_currency='GHS',
            destination_currency='USD'
        )
        
        self.assertEqual(result['source_currency'], 'GHS')
        self.assertEqual(result['destination_currency'], 'USD')
        # Exchange rate should be applied
        self.assertIn('exchange_rate', result)
        self.assertGreater(result['exchange_rate'], 0)
    
    def test_corridor_validation_supported(self):
        """Test supported transfer corridors"""
        from payments.services.cross_border_remittance_service import CrossBorderRemittanceService
        
        service = CrossBorderRemittanceService()
        
        # Ghana to US should be supported
        self.assertTrue(service._validate_corridor('GH', 'US'))
        # Ghana to Nigeria should be supported
        self.assertTrue(service._validate_corridor('GH', 'NG'))
        # Same country should be supported
        self.assertTrue(service._validate_corridor('GH', 'GH'))
    
    def test_corridor_validation_unsupported(self):
        """Test unsupported transfer corridors"""
        from payments.services.cross_border_remittance_service import CrossBorderRemittanceService
        
        service = CrossBorderRemittanceService()
        
        # Ghana to Japan not supported
        self.assertFalse(service._validate_corridor('GH', 'JP'))
        # Random countries not supported
        self.assertFalse(service._validate_corridor('XX', 'YY'))


class ComplianceChecksTests(TestCase):
    """Tests for AML/CTF compliance checks"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPass123!'
        )
    
    @patch('payments.services.cross_border_remittance_service.CrossBorderRemittanceService._get_user_daily_total')
    def test_daily_limit_check_pass(self, mock_daily_total):
        """Test daily limit check passes for normal amounts"""
        from payments.services.cross_border_remittance_service import CrossBorderRemittanceService
        
        mock_daily_total.return_value = Decimal('0')
        
        service = CrossBorderRemittanceService()
        
        result = service._perform_compliance_checks(
            sender_user=self.user,
            recipient_data={'name': 'John Doe'},
            amount=Decimal('1000.00'),
            purpose='family_support'
        )
        
        self.assertTrue(result['passed'])
    
    @patch('payments.services.cross_border_remittance_service.CrossBorderRemittanceService._get_user_daily_total')
    def test_daily_limit_check_fail(self, mock_daily_total):
        """Test daily limit check fails when exceeded"""
        from payments.services.cross_border_remittance_service import CrossBorderRemittanceService
        
        mock_daily_total.return_value = Decimal('9500.00')
        
        service = CrossBorderRemittanceService()
        
        result = service._perform_compliance_checks(
            sender_user=self.user,
            recipient_data={'name': 'John Doe'},
            amount=Decimal('1000.00'),  # Would exceed 10000 limit
            purpose='family_support'
        )
        
        self.assertFalse(result['passed'])
        self.assertIn('daily_limit_exceeded', result['flags'])
    
    @patch('payments.services.cross_border_remittance_service.CrossBorderRemittanceService._get_user_daily_total')
    @patch('payments.services.cross_border_remittance_service.CrossBorderRemittanceService._get_user_monthly_total')
    def test_monthly_limit_check_fail(self, mock_monthly_total, mock_daily_total):
        """Test monthly limit check fails when exceeded"""
        from payments.services.cross_border_remittance_service import CrossBorderRemittanceService
        
        mock_daily_total.return_value = Decimal('0')
        mock_monthly_total.return_value = Decimal('49000.00')
        
        service = CrossBorderRemittanceService()
        
        result = service._perform_compliance_checks(
            sender_user=self.user,
            recipient_data={'name': 'John Doe'},
            amount=Decimal('2000.00'),  # Would exceed 50000 monthly limit
            purpose='family_support'
        )
        
        self.assertFalse(result['passed'])
        self.assertIn('monthly_limit_exceeded', result['flags'])
    
    @patch('payments.services.cross_border_remittance_service.CrossBorderRemittanceService._get_user_daily_total')
    @patch('payments.services.cross_border_remittance_service.CrossBorderRemittanceService._get_user_monthly_total')
    def test_high_value_transaction_flag(self, mock_monthly_total, mock_daily_total):
        """Test high value transaction gets flagged"""
        from payments.services.cross_border_remittance_service import CrossBorderRemittanceService
        
        mock_daily_total.return_value = Decimal('0')
        mock_monthly_total.return_value = Decimal('0')
        
        service = CrossBorderRemittanceService()
        
        # Debug: Check if customer profile exists and KYC status
        print(f"User ID: {self.user.id}")
        print(f"User has customer_profile: {hasattr(self.user, 'customer_profile')}")
        if hasattr(self.user, 'customer_profile'):
            print(f"Customer KYC status: {self.user.customer_profile.kyc_status}")
        
        result = service._perform_compliance_checks(
            sender_user=self.user,
            recipient_data={'name': 'John Doe'},
            amount=Decimal('6000.00'),  # Above 5000 threshold
            purpose='family_support'
        )
        
        print(f"Compliance result: {result}")
        
        # High value transactions should pass but be flagged
        self.assertTrue(result['passed'])
        self.assertIn('high_value_transaction', result['flags'])
    
    def test_sanctions_screening(self):
        """Test sanctions list screening"""
        from payments.services.cross_border_remittance_service import CrossBorderRemittanceService
        
        service = CrossBorderRemittanceService()
        
        # Normal name should pass
        self.assertFalse(service._check_sanctions_list('John Doe'))
        
        # Empty name should pass
        self.assertFalse(service._check_sanctions_list(''))


class RemittanceStatusTests(TestCase):
    """Tests for remittance status tracking"""
    
    def test_status_constants(self):
        """Test remittance status constants are defined"""
        from payments.services.cross_border_remittance_service import RemittanceStatus
        
        self.assertEqual(RemittanceStatus.PENDING, 'pending')
        self.assertEqual(RemittanceStatus.PROCESSING, 'processing')
        self.assertEqual(RemittanceStatus.COMPLETED, 'completed')
        self.assertEqual(RemittanceStatus.FAILED, 'failed')
        self.assertEqual(RemittanceStatus.CANCELLED, 'cancelled')
        self.assertEqual(RemittanceStatus.REFUNDED, 'refunded')
    
    def test_delivery_method_constants(self):
        """Test delivery method constants are defined"""
        from payments.services.cross_border_remittance_service import RemittanceDeliveryMethod
        
        self.assertEqual(RemittanceDeliveryMethod.MOBILE_MONEY, 'mobile_money')
        self.assertEqual(RemittanceDeliveryMethod.BANK_TRANSFER, 'bank_transfer')
        self.assertEqual(RemittanceDeliveryMethod.CASH_PICKUP, 'cash_pickup')
        self.assertEqual(RemittanceDeliveryMethod.DIGITAL_WALLET, 'digital_wallet')
        self.assertEqual(RemittanceDeliveryMethod.SIKAREMIT_USER, 'sikaremit_user')


class DeliveryMethodTests(TestCase):
    """Tests for different delivery methods"""
    
    def test_delivery_time_estimates(self):
        """Test delivery time estimates are correct"""
        from payments.services.cross_border_remittance_service import CrossBorderRemittanceService
        
        service = CrossBorderRemittanceService()
        
        expected_times = {
            'mobile_money': 'Instant - 30 minutes',
            'bank_transfer': '1-3 business days',
            'cash_pickup': 'Same day - 24 hours',
            'digital_wallet': 'Instant - 2 hours',
            'sikaremit_user': 'Instant',
        }
        
        for method, expected_time in expected_times.items():
            self.assertEqual(service.DELIVERY_TIMES.get(method), expected_time)
    
    def test_fee_structure_defined(self):
        """Test fee structure is properly defined"""
        from payments.services.cross_border_remittance_service import CrossBorderRemittanceService
        
        service = CrossBorderRemittanceService()
        
        # All delivery methods should have fee structure
        for method in ['mobile_money', 'bank_transfer', 'cash_pickup', 'digital_wallet', 'sikaremit_user']:
            self.assertIn(method, service.FEE_STRUCTURE)
            self.assertIn('percentage', service.FEE_STRUCTURE[method])
            self.assertIn('fixed', service.FEE_STRUCTURE[method])


class ExchangeRateTests(TestCase):
    """Tests for exchange rate functionality"""
    
    def test_same_currency_rate(self):
        """Test exchange rate for same currency is 1.0"""
        from payments.services.cross_border_remittance_service import CrossBorderRemittanceService
        
        service = CrossBorderRemittanceService()
        
        rate = service._get_exchange_rate('GHS', 'GHS')
        self.assertEqual(rate, Decimal('1.0'))
        
        rate = service._get_exchange_rate('USD', 'USD')
        self.assertEqual(rate, Decimal('1.0'))
    
    def test_default_exchange_rates(self):
        """Test default exchange rates are available"""
        from payments.services.cross_border_remittance_service import CrossBorderRemittanceService
        
        service = CrossBorderRemittanceService()
        
        # GHS to USD
        rate = service._get_exchange_rate('GHS', 'USD')
        self.assertGreater(rate, Decimal('0'))
        
        # USD to GHS
        rate = service._get_exchange_rate('USD', 'GHS')
        self.assertGreater(rate, Decimal('0'))
