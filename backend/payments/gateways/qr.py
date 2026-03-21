from .base import PaymentGateway
from django.conf import settings
import qrcode
import io
import base64
import logging
import json
import uuid
from datetime import datetime, timedelta
from django.utils import timezone
from django.core.cache import cache

logger = logging.getLogger(__name__)

class QRPaymentGateway(PaymentGateway):
    """Complete QR Code payment gateway implementation with scanning and processing"""

    def __init__(self):
        self.expiry_minutes = getattr(settings, 'QR_PAYMENT_EXPIRY', 15)
        self.cache_timeout = self.expiry_minutes * 60  # Convert to seconds

    def process_payment(self, amount, currency, payment_method, customer, merchant, metadata=None):
        """Generate QR code for payment with enhanced metadata"""
        try:
            # Generate unique payment reference
            payment_ref = f"QR_{uuid.uuid4()}_{merchant.id}_{amount}_{int(datetime.now().timestamp())}"

            # Create comprehensive payment payload
            payload = {
                'version': '1.0',
                'type': 'payment',
                'merchant_id': merchant.id,
                'merchant_name': merchant.business_name,
                'amount': float(amount),
                'currency': currency,
                'reference': payment_ref,
                'customer_id': customer.id,
                'customer_email': customer.email,
                'expiry': (datetime.now() + timedelta(minutes=self.expiry_minutes)).isoformat(),
                'timestamp': datetime.now().isoformat(),
                'metadata': metadata or {},
                'signature': self._generate_payload_signature({
                    'merchant_id': merchant.id,
                    'amount': float(amount),
                    'currency': currency,
                    'reference': payment_ref,
                    'timestamp': datetime.now().isoformat()
                })
            }

            # Generate QR code image
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )

            # Add payload as JSON string
            qr.add_data(json.dumps(payload, separators=(',', ':')))
            qr.make(fit=True)

            img = qr.make_image(fill_color="black", back_color="white")

            # Convert to base64
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            qr_base64 = base64.b64encode(buffer.getvalue()).decode()

            # Cache payment data for validation
            cache_key = f"qr_payment_{payment_ref}"
            cache.set(cache_key, {
                'payload': payload,
                'status': 'pending',
                'created_at': datetime.now().isoformat(),
                'merchant_id': merchant.id,
                'customer_id': customer.id,
                'amount': float(amount),
                'currency': currency
            }, self.cache_timeout)

            return {
                'success': True,
                'transaction_id': payment_ref,
                'qr_code': qr_base64,
                'qr_data': payload,  # For debugging/testing
                'expiry_minutes': self.expiry_minutes,
                'reference': payment_ref,
                'raw_response': {
                    'qr_generated': True,
                    'cache_key': cache_key,
                    'expires_at': payload['expiry']
                }
            }

        except Exception as e:
            logger.error(f"QR generation failed: {str(e)}")
            return {
                'success': False,
                'error': f"QR generation failed: {str(e)}"
            }

    def validate_qr_payment(self, qr_data, scanner_user=None):
        """Validate and process scanned QR payment"""
        try:
            # Parse QR data if it's a string
            if isinstance(qr_data, str):
                qr_data = json.loads(qr_data)

            # Verify payload signature
            signature_data = {
                'merchant_id': qr_data['merchant_id'],
                'amount': qr_data['amount'],
                'currency': qr_data['currency'],
                'reference': qr_data['reference'],
                'timestamp': qr_data['timestamp']
            }

            if not self._verify_payload_signature(signature_data, qr_data.get('signature')):
                return {
                    'valid': False,
                    'error': 'Invalid QR code signature'
                }

            # Check expiry
            expiry_time = datetime.fromisoformat(qr_data['expiry'])
            if datetime.now() > expiry_time:
                return {
                    'valid': False,
                    'error': 'QR code has expired'
                }

            # Check cache for payment status
            cache_key = f"qr_payment_{qr_data['reference']}"
            cached_data = cache.get(cache_key)

            if not cached_data:
                return {
                    'valid': False,
                    'error': 'QR code not found or expired'
                }

            if cached_data['status'] != 'pending':
                return {
                    'valid': False,
                    'error': f'Payment already {cached_data["status"]}'
                }

            # Verify scanner is not the same as customer (prevent self-payment)
            if scanner_user and scanner_user.id == cached_data['customer_id']:
                return {
                    'valid': False,
                    'error': 'Cannot scan your own QR code'
                }

            return {
                'valid': True,
                'payment_data': cached_data,
                'qr_data': qr_data,
                'reference': qr_data['reference']
            }

        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.error(f"QR validation failed: {str(e)}")
            return {
                'valid': False,
                'error': 'Invalid QR code format'
            }

    def process_qr_scan(self, qr_reference, scanner_user, payment_method=None):
        """Process payment after QR scan validation"""
        try:
            cache_key = f"qr_payment_{qr_reference}"
            cached_data = cache.get(cache_key)

            if not cached_data or cached_data['status'] != 'pending':
                return {
                    'success': False,
                    'error': 'Payment not found or already processed'
                }

            # Verify scanner has sufficient balance
            from ..services.currency_service import WalletService
            from ..models import Currency

            currency = Currency.objects.get(code=cached_data['currency'])
            scanner_balance = WalletService.get_wallet_balance(scanner_user, currency)

            if scanner_balance.available_balance < cached_data['amount']:
                return {
                    'success': False,
                    'error': f'Insufficient balance. Required: {cached_data["currency"]} {cached_data["amount"]}'
                }

            # Process the payment
            from django.db import transaction as db_transaction

            with db_transaction.atomic():
                # Deduct from scanner
                success = WalletService.deduct_from_wallet(
                    scanner_user, currency, cached_data['amount']
                )

                if not success:
                    return {
                        'success': False,
                        'error': 'Payment processing failed'
                    }

                # Add to merchant (or customer if it's a P2P payment)
                from users.models import User
                try:
                    merchant = User.objects.get(id=cached_data['merchant_id'])
                    WalletService.add_to_wallet(merchant, currency, cached_data['amount'])
                except User.DoesNotExist:
                    logger.error(f"Merchant not found: {cached_data['merchant_id']}")
                    return {
                        'success': False,
                        'error': 'Merchant not found'
                    }

                # Create transaction record
                from ..models.transaction import Transaction
                transaction = Transaction.objects.create(
                    customer=scanner_user.customer_profile,
                    merchant=merchant.customer_profile if hasattr(merchant, 'customer_profile') else None,
                    amount=cached_data['amount'],
                    currency=cached_data['currency'],
                    payment_method=payment_method,
                    status=Transaction.COMPLETED,
                    description=f"QR Payment to {merchant.email}",
                    metadata={
                        'transaction_type': 'qr_payment',
                        'qr_reference': qr_reference,
                        'scanned_by': scanner_user.id,
                        'original_customer': cached_data['customer_id']
                    }
                )

                # Update cache status
                cached_data['status'] = 'completed'
                cached_data['completed_at'] = datetime.now().isoformat()
                cached_data['transaction_id'] = transaction.id
                cache.set(cache_key, cached_data, 3600)  # Keep completed status for 1 hour

                return {
                    'success': True,
                    'transaction_id': transaction.id,
                    'amount': cached_data['amount'],
                    'currency': cached_data['currency'],
                    'merchant': merchant.email,
                    'reference': qr_reference
                }

        except Exception as e:
            logger.error(f"QR payment processing failed: {str(e)}")
            return {
                'success': False,
                'error': f'Payment failed: {str(e)}'
            }

    def refund_payment(self, transaction_id, amount=None):
        """QR payments are instant - refunds go through original payment method"""
        return {
            'success': False,
            'error': 'Refunds must be processed through original payment method'
        }

    def _generate_payload_signature(self, data):
        """Generate HMAC signature for QR payload"""
        import hmac
        import hashlib

        secret = getattr(settings, 'QR_SIGNATURE_SECRET', 'default_qr_secret')
        message = json.dumps(data, sort_keys=True, separators=(',', ':'))

        return hmac.new(
            secret.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()

    def _verify_payload_signature(self, data, signature):
        """Verify HMAC signature for QR payload"""
        expected_signature = self._generate_payload_signature(data)
        return hmac.compare_digest(expected_signature, signature)
