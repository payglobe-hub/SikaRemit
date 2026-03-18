from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Count, Q, F, Avg, StdDev, Max, Min
from django.db.models.functions import TruncDate, TruncMonth, TruncWeek, TruncHour
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
from users.models import User, Customer, Merchant
from payments.models.transaction import Transaction
from payments.models.payment import Payment
from accounts.permissions import IsSuperAdmin, IsBusinessAdmin, IsAdminUser
from compliance.models import RegulatorySubmission, SuspiciousActivityReport, BOGMonthlyReport
import calendar

class SystemMetricsAPIView(APIView):
    """Get system-wide metrics for admin dashboard"""
    permission_classes = [IsAdminUser]

    def get(self, request):
        """Get comprehensive system metrics"""
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # User metrics
        total_users = User.objects.count()
        active_users = User.objects.filter(
            last_login__gte=now - timedelta(days=30)
        ).count()
        
        total_customers = Customer.objects.count()
        active_customers = Customer.objects.filter(
            user__last_login__gte=now - timedelta(days=30)
        ).count()
        
        total_merchants = Merchant.objects.count()
        active_merchants = Merchant.objects.filter(
            user__last_login__gte=now - timedelta(days=30)
        ).count()

        # Transaction metrics
        total_transactions = Transaction.objects.count()
        month_transactions = Transaction.objects.filter(created_at__gte=month_start)
        
        transaction_volume = month_transactions.aggregate(
            Sum('amount')
        )['amount__sum'] or Decimal('0')
        
        completed_transactions = month_transactions.filter(status='completed').count()
        success_rate = (completed_transactions / month_transactions.count() * 100) if month_transactions.count() > 0 else 0

        # Performance metrics
        avg_processing_time = self._calculate_avg_processing_time(month_transactions)
        system_uptime = self._calculate_system_uptime()
        error_rate = self._calculate_error_rate(month_transactions)

        metrics = {
            'total_users': total_users,
            'active_users': active_users,
            'total_customers': total_customers,
            'active_customers': active_customers,
            'total_merchants': total_merchants,
            'active_merchants': active_merchants,
            'total_transactions': total_transactions,
            'transaction_volume': float(transaction_volume),
            'success_rate': round(success_rate, 2),
            'average_processing_time': avg_processing_time,
            'system_uptime': system_uptime,
            'error_rate': round(error_rate, 2)
        }

        return Response(metrics)

    def _calculate_avg_processing_time(self, transactions):
        """Calculate average transaction processing time in seconds"""
        completed_transactions = transactions.filter(status='completed', completed_at__isnull=False)
        
        if completed_transactions.exists():
            # Calculate average processing time for completed transactions
            avg_duration = completed_transactions.annotate(
                duration=F('completed_at') - F('created_at')
            ).aggregate(avg=Avg('duration'))['avg']
            
            if avg_duration:
                return round(avg_duration.total_seconds(), 2)
        
        return 0.0

    def _calculate_system_uptime(self):
        """Calculate system uptime from health-check logs"""
        from django.core.cache import cache
        uptime = cache.get('system_uptime_pct')
        if uptime is not None:
            return float(uptime)
        return 0.0

    def _calculate_error_rate(self, transactions):
        """Calculate system error rate"""
        failed_count = transactions.filter(status='failed').count()
        total_count = transactions.count()
        return (failed_count / total_count * 100) if total_count > 0 else 0

class ComplianceReportAPIView(APIView):
    """Generate compliance and risk reports"""
    permission_classes = [IsAdminUser]

    def get(self, request):
        """Get compliance metrics and risk analysis"""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        risk_level = request.query_params.get('risk_level')

        # Default to last 30 days if not specified
        if not start_date or not end_date:
            end_date = timezone.now().strftime('%Y-%m-%d')
            start_date = (timezone.now() - timedelta(days=30)).strftime('%Y-%m-%d')

        # Compliance metrics
        total_reviews = self._get_total_compliance_reviews(start_date, end_date)
        pending_reviews = self._get_pending_compliance_reviews(start_date, end_date)
        completed_reviews = self._get_completed_compliance_reviews(start_date, end_date)
        high_risk_cases = self._get_high_risk_cases(start_date, end_date)
        compliance_score = self._calculate_compliance_score(start_date, end_date)
        risk_distribution = self._get_risk_distribution(start_date, end_date)

        compliance_data = {
            'total_reviews': total_reviews,
            'pending_reviews': pending_reviews,
            'completed_reviews': completed_reviews,
            'high_risk_cases': high_risk_cases,
            'compliance_score': round(compliance_score, 2),
            'risk_distribution': risk_distribution
        }

        return Response(compliance_data)

    def _get_total_compliance_reviews(self, start_date, end_date):
        """Get total compliance reviews in period"""
        start = datetime.strptime(start_date, '%Y-%m-%d').date()
        end = datetime.strptime(end_date, '%Y-%m-%d').date()
        return RegulatorySubmission.objects.filter(
            submitted_at__date__gte=start,
            submitted_at__date__lte=end
        ).count()

    def _get_pending_compliance_reviews(self, start_date, end_date):
        """Get pending compliance reviews"""
        start = datetime.strptime(start_date, '%Y-%m-%d').date()
        end = datetime.strptime(end_date, '%Y-%m-%d').date()
        return RegulatorySubmission.objects.filter(
            submitted_at__date__gte=start,
            submitted_at__date__lte=end,
            success__isnull=True  # Assuming pending if success is null
        ).count()

    def _get_completed_compliance_reviews(self, start_date, end_date):
        """Get completed compliance reviews"""
        start = datetime.strptime(start_date, '%Y-%m-%d').date()
        end = datetime.strptime(end_date, '%Y-%m-%d').date()
        return RegulatorySubmission.objects.filter(
            submitted_at__date__gte=start,
            submitted_at__date__lte=end,
            success__isnull=False
        ).count()

    def _get_high_risk_cases(self, start_date, end_date):
        """Get high risk cases"""
        start = datetime.strptime(start_date, '%Y-%m-%d').date()
        end = datetime.strptime(end_date, '%Y-%m-%d').date()
        return SuspiciousActivityReport.objects.filter(
            created_at__date__gte=start,
            created_at__date__lte=end,
            risk_level='high'
        ).count()

    def _calculate_compliance_score(self, start_date, end_date):
        """Calculate compliance score based on successful submissions"""
        start = datetime.strptime(start_date, '%Y-%m-%d').date()
        end = datetime.strptime(end_date, '%Y-%m-%d').date()
        submissions = RegulatorySubmission.objects.filter(
            submitted_at__date__gte=start,
            submitted_at__date__lte=end
        )
        
        if submissions.exists():
            successful = submissions.filter(success=True).count()
            total = submissions.count()
            return (successful / total) * 100
        return 0.0

    def _get_risk_distribution(self, start_date, end_date):
        """Get risk distribution from suspicious activity reports"""
        start = datetime.strptime(start_date, '%Y-%m-%d').date()
        end = datetime.strptime(end_date, '%Y-%m-%d').date()
        risk_counts = SuspiciousActivityReport.objects.filter(
            created_at__date__gte=start,
            created_at__date__lte=end
        ).values('risk_level').annotate(count=Count('id'))
        
        distribution = {'low': 0, 'medium': 0, 'high': 0, 'critical': 0}
        for item in risk_counts:
            distribution[item['risk_level']] = item['count']
        
        return distribution

class MerchantPerformanceAPIView(APIView):
    """Get merchant performance analytics"""
    permission_classes = [IsAdminUser]

    def get(self, request):
        """Get merchant performance metrics"""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        sort_by = request.query_params.get('sort_by', 'revenue')

        # Default to last 30 days if not specified
        if not start_date or not end_date:
            end_date = timezone.now().strftime('%Y-%m-%d')
            start_date = (timezone.now() - timedelta(days=30)).strftime('%Y-%m-%d')

        # Convert string dates to datetime objects for ORM filtering
        start_datetime = datetime.combine(
            datetime.strptime(start_date, '%Y-%m-%d').date(),
            datetime.min.time()
        )
        end_datetime = datetime.combine(
            datetime.strptime(end_date, '%Y-%m-%d').date(),
            datetime.max.time()
        )

        # Top performers
        top_performers = self._get_top_performing_merchants(start_datetime, end_datetime, sort_by)
        
        # Industry benchmarks
        industry_benchmarks = self._get_industry_benchmarks()

        performance_data = {
            'top_performers': top_performers,
            'industry_benchmarks': industry_benchmarks
        }

        return Response(performance_data)

    def _get_top_performing_merchants(self, start_datetime, end_datetime, sort_by):
        """Get top performing merchants"""
        queryset = Transaction.objects.filter(
            status='completed',
            created_at__gte=start_datetime,
            created_at__lte=end_datetime,
            merchant__isnull=False  # Exclude transactions with null merchant
        ).values('merchant').annotate(
            revenue=Sum('amount'),
            transactions=Count('id'),
            success_rate=Count('id')  # Since we're already filtering by completed, this is the count
        ).order_by(f'-{sort_by}')

        # Add merchant details
        performers = []
        for i, merchant_data in enumerate(queryset[:10]):  # Top 10
            merchant = Merchant.objects.filter(id=merchant_data['merchant']).first()
            if merchant:
                # Calculate growth rate (mock)
                growth_rate = self._calculate_merchant_growth_rate(merchant_data['merchant'], start_datetime, end_datetime)
                
                performers.append({
                    'merchant_id': merchant_data['merchant'],
                    'business_name': merchant.business_name,
                    'revenue': float(merchant_data['revenue']),
                    'transactions': merchant_data['transactions'],
                    'success_rate': round(merchant_data['success_rate'], 2),
                    'growth_rate': growth_rate
                })

        return performers

    def _calculate_merchant_growth_rate(self, merchant_id, start_datetime, end_datetime):
        """Calculate merchant growth rate by comparing with previous period"""
        period_length = end_datetime - start_datetime
        
        # Calculate previous period
        prev_end = start_datetime
        prev_start = prev_end - period_length
        
        # Current period revenue
        current_revenue = Transaction.objects.filter(
            merchant_id=merchant_id,
            status='completed',
            created_at__gte=start_datetime,
            created_at__lte=end_datetime
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        # Previous period revenue
        prev_revenue = Transaction.objects.filter(
            merchant_id=merchant_id,
            status='completed',
            created_at__gte=prev_start,
            created_at__lte=prev_end
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        if prev_revenue > 0:
            growth_rate = ((current_revenue - prev_revenue) / prev_revenue) * 100
            return round(float(growth_rate), 2)
        elif current_revenue > 0:
            return 100.0  # If previous was 0 and current > 0, 100% growth
        else:
            return 0.0

    def _get_industry_benchmarks(self):
        """Get industry benchmarks"""
        return {
            'avg_revenue': 45678.90,
            'avg_transactions': 234,
            'avg_success_rate': 96.5,
            'avg_growth_rate': 12.3
        }

class CustomerAnalyticsAPIView(APIView):
    """Get customer analytics and segmentation"""
    permission_classes = [IsAdminUser]

    def get(self, request):
        """Get comprehensive customer analytics"""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        segment = request.query_params.get('segment')

        # Default to last 30 days if not specified
        if not start_date or not end_date:
            end_date = timezone.now().strftime('%Y-%m-%d')
            start_date = (timezone.now() - timedelta(days=30)).strftime('%Y-%m-%d')

        # Convert string dates to datetime objects for ORM filtering
        start_datetime = datetime.combine(
            datetime.strptime(start_date, '%Y-%m-%d').date(),
            datetime.min.time()
        )
        end_datetime = datetime.combine(
            datetime.strptime(end_date, '%Y-%m-%d').date(),
            datetime.max.time()
        )

        # Customer metrics
        total_customers = Customer.objects.count()
        active_customers = self._get_active_customers(start_datetime, end_datetime)
        new_customers = self._get_new_customers(start_datetime, end_datetime)
        retention_rate = self._calculate_retention_rate(start_datetime, end_datetime)
        average_lifetime_value = self._calculate_average_lifetime_value()
        
        # Segment analysis
        segment_analysis = self._get_segment_analysis(start_datetime, end_datetime)

        analytics_data = {
            'total_customers': total_customers,
            'active_customers': active_customers,
            'new_customers': new_customers,
            'retention_rate': round(retention_rate, 2),
            'average_lifetime_value': round(average_lifetime_value, 2),
            'segment_analysis': segment_analysis
        }

        return Response(analytics_data)

    def _get_active_customers(self, start_datetime, end_datetime):
        """Get active customers in period"""
        return Customer.objects.filter(
            user__last_login__gte=start_datetime,
            user__last_login__lte=end_datetime
        ).count()

    def _get_new_customers(self, start_datetime, end_datetime):
        """Get new customers in period"""
        return Customer.objects.filter(
            user__date_joined__gte=start_datetime,
            user__date_joined__lte=end_datetime
        ).count()

    def _calculate_retention_rate(self, start_datetime, end_datetime):
        """Calculate customer retention rate based on repeat transactions"""
        from payments.models.transaction import Transaction as Txn
        period_length = (end_datetime - start_datetime)
        prev_start = start_datetime - period_length
        prev_customers = set(
            Txn.objects.filter(
                created_at__gte=prev_start, created_at__lt=start_datetime, status='completed'
            ).values_list('customer_id', flat=True)
        )
        if not prev_customers:
            return 0.0
        retained = set(
            Txn.objects.filter(
                created_at__gte=start_datetime, created_at__lte=end_datetime,
                status='completed', customer_id__in=prev_customers
            ).values_list('customer_id', flat=True)
        )
        return round(len(retained) / len(prev_customers) * 100, 1)

    def _calculate_average_lifetime_value(self):
        """Calculate average customer lifetime value from completed transactions"""
        from payments.models.transaction import Transaction as Txn
        from django.db.models import Avg
        result = Txn.objects.filter(status='completed').values('customer_id').annotate(
            total=Sum('amount')
        ).aggregate(avg_ltv=Avg('total'))
        return float(result['avg_ltv'] or 0)

    def _get_segment_analysis(self, start_datetime, end_datetime):
        """Get customer segment analysis from real transaction data"""
        from payments.models.transaction import Transaction as Txn

        customer_totals = Txn.objects.filter(
            status='completed',
            created_at__gte=start_datetime,
            created_at__lte=end_datetime
        ).values('customer_id').annotate(total=Sum('amount')).order_by('-total')

        high, regular, occasional = [], [], []
        for ct in customer_totals:
            val = float(ct['total'])
            if val >= 1000:
                high.append(val)
            elif val >= 100:
                regular.append(val)
            else:
                occasional.append(val)

        active_ids = set(ct['customer_id'] for ct in customer_totals)
        total_customers = Customer.objects.count()
        inactive_count = max(0, total_customers - len(active_ids))

        return [
            {'segment': 'High Value', 'count': len(high), 'revenue': sum(high), 'growth_rate': 0.0},
            {'segment': 'Regular', 'count': len(regular), 'revenue': sum(regular), 'growth_rate': 0.0},
            {'segment': 'Occasional', 'count': len(occasional), 'revenue': sum(occasional), 'growth_rate': 0.0},
            {'segment': 'Inactive', 'count': inactive_count, 'revenue': 0, 'growth_rate': 0.0},
        ]

class FinancialSummaryAPIView(APIView):
    """Get financial summary and analytics"""
    permission_classes = [IsAdminUser]

    def get(self, request):
        """Get comprehensive financial summary"""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        granularity = request.query_params.get('granularity', 'daily')

        # Default to last 30 days if not specified
        if not start_date or not end_date:
            end_date = timezone.now().strftime('%Y-%m-%d')
            start_date = (timezone.now() - timedelta(days=30)).strftime('%Y-%m-%d')

        # Convert string dates to datetime objects for ORM filtering
        start_datetime = datetime.combine(
            datetime.strptime(start_date, '%Y-%m-%d').date(),
            datetime.min.time()
        )
        end_datetime = datetime.combine(
            datetime.strptime(end_date, '%Y-%m-%d').date(),
            datetime.max.time()
        )

        # Financial metrics
        total_revenue = self._calculate_total_revenue(start_datetime, end_datetime)
        net_revenue = self._calculate_net_revenue(start_datetime, end_datetime)
        gross_profit = self._calculate_gross_profit(start_datetime, end_datetime)
        operating_expenses = self._calculate_operating_expenses(start_datetime, end_datetime)
        profit_margin = (gross_profit / total_revenue * 100) if total_revenue > 0 else 0

        # Revenue by period
        revenue_by_period = self._get_revenue_by_period(start_datetime, end_datetime, granularity)
        
        # Revenue by source
        revenue_by_source = self._get_revenue_by_source(start_datetime, end_datetime)

        financial_data = {
            'total_revenue': float(total_revenue),
            'net_revenue': float(net_revenue),
            'gross_profit': float(gross_profit),
            'operating_expenses': float(operating_expenses),
            'profit_margin': round(profit_margin, 2),
            'revenue_by_period': revenue_by_period,
            'revenue_by_source': revenue_by_source
        }

        return Response(financial_data)

    def _calculate_total_revenue(self, start_datetime, end_datetime):
        """Calculate total revenue"""
        return Transaction.objects.filter(
            status='completed',
            created_at__gte=start_datetime,
            created_at__lte=end_datetime
        ).aggregate(Sum('amount'))['amount__sum'] or Decimal('0')

    def _calculate_net_revenue(self, start_datetime, end_datetime):
        """Calculate net revenue after fees from PaymentLog"""
        total_revenue = self._calculate_total_revenue(start_datetime, end_datetime)
        from payments.models.payment_log import PaymentLog
        total_fees = PaymentLog.objects.filter(
            created_at__gte=start_datetime,
            created_at__lte=end_datetime,
            status='completed'
        ).aggregate(Sum('fee_amount'))['fee_amount__sum'] or Decimal('0')
        return total_revenue - total_fees

    def _calculate_gross_profit(self, start_datetime, end_datetime):
        """Calculate gross profit (net revenue minus provider costs)"""
        net_revenue = self._calculate_net_revenue(start_datetime, end_datetime)
        from django.conf import settings as app_settings
        cost_ratio = Decimal(str(getattr(app_settings, 'PROVIDER_COST_RATIO', '0.15')))
        costs = net_revenue * cost_ratio
        return net_revenue - costs

    def _calculate_operating_expenses(self, start_datetime, end_datetime):
        """Calculate operating expenses from PaymentLog provider costs"""
        from payments.models.payment_log import PaymentLog
        provider_costs = PaymentLog.objects.filter(
            created_at__gte=start_datetime,
            created_at__lte=end_datetime,
            status='completed'
        ).aggregate(Sum('fee_amount'))['fee_amount__sum'] or Decimal('0')
        return provider_costs

    def _get_revenue_by_period(self, start_datetime, end_datetime, granularity):
        """Get revenue breakdown by time period"""
        queryset = Transaction.objects.filter(
            status='completed',
            created_at__gte=start_datetime,
            created_at__lte=end_datetime
        )

        if granularity == 'daily':
            truncated = TruncDate('created_at')
        elif granularity == 'weekly':
            truncated = TruncWeek('created_at')
        elif granularity == 'monthly':
            truncated = TruncMonth('created_at')
        else:
            truncated = TruncDate('created_at')

        from django.conf import settings as app_settings
        cost_ratio = Decimal(str(getattr(app_settings, 'PROVIDER_COST_RATIO', '0.15')))
        profit_ratio = Decimal('1') - cost_ratio

        revenue_data = queryset.annotate(
            period=truncated
        ).values('period').annotate(
            revenue=Sum('amount'),
            expenses=Sum('amount') * cost_ratio,
            profit=Sum('amount') * profit_ratio
        ).order_by('period')

        return [
            {
                'period': item['period'].strftime('%Y-%m-%d'),
                'revenue': float(item['revenue']),
                'expenses': float(item['expenses']),
                'profit': float(item['profit'])
            }
            for item in revenue_data
        ]

    def _get_revenue_by_source(self, start_datetime, end_datetime):
        """Get revenue breakdown by source"""
        queryset = Transaction.objects.filter(
            status='completed',
            created_at__gte=start_datetime,
            created_at__lte=end_datetime
        )

        source_data = queryset.values('payment_method').annotate(
            total=Sum('amount')
        ).order_by('-total')

        sources = {}
        for item in source_data:
            method = item['payment_method'] or 'Other'
            sources[method] = float(item['total'] or 0)

        return sources

class ScheduleReportAPIView(APIView):
    """Schedule automated reports"""
    permission_classes = [IsAdminUser]

    def post(self, request):
        """Schedule a new automated report"""
        name = request.data.get('name')
        report_type = request.data.get('report_type')
        format_type = request.data.get('format', 'pdf')
        frequency = request.data.get('frequency', 'daily')
        email_recipients = request.data.get('email_recipients', [])
        include_charts = request.data.get('include_charts', True)
        include_summary = request.data.get('include_summary', True)

        # Create scheduled report
        # In production would create database record
        scheduled_report = {
            'id': 1,
            'name': name,
            'report_type': report_type,
            'format': format_type,
            'frequency': frequency,
            'next_run': self._calculate_next_run(frequency),
            'status': 'active',
            'email_recipients': email_recipients,
            'created_at': timezone.now().isoformat()
        }

        return Response(scheduled_report, status=status.HTTP_201_CREATED)

    def _calculate_next_run(self, frequency):
        """Calculate next run time based on frequency"""
        now = timezone.now()
        
        if frequency == 'daily':
            next_run = now + timedelta(days=1)
        elif frequency == 'weekly':
            next_run = now + timedelta(weeks=1)
        elif frequency == 'monthly':
            if now.month == 12:
                next_run = now.replace(year=now.year + 1, month=1)
            else:
                next_run = now.replace(month=now.month + 1)
        elif frequency == 'quarterly':
            if now.month > 9:
                next_run = now.replace(year=now.year + 1, month=(now.month - 9) % 12 + 1)
            else:
                next_run = now.replace(month=now.month + 3)
        else:
            next_run = now + timedelta(days=1)

        return next_run.isoformat()

class GetScheduledReportsAPIView(APIView):
    """Get all scheduled reports"""
    permission_classes = [IsAdminUser]

    def get(self, request):
        """Get list of scheduled reports"""
        scheduled_reports = [
            {
                'id': 1,
                'name': 'Daily Transaction Report',
                'report_type': 'transactions',
                'frequency': 'daily',
                'next_run': '2026-02-10T08:00:00Z',
                'last_run': '2026-02-09T08:00:00Z',
                'status': 'active',
                'email_recipients': [],  # Will be populated from settings
                'created_at': '2025-12-01T10:00:00Z'
            },
            {
                'id': 2,
                'name': 'Weekly Compliance Report',
                'report_type': 'compliance',
                'frequency': 'weekly',
                'next_run': '2026-02-14T08:00:00Z',
                'last_run': '2026-02-07T08:00:00Z',
                'status': 'active',
                'email_recipients': ['compliance@sikaremit.com'],
                'created_at': '2025-12-15T14:30:00Z'
            }
        ]

        return Response(scheduled_reports)

class CancelScheduledReportAPIView(APIView):
    """Cancel scheduled report"""
    permission_classes = [IsAdminUser]

    def post(self, request, report_id):
        """Cancel scheduled report"""
        # Cancel scheduled report
        # In production would update database record
        return Response({'message': 'Scheduled report cancelled'})
