"""
SikaRemit Balance Gateway
Internal wallet payment processor — instant, zero fees, no external APIs.
Debits sender's WalletBalance, credits merchant/recipient.
"""
from decimal import Decimal
from django.db import transaction as db_transaction
from django.utils import timezone
import logging
import uuid

from .base import PaymentGateway

logger = logging.getLogger(__name__)

class SikaRemitBalanceGateway(PaymentGateway):
    """
    Internal wallet gateway for SikaRemit balance payments.
    
    - Instant settlement (no async callbacks)
    - Zero processing fees
    - Multi-currency via WalletBalance model
    - Atomic debit/credit with Django DB transactions
    """

    def is_configured(self):
        """Always available — no external config needed."""
        return True

    def process_payment(self, amount, currency, payment_method, customer, merchant, metadata=None):
        """
        Process a payment from the sender's SikaRemit wallet balance.
        
        Atomically:
          1. Debit sender's available_balance
          2. Credit merchant's available_balance (if merchant provided)
          3. Return success with internal transaction reference
        """
        from payments.models.currency import WalletBalance, Currency

        amount = Decimal(str(amount))
        metadata = metadata or {}

        try:
            with db_transaction.atomic():
                # Resolve currency
                try:
                    currency_obj = Currency.objects.get(code=currency)
                except Currency.DoesNotExist:
                    return {
                        'success': False,
                        'error': f'Unsupported currency: {currency}',
                    }

                # Get or create sender wallet
                sender_wallet, _ = WalletBalance.objects.select_for_update().get_or_create(
                    user=customer.user,
                    currency=currency_obj,
                    defaults={'available_balance': Decimal('0'), 'pending_balance': Decimal('0'), 'reserved_balance': Decimal('0')}
                )

                # Check sufficient funds
                if sender_wallet.available_balance < amount:
                    return {
                        'success': False,
                        'error': 'Insufficient wallet balance',
                        'details': {
                            'available': str(sender_wallet.available_balance),
                            'required': str(amount),
                            'currency': currency,
                        }
                    }

                # Debit sender
                sender_wallet.available_balance -= amount
                sender_wallet.save()

                # Credit merchant if provided
                if merchant and hasattr(merchant, 'user'):
                    merchant_wallet, _ = WalletBalance.objects.select_for_update().get_or_create(
                        user=merchant.user,
                        currency=currency_obj,
                        defaults={'available_balance': Decimal('0'), 'pending_balance': Decimal('0'), 'reserved_balance': Decimal('0')}
                    )
                    merchant_wallet.available_balance += amount
                    merchant_wallet.save()

                txn_ref = f"SRB-{uuid.uuid4().hex[:12].upper()}"

                logger.info(
                    f"SikaRemit balance payment processed: {txn_ref} | "
                    f"{customer.user.email} → {merchant.user.email if merchant else 'N/A'} | "
                    f"{amount} {currency}"
                )

                return {
                    'success': True,
                    'transaction_id': txn_ref,
                    'gateway': 'sikaremit_balance',
                    'amount': str(amount),
                    'currency': currency,
                    'status': 'completed',
                    'processing_time': 'instant',
                    'fees': '0.00',
                    'raw_response': {
                        'sender_new_balance': str(sender_wallet.available_balance),
                        'timestamp': timezone.now().isoformat(),
                    }
                }

        except Exception as e:
            logger.error(f"SikaRemit balance payment error: {str(e)}")
            return {
                'success': False,
                'error': f'Wallet payment failed: {str(e)}',
            }

    def refund_payment(self, transaction_id, amount=None):
        """
        Refund a SikaRemit balance payment.
        
        Reverses the original debit/credit:
          1. Debit merchant's balance
          2. Credit customer's balance
        """
        from payments.models.transaction import Transaction
        from payments.models.currency import WalletBalance

        try:
            txn = Transaction.objects.select_related(
                'customer__user', 'merchant__user', 'payment_method'
            ).get(
                gateway_transaction_id=transaction_id
            )
        except Transaction.DoesNotExist:
            return {
                'success': False,
                'error': f'Transaction {transaction_id} not found',
            }

        refund_amount = Decimal(str(amount)) if amount else txn.amount

        try:
            with db_transaction.atomic():
                # Credit customer
                customer_wallet = WalletBalance.objects.select_for_update().get(
                    user=txn.customer.user,
                    currency__code=txn.currency,
                )
                customer_wallet.available_balance += refund_amount
                customer_wallet.save()

                # Debit merchant if applicable
                if txn.merchant:
                    merchant_wallet = WalletBalance.objects.select_for_update().get(
                        user=txn.merchant.user,
                        currency__code=txn.currency,
                    )
                    if merchant_wallet.available_balance >= refund_amount:
                        merchant_wallet.available_balance -= refund_amount
                        merchant_wallet.save()
                    else:
                        return {
                            'success': False,
                            'error': 'Merchant has insufficient balance for refund',
                        }

                refund_ref = f"SRB-R-{uuid.uuid4().hex[:10].upper()}"

                logger.info(
                    f"SikaRemit balance refund processed: {refund_ref} | "
                    f"Original: {transaction_id} | {refund_amount} {txn.currency}"
                )

                return {
                    'success': True,
                    'transaction_id': refund_ref,
                    'gateway': 'sikaremit_balance',
                    'refund_amount': str(refund_amount),
                    'status': 'completed',
                }

        except WalletBalance.DoesNotExist:
            return {
                'success': False,
                'error': 'Wallet not found for refund',
            }
        except Exception as e:
            logger.error(f"SikaRemit balance refund error: {str(e)}")
            return {
                'success': False,
                'error': f'Refund failed: {str(e)}',
            }

    def check_balance(self, user, currency='GHS'):
        """
        Check a user's available wallet balance.
        Returns the available balance or 0 if no wallet exists.
        """
        from payments.models.currency import WalletBalance

        try:
            wallet = WalletBalance.objects.get(
                user=user,
                currency__code=currency,
            )
            return {
                'success': True,
                'available_balance': str(wallet.available_balance),
                'pending_balance': str(wallet.pending_balance),
                'reserved_balance': str(wallet.reserved_balance),
                'total_balance': str(wallet.total_balance),
                'currency': currency,
            }
        except WalletBalance.DoesNotExist:
            return {
                'success': True,
                'available_balance': '0.00',
                'pending_balance': '0.00',
                'reserved_balance': '0.00',
                'total_balance': '0.00',
                'currency': currency,
            }

    # --- Webhook stubs (not needed for internal gateway) ---

    def get_webhook_secret(self):
        return None

    def parse_webhook(self, request):
        return {}

    def process_webhook(self, event):
        from django.http import JsonResponse
        return JsonResponse({'status': 'not_applicable'})
