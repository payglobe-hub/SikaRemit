"""
Django management command to populate currencies
"""
from django.core.management.base import BaseCommand
from payments.models import Currency, ExchangeRate
from shared.constants import DEFAULT_CURRENCY
import random

class Command(BaseCommand):
    help = 'Populate currencies with default data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Delete existing currencies before creating new ones'
        )
        parser.add_argument(
            '--create-rates',
            action='store_true',
            help='Create sample exchange rates'
        )

    def handle(self, *args, **options):
        reset = options['reset']
        create_rates = options['create_rates']
        
        self.stdout.write('🚀 Populating currencies...')
        
        # Currency data with flag emojis and additional info
        currencies_data = [
            {'code': 'USD', 'name': 'US Dollar', 'symbol': '$', 'flag': '🇺🇸', 'is_base': True, 'decimal_places': 2},
            {'code': 'EUR', 'name': 'Euro', 'symbol': '€', 'flag': '🇪🇺', 'is_base': False, 'decimal_places': 2},
            {'code': 'GBP', 'name': 'British Pound', 'symbol': '£', 'flag': '🇬🇧', 'is_base': False, 'decimal_places': 2},
            {'code': 'GHS', 'name': 'Ghanaian Cedi', 'symbol': '₵', 'flag': '🇬🇭', 'is_base': False, 'decimal_places': 2},
            {'code': 'NGN', 'name': 'Nigerian Naira', 'symbol': '₦', 'flag': '🇳🇬', 'is_base': False, 'decimal_places': 2},
            {'code': 'KES', 'name': 'Kenyan Shilling', 'symbol': 'KSh', 'flag': '🇰🇪', 'is_base': False, 'decimal_places': 2},
            {'code': 'ZAR', 'name': 'South African Rand', 'symbol': 'R', 'flag': '🇿🇦', 'is_base': False, 'decimal_places': 2},
            {'code': 'UGX', 'name': 'Ugandan Shilling', 'symbol': 'USh', 'flag': '🇺🇬', 'is_base': False, 'decimal_places': 0},
            {'code': 'TZS', 'name': 'Tanzanian Shilling', 'symbol': 'TSh', 'flag': '🇹🇿', 'is_base': False, 'decimal_places': 0},
            {'code': 'RWF', 'name': 'Rwandan Franc', 'symbol': 'FRw', 'flag': '🇷🇼', 'is_base': False, 'decimal_places': 0},
            {'code': 'ETB', 'name': 'Ethiopian Birr', 'symbol': 'ብር', 'flag': '🇪🇹', 'is_base': False, 'decimal_places': 2},
            {'code': 'XOF', 'name': 'West African CFA Franc', 'symbol': 'CFA', 'flag': '🇧🇯', 'is_base': False, 'decimal_places': 0},
            {'code': 'CAD', 'name': 'Canadian Dollar', 'symbol': 'C$', 'flag': '🇨🇦', 'is_base': False, 'decimal_places': 2},
            {'code': 'AUD', 'name': 'Australian Dollar', 'symbol': 'A$', 'flag': '🇦🇺', 'is_base': False, 'decimal_places': 2},
            {'code': 'JPY', 'name': 'Japanese Yen', 'symbol': '¥', 'flag': '🇯🇵', 'is_base': False, 'decimal_places': 0},
            {'code': 'CNY', 'name': 'Chinese Yuan', 'symbol': '¥', 'flag': '🇨🇳', 'is_base': False, 'decimal_places': 2},
            {'code': 'INR', 'name': 'Indian Rupee', 'symbol': '₹', 'flag': '🇮🇳', 'is_base': False, 'decimal_places': 2},
            {'code': 'BRL', 'name': 'Brazilian Real', 'symbol': 'R$', 'flag': '🇧🇷', 'is_base': False, 'decimal_places': 2},
            {'code': 'MXN', 'name': 'Mexican Peso', 'symbol': '$', 'flag': '🇲🇽', 'is_base': False, 'decimal_places': 2},
        ]
        
        if reset:
            self.stdout.write('🔄 Resetting existing currencies...')
            deleted_count = Currency.objects.all().delete()[0]
            self.stdout.write(f'   Deleted {deleted_count} existing currencies')
        
        created_currencies = []
        
        for currency_data in currencies_data:
            currency, created = Currency.objects.get_or_create(
                code=currency_data['code'],
                defaults={
                    'name': currency_data['name'],
                    'symbol': currency_data['symbol'],
                    'flag_emoji': currency_data['flag'],
                    'is_base_currency': currency_data['is_base'],
                    'decimal_places': currency_data['decimal_places'],
                    'is_active': True,
                    'exchange_api_supported': True,
                }
            )
            
            if created:
                created_currencies.append(currency)
                self.stdout.write(f'✅ Created currency: {currency.display_name}')
            else:
                # Update existing currency with new data
                currency.name = currency_data['name']
                currency.symbol = currency_data['symbol']
                currency.flag_emoji = currency_data['flag']
                currency.is_base_currency = currency_data['is_base']
                currency.decimal_places = currency_data['decimal_places']
                currency.save()
                self.stdout.write(f'🔄 Updated currency: {currency.display_name}')
        
        # Create sample exchange rates if requested
        if create_rates:
            self.stdout.write('\n📈 Creating sample exchange rates...')
            self._create_exchange_rates(created_currencies)
        
        self.stdout.write(f'\n✅ Successfully processed {len(currencies_data)} currencies!')
        
        # Display summary
        self.stdout.write('\n' + '='*60)
        self.stdout.write('📊 CURRENCY SUMMARY')
        self.stdout.write('='*60)
        self.stdout.write(f'Total currencies: {Currency.objects.count()}')
        self.stdout.write(f'Active currencies: {Currency.objects.filter(is_active=True).count()}')
        self.stdout.write(f'Base currency: {Currency.objects.filter(is_base_currency=True).first()}')
        
        if create_rates:
            self.stdout.write(f'Exchange rates: {ExchangeRate.objects.count()}')
        
        self.stdout.write('='*60)

    def _create_exchange_rates(self, currencies):
        """Create sample exchange rates"""
        from django.utils import timezone
        import datetime
        
        # Find base currency (USD)
        base_currency = Currency.objects.filter(is_base_currency=True).first()
        if not base_currency:
            base_currency = Currency.objects.filter(code='USD').first()
        
        if not base_currency:
            self.stdout.write(self.style.WARNING('⚠️  No base currency found, skipping exchange rates'))
            return
        
        # Sample exchange rates relative to USD
        sample_rates = {
            'EUR': 0.92,
            'GBP': 0.79,
            'GHS': 12.45,
            'NGN': 777.50,
            'KES': 129.25,
            'ZAR': 18.75,
            'UGX': 3765.00,
            'TZS': 2475.00,
            'RWF': 1315.00,
            'ETB': 56.50,
            'XOF': 606.25,
            'CAD': 1.36,
            'AUD': 1.53,
            'JPY': 149.75,
            'CNY': 7.24,
            'INR': 82.85,
            'BRL': 4.92,
            'MXN': 17.15,
        }
        
        for currency in currencies:
            if currency.code == base_currency.code:
                continue
            
            rate_value = sample_rates.get(currency.code)
            if rate_value:
                # Create USD to Currency rate
                ExchangeRate.objects.get_or_create(
                    from_currency=base_currency,
                    to_currency=currency,
                    defaults={
                        'rate': rate_value,
                        'source': 'seed_data',
                        'is_latest': True,
                    }
                )
                
                # Create Currency to USD rate (inverse)
                ExchangeRate.objects.get_or_create(
                    from_currency=currency,
                    to_currency=base_currency,
                    defaults={
                        'rate': 1 / rate_value,
                        'source': 'seed_data',
                        'is_latest': True,
                    }
                )
                
                self.stdout.write(f'   📈 {base_currency.code} → {currency.code}: {rate_value}')
