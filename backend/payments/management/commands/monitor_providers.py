from django.core.management.base import BaseCommand
from django.utils import timezone
from payments.services.verification import VerificationService
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Monitor and report verification provider status'

    def handle(self, *args, **options):
        """Run provider health checks"""
        VerificationService.check_provider_health()
        
        # Log status
        for provider, status in VerificationService._provider_status.items():
            logger.info(
                f"Provider {provider} status: {'HEALTHY' if status['healthy'] else 'UNHEALTHY'}"
            )
