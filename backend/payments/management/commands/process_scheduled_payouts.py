from django.core.management.base import BaseCommand
from django.utils import timezone
from ...models import ScheduledPayout
from ...services import PaymentService
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Process all scheduled payouts that are due'

    def handle(self, *args, **options):
        due_payouts = ScheduledPayout.objects.filter(
            next_execution__lte=timezone.now(),
            status=ScheduledPayout.ACTIVE
        )
        
        if not due_payouts.exists():
            logger.info("No scheduled payouts to process")
            return
            
        logger.info(f"Processing {due_payouts.count()} scheduled payouts")
        
        for payout in due_payouts:
            try:
                # Process payout via PaymentService
                PaymentService.process_payout(
                    merchant=payout.merchant,
                    amount=payout.amount
                )
                
                # Update next execution time
                payout.calculate_next_execution()
                payout.save()
                
                logger.info(f"Processed payout {payout.id} for {payout.merchant.business_name}")
                
            except Exception as e:
                logger.error(f"Failed to process payout {payout.id}: {str(e)}")
