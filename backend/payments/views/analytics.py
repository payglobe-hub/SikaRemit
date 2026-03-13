from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Avg
from django.utils import timezone
from datetime import timedelta, datetime
from .services.analytics_service import AnalyticsService
from .models import AnalyticsMetric, DashboardSnapshot, MerchantAnalytics, PerformanceAlert


class AnalyticsDashboardViewSet(viewsets.ViewSet):
    """
    Comprehensive analytics dashboard API
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def realtime_metrics(self, request):
        """
        Get real-time metrics for the last 24 hours
        """
        metrics = AnalyticsService.get_realtime_metrics()
        return Response(metrics)

    @action(detail=False, methods=['get'])
    def dashboard_snapshot(self, request):
        """
        Get latest dashboard snapshot
        """
        try:
            snapshot = DashboardSnapshot.objects.latest('date')
            return Response({
                'date': snapshot.date,
                'total_transactions': snapshot.total_transactions,
                'total_transaction_value': float(snapshot.total_transaction_value),
                'total_fee_revenue': float(snapshot.total_fee_revenue),
                'active_merchants': snapshot.active_merchants,
                'active_customers': snapshot.active_customers,
                'new_registrations': snapshot.new_registrations,
                'successful_transactions': snapshot.successful_transactions,
                'failed_transactions': snapshot.failed_transactions,
                'success_rate': snapshot.success_rate,
                'transactions_by_country': snapshot.transactions_by_country,
                'revenue_by_country': snapshot.revenue_by_country,
                'payment_method_usage': snapshot.payment_method_usage,
                'top_merchants_by_volume': snapshot.top_merchants_by_volume,
                'top_merchants_by_revenue': snapshot.top_merchants_by_revenue,
                'kyc_completion_rate': float(snapshot.kyc_completion_rate),
                'high_risk_transactions': snapshot.high_risk_transactions,
                'reported_to_regulator': snapshot.reported_to_regulator,
            })
        except DashboardSnapshot.DoesNotExist:
            return Response(
                {'error': 'No dashboard snapshot available'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'])
    def merchant_insights(self, request):
        """
        Get insights for the current user's merchant (if applicable)
        """
        if not hasattr(request.user, 'merchant_profile') or not request.user.merchant_profile:
            return Response(
                {'error': 'User is not associated with a merchant'},
                status=status.HTTP_403_FORBIDDEN
            )

        merchant = request.user.merchant_profile
        days = int(request.query_params.get('days', 30))

        insights = AnalyticsService.get_merchant_insights(merchant.id, days)
        return Response(insights)

    @action(detail=False, methods=['post'])
    def update_snapshot(self, request):
        """
        Force update dashboard snapshot (admin only)
        """
        if not request.user.is_staff and not request.user.is_superuser:
            return Response(
                {'error': 'Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )

        date = request.data.get('date')
        if date:
            try:
                date = datetime.fromisoformat(date).date()
            except:
                return Response(
                    {'error': 'Invalid date format'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            date = timezone.now().date()

        try:
            snapshot = AnalyticsService.update_dashboard_snapshot(date)
            return Response({
                'message': f'Dashboard snapshot updated for {date}',
                'snapshot_id': snapshot.id
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PerformanceAlertViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API for performance alerts and monitoring
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff or self.request.user.is_superuser:
            return PerformanceAlert.objects.all()
        else:
            # Non-admin users see only active alerts
            return PerformanceAlert.objects.filter(is_active=True)

    def get_serializer_class(self):
        from payments.serializers.analytics import PerformanceAlertSerializer
        return PerformanceAlertSerializer

    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        """
        Acknowledge an alert
        """
        alert = self.get_object()
        alert.acknowledge(request.user)
        return Response({'message': 'Alert acknowledged'})

    @action(detail=False, methods=['post'])
    def check_alerts(self, request):
        """
        Manually trigger alert checking (admin only)
        """
        if not request.user.is_staff and not request.user.is_superuser:
            return Response(
                {'error': 'Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )

        alerts_created = AnalyticsService.check_performance_alerts()
        return Response({
            'message': f'Created {len(alerts_created)} alerts',
            'alerts': [{'id': alert.id, 'title': alert.title} for alert in alerts_created]
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def analytics_overview(request):
    """
    High-level analytics overview for quick dashboard display
    """
    # Last 30 days summary
    end_date = timezone.now()
    start_date = end_date - timedelta(days=30)

    # Transaction metrics
    transactions = Transaction.objects.filter(created_at__range=(start_date, end_date))
    transaction_summary = transactions.aggregate(
        total_count=Count('id'),
        total_amount=Sum('amount'),
        avg_amount=Avg('amount'),
        fee_revenue=Sum('fee_amount')
    )

    # User growth
    from users.models import Customer, Merchant
    customer_growth = Customer.objects.filter(created_at__range=(start_date, end_date)).count()
    merchant_growth = Merchant.objects.filter(created_at__range=(start_date, end_date)).count()

    # Geographic distribution (top 5 countries)
    country_distribution = transactions.values('country_to').annotate(
        count=Count('id'),
        revenue=Sum('amount')
    ).order_by('-count')[:5]

    # Success rate
    successful = transactions.filter(status='completed').count()
    total = transactions.count()
    success_rate = (successful / total * 100) if total > 0 else 0

    # Trends (daily for last 7 days)
    daily_trends = []
    for i in range(6, -1, -1):
        date = (end_date - timedelta(days=i)).date()
        day_start = datetime.combine(date, datetime.min.time())
        day_end = datetime.combine(date, datetime.max.time())

        day_transactions = Transaction.objects.filter(created_at__range=(day_start, day_end))
        daily_trends.append({
            'date': date.isoformat(),
            'transactions': day_transactions.count(),
            'revenue': float(day_transactions.aggregate(total=Sum('amount'))['total'] or 0)
        })

    return Response({
        'period': {
            'start': start_date.date().isoformat(),
            'end': end_date.date().isoformat(),
            'days': 30
        },
        'summary': {
            'total_transactions': transaction_summary['total_count'] or 0,
            'total_revenue': float(transaction_summary['total_amount'] or 0),
            'fee_revenue': float(transaction_summary['fee_revenue'] or 0),
            'average_transaction': float(transaction_summary['avg_amount'] or 0),
            'customer_growth': customer_growth,
            'merchant_growth': merchant_growth,
            'success_rate': success_rate,
        },
        'geographic_distribution': list(country_distribution),
        'daily_trends': daily_trends,
        'top_payment_methods': list(
            transactions.values('payment_method_type').annotate(
                count=Count('id'),
                total=Sum('amount')
            ).order_by('-count')[:5]
        ),
        'alerts_count': PerformanceAlert.objects.filter(is_active=True).count(),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def revenue_analytics(request):
    """
    Detailed revenue analytics
    """
    period = request.query_params.get('period', '30d')

    # Parse period
    if period.endswith('d'):
        days = int(period[:-1])
    elif period.endswith('w'):
        days = int(period[:-1]) * 7
    elif period.endswith('m'):
        days = int(period[:-1]) * 30
    else:
        days = 30

    end_date = timezone.now()
    start_date = end_date - timedelta(days=days)

    # Revenue by transaction type
    revenue_by_type = Transaction.objects.filter(
        created_at__range=(start_date, end_date)
    ).values('transaction_type').annotate(
        revenue=Sum('amount'),
        fee_revenue=Sum('fee_amount'),
        count=Count('id')
    ).order_by('-revenue')

    # Revenue by merchant (top 10)
    revenue_by_merchant = Transaction.objects.filter(
        created_at__range=(start_date, end_date)
    ).values('merchant__business_name').annotate(
        revenue=Sum('amount'),
        fee_revenue=Sum('fee_amount'),
        count=Count('id')
    ).order_by('-revenue')[:10]

    # Revenue trends
    revenue_trends = []
    current_date = start_date
    while current_date <= end_date:
        day_start = datetime.combine(current_date.date(), datetime.min.time())
        day_end = datetime.combine(current_date.date(), datetime.max.time())

        day_revenue = Transaction.objects.filter(
            created_at__range=(day_start, day_end)
        ).aggregate(
            transaction_revenue=Sum('amount'),
            fee_revenue=Sum('fee_amount')
        )

        revenue_trends.append({
            'date': current_date.date().isoformat(),
            'transaction_revenue': float(day_revenue['transaction_revenue'] or 0),
            'fee_revenue': float(day_revenue['fee_revenue'] or 0),
        })

        current_date += timedelta(days=1)

    return Response({
        'period': {'start': start_date.date().isoformat(), 'end': end_date.date().isoformat()},
        'revenue_by_type': list(revenue_by_type),
        'revenue_by_merchant': list(revenue_by_merchant),
        'revenue_trends': revenue_trends,
        'total_revenue': sum(item['transaction_revenue'] for item in revenue_trends),
        'total_fee_revenue': sum(item['fee_revenue'] for item in revenue_trends),
    })
