from django.db import transaction
from django.utils import timezone
from ..models import Payment
import logging
from django.db.models import Q, Sum, Count
from django.db.models.functions import ExtractMonth, ExtractYear

logger = logging.getLogger(__name__)

class RemittanceService:
    @staticmethod
    def generate_remittance_report():
        """
        Generate comprehensive remittance report
        Returns: dict with remittance data
        """
        return {
            'daily_remittances': Payment.objects.filter(is_remitted=True)
                .extra({'day': "date(remittance_date)"})
                .values('day')
                .annotate(
                    total=Sum('amount'),
                    count=Count('id')
                ).order_by('day'),
            'pending_remittances': Payment.objects.filter(is_remitted=False)
                .values('bill_type')
                .annotate(
                    total=Sum('amount'),
                    count=Count('id')
                ).order_by('bill_type'),
            'summary': {
                'total_remitted': Payment.objects.filter(is_remitted=True).aggregate(Sum('amount'))['amount__sum'] or 0,
                'total_pending': Payment.objects.filter(is_remitted=False).aggregate(Sum('amount'))['amount__sum'] or 0
            }
        }

    @staticmethod
    def generate_detailed_remittance_report(bill_type=None, date_range=None):
        """
        Generate detailed remittance report with:
        - Daily summaries
        - Bill type breakdown
        - Pending/remitted totals
        Args:
            bill_type: Optional filter for specific bill types
            date_range: Tuple of (start_date, end_date)
        Returns: dict with detailed report data
        """
        base_query = Payment.objects.all()
        
        if bill_type:
            base_query = base_query.filter(bill_type=bill_type)
            
        if date_range:
            start_date, end_date = date_range
            base_query = base_query.filter(
                Q(remittance_date__gte=start_date) if start_date else Q(),
                Q(remittance_date__lte=end_date) if end_date else Q()
            )
        
        remitted = base_query.filter(is_remitted=True)
        pending = base_query.filter(is_remitted=False)
        
        return {
            'daily_summary': remitted.extra({'day': "date(remittance_date)"})
                .values('day')
                .annotate(
                    total=Sum('amount'),
                    count=Count('id'),
                    avg_amount=Sum('amount')/Count('id')
                ).order_by('day'),
            'bill_type_breakdown': base_query.values('bill_type')
                .annotate(
                    total=Sum('amount'),
                    count=Count('id'),
                    remitted_total=Sum('amount', filter=Q(is_remitted=True)),
                    pending_total=Sum('amount', filter=Q(is_remitted=False))
                ).order_by('bill_type'),
            'totals': {
                'remitted': remitted.aggregate(Sum('amount'))['amount__sum'] or 0,
                'pending': pending.aggregate(Sum('amount'))['amount__sum'] or 0
            }
        }

    @staticmethod
    def generate_visualization_data(date_range=None):
        """
        Generate data for visualizations:
        - Monthly remittance trends
        - Bill type distribution
        - Status ratios
        Returns: dict with visualization-ready data
        """
        base_query = Payment.objects.all()
        
        if date_range:
            start_date, end_date = date_range
            base_query = base_query.filter(
                Q(remittance_date__gte=start_date) if start_date else Q(),
                Q(remittance_date__lte=end_date) if end_date else Q()
            )
        
        # Monthly trends
        monthly_data = base_query.filter(is_remitted=True)
            .annotate(
                month=ExtractMonth('remittance_date'),
                year=ExtractYear('remittance_date')
            )
            .values('year', 'month')
            .annotate(total=Sum('amount'))
            .order_by('year', 'month')
        
        # Bill type distribution
        type_data = base_query.values('bill_type')
            .annotate(
                count=Count('id'),
                total=Sum('amount')
            )
            .order_by('-total')
        
        # Status ratios
        status_data = base_query.values('status')
            .annotate(count=Count('id'))
            .order_by('-count')
        
        return {
            'monthly_trends': list(monthly_data),
            'type_distribution': list(type_data),
            'status_ratios': list(status_data)
        }

    @staticmethod
    @transaction.atomic
    def process_remittance_batch(bill_type=None, user=None):
        """
        Process batch remittance for payments
        Args:
            bill_type: Optional filter for specific bill types
            user: User processing the remittance
        Returns: dict with results
        """
        payments = Payment.objects.filter(is_remitted=False)
        if bill_type:
            payments = payments.filter(bill_type=bill_type)
        
        batch_ref = f"REM-{timezone.now().strftime('%Y%m%d-%H%M%S')}"
        updated = payments.update(
            is_remitted=True,
            remittance_date=timezone.now(),
            remittance_reference=batch_ref,
            remittance_batch=batch_ref,
            remittance_processed_by=user
        )
        
        logger.info(f"Processed remittance batch {batch_ref} with {updated} payments")
        return {
            'batch_reference': batch_ref,
            'payment_count': updated,
            'bill_type': bill_type or 'all'
        }
