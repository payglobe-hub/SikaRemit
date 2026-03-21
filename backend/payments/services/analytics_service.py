import logging
from django.db import models
from django.db.models import Sum, Count, Avg, Max, Min, Q, F
from django.db.models.functions import TruncHour, TruncDate
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta, datetime
from typing import Dict, List, Any, Optional
from payments.models import Payment, Transaction, CrossBorderRemittance
# Import analytics models if they exist, otherwise use defaults
try:
    from payments.models import AnalyticsMetric, DashboardSnapshot, MerchantAnalytics, TransactionAnalytics, PerformanceAlert
except ImportError:
    AnalyticsMetric = None
    DashboardSnapshot = None
    MerchantAnalytics = None
    TransactionAnalytics = None
    PerformanceAlert = None

logger = logging.getLogger(__name__)

class AnalyticsService:
    """
    Comprehensive analytics service for SikaRemit business intelligence
    """

    @staticmethod
    def calculate_dashboard_metrics(date: datetime.date = None) -> Dict[str, Any]:
        """
        Calculate comprehensive dashboard metrics for a given date
        """
        if date is None:
            date = timezone.now().date()

        start_date = datetime.combine(date, datetime.min.time())
        end_date = datetime.combine(date, datetime.max.time())

        logger.info(f"Calculating dashboard metrics for {date}")

        # Transaction metrics
        transactions = Transaction.objects.filter(created_at__range=(start_date, end_date))
        payments = Payment.objects.filter(created_at__range=(start_date, end_date))
        remittances = CrossBorderRemittance.objects.filter(created_at__range=(start_date, end_date))

        # Combine all transaction types
        total_transaction_count = transactions.count() + remittances.count()
        total_transaction_value = (
            (transactions.aggregate(total=Sum('amount'))['total'] or 0) +
            (remittances.aggregate(total=Sum('amount_sent'))['total'] or 0)
        )

        # Fee revenue calculation (Transaction model doesn't have fee_amount, estimate from total)
        fee_revenue = (remittances.aggregate(total=Sum('fee'))['total'] or 0)

        # User metrics
        from users.models import Customer, Merchant
        active_customers = Customer.objects.filter(
            user__last_login__date__gte=date - timedelta(days=30)
        ).count()
        active_merchants = Merchant.objects.filter(
            user__last_login__date__gte=date - timedelta(days=30)
        ).count()

        # New registrations today (using user__date_joined as Customer/Merchant don't have created_at)
        new_registrations = (
            Customer.objects.filter(user__date_joined__date=date).count() +
            Merchant.objects.filter(user__date_joined__date=date).count()
        )

        # Success/failure rates
        successful_transactions = (
            transactions.filter(status='completed').count() +
            remittances.filter(status='completed').count()
        )
        failed_transactions = (
            transactions.filter(status__in=['failed', 'cancelled']).count() +
            remittances.filter(status__in=['failed']).count()
        )

        # Geographic distribution
        transactions_by_country = AnalyticsService._calculate_geographic_distribution(date)
        revenue_by_country = AnalyticsService._calculate_revenue_by_country(date)

        # Payment method usage
        payment_method_usage = AnalyticsService._calculate_payment_method_usage(date)

        # Top merchants
        top_merchants_volume = AnalyticsService._calculate_top_merchants(date, 'volume')
        top_merchants_revenue = AnalyticsService._calculate_top_merchants(date, 'revenue')

        # Risk and compliance metrics
        kyc_completion_rate = AnalyticsService._calculate_kyc_completion_rate()
        high_risk_transactions = AnalyticsService._calculate_high_risk_transactions(date)
        reported_to_regulator = remittances.filter(reported_to_regulator=True, created_at__date=date).count()

        return {
            'date': date,
            'total_transactions': total_transaction_count,
            'total_transaction_value': total_transaction_value,
            'total_fee_revenue': fee_revenue,
            'active_merchants': active_merchants,
            'active_customers': active_customers,
            'new_registrations': new_registrations,
            'successful_transactions': successful_transactions,
            'failed_transactions': failed_transactions,
            'transactions_by_country': transactions_by_country,
            'revenue_by_country': revenue_by_country,
            'payment_method_usage': payment_method_usage,
            'top_merchants_by_volume': top_merchants_volume,
            'top_merchants_by_revenue': top_merchants_revenue,
            'kyc_completion_rate': kyc_completion_rate,
            'high_risk_transactions': high_risk_transactions,
            'reported_to_regulator': reported_to_regulator,
        }

    @staticmethod
    def update_dashboard_snapshot(date: datetime.date = None) -> DashboardSnapshot:
        """
        Create or update dashboard snapshot for a given date
        """
        if date is None:
            date = timezone.now().date()

        metrics = AnalyticsService.calculate_dashboard_metrics(date)

        snapshot, created = DashboardSnapshot.objects.update_or_create(
            date=date,
            defaults=metrics
        )

        logger.info(f"{'Created' if created else 'Updated'} dashboard snapshot for {date}")
        return snapshot

    @staticmethod
    def update_merchant_analytics(date: datetime.date = None):
        """
        Update analytics for all merchants for a given date
        """
        if date is None:
            date = timezone.now().date()

        from users.models import Merchant

        merchants = Merchant.objects.all()
        for merchant in merchants:
            AnalyticsService._calculate_merchant_analytics(merchant, date)

        logger.info(f"Updated merchant analytics for {merchants.count()} merchants on {date}")

    @staticmethod
    def _calculate_merchant_analytics(merchant, date: datetime.date) -> MerchantAnalytics:
        """
        Calculate detailed analytics for a specific merchant
        """
        start_date = datetime.combine(date, datetime.min.time())
        end_date = datetime.combine(date, datetime.max.time())

        # Transactions for this merchant
        transactions = Transaction.objects.filter(
            merchant=merchant,
            created_at__range=(start_date, end_date)
        )

        remittances = CrossBorderRemittance.objects.filter(
            sender__merchant_relationship__merchant=merchant,
            created_at__range=(start_date, end_date)
        )

        # Aggregate metrics
        transaction_count = transactions.count() + remittances.count()
        transaction_value = (
            transactions.aggregate(total=Sum('amount'))['total'] or 0 +
            remittances.aggregate(total=Sum('amount_sent'))['total'] or 0
        )
        fee_revenue = (
            transactions.aggregate(total=Sum('fee_amount'))['total'] or 0 +
            remittances.aggregate(total=Sum('fee'))['total'] or 0
        )

        # Customer metrics
        unique_customers = len(set(
            list(transactions.values_list('customer', flat=True)) +
            list(remittances.values_list('sender', flat=True))
        ))

        # Success rate
        successful_count = (
            transactions.filter(status='completed').count() +
            remittances.filter(status='completed').count()
        )
        success_rate = (successful_count / transaction_count * 100) if transaction_count > 0 else 0

        # Average transaction value
        avg_transaction_value = transaction_value / transaction_count if transaction_count > 0 else 0

        # Geographic breakdown
        transactions_by_country = {}
        for transaction in transactions:
            country = getattr(transaction, 'country_to', 'Unknown')
            transactions_by_country[country] = transactions_by_country.get(country, 0) + 1

        # Payment method usage
        payment_method_usage = {}
        for transaction in transactions:
            method = transaction.payment_method or 'Unknown'
            payment_method_usage[method] = payment_method_usage.get(method, 0) + 1

        # Risk metrics
        high_risk_transactions = transactions.filter(risk_score__gte=7).count()
        kyc_pending_customers = merchant.merchant_customers.filter(
            kyc_status__in=['pending_review', 'in_progress']
        ).count()

        analytics, created = MerchantAnalytics.objects.update_or_create(
            merchant=merchant,
            date=date,
            defaults={
                'transaction_count': transaction_count,
                'transaction_value': transaction_value,
                'fee_revenue': fee_revenue,
                'unique_customers': unique_customers,
                'new_customers': Transaction.objects.filter(
                    merchant=merchant,
                    created_at__range=(start_date, end_date)
                ).values('customer').annotate(
                    first_tx=Min('created_at')
                ).filter(first_tx__range=(start_date, end_date)).count(),
                'success_rate': success_rate,
                'average_transaction_value': avg_transaction_value,
                'transactions_by_country': transactions_by_country,
                'payment_method_usage': payment_method_usage,
                'high_risk_transactions': high_risk_transactions,
                'kyc_pending_customers': kyc_pending_customers,
            }
        )

        return analytics

    @staticmethod
    def _calculate_geographic_distribution(date: datetime.date) -> Dict[str, int]:
        """
        Calculate transaction distribution by country
        """
        start_date = datetime.combine(date, datetime.min.time())
        end_date = datetime.combine(date, datetime.max.time())

        transactions_by_country = {}

        # From transactions
        transactions = Transaction.objects.filter(created_at__range=(start_date, end_date))
        for transaction in transactions:
            country = getattr(transaction, 'country_to', 'Unknown')
            transactions_by_country[country] = transactions_by_country.get(country, 0) + 1

        # From remittances
        remittances = CrossBorderRemittance.objects.filter(created_at__range=(start_date, end_date))
        for remittance in remittances:
            country = remittance.recipient_country
            transactions_by_country[country] = transactions_by_country.get(country, 0) + 1

        return transactions_by_country

    @staticmethod
    def _calculate_revenue_by_country(date: datetime.date) -> Dict[str, float]:
        """
        Calculate revenue distribution by country
        """
        start_date = datetime.combine(date, datetime.min.time())
        end_date = datetime.combine(date, datetime.max.time())

        revenue_by_country = {}

        # From transactions
        transactions = Transaction.objects.filter(created_at__range=(start_date, end_date))
        for transaction in transactions:
            country = getattr(transaction, 'country_to', 'Unknown')
            amount = float(transaction.amount)
            revenue_by_country[country] = revenue_by_country.get(country, 0) + amount

        # From remittances
        remittances = CrossBorderRemittance.objects.filter(created_at__range=(start_date, end_date))
        for remittance in remittances:
            country = remittance.recipient_country
            amount = float(remittance.amount_sent)
            revenue_by_country[country] = revenue_by_country.get(country, 0) + amount

        return revenue_by_country

    @staticmethod
    def _calculate_payment_method_usage(date: datetime.date) -> Dict[str, int]:
        """
        Calculate payment method usage distribution
        """
        start_date = datetime.combine(date, datetime.min.time())
        end_date = datetime.combine(date, datetime.max.time())

        usage = {}

        transactions = Transaction.objects.filter(created_at__range=(start_date, end_date))
        for transaction in transactions:
            method = transaction.payment_method or 'Unknown'
            usage[method] = usage.get(method, 0) + 1

        remittances = CrossBorderRemittance.objects.filter(created_at__range=(start_date, end_date))
        for remittance in remittances:
            method = remittance.payment_method or 'Wire Transfer'
            usage[method] = usage.get(method, 0) + 1

        return usage

    @staticmethod
    def _calculate_top_merchants(date: datetime.date, metric: str, limit: int = 10) -> List[Dict]:
        """
        Calculate top merchants by volume or revenue
        """
        start_date = datetime.combine(date, datetime.min.time())
        end_date = datetime.combine(date, datetime.max.time())

        from users.models import Merchant

        merchants_data = []

        for merchant in Merchant.objects.all():
            transactions = Transaction.objects.filter(
                merchant=merchant,
                created_at__range=(start_date, end_date)
            )

            if metric == 'volume':
                value = transactions.count()
            elif metric == 'revenue':
                value = transactions.aggregate(total=Sum('amount'))['total'] or 0
            else:
                value = 0

            if value > 0:
                merchants_data.append({
                    'merchant_id': merchant.id,
                    'business_name': merchant.business_name,
                    'value': float(value),
                })

        # Sort and limit
        merchants_data.sort(key=lambda x: x['value'], reverse=True)
        return merchants_data[:limit]

    @staticmethod
    def _calculate_kyc_completion_rate() -> float:
        """
        Calculate overall KYC completion rate
        """
        from users.models import Customer

        total_customers = Customer.objects.count()
        if total_customers == 0:
            return 0

        verified_customers = Customer.objects.filter(kyc_verified=True).count()
        return (verified_customers / total_customers) * 100

    @staticmethod
    def _calculate_high_risk_transactions(date: datetime.date) -> int:
        """
        Calculate number of high-risk transactions
        """
        start_date = datetime.combine(date, datetime.min.time())
        end_date = datetime.combine(date, datetime.max.time())

        return Transaction.objects.filter(
            created_at__range=(start_date, end_date),
            risk_score__gte=7
        ).count()

    @staticmethod
    def check_performance_alerts():
        """
        Check for performance issues and create alerts
        """
        alerts_created = []

        # Check transaction failure rate
        failure_rate = AnalyticsService._check_transaction_failure_rate()
        if failure_rate > 5:  # More than 5% failure rate
            alert = PerformanceAlert.objects.create(
                alert_type='transaction_failure_rate',
                severity='high' if failure_rate > 10 else 'medium',
                title=f'High Transaction Failure Rate: {failure_rate:.1f}%',
                description=f'Transaction failure rate has reached {failure_rate:.1f}%, which is above normal thresholds.',
                metrics={'failure_rate': failure_rate},
                suggested_actions=[
                    'Investigate payment gateway issues',
                    'Check merchant configurations',
                    'Review recent code deployments'
                ]
            )
            alerts_created.append(alert)

        # Check for unusual transaction volume
        volume_anomaly = AnalyticsService._check_volume_anomaly()
        if volume_anomaly:
            alert = PerformanceAlert.objects.create(
                alert_type='unusual_transaction_volume',
                severity='medium',
                title='Unusual Transaction Volume Detected',
                description='Transaction volume has deviated significantly from normal patterns.',
                metrics=volume_anomaly,
                suggested_actions=[
                    'Verify transaction authenticity',
                    'Check for system issues',
                    'Monitor closely for next 24 hours'
                ]
            )
            alerts_created.append(alert)

        return alerts_created

    @staticmethod
    def _check_transaction_failure_rate() -> float:
        """
        Calculate current transaction failure rate
        """
        # Last 24 hours
        since = timezone.now() - timedelta(hours=24)

        total_transactions = Transaction.objects.filter(created_at__gte=since).count()
        failed_transactions = Transaction.objects.filter(
            created_at__gte=since,
            status__in=['failed', 'cancelled']
        ).count()

        return (failed_transactions / total_transactions * 100) if total_transactions > 0 else 0

    @staticmethod
    def _check_volume_anomaly() -> Optional[Dict]:
        """
        Check for unusual transaction volume patterns
        """
        # Compare current hour with average of last 7 days same hour
        now = timezone.now()
        current_hour = now.replace(minute=0, second=0, microsecond=0)

        # Current hour transactions
        current_volume = Transaction.objects.filter(
            created_at__gte=current_hour,
            created_at__lt=current_hour + timedelta(hours=1)
        ).count()

        # Average for same hour over last 7 days
        avg_volume = 0
        for i in range(1, 8):
            past_hour = current_hour - timedelta(days=i)
            volume = Transaction.objects.filter(
                created_at__gte=past_hour,
                created_at__lt=past_hour + timedelta(hours=1)
            ).count()
            avg_volume += volume
        avg_volume = avg_volume / 7

        # Check if current volume is 3x average
        if current_volume > avg_volume * 3 and avg_volume > 0:
            return {
                'current_volume': current_volume,
                'average_volume': avg_volume,
                'ratio': current_volume / avg_volume
            }

        return None

    @staticmethod
    def get_realtime_metrics() -> Dict[str, Any]:
        """
        Get real-time dashboard metrics for the last 24 hours
        """
        since = timezone.now() - timedelta(hours=24)

        return {
            'transactions_last_24h': Transaction.objects.filter(created_at__gte=since).count(),
            'transaction_value_last_24h': Transaction.objects.filter(created_at__gte=since).aggregate(
                total=Sum('amount')
            )['total'] or 0,
            'active_alerts': PerformanceAlert.objects.filter(is_active=True).count(),
            'system_health': AnalyticsService._check_system_health(),
        }

    @staticmethod
    def get_merchant_insights(merchant_id: int, days: int = 30) -> Dict[str, Any]:
        """
        Get detailed insights for a specific merchant
        """
        from users.models import Merchant

        try:
            merchant = Merchant.objects.get(id=merchant_id)
        except Merchant.DoesNotExist:
            return {'error': 'Merchant not found'}

        since = timezone.now() - timedelta(days=days)

        # Transaction trends (using TruncDate for SQLite compatibility)
        daily_transactions = Transaction.objects.filter(
            merchant=merchant,
            created_at__gte=since
        ).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            count=Count('id'),
            revenue=Sum('amount')
        ).order_by('date')

        # Customer growth (using TruncDate for SQLite compatibility)
        customer_growth = Transaction.objects.filter(
            merchant=merchant,
            created_at__gte=since
        ).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            unique_customers=Count('customer', distinct=True)
        ).order_by('date')

        return {
            'merchant': {
                'id': merchant.id,
                'name': merchant.business_name,
                'status': getattr(merchant, 'status', 'active'),
            },
            'period_days': days,
            'transaction_trends': list(daily_transactions),
            'customer_growth': list(customer_growth),
            'total_revenue': sum(day['revenue'] for day in daily_transactions),
            'total_transactions': sum(day['count'] for day in daily_transactions),
        }

    @staticmethod
    def get_realtime_metrics() -> Dict[str, Any]:
        """
        Get real-time metrics for dashboard overview
        """
        now = timezone.now()
        last_24h = now - timedelta(hours=24)
        last_7d = now - timedelta(days=7)
        last_30d = now - timedelta(days=30)

        from django.contrib.auth import get_user_model
        from users.models import KYCDocument

        User = get_user_model()

        # User metrics
        total_users = User.objects.count()
        active_users_24h = User.objects.filter(last_login__gte=last_24h).count()
        active_users_7d = User.objects.filter(last_login__gte=last_7d).count()

        # Transaction metrics
        transactions_24h = Transaction.objects.filter(created_at__gte=last_24h)
        transactions_7d = Transaction.objects.filter(created_at__gte=last_7d)
        transactions_30d = Transaction.objects.filter(created_at__gte=last_30d)

        # Revenue metrics
        revenue_24h = transactions_24h.filter(status='completed').aggregate(
            total=Sum('amount'))['total'] or Decimal('0')
        revenue_7d = transactions_7d.filter(status='completed').aggregate(
            total=Sum('amount'))['total'] or Decimal('0')
        revenue_30d = transactions_30d.filter(status='completed').aggregate(
            total=Sum('amount'))['total'] or Decimal('0')

        # Payment method distribution
        payment_methods = Payment.objects.filter(
            created_at__gte=last_7d
        ).values('payment_method__method_type').annotate(
            count=Count('id'),
            volume=Sum('amount')
        ).order_by('-count')

        # Geographic distribution
        from users.models import Customer
        geographic_data = Customer.objects.exclude(
            address__isnull=True
        ).exclude(
            address__country__isnull=True
        ).values('address__country').annotate(
            user_count=Count('id')
        ).order_by('-user_count')[:10]

        # KYC pending
        pending_kyc = KYCDocument.objects.filter(status='PENDING').count()

        # Failed payments
        failed_payments_24h = Payment.objects.filter(
            status='failed',
            created_at__gte=last_24h
        ).count()

        return {
            'timestamp': now.isoformat(),
            'users': {
                'total': total_users,
                'active_24h': active_users_24h,
                'active_7d': active_users_7d,
                'growth_24h': AnalyticsService._calculate_growth_rate(active_users_24h, active_users_7d, 7)
            },
            'transactions': {
                'count_24h': transactions_24h.count(),
                'count_7d': transactions_7d.count(),
                'count_30d': transactions_30d.count(),
                'volume_24h': float(revenue_24h),
                'volume_7d': float(revenue_7d),
                'volume_30d': float(revenue_30d),
                'avg_transaction': float(revenue_24h / transactions_24h.count()) if transactions_24h.count() > 0 else 0
            },
            'payment_methods': list(payment_methods.values('payment_method__method_type', 'count', 'volume')),
            'geographic': list(geographic_data.values('address__country', 'user_count')),
            'alerts': {
                'pending_kyc': pending_kyc,
                'failed_payments_24h': failed_payments_24h
            }
        }

    @staticmethod
    def get_transaction_trends(days: int = 30) -> Dict[str, Any]:
        """
        Get transaction trends over time
        """
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)

        # Daily transaction data (using Django's TruncDate for SQLite compatibility)
        daily_data = Transaction.objects.filter(
            created_at__gte=start_date,
            created_at__lte=end_date
        ).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            count=Count('id'),
            volume=Sum('amount'),
            completed_count=Count('id', filter=Q(status='completed')),
            failed_count=Count('id', filter=Q(status='failed'))
        ).order_by('date')

        # Hourly data for last 7 days (using Django's TruncHour for SQLite compatibility)
        hourly_data = Transaction.objects.filter(
            created_at__gte=end_date - timedelta(days=7)
        ).annotate(
            hour=TruncHour('created_at')
        ).values('hour').annotate(
            count=Count('id'),
            volume=Sum('amount')
        ).order_by('hour')

        # Status distribution
        status_distribution = Transaction.objects.filter(
            created_at__gte=start_date
        ).values('status').annotate(
            count=Count('id')
        ).order_by('-count')

        # Top merchants by volume
        from users.models import Merchant
        top_merchants = Transaction.objects.filter(
            created_at__gte=start_date,
            status='completed',
            merchant__isnull=False
        ).values('merchant__business_name').annotate(
            transaction_count=Count('id'),
            total_volume=Sum('amount')
        ).order_by('-total_volume')[:10]

        return {
            'period_days': days,
            'daily_trends': list(daily_data.values('date', 'count', 'volume', 'completed_count', 'failed_count')),
            'hourly_trends': list(hourly_data.values('hour', 'count', 'volume')),
            'status_distribution': list(status_distribution.values('status', 'count')),
            'top_merchants': list(top_merchants.values('merchant__business_name', 'transaction_count', 'total_volume'))
        }

    @staticmethod
    def _check_system_health() -> str:
        """Check overall system health based on recent metrics"""
        try:
            now = timezone.now()
            last_hour = now - timedelta(hours=1)

            # Check recent transaction failure rate
            recent_txs = Transaction.objects.filter(created_at__gte=last_hour)
            total = recent_txs.count()
            if total > 0:
                failed = recent_txs.filter(status='failed').count()
                failure_rate = failed / total
                if failure_rate > 0.5:
                    return 'critical'
                elif failure_rate > 0.2:
                    return 'degraded'

            # Check for active critical alerts
            if PerformanceAlert and PerformanceAlert.objects.filter(
                is_active=True, severity='critical'
            ).exists():
                return 'degraded'

            return 'operational'
        except Exception:
            return 'unknown'

    @staticmethod
    def _calculate_growth_rate(current: int, previous: int, period_days: int) -> float:
        """Calculate growth rate"""
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        return ((current - previous) / previous) * 100
