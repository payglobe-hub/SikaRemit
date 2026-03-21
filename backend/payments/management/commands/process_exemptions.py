from django.core.management.base import BaseCommand
from payments.models.cross_border import CrossBorderRemittance
from django.utils import timezone
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Process pending exemption requests'

    def handle(self, *args, **options):
        """Approve/Reject pending exemptions"""
        pending = CrossBorderRemittance.objects.filter(
            exemption_status='pending',
            created_at__gte=timezone.now() - timezone.timedelta(days=1)
        )

        for remittance in pending:
            try:
                if self._approve_exemption(remittance):
                    remittance.exemption_status = 'approved'
                    remittance.save()
                    logger.info(f"Approved exemption for {remittance.reference_number}")
                else:
                    remittance.exemption_status = 'rejected'
                    remittance.save()
                    logger.warning(f"Rejected exemption for {remittance.reference_number}")
            except Exception as e:
                logger.error(f"Failed to process exemption {remittance.reference_number}: {str(e)}")

    def _approve_exemption(self, remittance):
        """Determine if exemption should be approved"""
        # Add your approval logic here
        # This could check docs, risk level, etc.
        return remittance.sender.risk_category == 'low' and \
               remittance.amount_sent <= settings.EXEMPTION_AUTO_APPROVE_LIMIT
