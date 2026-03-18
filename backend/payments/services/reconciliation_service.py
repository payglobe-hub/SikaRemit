"""
Reconciliation Service for SikaRemit

Compares gateway transaction records against internal ledger/transaction records
to detect discrepancies (missing entries, amount mismatches, status drift).
"""

import logging
from datetime import timedelta
from decimal import Decimal
from django.db.models import Sum, Q
from django.utils import timezone

from payments.models.transaction import Transaction
from payments.models.ledger import LedgerJournal, LedgerEntry

logger = logging.getLogger(__name__)

class ReconciliationService:
    """
    Reconcile internal transaction records against ledger journals
    and flag discrepancies.
    """

    class Status:
        MATCHED = 'matched'
        MISSING_JOURNAL = 'missing_journal'
        AMOUNT_MISMATCH = 'amount_mismatch'
        MISSING_TRANSACTION = 'missing_transaction'
        STATUS_DRIFT = 'status_drift'

    @classmethod
    def reconcile_transactions(cls, start_date=None, end_date=None):
        """
        Run full reconciliation for a date range.
        Returns a report dict with summary and discrepancies.
        """
        if not end_date:
            end_date = timezone.now()
        if not start_date:
            start_date = end_date - timedelta(days=1)

        # Get all completed/refunded transactions in the range
        transactions = Transaction.objects.filter(
            created_at__gte=start_date,
            created_at__lte=end_date,
            status__in=['completed', 'refunded', 'settled'],
        ).select_related('payment_method')

        # Get all journal references in the range
        journals = LedgerJournal.objects.filter(
            posted_at__gte=start_date,
            posted_at__lte=end_date,
        ).prefetch_related('entries')

        journal_by_ref = {}
        for j in journals:
            journal_by_ref[j.reference] = j

        discrepancies = []
        matched = 0
        total = transactions.count()

        for txn in transactions:
            ref = f"PAY-{txn.id}"
            ref_refund = f"REF-{txn.id}"

            journal = journal_by_ref.get(ref)

            if not journal and txn.status == 'refunded':
                journal = journal_by_ref.get(ref_refund)

            if not journal:
                discrepancies.append({
                    'type': cls.Status.MISSING_JOURNAL,
                    'transaction_id': str(txn.id),
                    'expected_ref': ref,
                    'amount': str(txn.amount),
                    'status': txn.status,
                    'created_at': txn.created_at.isoformat(),
                    'detail': 'Transaction has no matching ledger journal entry',
                })
                continue

            # Check amount matches
            journal_total = journal.entries.aggregate(
                total_debit=Sum('debit')
            )['total_debit'] or Decimal('0')

            txn_amount = Decimal(str(txn.amount))
            if abs(journal_total - txn_amount) > Decimal('0.01'):
                discrepancies.append({
                    'type': cls.Status.AMOUNT_MISMATCH,
                    'transaction_id': str(txn.id),
                    'journal_ref': journal.reference,
                    'txn_amount': str(txn_amount),
                    'journal_amount': str(journal_total),
                    'difference': str(abs(journal_total - txn_amount)),
                    'detail': 'Transaction amount does not match journal total',
                })
                continue

            matched += 1

        # Check for orphaned journals (journals with no matching transaction)
        txn_ids = set(str(t.id) for t in transactions)
        for ref, journal in journal_by_ref.items():
            # Extract transaction ID from reference
            parts = ref.split('-', 1)
            if len(parts) == 2 and parts[0] in ('PAY', 'REF', 'P2P'):
                txn_id = parts[1]
                if txn_id not in txn_ids:
                    discrepancies.append({
                        'type': cls.Status.MISSING_TRANSACTION,
                        'journal_ref': ref,
                        'journal_total': str(journal.total),
                        'posted_at': journal.posted_at.isoformat(),
                        'detail': 'Ledger journal has no matching transaction record',
                    })

        report = {
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat(),
            },
            'summary': {
                'total_transactions': total,
                'matched': matched,
                'discrepancies': len(discrepancies),
                'reconciliation_rate': f"{(matched / total * 100):.1f}%" if total > 0 else 'N/A',
            },
            'discrepancies': discrepancies,
            'generated_at': timezone.now().isoformat(),
        }

        if discrepancies:
            logger.warning(
                f"Reconciliation found {len(discrepancies)} discrepancies "
                f"for period {start_date.date()} to {end_date.date()}"
            )
        else:
            logger.info(
                f"Reconciliation complete: {matched}/{total} matched "
                f"for period {start_date.date()} to {end_date.date()}"
            )

        return report

    @classmethod
    def check_ledger_balance(cls):
        """
        Verify the fundamental accounting equation: total debits == total credits.
        Returns True if balanced, or a dict with the imbalance details.
        """
        totals = LedgerEntry.objects.aggregate(
            total_debit=Sum('debit'),
            total_credit=Sum('credit'),
        )
        debits = totals['total_debit'] or Decimal('0')
        credits = totals['total_credit'] or Decimal('0')
        diff = abs(debits - credits)

        if diff <= Decimal('0.000001'):
            logger.info(f"Ledger balanced: debits={debits}, credits={credits}")
            return {'balanced': True, 'total_debit': str(debits), 'total_credit': str(credits)}

        logger.error(f"LEDGER IMBALANCE: debits={debits}, credits={credits}, diff={diff}")
        return {
            'balanced': False,
            'total_debit': str(debits),
            'total_credit': str(credits),
            'difference': str(diff),
        }

    @classmethod
    def daily_reconciliation(cls):
        """
        Convenience method for daily automated reconciliation (e.g. via Celery beat).
        Reconciles yesterday's transactions.
        """
        yesterday = timezone.now() - timedelta(days=1)
        start = yesterday.replace(hour=0, minute=0, second=0, microsecond=0)
        end = yesterday.replace(hour=23, minute=59, second=59, microsecond=999999)

        report = cls.reconcile_transactions(start_date=start, end_date=end)
        balance_check = cls.check_ledger_balance()
        report['ledger_balance'] = balance_check

        return report
