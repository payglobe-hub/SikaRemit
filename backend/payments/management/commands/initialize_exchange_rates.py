from django.core.management.base import BaseCommand
from payments.models import Currency, ExchangeRate
from decimal import Decimal

class Command(BaseCommand):
    help = 'Initialize default exchange rates for the 24 BoG currencies (GHS as base)'

    def handle(self, *args, **options):
        self.stdout.write('Initializing exchange rates with GHS as base currency...')

        # Get GHS as base currency
        try:
            ghs = Currency.objects.get(code='GHS')
        except Currency.DoesNotExist:
            self.stdout.write(self.style.ERROR('GHS currency not found. Run initialize_currencies first.'))
            return

        # Default exchange rates from GHS to other currencies
        # These are approximate rates - admin should update with live rates
        default_rates = {
            'USD': Decimal('0.0625'),    # 1 GHS = 0.0625 USD (1 USD = 16 GHS)
            'EUR': Decimal('0.0575'),    # 1 GHS = 0.0575 EUR
            'GBP': Decimal('0.0495'),    # 1 GHS = 0.0495 GBP
            'CHF': Decimal('0.0555'),    # 1 GHS = 0.0555 CHF
            'AUD': Decimal('0.0965'),    # 1 GHS = 0.0965 AUD
            'CAD': Decimal('0.0855'),    # 1 GHS = 0.0855 CAD
            'JPY': Decimal('9.375'),     # 1 GHS = 9.375 JPY
            'NZD': Decimal('0.1045'),    # 1 GHS = 0.1045 NZD
            'CNY': Decimal('0.455'),     # 1 GHS = 0.455 CNY
            'ZAR': Decimal('1.135'),     # 1 GHS = 1.135 ZAR
            'DKK': Decimal('0.43'),      # 1 GHS = 0.43 DKK
            'NOK': Decimal('0.685'),     # 1 GHS = 0.685 NOK
            'SEK': Decimal('0.665'),     # 1 GHS = 0.665 SEK
            'NGN': Decimal('98.5'),      # 1 GHS = 98.5 NGN
            'XOF': Decimal('37.75'),     # 1 GHS = 37.75 XOF (CFA Franc)
            'GMD': Decimal('4.375'),     # 1 GHS = 4.375 GMD
            'MRU': Decimal('2.485'),     # 1 GHS = 2.485 MRU
            'SLL': Decimal('1387.5'),    # 1 GHS = 1387.5 SLL
            'KES': Decimal('9.625'),     # 1 GHS = 9.625 KES
            'UGX': Decimal('231.25'),    # 1 GHS = 231.25 UGX
            'TZS': Decimal('168.75'),    # 1 GHS = 168.75 TZS
            'RWF': Decimal('81.25'),     # 1 GHS = 81.25 RWF
            'ETB': Decimal('7.5'),       # 1 GHS = 7.5 ETB
        }

        created_count = 0
        updated_count = 0

        for currency_code, rate in default_rates.items():
            try:
                to_currency = Currency.objects.get(code=currency_code)
                
                # Check if rate already exists
                existing = ExchangeRate.objects.filter(
                    from_currency=ghs,
                    to_currency=to_currency,
                    is_latest=True
                ).first()

                if existing:
                    # Update existing rate
                    existing.rate = rate
                    existing.source = 'admin_init'
                    existing.save()
                    updated_count += 1
                    self.stdout.write(f'  Updated: GHS -> {currency_code} = {rate}')
                else:
                    # Create new rate
                    ExchangeRate.objects.create(
                        from_currency=ghs,
                        to_currency=to_currency,
                        rate=rate,
                        source='admin_init',
                        is_latest=True
                    )
                    created_count += 1
                    self.stdout.write(f'  Created: GHS -> {currency_code} = {rate}')

            except Currency.DoesNotExist:
                self.stdout.write(self.style.WARNING(f'  Currency {currency_code} not found, skipping'))

        self.stdout.write(self.style.SUCCESS(
            f'\nSuccessfully initialized exchange rates: {created_count} created, {updated_count} updated'
        ))
        self.stdout.write(self.style.WARNING(
            '\nNote: These are default rates. Admin should update with live rates in the dashboard.'
        ))
