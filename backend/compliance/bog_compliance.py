"""
Bank of Ghana Compliance Module
Implements BoG regulatory requirements for Payment Service Providers
"""
from decimal import Decimal
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from django.conf import settings
from django.db.models import Sum
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

class BOGTransactionLimits:
    """
    Bank of Ghana Transaction Limits per KYC Tier
    Reference: BoG Payment Systems Guidelines
    """
    
    # KYC Tier Limits (in GHS)
    TIER_LIMITS = {
        0: {  # Unverified
            'single_transaction': Decimal('0'),
            'daily_limit': Decimal('0'),
            'monthly_limit': Decimal('0'),
            'description': 'Unverified - No transactions allowed',
        },
        1: {  # Basic - Phone verified
            'single_transaction': Decimal('500'),
            'daily_limit': Decimal('1000'),
            'monthly_limit': Decimal('5000'),
            'description': 'Tier 1 - Phone verification only',
        },
        2: {  # Standard - ID verified
            'single_transaction': Decimal('2000'),
            'daily_limit': Decimal('5000'),
            'monthly_limit': Decimal('25000'),
            'description': 'Tier 2 - ID document verified',
        },
        3: {  # Full - Complete KYC
            'single_transaction': Decimal('10000'),
            'daily_limit': Decimal('20000'),
            'monthly_limit': Decimal('100000'),
            'description': 'Tier 3 - Full KYC completed',
        },
    }
    
    # Wallet balance limits per tier
    WALLET_LIMITS = {
        0: Decimal('0'),
        1: Decimal('1000'),
        2: Decimal('10000'),
        3: Decimal('20000'),
    }
    
    @classmethod
    def get_limits_for_tier(cls, tier: int) -> Dict:
        """Get transaction limits for a KYC tier"""
        return cls.TIER_LIMITS.get(tier, cls.TIER_LIMITS[0])
    
    @classmethod
    def get_wallet_limit(cls, tier: int) -> Decimal:
        """Get wallet balance limit for a KYC tier"""
        return cls.WALLET_LIMITS.get(tier, Decimal('0'))
    
    @classmethod
    def check_transaction_allowed(
        cls,
        user,
        amount: Decimal,
        currency: str = 'GHS'
    ) -> Tuple[bool, str]:
        """
        Check if a transaction is allowed based on user's KYC tier
        
        Returns:
            Tuple of (allowed, reason)
        """
        from payments.models import Transaction
        
        # Get user's verification level
        tier = getattr(user, 'verification_level', 0)
        limits = cls.get_limits_for_tier(tier)
        
        # Check if tier allows transactions
        if tier == 0:
            return False, "Please complete phone verification to make transactions"
        
        # Convert amount to GHS if needed
        if currency != 'GHS':
            # Would need exchange rate conversion here
            amount_ghs = amount  # Placeholder
        else:
            amount_ghs = amount
        
        # Check single transaction limit
        if amount_ghs > limits['single_transaction']:
            return False, f"Amount exceeds your single transaction limit of GHS {limits['single_transaction']}. Upgrade your KYC to increase limits."
        
        # Check daily limit
        today = timezone.now().date()
        daily_total = Transaction.objects.filter(
            customer__user=user,
            created_at__date=today,
            status='completed'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        if daily_total + amount_ghs > limits['daily_limit']:
            remaining = limits['daily_limit'] - daily_total
            return False, f"This transaction would exceed your daily limit. Remaining today: GHS {remaining}"
        
        # Check monthly limit
        month_start = today.replace(day=1)
        monthly_total = Transaction.objects.filter(
            customer__user=user,
            created_at__date__gte=month_start,
            status='completed'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        if monthly_total + amount_ghs > limits['monthly_limit']:
            remaining = limits['monthly_limit'] - monthly_total
            return False, f"This transaction would exceed your monthly limit. Remaining this month: GHS {remaining}"
        
        return True, "Transaction allowed"
    
    @classmethod
    def get_user_limits_info(cls, user) -> Dict:
        """Get comprehensive limits info for a user"""
        from payments.models import Transaction
        
        tier = getattr(user, 'verification_level', 0)
        limits = cls.get_limits_for_tier(tier)
        
        today = timezone.now().date()
        month_start = today.replace(day=1)
        
        # Calculate usage
        daily_used = Transaction.objects.filter(
            customer__user=user,
            created_at__date=today,
            status='completed'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        monthly_used = Transaction.objects.filter(
            customer__user=user,
            created_at__date__gte=month_start,
            status='completed'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        return {
            'tier': tier,
            'tier_description': limits['description'],
            'single_transaction_limit': float(limits['single_transaction']),
            'daily_limit': float(limits['daily_limit']),
            'daily_used': float(daily_used),
            'daily_remaining': float(limits['daily_limit'] - daily_used),
            'monthly_limit': float(limits['monthly_limit']),
            'monthly_used': float(monthly_used),
            'monthly_remaining': float(limits['monthly_limit'] - monthly_used),
            'wallet_limit': float(cls.get_wallet_limit(tier)),
            'upgrade_available': tier < 3,
        }

class SuspiciousActivityReport:
    """
    Suspicious Activity Report (SAR) generation for FIC reporting
    Reference: Anti-Money Laundering Act, 2020 (Act 1044)
    """
    
    SAR_TRIGGERS = [
        'large_cash_transaction',      # > GHS 50,000
        'structured_transactions',      # Multiple transactions to avoid limits
        'unusual_pattern',              # Deviation from normal behavior
        'high_risk_country',            # Transaction to/from high-risk jurisdiction
        'pep_involvement',              # Politically Exposed Person
        'sanctions_match',              # Name matches sanctions list
        'rapid_movement',               # Quick in-and-out of funds
        'third_party_funding',          # Funded by unrelated third party
    ]
    
    @classmethod
    def generate_sar(
        cls,
        user,
        transaction,
        trigger_reason: str,
        additional_info: str = ''
    ) -> Dict:
        """
        Generate a Suspicious Activity Report
        """
        from compliance.models import SuspiciousActivityReport as SARModel
        
        sar = SARModel.objects.create(
            user=user,
            transaction=transaction,
            trigger_reason=trigger_reason,
            additional_info=additional_info,
            status='pending',
            reported_at=timezone.now(),
        )
        
        logger.warning(
            f"SAR generated: {sar.id} for user {user.id}, "
            f"transaction {transaction.id if transaction else 'N/A'}, "
            f"reason: {trigger_reason}"
        )
        
        return {
            'sar_id': sar.id,
            'status': 'pending',
            'trigger': trigger_reason,
            'requires_fic_report': cls._requires_fic_report(trigger_reason),
        }
    
    @classmethod
    def _requires_fic_report(cls, trigger: str) -> bool:
        """Determine if SAR requires immediate FIC reporting"""
        immediate_report_triggers = [
            'sanctions_match',
            'pep_involvement',
            'large_cash_transaction',
        ]
        return trigger in immediate_report_triggers
    
    @classmethod
    def check_for_suspicious_activity(cls, user, transaction) -> Optional[str]:
        """
        Check a transaction for suspicious activity indicators
        Returns trigger reason if suspicious, None otherwise
        """
        amount = transaction.amount
        
        # Large cash transaction (> GHS 50,000)
        if amount > Decimal('50000'):
            return 'large_cash_transaction'
        
        # Check for structuring (multiple transactions just under limit)
        from payments.models import Transaction
        
        one_hour_ago = timezone.now() - timedelta(hours=1)
        recent_txns = Transaction.objects.filter(
            customer__user=user,
            created_at__gte=one_hour_ago
        )
        
        # More than 5 transactions in an hour
        if recent_txns.count() > 5:
            return 'structured_transactions'
        
        # Rapid movement of funds
        total_in_hour = recent_txns.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        if total_in_hour > Decimal('20000'):
            return 'rapid_movement'
        
        return None

class BOGReportGenerator:
    """
    Generate regulatory reports for Bank of Ghana
    """
    
    @classmethod
    def generate_monthly_report(cls, year: int, month: int) -> Dict:
        """
        Generate monthly transaction report for BoG
        """
        from payments.models import Transaction, Payment
        from users.models import User, Customer
        from django.db.models import Count, Avg
        
        # Date range
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month + 1, 1)
        
        # Transaction statistics
        transactions = Transaction.objects.filter(
            created_at__gte=start_date,
            created_at__lt=end_date
        )
        
        report = {
            'report_type': 'monthly_transaction_report',
            'period': f"{year}-{month:02d}",
            'generated_at': timezone.now().isoformat(),
            'submitted_to_bog': False,
            
            'transaction_summary': {
                'total_count': transactions.count(),
                'total_volume': float(transactions.aggregate(total=Sum('amount'))['total'] or 0),
                'average_amount': float(transactions.aggregate(avg=Avg('amount'))['avg'] or 0),
                'by_status': dict(transactions.values('status').annotate(count=Count('id')).values_list('status', 'count')),
            },
            
            'user_statistics': {
                'total_active_users': Customer.objects.filter(
                    user__last_login__gte=start_date
                ).count(),
                'new_registrations': User.objects.filter(
                    date_joined__gte=start_date,
                    date_joined__lt=end_date
                ).count(),
                'kyc_approved': User.objects.filter(
                    verification_level__gte=2
                ).count(),
            },
            
            'compliance': {
                'sar_count': 0,  # Would query SAR model
                'blocked_transactions': transactions.filter(status='blocked').count(),
                'fraud_alerts': 0,  # Would query fraud alerts
            },
            
            'remittance': {
                'inbound_count': 0,
                'inbound_volume': 0,
                'outbound_count': 0,
                'outbound_volume': 0,
            },
        }
        
        return report
    
    @classmethod
    def generate_quarterly_aml_report(cls, year: int, quarter: int) -> Dict:
        """
        Generate quarterly AML/CFT report for BoG
        """
        # Quarter date ranges
        quarter_months = {
            1: (1, 3),
            2: (4, 6),
            3: (7, 9),
            4: (10, 12),
        }
        
        start_month, end_month = quarter_months[quarter]
        
        report = {
            'report_type': 'quarterly_aml_report',
            'period': f"{year}-Q{quarter}",
            'generated_at': timezone.now().isoformat(),
            
            'aml_statistics': {
                'total_sar_filed': 0,
                'sar_by_trigger': {},
                'high_risk_transactions': 0,
                'blocked_accounts': 0,
            },
            
            'kyc_statistics': {
                'total_verifications': 0,
                'approved': 0,
                'rejected': 0,
                'pending': 0,
            },
            
            'training': {
                'staff_trained': 0,
                'training_date': None,
            },
        }
        
        return report

# BoG Contact Information for Consumer Protection
BOG_CONTACT_INFO = {
    'name': 'Bank of Ghana',
    'department': 'Payment Systems Department',
    'address': '1 Thorpe Road, Accra, Ghana',
    'phone': '+233 302 666 174',
    'email': 'secretary@bog.gov.gh',
    'website': 'https://www.bog.gov.gh',
    'complaint_portal': 'https://www.bog.gov.gh/complaints',
}

FIC_CONTACT_INFO = {
    'name': 'Financial Intelligence Centre',
    'phone': '+233 302 662 028',
    'email': 'info@fic.gov.gh',
    'website': 'https://www.fic.gov.gh',
}
