from django.core.management.base import BaseCommand
from payments.models.verification import VerificationTrend

class Command(BaseCommand):
    help = 'Update verification trend analytics'

    def handle(self, *args, **options):
        VerificationTrend.update_trends()
        self.stdout.write(self.style.SUCCESS('Updated verification trends'))
