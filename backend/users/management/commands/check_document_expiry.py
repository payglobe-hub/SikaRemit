from django.core.management.base import BaseCommand
from django.utils import timezone
from ...models import KYCDocument

class Command(BaseCommand):
    help = 'Checks for expired KYC documents'

    def handle(self, *args, **options):
        today = timezone.now().date()
        expired = KYCDocument.objects.filter(
            expiry_date__lt=today,
            is_expired=False
        ).update(is_expired=True)
        
        self.stdout.write(f"Marked {expired} documents as expired")
