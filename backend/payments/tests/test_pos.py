"""
Soft POS / Digital POS Tests.

Tests POS device creation, device types, capabilities,
security levels, status transitions, and payment method support.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model

from payments.models.pos import POSDevice
from users.models import Merchant
from shared.constants import USER_TYPE_MERCHANT

User = get_user_model()

class POSDeviceTests(TestCase):
    """Test POS device creation and properties."""

    def setUp(self):
        self.merchant_user = User.objects.create_user(
            username='posmerch', email='pos@test.com',
            password='testpass123', user_type=USER_TYPE_MERCHANT
        )
        self.merchant = Merchant.objects.get(user=self.merchant_user)
        self.merchant.business_name = 'POS Store'
        self.merchant.tax_id = 'TAX-POS'
        self.merchant.save()

    def test_create_smartphone_pos(self):
        device = POSDevice.objects.create(
            device_id='POS-SMART-001',
            merchant=self.merchant,
            device_type='smartphone_pos',
            device_name='Main Counter Phone',
            connection_type='wifi'
        )
        self.assertEqual(device.device_type, 'smartphone_pos')
        self.assertEqual(device.status, 'active')

    def test_create_nfc_reader(self):
        device = POSDevice.objects.create(
            device_id='POS-NFC-001',
            merchant=self.merchant,
            device_type='nfc_reader',
            device_name='NFC Tap Reader',
            supports_nfc=True,
            supports_contactless=True
        )
        self.assertTrue(device.supports_nfc)
        self.assertTrue(device.supports_contactless)

    def test_create_virtual_terminal(self):
        device = POSDevice.objects.create(
            device_id='POS-VT-001',
            merchant=self.merchant,
            device_type='virtual_terminal',
            device_name='Online Terminal',
            connection_type='internet'
        )
        self.assertEqual(device.device_type, 'virtual_terminal')

    def test_all_device_types(self):
        for i, (dtype, _) in enumerate(POSDevice.DEVICE_TYPES):
            device = POSDevice.objects.create(
                device_id=f'POS-{dtype[:4].upper()}-{i}',
                merchant=self.merchant,
                device_type=dtype,
                device_name=f'{dtype} device'
            )
            self.assertEqual(device.device_type, dtype)

    def test_device_status_transitions(self):
        device = POSDevice.objects.create(
            device_id='POS-STAT-001',
            merchant=self.merchant,
            device_type='countertop',
            device_name='Status Test'
        )
        for status in ['inactive', 'maintenance', 'active', 'suspended', 'decommissioned']:
            device.status = status
            device.save()
            device.refresh_from_db()
            self.assertEqual(device.status, status)

    def test_security_levels(self):
        for level, _ in POSDevice.SECURITY_LEVELS:
            device = POSDevice.objects.create(
                device_id=f'POS-SEC-{level[:3]}',
                merchant=self.merchant,
                device_type='countertop',
                device_name=f'{level} device',
                security_level=level
            )
            self.assertEqual(device.security_level, level)

    def test_supported_payment_methods_basic(self):
        device = POSDevice.objects.create(
            device_id='POS-PAY-001',
            merchant=self.merchant,
            device_type='countertop',
            device_name='Basic Terminal',
            supports_nfc=False,
            supports_mobile_money=False
        )
        methods = device.get_supported_payment_methods()
        self.assertIn('credit_card', methods)
        self.assertIn('debit_card', methods)
        self.assertNotIn('nfc_credit', methods)
        self.assertNotIn('mtn_money', methods)

    def test_supported_payment_methods_nfc(self):
        device = POSDevice.objects.create(
            device_id='POS-PAY-002',
            merchant=self.merchant,
            device_type='nfc_reader',
            device_name='NFC Terminal',
            supports_nfc=True
        )
        methods = device.get_supported_payment_methods()
        self.assertIn('nfc_credit', methods)
        self.assertIn('mobile_wallets', methods)

    def test_supported_payment_methods_mobile_money(self):
        device = POSDevice.objects.create(
            device_id='POS-PAY-003',
            merchant=self.merchant,
            device_type='smartphone_pos',
            device_name='MoMo Terminal',
            supports_mobile_money=True
        )
        methods = device.get_supported_payment_methods()
        self.assertIn('mtn_money', methods)
        self.assertIn('telecel_cash', methods)

    def test_unique_device_id(self):
        POSDevice.objects.create(
            device_id='POS-UNIQUE-001',
            merchant=self.merchant,
            device_type='countertop',
            device_name='First'
        )
        with self.assertRaises(Exception):
            POSDevice.objects.create(
                device_id='POS-UNIQUE-001',
                merchant=self.merchant,
                device_type='countertop',
                device_name='Duplicate'
            )

    def test_device_capabilities_defaults(self):
        device = POSDevice.objects.create(
            device_id='POS-DEF-001',
            merchant=self.merchant,
            device_type='countertop',
            device_name='Defaults'
        )
        self.assertFalse(device.supports_nfc)
        self.assertFalse(device.supports_mobile_money)
        self.assertTrue(device.supports_chip)
        self.assertTrue(device.supports_swipe)
        self.assertTrue(device.pin_required)
        self.assertTrue(device.encryption_enabled)

    def test_device_str(self):
        device = POSDevice.objects.create(
            device_id='POS-STR-001',
            merchant=self.merchant,
            device_type='countertop',
            device_name='My Terminal'
        )
        self.assertIn('My Terminal', str(device))
        self.assertIn('POS-STR-001', str(device))

    def test_multiple_devices_per_merchant(self):
        for i in range(3):
            POSDevice.objects.create(
                device_id=f'POS-MULTI-{i}',
                merchant=self.merchant,
                device_type='smartphone_pos',
                device_name=f'Device {i}'
            )
        self.assertEqual(self.merchant.pos_devices.count(), 3)

    def test_pci_and_emv_certification(self):
        device = POSDevice.objects.create(
            device_id='POS-CERT-001',
            merchant=self.merchant,
            device_type='countertop',
            device_name='Certified Terminal',
            pci_certified=True,
            emv_certified=True,
            security_level='pci_compliant'
        )
        self.assertTrue(device.pci_certified)
        self.assertTrue(device.emv_certified)
