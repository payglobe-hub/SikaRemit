"""
Automated Merchant Settlement Engine for SikaRemit

Calculates pending settlement amounts, creates settlement batches,
and triggers payouts to merchants on a configurable schedule.
"""

import logging
import uuid
from decimal import Decimal
from django.db import models, transaction as db_transaction
from django.utils import timezone
from django.conf import settings
from datetime import timedelta

from payments.models.transaction import Transaction
from payments.models.ledger import LedgerService

logger = logging.getLogger(__name__)


class SettlementBatch:
    """
    Lightweight value object representing a settlement batch.
    Stored as metadata on LedgerJournal — no extra model needed.
    """
    def __init__(self, batch_id, merchant, amount, currency, transaction_ids):
        self.batch_id = batch_id
        self.merchant = merchant
        self.amount = amount
        self.currency = currency
        self.transaction_ids = transaction_ids


class SettlementService:
    """
    Automated settlement engine for merchant payouts.
    """

    # Settlement schedule: merchants are settled daily by default
    DEFAULT_SETTLEMENT_DELAY_HOURS = 24
    # Minimum amount to trigger a settlement (avoid micro-payouts)
    MINIMUM_SETTLEMENT_AMOUNT = Decimal('1.00')

    @classmethod
    def get_pending_settlements(cls, merchant_user=None):
        """
        Calculate pending settlement amounts per merchant.
        A transaction is settlement-eligible if:
        - status is 'completed'
        - it's older than the settlement delay
        - it hasn't been settled yet (no settlement journal exists)
        """
        cutoff = timezone.now() - timedelta(
            hours=cls.DEFAULT_SETTLEMENT_DELAY_HOURS
        )

        qs = Transaction.objects.filter(
            status='completed',
            created_at__lte=cutoff,
        ).exclude(
            # Exclude already-settled transactions
            journal_entries__reference__startswith='SETTLE-'
        )

        if merchant_user:
            qs = qs.filter(
                models.Q(metadata__merchant_id__isnull=False) |
                models.Q(payment_method__user=merchant_user)
            )

        # Group by merchant (using payment_method.user as proxy)
        pending = {}
        for txn in qs.select_related('payment_method', 'payment_method__user'):
            merchant = getattr(txn, 'merchant', None)
            if not merchant and txn.payment_method:
                # For merchant transactions, the merchant is typically in metadata
                merchant_id = None
                if txn.metadata and isinstance(txn.metadata, dict):
                    merchant_id = txn.metadata.get('merchant_id')

                if not merchant_id:
                    continue

                from users.models import User
                try:
                    merchant = User.objects.get(id=merchant_id)
                except User.DoesNotExist:
                    continue

            if not merchant:
                continue

            key = str(merchant.id)
            if key not in pending:
                pending[key] = {
                    'merchant': merchant,
                    'amount': Decimal('0'),
                    'currency': txn.currency if hasattr(txn, 'currency') else 'GHS',
                    'transaction_ids': [],
                    'transaction_count': 0,
                }

            amount = Decimal(str(txn.amount)) if txn.amount else Decimal('0')
            pending[key]['amount'] += amount
            pending[key]['transaction_ids'].append(str(txn.id))
            pending[key]['transaction_count'] += 1

        return pending

    @classmethod
    @db_transaction.atomic
    def settle_merchant(cls, merchant_user, amount, currency, transaction_ids):
        """
        Execute a single merchant settlement:
        1. Record in ledger (double-entry)
        2. Mark transactions as settled
        3. Return settlement batch info
        """
        if amount < cls.MINIMUM_SETTLEMENT_AMOUNT:
            logger.info(
                f"Settlement for {merchant_user.email} skipped: "
                f"{amount} below minimum {cls.MINIMUM_SETTLEMENT_AMOUNT}"
            )
            return None

        batch_id = f"SETTLE-{merchant_user.id}-{uuid.uuid4().hex[:8]}"

        # Record in double-entry ledger
        journal = LedgerService.record_merchant_settlement(
            merchant_user=merchant_user,
            amount=amount,
            currency=currency,
            reference=batch_id,
        )

        # Mark transactions as settled
        Transaction.objects.filter(
            id__in=transaction_ids
        ).update(status='settled')

        logger.info(
            f"Settlement {batch_id}: {amount} {currency} to {merchant_user.email} "
            f"({len(transaction_ids)} transactions)"
        )

        return SettlementBatch(
            batch_id=batch_id,
            merchant=merchant_user,
            amount=amount,
            currency=currency,
            transaction_ids=transaction_ids,
        )

    @classmethod
    def run_settlements(cls):
        """
        Main entry point: find all pending settlements and execute them.
        Designed to be called by Celery beat (e.g. daily at 2am).
        Returns a summary report.
        """
        pending = cls.get_pending_settlements()

        results = {
            'settled': [],
            'skipped': [],
            'errors': [],
            'total_amount': Decimal('0'),
            'merchant_count': 0,
        }

        for key, data in pending.items():
            try:
                batch = cls.settle_merchant(
                    merchant_user=data['merchant'],
                    amount=data['amount'],
                    currency=data['currency'],
                    transaction_ids=data['transaction_ids'],
                )
                if batch:
                    results['settled'].append({
                        'batch_id': batch.batch_id,
                        'merchant_email': batch.merchant.email,
                        'amount': str(batch.amount),
                        'currency': batch.currency,
                        'transaction_count': len(batch.transaction_ids),
                    })
                    results['total_amount'] += batch.amount
                    results['merchant_count'] += 1
                else:
                    results['skipped'].append({
                        'merchant_email': data['merchant'].email,
                        'amount': str(data['amount']),
                        'reason': 'Below minimum settlement amount',
                    })
            except Exception as e:
                logger.error(f"Settlement failed for merchant {key}: {e}")
                results['errors'].append({
                    'merchant_id': key,
                    'error': str(e),
                })

        results['total_amount'] = str(results['total_amount'])
        results['generated_at'] = timezone.now().isoformat()

        logger.info(
            f"Settlement run complete: {results['merchant_count']} merchants, "
            f"{results['total_amount']} total"
        )

        return results
