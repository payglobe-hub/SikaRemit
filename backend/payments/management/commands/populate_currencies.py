from django.core.management.base import BaseCommand
from payments.models import Currency


class Command(BaseCommand):
    help = 'Populate currencies in the database'

    def handle(self, *args, **options):
        currencies_data = [
            ('USD', 'US Dollar', '$', 2, True, '🇺🇸'),
            ('EUR', 'Euro', '€', 2, False, '🇪🇺'),
            ('GBP', 'British Pound', '£', 2, False, '🇬🇧'),
            ('GHS', 'Ghanaian Cedi', '₵', 2, False, '🇬🇭'),
            ('NGN', 'Nigerian Naira', '₦', 2, False, '🇳🇬'),
            ('KES', 'Kenyan Shilling', 'KSh', 2, False, '🇰🇪'),
            ('ZAR', 'South African Rand', 'R', 2, False, '🇿🇦'),
            ('UGX', 'Ugandan Shilling', 'USh', 0, False, '🇺🇬'),
            ('TZS', 'Tanzanian Shilling', 'TSh', 2, False, '🇹🇿'),
            ('RWF', 'Rwandan Franc', 'FRw', 0, False, '🇷🇼'),
            ('ETB', 'Ethiopian Birr', 'Br', 2, False, '🇪🇹'),
            ('XOF', 'West African CFA Franc', 'CFA', 0, False, '🇧🇫'),
            ('CAD', 'Canadian Dollar', 'C$', 2, False, '🇨🇦'),
            ('AUD', 'Australian Dollar', 'A$', 2, False, '🇦🇺'),
            ('JPY', 'Japanese Yen', '¥', 0, False, '🇯🇵'),
            ('CNY', 'Chinese Yuan', '¥', 2, False, '🇨🇳'),
            ('INR', 'Indian Rupee', '₹', 2, False, '🇮🇳'),
            ('BRL', 'Brazilian Real', 'R$', 2, False, '🇧🇷'),
            ('MXN', 'Mexican Peso', '$', 2, False, '🇲🇽'),
        ]

        created_count = 0
        updated_count = 0

        for code, name, symbol, decimal_places, is_base, flag in currencies_data:
            currency, created = Currency.objects.update_or_create(
                code=code,
                defaults={
                    'name': name,
                    'symbol': symbol,
                    'decimal_places': decimal_places,
                    'is_base_currency': is_base,
                    'flag_emoji': flag,
                    'is_active': True,
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'Created currency: {code} - {name}'))
            else:
                updated_count += 1
                self.stdout.write(self.style.WARNING(f'Updated currency: {code} - {name}'))

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully processed currencies: {created_count} created, {updated_count} updated'
            )
        )
