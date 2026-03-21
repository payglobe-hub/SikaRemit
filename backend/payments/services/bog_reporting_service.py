import requests
import logging
from django.conf import settings
from django.utils import timezone
import json
from decimal import Decimal

logger = logging.getLogger(__name__)

class BoGReportingService:
    """
    Service for reporting cross-border remittances to Bank of Ghana
    """

    @staticmethod
    def report_transaction(remittance):
        """
        Report a cross-border remittance transaction to BoG
        Args:
            remittance: CrossBorderRemittance instance
        Returns: dict with reporting status
        """
        if not settings.BOG_REPORTING_ENABLED:
            logger.info(f"BoG reporting disabled, skipping report for {remittance.reference_number}")
            return {'success': True, 'message': 'Reporting disabled'}

        if not remittance.requires_reporting():
            logger.info(f"Transaction {remittance.reference_number} below reporting threshold")
            return {'success': True, 'message': 'Below threshold'}

        try:
            payload = BoGReportingService._build_report_payload(remittance)

            headers = {
                'Authorization': f'Bearer {settings.BOG_API_KEY}',
                'Content-Type': 'application/json',
            }

            response = requests.post(
                f"{settings.BOG_API_ENDPOINT}/report",
                json=payload,
                headers=headers,
                timeout=30
            )

            if response.status_code == 200:
                data = response.json()
                remittance.report_reference = data.get('report_id')
                remittance.reported_to_regulator = True
                remittance.save()

                logger.info(f"Successfully reported transaction {remittance.reference_number} to BoG")
                return {
                    'success': True,
                    'report_id': data.get('report_id'),
                    'message': 'Reported successfully'
                }
            else:
                logger.error(f"BoG reporting failed: {response.status_code} - {response.text}")
                return {
                    'success': False,
                    'error': f'HTTP {response.status_code}: {response.text}'
                }

        except Exception as e:
            logger.error(f"BoG reporting error for {remittance.reference_number}: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    @staticmethod
    def _build_report_payload(remittance):
        """
        Build the JSON payload for BoG reporting
        """
        return {
            'transaction_type': 'cross_border_remittance',
            'reference_number': remittance.reference_number,
            'reporting_entity': {
                'name': 'SikaRemit',
                'license_number': settings.BOG_LICENSE_NUMBER if hasattr(settings, 'BOG_LICENSE_NUMBER') else 'PG-001',
                'country': 'US'
            },
            'sender': {
                'name': remittance.sender.full_name(),
                'country': 'US',  # Assuming US-based platform
                'identification': remittance.sender.id_number if hasattr(remittance.sender, 'id_number') else str(remittance.sender.id)
            },
            'recipient': {
                'name': remittance.recipient_name,
                'country': remittance.recipient_country,
                'phone': remittance.recipient_phone
            },
            'transaction_details': {
                'amount_sent': float(remittance.amount_sent),
                'amount_received': float(remittance.amount_received),
                'currency_sent': 'USD',
                'currency_received': 'GHS',
                'exchange_rate': float(remittance.exchange_rate),
                'fee': float(remittance.fee),
                'purpose': 'personal_remittance'
            },
            'compliance_info': {
                'source_of_funds_verified': remittance.source_of_funds_verified,
                'recipient_verified': remittance.recipient_verified,
                'exemption_status': remittance.exemption_status,
                'exemption_approver': remittance.exemption_approver.email if remittance.exemption_approver else None
            },
            'reporting_timestamp': timezone.now().isoformat(),
            'transaction_date': remittance.created_at.isoformat()
        }

    @staticmethod
    def check_reporting_status(reference_number):
        """
        Check the status of a previously reported transaction
        """
        if not settings.BOG_REPORTING_ENABLED:
            return {'success': True, 'status': 'reporting_disabled'}

        try:
            headers = {
                'Authorization': f'Bearer {settings.BOG_API_KEY}',
            }

            response = requests.get(
                f"{settings.BOG_API_ENDPOINT}/status/{reference_number}",
                headers=headers,
                timeout=30
            )

            if response.status_code == 200:
                return {
                    'success': True,
                    'status': response.json()
                }
            else:
                return {
                    'success': False,
                    'error': f'HTTP {response.status_code}: {response.text}'
                }

        except Exception as e:
            logger.error(f"Error checking BoG reporting status: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    @staticmethod
    def batch_report_transactions(remittances):
        """
        Report multiple transactions in a batch
        """
        if not settings.BOG_REPORTING_ENABLED:
            return {'success': True, 'message': 'Reporting disabled'}

        reportable = [r for r in remittances if r.requires_reporting() and not r.reported_to_regulator]

        if not reportable:
            return {'success': True, 'message': 'No transactions require reporting'}

        try:
            batch_payload = {
                'transactions': [BoGReportingService._build_report_payload(r) for r in reportable],
                'batch_id': f"BATCH-{timezone.now().strftime('%Y%m%d-%H%M%S')}",
                'reporting_timestamp': timezone.now().isoformat()
            }

            headers = {
                'Authorization': f'Bearer {settings.BOG_API_KEY}',
                'Content-Type': 'application/json',
            }

            response = requests.post(
                f"{settings.BOG_API_ENDPOINT}/batch-report",
                json=batch_payload,
                headers=headers,
                timeout=60  # Longer timeout for batch
            )

            if response.status_code == 200:
                data = response.json()

                # Update reported status for successful reports
                for remittance in reportable:
                    report_id = data.get('report_ids', {}).get(remittance.reference_number)
                    if report_id:
                        remittance.report_reference = report_id
                        remittance.reported_to_regulator = True
                        remittance.save()

                return {
                    'success': True,
                    'batch_id': data.get('batch_id'),
                    'reported_count': len(data.get('report_ids', {})),
                    'message': f'Successfully reported {len(data.get("report_ids", {}))} transactions'
                }
            else:
                logger.error(f"BoG batch reporting failed: {response.status_code} - {response.text}")
                return {
                    'success': False,
                    'error': f'HTTP {response.status_code}: {response.text}'
                }

        except Exception as e:
            logger.error(f"BoG batch reporting error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
