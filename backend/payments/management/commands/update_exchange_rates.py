from django.core.management.base import BaseCommand
from payments.services.currency_service import CurrencyService

class Command(BaseCommand):
    help = 'Update exchange rates from external API'

    def handle(self, *args, **options):
        self.stdout.write('Updating exchange rates...')
        success = CurrencyService.update_exchange_rates()
        if success:
            self.stdout.write(self.style.SUCCESS('Exchange rates updated successfully'))
        else:
            self.stdout.write(self.style.ERROR('Failed to update exchange rates'))
