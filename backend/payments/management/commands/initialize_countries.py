from django.core.management.base import BaseCommand
from payments.models import Country, Currency

class Command(BaseCommand):
    help = 'Initialize countries that match the 24 BoG currencies'

    def handle(self, *args, **options):
        self.stdout.write('Initializing countries to match BoG currencies...')

        # Only 24 countries that match our 24 BoG currencies
        # Ghana is the default/base country
        countries_data = [
            # Base country - Ghana (GHS)
            {'code': 'GH', 'name': 'Ghana', 'flag_emoji': '🇬🇭', 'phone_code': '+233', 'currency_code': 'GHS', 'is_default': True},
            # Major international (matching BoG currencies)
            {'code': 'US', 'name': 'United States', 'flag_emoji': '🇺🇸', 'phone_code': '+1', 'currency_code': 'USD'},
            {'code': 'EU', 'name': 'European Union', 'flag_emoji': '🇪🇺', 'phone_code': '', 'currency_code': 'EUR'},
            {'code': 'GB', 'name': 'United Kingdom', 'flag_emoji': '🇬🇧', 'phone_code': '+44', 'currency_code': 'GBP'},
            {'code': 'CH', 'name': 'Switzerland', 'flag_emoji': '🇨🇭', 'phone_code': '+41', 'currency_code': 'CHF'},
            {'code': 'AU', 'name': 'Australia', 'flag_emoji': '🇦🇺', 'phone_code': '+61', 'currency_code': 'AUD'},
            {'code': 'CA', 'name': 'Canada', 'flag_emoji': '🇨🇦', 'phone_code': '+1', 'currency_code': 'CAD'},
            {'code': 'JP', 'name': 'Japan', 'flag_emoji': '🇯🇵', 'phone_code': '+81', 'currency_code': 'JPY'},
            {'code': 'NZ', 'name': 'New Zealand', 'flag_emoji': '🇳🇿', 'phone_code': '+64', 'currency_code': 'NZD'},
            {'code': 'CN', 'name': 'China', 'flag_emoji': '🇨🇳', 'phone_code': '+86', 'currency_code': 'CNY'},
            {'code': 'ZA', 'name': 'South Africa', 'flag_emoji': '🇿🇦', 'phone_code': '+27', 'currency_code': 'ZAR'},
            # Scandinavian countries (matching BoG currencies)
            {'code': 'DK', 'name': 'Denmark', 'flag_emoji': '🇩🇰', 'phone_code': '+45', 'currency_code': 'DKK'},
            {'code': 'NO', 'name': 'Norway', 'flag_emoji': '🇳🇴', 'phone_code': '+47', 'currency_code': 'NOK'},
            {'code': 'SE', 'name': 'Sweden', 'flag_emoji': '🇸🇪', 'phone_code': '+46', 'currency_code': 'SEK'},
            # African countries (matching BoG currencies)
            {'code': 'NG', 'name': 'Nigeria', 'flag_emoji': '🇳🇬', 'phone_code': '+234', 'currency_code': 'NGN'},
            {'code': 'XO', 'name': 'West Africa (CFA Zone)', 'flag_emoji': '🌍', 'phone_code': '', 'currency_code': 'XOF'},
            {'code': 'GM', 'name': 'Gambia', 'flag_emoji': '🇬🇲', 'phone_code': '+220', 'currency_code': 'GMD'},
            {'code': 'MR', 'name': 'Mauritania', 'flag_emoji': '🇲🇷', 'phone_code': '+222', 'currency_code': 'MRU'},
            {'code': 'SL', 'name': 'Sierra Leone', 'flag_emoji': '🇸🇱', 'phone_code': '+232', 'currency_code': 'SLL'},
            # East African countries (matching BoG currencies)
            {'code': 'KE', 'name': 'Kenya', 'flag_emoji': '🇰🇪', 'phone_code': '+254', 'currency_code': 'KES'},
            {'code': 'UG', 'name': 'Uganda', 'flag_emoji': '🇺🇬', 'phone_code': '+256', 'currency_code': 'UGX'},
            {'code': 'TZ', 'name': 'Tanzania', 'flag_emoji': '🇹🇿', 'phone_code': '+255', 'currency_code': 'TZS'},
            {'code': 'RW', 'name': 'Rwanda', 'flag_emoji': '🇷🇼', 'phone_code': '+250', 'currency_code': 'RWF'},
            {'code': 'ET', 'name': 'Ethiopia', 'flag_emoji': '🇪🇹', 'phone_code': '+251', 'currency_code': 'ETB'},
        ]

        # First, deactivate all existing countries
        Country.objects.all().update(is_active=False)
        self.stdout.write('Deactivated all existing countries')

        created_count = 0
        updated_count = 0

        for country_data in countries_data:
            currency = None
            if country_data['currency_code']:
                try:
                    currency = Currency.objects.get(code=country_data['currency_code'])
                except Currency.DoesNotExist:
                    self.stdout.write(
                        self.style.WARNING(
                            f"Currency {country_data['currency_code']} not found for {country_data['name']}"
                        )
                    )

            country, created = Country.objects.update_or_create(
                code=country_data['code'],
                defaults={
                    'name': country_data['name'],
                    'flag_emoji': country_data['flag_emoji'],
                    'phone_code': country_data['phone_code'],
                    'currency': currency,
                    'is_active': True
                }
            )

            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully initialized 24 countries: {created_count} created, {updated_count} updated'
            )
        )
        self.stdout.write(
            self.style.SUCCESS(
                'Ghana (GH) is set as the default country with GHS currency'
            )
        )
