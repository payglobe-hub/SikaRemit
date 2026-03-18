"""
Advanced Analytics API Views
Provides REST endpoints for real-time analytics and dashboard data
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from accounts.permissions import IsAdminUser
from shared.constants import USER_TYPE_SUPER_ADMIN, USER_TYPE_MERCHANT
from django.utils import timezone
from django.db.models import Count, Sum, Avg
from datetime import timedelta
from payments.services.analytics_service import AnalyticsService
from payments.models import Transaction, Payment
from users.models import Customer, Merchant
from django.contrib.auth import get_user_model

User = get_user_model()

class AnalyticsViewSet(viewsets.ViewSet):
    """
    Advanced analytics API endpoints
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def realtime_metrics(self, request):
        """
        Get real-time dashboard metrics
        """
        try:
            metrics = AnalyticsService.get_realtime_metrics()
            return Response(metrics)
        except Exception as e:
            return Response(
                {'error': f'Failed to fetch metrics: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def transaction_trends(self, request):
        """
        Get transaction trends over time
        """
        try:
            days = int(request.query_params.get('days', 30))
            if days > 365:
                days = 365  # Limit to 1 year

            trends = AnalyticsService.get_transaction_trends(days)
            return Response(trends)
        except Exception as e:
            return Response(
                {'error': f'Failed to fetch trends: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def revenue_analytics(self, request):
        """
        Get detailed revenue analytics
        """
        try:
            days = int(request.query_params.get('days', 90))
            analytics = AnalyticsService.calculate_dashboard_metrics()
            return Response(analytics)
        except Exception as e:
            return Response(
                {'error': f'Failed to fetch revenue analytics: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def user_analytics(self, request):
        """
        Get user behavior analytics
        """
        try:
            days = int(request.query_params.get('days', 30))
            end_date = timezone.now()
            start_date = end_date - timedelta(days=days)

            # User registration trends
            user_registrations = User.objects.filter(
                date_joined__gte=start_date
            ).extra(
                select={'date': "DATE(date_joined)"}
            ).values('date').annotate(
                count=Count('id')
            ).order_by('date')

            # User activity metrics
            active_users = User.objects.filter(
                last_login__gte=start_date
            ).count()

            # Customer segments
            customer_segments = Customer.objects.values('user__user_type').annotate(
                count=Count('id')
            ).order_by('user__user_type')

            return Response({
                'period_days': days,
                'user_registrations': list(user_registrations.values('date', 'count')),
                'active_users': active_users,
                'customer_segments': list(customer_segments.values('user__user_type', 'count'))
            })
        except Exception as e:
            return Response(
                {'error': f'Failed to fetch user analytics: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def risk_analytics(self, request):
        """
        Get risk and security analytics
        """
        try:
            days = int(request.query_params.get('days', 7))
            end_date = timezone.now()
            start_date = end_date - timedelta(days=days)

            # Failed transaction rate
            total_transactions = Transaction.objects.filter(
                created_at__gte=start_date
            ).count()

            failed_transactions = Transaction.objects.filter(
                created_at__gte=start_date,
                status='failed'
            ).count()

            failed_rate = (failed_transactions / total_transactions * 100) if total_transactions > 0 else 0

            # Large transactions
            large_transactions = Transaction.objects.filter(
                created_at__gte=start_date,
                amount__gte=10000,  # $10,000 threshold
                status='completed'
            ).count()

            return Response({
                'period_days': days,
                'risk_metrics': {
                    'failed_transaction_rate': failed_rate,
                    'large_transactions': large_transactions,
                    'total_transactions': total_transactions
                }
            })
        except Exception as e:
            return Response(
                {'error': f'Failed to fetch risk analytics: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def dashboard_overview(self, request):
        """
        Comprehensive dashboard overview with all key metrics
        """
        try:
            # Get basic metrics directly to avoid service layer issues
            from django.db.models import Sum, Count
            
            # Transaction counts
            total_transactions = Transaction.objects.count()
            completed_transactions = Transaction.objects.filter(status='completed').count()
            
            # Revenue
            total_revenue = Transaction.objects.filter(
                status='completed'
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            # User counts
            total_customers = Customer.objects.count()
            total_merchants = Merchant.objects.count()
            
            # Calculate success rate
            success_rate = (completed_transactions / total_transactions * 100) if total_transactions > 0 else 0

            return Response({
                'summary': {
                    'total_transactions': total_transactions,
                    'total_revenue': float(total_revenue),
                    'fee_revenue': 0,
                    'average_transaction': float(total_revenue / total_transactions) if total_transactions > 0 else 0,
                    'customer_growth': total_customers,
                    'success_rate': round(success_rate, 1)
                },
                'realtime': {
                    'transactions_last_24h': Transaction.objects.filter(
                        created_at__gte=timezone.now() - timedelta(hours=24)
                    ).count(),
                    'active_users': total_customers + total_merchants,
                    'system_health': 'healthy'
                },
                'timestamp': timezone.now().isoformat()
            })
        except Exception as e:
            return Response(
                {'error': f'Failed to fetch dashboard overview: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class MerchantAnalyticsViewSet(viewsets.ViewSet):
    """
    Merchant-specific analytics endpoints
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Get merchants accessible to current user"""
        user = self.request.user
        if user.user_type == USER_TYPE_SUPER_ADMIN:  # Admin
            return Merchant.objects.all()
        elif user.user_type == USER_TYPE_MERCHANT:  # Merchant
            return Merchant.objects.filter(user=user)
        return Merchant.objects.none()

    @action(detail=True, methods=['get'])
    def performance(self, request, pk=None):
        """
        Get detailed performance analytics for a specific merchant
        """
        try:
            merchant = self.get_queryset().get(pk=pk)
            days = int(request.query_params.get('days', 30))

            analytics = AnalyticsService.get_merchant_analytics(merchant, days)
            return Response(analytics)
        except Merchant.DoesNotExist:
            return Response(
                {'error': 'Merchant not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to fetch merchant analytics: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def leaderboard(self, request):
        """
        Get merchant leaderboard by performance metrics
        """
        try:
            days = int(request.query_params.get('days', 30))
            metric = request.query_params.get('metric', 'revenue')  # revenue, transactions, customers

            merchants = self.get_queryset()
            leaderboard = []

            for merchant in merchants:
                analytics = AnalyticsService.get_merchant_analytics(merchant, days)
                leaderboard.append({
                    'merchant_id': merchant.id,
                    'merchant_name': merchant.business_name,
                    'total_revenue': analytics['total_revenue'],
                    'total_transactions': analytics['total_transactions'],
                    'performance_score': analytics['total_revenue']  # Simplified
                })

            # Sort by selected metric
            if metric == 'revenue':
                leaderboard.sort(key=lambda x: x['total_revenue'], reverse=True)
            elif metric == 'transactions':
                leaderboard.sort(key=lambda x: x['total_transactions'], reverse=True)

            return Response({
                'metric': metric,
                'period_days': days,
                'leaderboard': leaderboard[:20]  # Top 20
            })
        except Exception as e:
            return Response(
                {'error': f'Failed to fetch leaderboard: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
