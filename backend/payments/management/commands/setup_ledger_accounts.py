"""
Management command to create the system ledger accounts required by LedgerService.
Run once after migrations: python manage.py setup_ledger_accounts
"""
from django.core.management.base import BaseCommand
from payments.models.ledger import LedgerAccount

SYSTEM_ACCOUNTS = [
    # Assets
    {'code': 'ASSET-CASH', 'name': 'Platform Cash', 'account_type': LedgerAccount.ASSET},
    {'code': 'ASSET-BANK', 'name': 'Platform Bank Account', 'account_type': LedgerAccount.ASSET},
    {'code': 'ASSET-RECEIVABLES', 'name': 'Accounts Receivable', 'account_type': LedgerAccount.ASSET},
    # Liabilities
    {'code': 'LIA-SETTLEMENTS', 'name': 'Merchant Settlement Payable', 'account_type': LedgerAccount.LIABILITY},
    {'code': 'LIA-USER-FUNDS', 'name': 'User Funds Held', 'account_type': LedgerAccount.LIABILITY},
    # Revenue
    {'code': 'REV-FEES', 'name': 'Transaction Fee Revenue', 'account_type': LedgerAccount.REVENUE},
    {'code': 'REV-FX', 'name': 'FX Spread Revenue', 'account_type': LedgerAccount.REVENUE},
    # Expenses
    {'code': 'EXP-REFUNDS', 'name': 'Refund Expense', 'account_type': LedgerAccount.EXPENSE},
    {'code': 'EXP-CHARGEBACKS', 'name': 'Chargeback Expense', 'account_type': LedgerAccount.EXPENSE},
    {'code': 'EXP-GATEWAY', 'name': 'Gateway Processing Fees', 'account_type': LedgerAccount.EXPENSE},
    # Equity
    {'code': 'EQ-RETAINED', 'name': 'Retained Earnings', 'account_type': LedgerAccount.EQUITY},
]

class Command(BaseCommand):
    help = 'Create system ledger accounts for double-entry bookkeeping'

    def handle(self, *args, **options):
        created = 0
        for acct in SYSTEM_ACCOUNTS:
            _, was_created = LedgerAccount.objects.get_or_create(
                code=acct['code'],
                defaults={
                    'name': acct['name'],
                    'account_type': acct['account_type'],
                    'is_system': True,
                }
            )
            if was_created:
                created += 1
                self.stdout.write(self.style.SUCCESS(f"  Created: {acct['code']} — {acct['name']}"))
            else:
                self.stdout.write(f"  Exists:  {acct['code']}")

        self.stdout.write(self.style.SUCCESS(f"\nDone. {created} new accounts created, {len(SYSTEM_ACCOUNTS) - created} already existed."))
