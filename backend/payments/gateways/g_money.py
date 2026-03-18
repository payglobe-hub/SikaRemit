# ====================================================================================
# SikaRemit G-Money Payment Gateway Integration
# Powered by GCB Bank Ghana - Nexus API for fintech partners
# ====================================================================================

import json
import uuid
from datetime import datetime
import requests
from django.conf import settings
from django.http import JsonResponse
from django.utils import timezone
import logging
import hmac
import hashlib
from decimal import Decimal

from .base import PaymentGateway

logger = logging.getLogger(__name__)

class GMoneyGateway(PaymentGateway):
    """
    G-Money payment gateway integration via GCB Bank Nexus API
    Supports collections and disbursements for Ghana mobile money
    """

    # Gateway configuration
    GATEWAY_NAME = 'g_money'
    SUPPORTED_CURRENCIES = ['GHS']
    MAX_TRANSACTION_AMOUNT = Decimal('10000.00')  # GHS 10,000
    MIN_TRANSACTION_AMOUNT = Decimal('1.00')     # GHS 1
    PROCESSING_FEE_PERCENTAGE = Decimal('1.2')   # 1.2% competitive fee
    PROCESSING_FEE_FIXED = Decimal('0.00')       # No fixed fee

    # API endpoints
    COLLECTIONS_ENDPOINT = '/api/v1/collections'
    DISBURSEMENTS_ENDPOINT = '/api/v1/disbursements'
    STATUS_CHECK_ENDPOINT = '/api/v1/transactions/{transaction_id}/status'

    # Webhook configuration
    SIGNATURE_HEADER = 'X-G-Money-Signature'

    def __init__(self):
        """Initialize G-Money gateway with configuration"""
        self.api_key = getattr(settings, 'G_MONEY_API_KEY', None)
        self.api_secret = getattr(settings, 'G_MONEY_API_SECRET', None)
        self.api_url = getattr(settings, 'G_MONEY_API_URL', 'https://api.gcb.com.gh/nexus')
        self.webhook_secret = getattr(settings, 'G_MONEY_WEBHOOK_SECRET', None)

        # Validate configuration
        if not all([self.api_key, self.api_secret, self.api_url]):
            raise ValueError("G-Money gateway configuration incomplete")

        # Setup session with retry configuration
        self.session = requests.Session()
        self.session.timeout = 30

    def process_payment(self, amount, currency, payment_method, customer, merchant, metadata=None):
        """
        Process payment collection via G-Money Nexus API

        Args:
            amount: Transaction amount
            currency: Transaction currency (must be GHS)
            payment_method: Customer mobile money details
            customer: Customer model instance
            merchant: Merchant model instance
            metadata: Additional transaction metadata

        Returns:
            dict: Transaction result
        """
        try:
            # Validate inputs
            if currency != 'GHS':
                return {
                    'success': False,
                    'error': 'G-Money only supports GHS currency'
                }

            if amount > self.MAX_TRANSACTION_AMOUNT or amount < self.MIN_TRANSACTION_AMOUNT:
                return {
                    'success': False,
                    'error': f'Amount must be between {self.MIN_TRANSACTION_AMOUNT} and {self.MAX_TRANSACTION_AMOUNT} GHS'
                }

            # Validate mobile money number
            mobile_number = payment_method.get('mobile_number')
            network = payment_method.get('network')

            if not self._validate_mobile_number(mobile_number, network):
                return {
                    'success': False,
                    'error': 'Invalid mobile number or unsupported network'
                }

            # Generate transaction reference
            transaction_ref = f"SR-{uuid.uuid4().hex[:16].upper()}"

            # Prepare collection payload
            payload = {
                'reference': transaction_ref,
                'amount': str(amount),
                'currency': currency,
                'mobile_number': mobile_number,
                'network': network,
                'description': f"Payment to {merchant.business_name}",
                'callback_url': getattr(settings, 'PAYMENT_CALLBACK_URL', ''),
                'metadata': {
                    'customer_id': str(customer.id),
                    'merchant_id': str(merchant.id),
                    'transaction_type': 'collection',
                    **(metadata or {})
                }
            }

            # Make API request
            response = self._make_request(self.COLLECTIONS_ENDPOINT, payload)

            if response.get('success'):
                return {
                    'success': True,
                    'transaction_id': transaction_ref,
                    'gateway_transaction_id': response.get('transaction_id'),
                    'status': 'pending',  # G-Money collections are asynchronous
                    'raw_response': response
                }
            else:
                return {
                    'success': False,
                    'error': response.get('message', 'Collection failed'),
                    'raw_response': response
                }

        except Exception as e:
            logger.error(f"G-Money collection error: {str(e)}")
            return {
                'success': False,
                'error': 'Internal processing error'
            }

    def refund_payment(self, transaction_id, amount=None):
        """
        Process disbursement (refund) via G-Money Nexus API

        Args:
            transaction_id: Original transaction reference
            amount: Refund amount (if partial)

        Returns:
            dict: Refund result
        """
        try:
            # For refunds, we need to disburse to the original sender
            # This would typically be called with original transaction details

            # Generate disbursement reference
            disbursement_ref = f"REF-{transaction_id}"

            payload = {
                'reference': disbursement_ref,
                'original_transaction': transaction_id,
                'amount': str(amount) if amount else None,
                'description': f"Refund for transaction {transaction_id}",
                'callback_url': getattr(settings, 'PAYMENT_CALLBACK_URL', '')
            }

            response = self._make_request(self.DISBURSEMENTS_ENDPOINT, payload)

            if response.get('success'):
                return {
                    'success': True,
                    'transaction_id': disbursement_ref,
                    'gateway_transaction_id': response.get('transaction_id'),
                    'status': 'pending',
                    'raw_response': response
                }
            else:
                return {
                    'success': False,
                    'error': response.get('message', 'Disbursement failed'),
                    'raw_response': response
                }

        except Exception as e:
            logger.error(f"G-Money refund error: {str(e)}")
            return {
                'success': False,
                'error': 'Refund processing error'
            }

    def check_transaction_status(self, transaction_id):
        """
        Check transaction status via G-Money API

        Args:
            transaction_id: Transaction reference to check

        Returns:
            dict: Status information
        """
        try:
            endpoint = self.STATUS_CHECK_ENDPOINT.format(transaction_id=transaction_id)
            response = self._make_request(endpoint, {})

            return {
                'success': True,
                'status': response.get('status', 'unknown'),
                'details': response
            }

        except Exception as e:
            logger.error(f"G-Money status check error: {str(e)}")
            return {
                'success': False,
                'error': 'Status check failed'
            }

    def _make_request(self, endpoint, payload):
        """
        Make authenticated API request to G-Money Nexus

        Args:
            endpoint: API endpoint
            payload: Request payload

        Returns:
            dict: API response
        """
        url = f"{self.api_url}{endpoint}"

        # Add timestamp for request signing
        timestamp = datetime.utcnow().isoformat()
        payload['timestamp'] = timestamp

        # Create signature
        payload_json = json.dumps(payload, sort_keys=True)
        signature = hmac.new(
            self.api_secret.encode(),
            payload_json.encode(),
            hashlib.sha256
        ).hexdigest()

        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
            'X-G-Money-Signature': signature,
            'X-Timestamp': timestamp
        }

        try:
            response = self.session.post(url, json=payload, headers=headers)
            response.raise_for_status()

            return response.json()

        except requests.exceptions.RequestException as e:
            logger.error(f"G-Money API request failed: {str(e)}")
            raise

    def _validate_mobile_number(self, mobile_number, network):
        """
        Validate Ghana mobile money number and network

        Args:
            mobile_number: Mobile number to validate
            network: Network provider

        Returns:
            bool: Validation result
        """
        if not mobile_number or not network:
            return False

        # Remove any spaces, dashes, or +233 prefix
        clean_number = mobile_number.replace(' ', '').replace('-', '').replace('+233', '').replace('+', '')

        # Validate Ghana number format (9-10 digits)
        if not (9 <= len(clean_number) <= 10 and clean_number.isdigit()):
            return False

        # Validate network prefixes
        network_prefixes = {
            'mtn': ['024', '054', '055', '059'],
            'vodafone': ['020', '050'],
            'airteltigo': ['027', '057', '026', '056']
        }

        if network.lower() not in network_prefixes:
            return False

        # Check if number starts with valid prefix
        prefix = clean_number[:3]
        return prefix in network_prefixes[network.lower()]

    def get_webhook_secret(self):
        """Get webhook verification secret"""
        return self.webhook_secret

    def parse_webhook(self, request):
        """
        Parse G-Money webhook payload

        Returns:
            dict: Standardized webhook event
        """
        try:
            payload = json.loads(request.body)

            return {
                'event_type': payload.get('event'),
                'transaction_id': payload.get('reference'),
                'gateway_transaction_id': payload.get('transaction_id'),
                'status': payload.get('status'),
                'amount': payload.get('amount'),
                'currency': payload.get('currency'),
                'mobile_number': payload.get('mobile_number'),
                'network': payload.get('network'),
                'timestamp': payload.get('timestamp'),
                'metadata': payload.get('metadata', {}),
                'raw_payload': payload
            }

        except json.JSONDecodeError as e:
            logger.error(f"Invalid webhook payload: {str(e)}")
            raise ValueError("Invalid JSON payload")

    def process_webhook(self, event):
        """
        Process G-Money webhook event

        Args:
            event: Parsed webhook event

        Returns:
            JsonResponse: Webhook response
        """
        try:
            event_type = event['event_type']
            transaction_id = event['transaction_id']
            status = event['status']

            logger.info(f"Processing G-Money webhook: {event_type} for {transaction_id}")

            # Update transaction status based on webhook
            if event_type == 'collection.completed':
                # Update transaction as completed
                self._update_transaction_status(transaction_id, 'completed', event)
            elif event_type == 'collection.failed':
                # Update transaction as failed
                self._update_transaction_status(transaction_id, 'failed', event)
            elif event_type == 'disbursement.completed':
                # Update refund as completed
                self._update_transaction_status(transaction_id, 'refunded', event)
            elif event_type == 'disbursement.failed':
                # Update refund as failed
                self._update_transaction_status(transaction_id, 'refund_failed', event)

            return JsonResponse({'status': 'processed'})

        except Exception as e:
            logger.error(f"G-Money webhook processing error: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)

    def _update_transaction_status(self, transaction_id, status, event_data):
        """
        Update transaction status in database

        Args:
            transaction_id: Transaction reference
            status: New status
            event_data: Webhook event data
        """
        from payments.models import Transaction

        try:
            transaction = Transaction.objects.get(reference=transaction_id)
            transaction.status = status
            transaction.gateway_response = event_data
            transaction.completed_at = timezone.now() if status in ['completed', 'refunded'] else None
            transaction.save()

            logger.info(f"Updated transaction {transaction_id} to status {status}")

        except Transaction.DoesNotExist:
            logger.error(f"Transaction {transaction_id} not found")
        except Exception as e:
            logger.error(f"Error updating transaction {transaction_id}: {str(e)}")

    @property
    def signature_header(self):
        """Webhook signature header name"""
        return self.SIGNATURE_HEADER
