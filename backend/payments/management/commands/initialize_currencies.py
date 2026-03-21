from django.core.management.base import BaseCommand
from payments.services.currency_service import CurrencyService

class Command(BaseCommand):
    help = 'Initialize default currencies in the system'

    def handle(self, *args, **options):
        self.stdout.write('Initializing currencies...')
        CurrencyService.initialize_currencies()
        self.stdout.write(
            self.style.SUCCESS('Successfully initialized currencies')
        )
