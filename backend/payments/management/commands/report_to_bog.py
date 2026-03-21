from django.core.management.base import BaseCommand
from django.conf import settings
from payments.models.cross_border import CrossBorderRemittance
import requests
import json
import logging
from datetime import timedelta, datetime

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Report large remittances to Bank of Ghana'

    def handle(self, *args, **options):
        """Find and report unreported large transactions"""
        unreported = CrossBorderRemittance.objects.filter(
            reported_to_regulator=False,
            requires_reporting=True,
            created_at__gte=datetime.now() - timedelta(days=1)
        )

        for remittance in unreported:
            try:
                response = self.submit_bog_report(remittance)
                remittance.reported_to_regulator = True
                remittance.report_reference = response.get('reference')
                remittance.save()
                logger.info(f"Reported remittance {remittance.reference_number} to BoG")
            except Exception as e:
                logger.error(f"Failed to report {remittance.reference_number}: {str(e)}")

    def submit_bog_report(self, remittance):
        """Custom BoG reporting format"""
        payload = {
            "transaction": {
                "reference": remittance.reference_number,
                "date": remittance.created_at.strftime('%Y-%m-%dT%H:%M:%SZ'),
                "amount": {
                    "value": float(remittance.amount_sent),
                    "currency": settings.DEFAULT_CURRENCY
                },
                "exchange_rate": float(remittance.exchange_rate)
            },
            "parties": {
                "sender": {
                    "type": "EXEMPT" if remittance.exempt_status else "INDIVIDUAL",
                    "reference": str(remittance.sender.id),
                    "country": settings.BASE_COUNTRY
                },
                "recipient": {
                    "name": remittance.recipient_name,
                    "phone": remittance.recipient_phone,
                    "country": remittance.recipient_country
                }
            },
            "compliance": {
                "source_verified": remittance.source_of_funds_verified,
                "recipient_verified": remittance.recipient_verified,
                "exempt": bool(remittance.exempt_status)
            }
        }

        headers = {
            "Authorization": f"Bearer {settings.BOG_API_KEY}",
            "Content-Type": "application/json"
        }

        response = requests.post(
            settings.BOG_REPORTING_URL,
            data=json.dumps(payload),
            headers=headers
        )
        response.raise_for_status()

        return response.json()
