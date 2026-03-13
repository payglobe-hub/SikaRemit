"""
Double-Entry Bookkeeping Ledger for SikaRemit

Every financial movement creates balanced debit/credit entries.
Sum of all debits always equals sum of all credits (accounting equation).

Account types and their normal balances:
  ASSET      → Debit increases  (user wallets, bank accounts, receivables)
  LIABILITY  → Credit increases (payables, merchant deposits)
  EQUITY     → Credit increases (platform equity, retained earnings)
  REVENUE    → Credit increases (fees, commissions)
  EXPENSE    → Debit increases  (refunds, chargebacks, operational costs)
"""

import uuid
from decimal import Decimal
from django.conf import settings
from django.db import models, transaction as db_transaction
from django.utils import timezone
from django.core.exceptions import ValidationError


class LedgerAccount(models.Model):
    """
    Chart of accounts — every entity that can hold or owe money.
    """
    ASSET = 'asset'
    LIABILITY = 'liability'
    EQUITY = 'equity'
    REVENUE = 'revenue'
    EXPENSE = 'expense'

    ACCOUNT_TYPES = [
        (ASSET, 'Asset'),
        (LIABILITY, 'Liability'),
        (EQUITY, 'Equity'),
        (REVENUE, 'Revenue'),
        (EXPENSE, 'Expense'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True, db_index=True)
    name = models.CharField(max_length=120)
    account_type = models.CharField(max_length=12, choices=ACCOUNT_TYPES)
    currency = models.ForeignKey(
        'payments.Currency', on_delete=models.PROTECT, null=True, blank=True
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='ledger_accounts'
    )
    parent = models.ForeignKey(
        'self', on_delete=models.CASCADE, null=True, blank=True, related_name='children'
    )
    is_system = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    description = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Ledger Account'
        verbose_name_plural = 'Ledger Accounts'
        ordering = ['code']

    def __str__(self):
        return f"{self.code} — {self.name}"

    @property
    def balance(self):
        """Current balance: debits minus credits (asset/expense) or credits minus debits."""
        agg = self.entries.aggregate(
            total_debit=models.Sum('debit'),
            total_credit=models.Sum('credit'),
        )
        debits = agg['total_debit'] or Decimal('0')
        credits = agg['total_credit'] or Decimal('0')
        if self.account_type in (self.ASSET, self.EXPENSE):
            return debits - credits
        return credits - debits


class LedgerJournal(models.Model):
    """
    A journal groups one or more entries that must balance (total debit == total credit).
    Maps 1-to-1 with a business event (payment, refund, fee, settlement, etc.).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=80, unique=True, db_index=True)
    description = models.CharField(max_length=255)
    transaction = models.ForeignKey(
        'payments.Transaction', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='journal_entries'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True
    )
    posted_at = models.DateTimeField(default=timezone.now)
    is_reversed = models.BooleanField(default=False)
    reversal_of = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, related_name='reversals'
    )
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Ledger Journal'
        verbose_name_plural = 'Ledger Journals'
        ordering = ['-posted_at']

    def __str__(self):
        return f"Journal {self.reference}"

    def clean(self):
        """Validate that debits == credits."""
        agg = self.entries.aggregate(
            total_debit=models.Sum('debit'),
            total_credit=models.Sum('credit'),
        )
        debits = agg['total_debit'] or Decimal('0')
        credits = agg['total_credit'] or Decimal('0')
        if debits != credits:
            raise ValidationError(
                f"Journal {self.reference} is unbalanced: "
                f"debits={debits}, credits={credits}"
            )

    @property
    def total(self):
        agg = self.entries.aggregate(total=models.Sum('debit'))
        return agg['total'] or Decimal('0')


class LedgerEntry(models.Model):
    """
    Single line in a journal — always one of debit or credit is non-zero.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    journal = models.ForeignKey(
        LedgerJournal, on_delete=models.CASCADE, related_name='entries'
    )
    account = models.ForeignKey(
        LedgerAccount, on_delete=models.PROTECT, related_name='entries'
    )
    debit = models.DecimalField(max_digits=15, decimal_places=6, default=Decimal('0'))
    credit = models.DecimalField(max_digits=15, decimal_places=6, default=Decimal('0'))
    currency = models.ForeignKey(
        'payments.Currency', on_delete=models.PROTECT
    )
    description = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Ledger Entry'
        verbose_name_plural = 'Ledger Entries'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['account', 'created_at']),
            models.Index(fields=['journal', 'account']),
        ]

    def __str__(self):
        side = 'DR' if self.debit else 'CR'
        amount = self.debit if self.debit else self.credit
        return f"{side} {self.account.code} {amount} {self.currency_id}"

    def clean(self):
        if self.debit and self.credit:
            raise ValidationError("An entry cannot have both debit and credit.")
        if not self.debit and not self.credit:
            raise ValidationError("An entry must have either a debit or credit amount.")


# ---------------------------------------------------------------------------
# Service layer — the only way to create ledger entries
# ---------------------------------------------------------------------------

class LedgerService:
    """
    Provides atomic, balanced journal creation for common business events.
    All methods are class methods — no state needed.
    """

    # Well-known system account codes (created via data migration / management command)
    PLATFORM_CASH = 'ASSET-CASH'
    PLATFORM_FEES = 'REV-FEES'
    PLATFORM_REFUNDS = 'EXP-REFUNDS'
    PLATFORM_SETTLEMENTS = 'LIA-SETTLEMENTS'

    @classmethod
    def _get_or_create_user_account(cls, user, currency):
        """Get or create a wallet ledger account for a user+currency pair."""
        code = f"ASSET-WALLET-{user.id}-{currency.code}"
        account, _ = LedgerAccount.objects.get_or_create(
            code=code,
            defaults={
                'name': f"Wallet {user.email} ({currency.code})",
                'account_type': LedgerAccount.ASSET,
                'currency': currency,
                'user': user,
            }
        )
        return account

    @classmethod
    def _get_system_account(cls, code):
        account = LedgerAccount.objects.filter(code=code, is_system=True).first()
        if not account:
            raise ValueError(f"System ledger account '{code}' not found. Run setup_ledger_accounts management command.")
        return account

    @classmethod
    @db_transaction.atomic
    def record_payment(cls, *, transaction, sender, amount, fee, currency):
        """
        Record a payment: debit sender wallet, credit platform cash + fee revenue.
        """
        from payments.models.currency import Currency as CurrencyModel
        if isinstance(currency, str):
            currency = CurrencyModel.objects.get(code=currency)

        sender_account = cls._get_or_create_user_account(sender, currency)
        cash_account = cls._get_system_account(cls.PLATFORM_CASH)
        fee_account = cls._get_system_account(cls.PLATFORM_FEES)

        net = amount - fee
        ref = f"PAY-{transaction.id}"

        journal = LedgerJournal.objects.create(
            reference=ref,
            description=f"Payment {transaction.id}",
            transaction=transaction,
            created_by=sender,
        )

        entries = [
            LedgerEntry(journal=journal, account=sender_account,
                        credit=amount, currency=currency,
                        description='Wallet debit for payment'),
            LedgerEntry(journal=journal, account=cash_account,
                        debit=net, currency=currency,
                        description='Platform receives net amount'),
        ]
        if fee > 0:
            entries.append(
                LedgerEntry(journal=journal, account=fee_account,
                            debit=fee, currency=currency,
                            description='Fee revenue')
            )

        LedgerEntry.objects.bulk_create(entries)
        return journal

    @classmethod
    @db_transaction.atomic
    def record_refund(cls, *, transaction, recipient, amount, currency):
        """
        Record a refund: debit platform refund expense, credit user wallet.
        """
        from payments.models.currency import Currency as CurrencyModel
        if isinstance(currency, str):
            currency = CurrencyModel.objects.get(code=currency)

        user_account = cls._get_or_create_user_account(recipient, currency)
        cash_account = cls._get_system_account(cls.PLATFORM_CASH)
        refund_account = cls._get_system_account(cls.PLATFORM_REFUNDS)

        ref = f"REF-{transaction.id}"
        journal = LedgerJournal.objects.create(
            reference=ref,
            description=f"Refund for {transaction.id}",
            transaction=transaction,
            created_by=recipient,
        )

        LedgerEntry.objects.bulk_create([
            LedgerEntry(journal=journal, account=user_account,
                        debit=amount, currency=currency,
                        description='Refund credited to wallet'),
            LedgerEntry(journal=journal, account=cash_account,
                        credit=amount, currency=currency,
                        description='Platform cash outflow'),
            LedgerEntry(journal=journal, account=refund_account,
                        debit=amount, currency=currency,
                        description='Refund expense'),
            LedgerEntry(journal=journal, account=refund_account,
                        credit=amount, currency=currency,
                        description='Offset (net zero on expense — cash bears the cost)'),
        ])
        return journal

    @classmethod
    @db_transaction.atomic
    def record_p2p_transfer(cls, *, transaction, sender, recipient, amount, fee, currency):
        """
        P2P: debit sender, credit recipient, credit fee revenue.
        """
        from payments.models.currency import Currency as CurrencyModel
        if isinstance(currency, str):
            currency = CurrencyModel.objects.get(code=currency)

        sender_account = cls._get_or_create_user_account(sender, currency)
        recipient_account = cls._get_or_create_user_account(recipient, currency)
        fee_account = cls._get_system_account(cls.PLATFORM_FEES)

        ref = f"P2P-{transaction.id}"
        journal = LedgerJournal.objects.create(
            reference=ref,
            description=f"P2P transfer {transaction.id}",
            transaction=transaction,
            created_by=sender,
        )

        net = amount - fee
        entries = [
            LedgerEntry(journal=journal, account=sender_account,
                        credit=amount, currency=currency,
                        description='Sender wallet debit'),
            LedgerEntry(journal=journal, account=recipient_account,
                        debit=net, currency=currency,
                        description='Recipient wallet credit'),
        ]
        if fee > 0:
            entries.append(
                LedgerEntry(journal=journal, account=fee_account,
                            debit=fee, currency=currency,
                            description='Transfer fee revenue')
            )
        LedgerEntry.objects.bulk_create(entries)
        return journal

    @classmethod
    @db_transaction.atomic
    def record_merchant_settlement(cls, *, merchant_user, amount, currency, reference=None):
        """
        Settlement: debit platform settlement liability, credit merchant wallet.
        """
        from payments.models.currency import Currency as CurrencyModel
        if isinstance(currency, str):
            currency = CurrencyModel.objects.get(code=currency)

        merchant_account = cls._get_or_create_user_account(merchant_user, currency)
        settlement_account = cls._get_system_account(cls.PLATFORM_SETTLEMENTS)

        ref = reference or f"SETTLE-{merchant_user.id}-{timezone.now().strftime('%Y%m%d%H%M%S')}"
        journal = LedgerJournal.objects.create(
            reference=ref,
            description=f"Merchant settlement for {merchant_user.email}",
            created_by=merchant_user,
        )

        LedgerEntry.objects.bulk_create([
            LedgerEntry(journal=journal, account=settlement_account,
                        debit=amount, currency=currency,
                        description='Settlement liability reduced'),
            LedgerEntry(journal=journal, account=merchant_account,
                        credit=amount, currency=currency,
                        description='Merchant receives settlement'),
        ])
        return journal

    @classmethod
    @db_transaction.atomic
    def record_deposit(cls, *, user, amount, currency, reference=None):
        """
        External deposit into user wallet (e.g. bank transfer in, mobile money top-up).
        """
        from payments.models.currency import Currency as CurrencyModel
        if isinstance(currency, str):
            currency = CurrencyModel.objects.get(code=currency)

        user_account = cls._get_or_create_user_account(user, currency)
        cash_account = cls._get_system_account(cls.PLATFORM_CASH)

        ref = reference or f"DEP-{user.id}-{timezone.now().strftime('%Y%m%d%H%M%S')}"
        journal = LedgerJournal.objects.create(
            reference=ref,
            description=f"Deposit for {user.email}",
            created_by=user,
        )

        LedgerEntry.objects.bulk_create([
            LedgerEntry(journal=journal, account=cash_account,
                        debit=amount, currency=currency,
                        description='Cash received from external source'),
            LedgerEntry(journal=journal, account=user_account,
                        debit=amount, currency=currency,
                        description='User wallet funded'),
        ])
        return journal

    @classmethod
    def get_account_statement(cls, account, start_date=None, end_date=None):
        """Return entries for an account within a date range."""
        qs = LedgerEntry.objects.filter(account=account).select_related('journal')
        if start_date:
            qs = qs.filter(created_at__gte=start_date)
        if end_date:
            qs = qs.filter(created_at__lte=end_date)
        return qs.order_by('created_at')

    @classmethod
    def trial_balance(cls, currency_code=None):
        """
        Return trial balance: {account_code: balance} for all accounts.
        Total debits must equal total credits.
        """
        accounts = LedgerAccount.objects.filter(is_active=True)
        if currency_code:
            accounts = accounts.filter(currency__code=currency_code)
        result = {}
        for account in accounts:
            bal = account.balance
            if bal != 0:
                result[account.code] = {'name': account.name, 'balance': bal, 'type': account.account_type}
        return result
