import pytest
from django.test import TestCase
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import transaction
from payments.models import TelecomProvider, TelecomPackage, Country, Currency
from payments.management.commands.populate_telecom import Command
from decimal import Decimal


class PopulateTelecomCommandTest(TestCase):
    """Test cases for populate_telecom management command"""

    def setUp(self):
        """Set up test data"""
        # Create test countries
        self.ghana = Country.objects.create(
            code='GH',
            name='Ghana',
            currency_code='GHS'
        )
        self.nigeria = Country.objects.create(
            code='NG',
            name='Nigeria',
            currency_code='NGN'
        )
        self.kenya = Country.objects.create(
            code='KE',
            name='Kenya',
            currency_code='KES'
        )
        
        # Create test currencies
        self.ghs = Currency.objects.create(
            code='GHS',
            name='Ghana Cedi',
            symbol='₵'
        )
        self.ngn = Currency.objects.create(
            code='NGN',
            name='Nigerian Naira',
            symbol='₦'
        )
        self.kes = Currency.objects.create(
            code='KES',
            name='Kenyan Shilling',
            symbol='KSh'
        )

    def test_command_runs_successfully(self):
        """Test that the command runs without errors"""
        # Clear existing data
        TelecomProvider.objects.all().delete()
        TelecomPackage.objects.all().delete()
        
        # Run the command
        call_command('populate_telecom')
        
        # Verify providers were created
        ghana_providers = TelecomProvider.objects.filter(country=self.ghana)
        nigeria_providers = TelecomProvider.objects.filter(country=self.nigeria)
        kenya_providers = TelecomProvider.objects.filter(country=self.kenya)
        
        self.assertGreater(ghana_providers.count(), 0)
        self.assertGreater(nigeria_providers.count(), 0)
        self.assertGreater(kenya_providers.count(), 0)

    def test_ghana_providers_created(self):
        """Test that Ghana providers are created correctly"""
        call_command('populate_telecom')
        
        # Check MTN Ghana
        mtn_gh = TelecomProvider.objects.get(code='MTN_GH')
        self.assertEqual(mtn_gh.name, 'MTN Ghana')
        self.assertEqual(mtn_gh.country, self.ghana)
        self.assertTrue(mtn_gh.supports_data)
        self.assertTrue(mtn_gh.supports_airtime)
        self.assertTrue(mtn_gh.is_active)
        
        # Check Telecel Ghana
        telecel_gh = TelecomProvider.objects.get(code='TELECEL_GH')
        self.assertEqual(telecel_gh.name, 'Telecel Ghana')
        self.assertEqual(telecel_gh.country, self.ghana)
        
        # Check AirtelTigo Ghana
        airteltigo_gh = TelecomProvider.objects.get(code='AIRTELTIGO_GH')
        self.assertEqual(airteltigo_gh.name, 'AirtelTigo Ghana')
        self.assertEqual(airteltigo_gh.country, self.ghana)

    def test_packages_created_for_providers(self):
        """Test that packages are created for each provider"""
        call_command('populate_telecom')
        
        # Check MTN Ghana packages
        mtn_gh = TelecomProvider.objects.get(code='MTN_GH')
        mtn_packages = TelecomPackage.objects.filter(provider=mtn_gh)
        self.assertGreater(mtn_packages.count(), 0)
        
        # Check package structure
        package = mtn_packages.first()
        self.assertIsNotNone(package.name)
        self.assertIsNotNone(package.package_id)
        self.assertEqual(package.provider, mtn_gh)
        self.assertEqual(package.currency, self.ghs)
        self.assertTrue(package.is_active)

    def test_package_prices_are_valid(self):
        """Test that package prices are valid decimal values"""
        call_command('populate_telecom')
        
        packages = TelecomPackage.objects.all()
        for package in packages:
            self.assertIsInstance(package.price, Decimal)
            self.assertGreater(package.price, 0)

    def test_package_validity_days(self):
        """Test that packages have valid validity periods"""
        call_command('populate_telecom')
        
        packages = TelecomPackage.objects.all()
        for package in packages:
            self.assertGreater(package.validity_days, 0)
            self.assertIsInstance(package.validity_days, int)

    def test_no_duplicate_providers(self):
        """Test that running command twice doesn't create duplicates"""
        # First run
        call_command('populate_telecom')
        initial_count = TelecomProvider.objects.count()
        
        # Second run
        call_command('populate_telecom')
        final_count = TelecomProvider.objects.count()
        
        # Should be the same count (no duplicates)
        self.assertEqual(initial_count, final_count)

    def test_no_duplicate_packages(self):
        """Test that running command twice doesn't create duplicate packages"""
        # First run
        call_command('populate_telecom')
        initial_count = TelecomPackage.objects.count()
        
        # Second run
        call_command('populate_telecom')
        final_count = TelecomPackage.objects.count()
        
        # Should be the same count (no duplicates)
        self.assertEqual(initial_count, final_count)

    def test_featured_packages_marked_correctly(self):
        """Test that featured packages are marked correctly"""
        call_command('populate_telecom')
        
        # Check that some packages are marked as featured
        featured_packages = TelecomPackage.objects.filter(is_featured=True)
        self.assertGreater(featured_packages.count(), 0)

    def test_package_types_are_valid(self):
        """Test that all packages have valid package types"""
        call_command('populate_telecom')
        
        valid_types = ['data', 'airtime', 'bundle']
        packages = TelecomPackage.objects.all()
        
        for package in packages:
            self.assertIn(package.package_type, valid_types)

    def test_nigeria_providers_created(self):
        """Test that Nigeria providers are created correctly"""
        call_command('populate_telecom')
        
        # Check MTN Nigeria
        mtn_ng = TelecomProvider.objects.get(code='MTN_NG')
        self.assertEqual(mtn_ng.name, 'MTN Nigeria')
        self.assertEqual(mtn_ng.country, self.nigeria)
        
        # Check that Nigeria packages use NGN currency
        mtn_ng_packages = TelecomPackage.objects.filter(provider=mtn_ng)
        for package in mtn_ng_packages:
            self.assertEqual(package.currency, self.ngn)

    def test_kenya_providers_created(self):
        """Test that Kenya providers are created correctly"""
        call_command('populate_telecom')
        
        # Check Safaricom Kenya
        safaricom_ke = TelecomProvider.objects.get(code='SAFARICOM_KE')
        self.assertEqual(safaricom_ke.name, 'Safaricom Kenya')
        self.assertEqual(safaricom_ke.country, self.kenya)
        
        # Check that Kenya packages use KES currency
        safaricom_packages = TelecomPackage.objects.filter(provider=safaricom_ke)
        for package in safaricom_packages:
            self.assertEqual(package.currency, self.kes)

    def test_command_handles_missing_country_gracefully(self):
        """Test that command handles missing countries gracefully"""
        # Delete Ghana country
        self.ghana.delete()
        
        # Command should still run without errors
        call_command('populate_telecom')
        
        # Other countries should still be populated
        nigeria_providers = TelecomProvider.objects.filter(country=self.nigeria)
        kenya_providers = TelecomProvider.objects.filter(country=self.kenya)
        
        self.assertGreater(nigeria_providers.count(), 0)
        self.assertGreater(kenya_providers.count(), 0)

    def test_command_handles_missing_currency_gracefully(self):
        """Test that command handles missing currencies gracefully"""
        # Delete GHS currency
        self.ghs.delete()
        
        # Command should still run without errors
        call_command('populate_telecom')
        
        # Other countries should still be populated
        nigeria_packages = TelecomPackage.objects.filter(currency=self.ngn)
        kenya_packages = TelecomPackage.objects.filter(currency=self.kes)
        
        self.assertGreater(nigeria_packages.count(), 0)
        self.assertGreater(kenya_packages.count(), 0)

    def test_transaction_rollback_on_error(self):
        """Test that transaction is rolled back on error"""
        # Mock an error during provider creation
        from unittest.mock import patch
        
        with patch.object(TelecomProvider.objects, 'get_or_create') as mock_get_or_create:
            mock_get_or_create.side_effect = Exception("Database error")
            
            # Command should raise an exception
            with self.assertRaises(Exception):
                call_command('populate_telecom')
            
            # No providers should be created due to transaction rollback
            self.assertEqual(TelecomProvider.objects.count(), 0)

    def test_data_integrity_validation(self):
        """Test data integrity of created records"""
        call_command('populate_telecom')
        
        # Check all providers have required fields
        providers = TelecomProvider.objects.all()
        for provider in providers:
            self.assertIsNotNone(provider.name)
            self.assertIsNotNone(provider.code)
            self.assertIsNotNone(provider.country)
            self.assertTrue(len(provider.name) > 0)
            self.assertTrue(len(provider.code) > 0)
        
        # Check all packages have required fields
        packages = TelecomPackage.objects.all()
        for package in packages:
            self.assertIsNotNone(package.name)
            self.assertIsNotNone(package.package_id)
            self.assertIsNotNone(package.provider)
            self.assertIsNotNone(package.currency)
            self.assertTrue(len(package.name) > 0)
            self.assertTrue(len(package.package_id) > 0)

    def test_command_output_messages(self):
        """Test that command outputs appropriate messages"""
        # Capture command output
        from io import StringIO
        from django.core.management import call_command
        
        out = StringIO()
        call_command('populate_telecom', stdout=out)
        
        output = out.getvalue()
        self.assertIn('Starting telecom data population', output)
        self.assertIn('✅ Telecom data population completed successfully', output)

    def test_provider_websites_are_valid_urls(self):
        """Test that provider websites are valid URLs"""
        call_command('populate_telecom')
        
        providers = TelecomProvider.objects.exclude(website='')
        for provider in providers:
            # Basic URL validation
            self.assertTrue(provider.website.startswith('http'))

    def test_package_data_amounts_are_valid(self):
        """Test that package data amounts are in valid format"""
        call_command('populate_telecom')
        
        data_packages = TelecomPackage.objects.filter(package_type='data')
        for package in data_packages:
            if package.data_amount:
                # Should be in format like "1GB", "500MB", etc.
                self.assertTrue(
                    package.data_amount.endswith('GB') or 
                    package.data_amount.endswith('MB') or
                    package.data_amount.endswith('KB')
                )
