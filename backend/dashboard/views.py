from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from users.models import Merchant, Customer
from payments.models import Transaction
from payments.models.fees import FeeConfiguration, FeeCalculationLog
from datetime import datetime, timedelta
from django.db.models import Sum, Count
from django.utils import timezone
from django.core.cache import cache
from django.conf import settings
from core.api_utils import api_success
from .models import DashboardStats
from .serializers import DashboardStatsSerializer
from payments.serializers.fees import FeeConfigurationSerializer
from shared.constants import (
    USER_TYPE_SUPER_ADMIN, USER_TYPE_MERCHANT, USER_TYPE_CUSTOMER,
    ADMIN_HIERARCHY_LEVELS
)
from users.permissions import IsAdminUser, CanAccessSystemSettings, CanAccessReporting

class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        
        if user.user_type == USER_TYPE_SUPER_ADMIN:
            data = {
                'total_merchants': Merchant.objects.count(),
                'total_customers': Customer.objects.count(),
                'total_transactions': Transaction.objects.count()
            }
            return api_success(data, request=request)
        
        elif user.user_type == USER_TYPE_MERCHANT:
            merchant = Merchant.objects.get(user=user)
            transactions = Transaction.objects.filter(merchant=merchant)
            
            data = {
                'total_transactions': transactions.count(),
                'total_volume': sum(t.amount for t in transactions)
            }
            return api_success(data, request=request)
        
        else:  # customer
            customer = Customer.objects.get(user=user)
            transactions = Transaction.objects.filter(customer=customer)
            return api_success({'total_transactions': transactions.count(), 'total_spent': sum(t.amount for t in transactions)}, request=request)

class DashboardStatsViewSet(viewsets.ModelViewSet):
    queryset = DashboardStats.objects.all()
    serializer_class = DashboardStatsSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Only show stats for current user
        if not self.request.user.is_staff:
            queryset = queryset.filter(user=self.request.user)
            
        return queryset

    def list(self, request, *args, **kwargs):
        """List dashboard stats with error handling"""
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            # Return empty stats on error
            return Response({
                'results': [],
                'count': 0,
                'error': str(e)
            })

class BusinessSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        try:
            if request.user.user_type == USER_TYPE_CUSTOMER:
                return Response({'error': 'Not found'}, status=404)
                
            if request.user.user_type != USER_TYPE_MERCHANT:
                return Response(
                    {'error': 'Merchant analytics only available for merchant accounts'}, 
                    status=403
                )
                
            merchant = Merchant.objects.select_related('subscription').get(user=request.user)
            
            if merchant.subscription.tier == 'basic':
                return Response(
                    {'error': 'Upgrade to Standard or Premium for analytics features'},
                    status=403
                )
                
            cache_key = f'business_summary_{merchant.id}'
            if not request.GET.get('refresh') and (cached_data := cache.get(cache_key)):
                return Response(cached_data)
                
            transactions = Transaction.objects.filter(
                merchant=merchant,
                created_at__gte=timezone.now() - timedelta(days=30)
            ).select_related('payment_method')
            
            # top_products = Product.objects.filter(
            #     store__merchant=merchant
            # ).prefetch_related('transaction_items').annotate(
            #     sales_count=Count('transaction_items')
            # ).order_by('-sales_count')[:5]
            
            response_data = {
                'total_sales': transactions.count(),
                'total_volume': transactions.aggregate(Sum('amount'))['amount__sum'] or 0,
                'top_products': [],  # Disabled - products module not available
                'payment_methods': list(transactions.values('payment_method__name').annotate(
                    count=Count('id'),
                    total=Sum('amount')
                ).order_by('-total'))
            }
            
            cache.set(cache_key, response_data, timeout=settings.ANALYTICS_CACHE_TIMEOUT)
            return Response(response_data)
            
        except Exception as e:
            return Response(
                {'error': 'Failed to generate business summary', 'details': str(e)},
                status=500
            )

class SalesTrendsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        if request.user.user_type == USER_TYPE_CUSTOMER:
            return Response({'error': 'Not found'}, status=404)
            
        if request.user.user_type != USER_TYPE_MERCHANT:
            return Response({'error': 'Unauthorized'}, status=403)
            
        merchant = Merchant.objects.get(user=request.user)
        
        if merchant.subscription_tier == 'basic':
            return Response({'error': 'Sales trends require Standard or Premium tier'}, status=403)
            
        days = int(request.query_params.get('days', 7))
        cache_key = f'sales_trends_{merchant.id}_{days}'
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)
            
        now = timezone.now()
        daily_sales = []
        for i in range(days):
            date = now - timedelta(days=i)
            total = Transaction.objects.filter(
                merchant=merchant,
                created_at__date=date.date()
            ).aggregate(Sum('amount'))['amount__sum'] or 0
            daily_sales.append({
                'date': date.date(),
                'total': total
            })
            
        response_data = {
            'daily_sales': sorted(daily_sales, key=lambda x: x['date']),
            'period': f'Last {days} days'
        }
        
        cache.set(cache_key, response_data, timeout=settings.ANALYTICS_CACHE_TIMEOUT)
        return Response(response_data)

class AdminAuditView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        # AdminActivity model not available - returning empty list
        return Response([])

class SystemSettingsView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanAccessSystemSettings]
    
    def get(self, request):
        settings_data = {
            'payment_gateway_enabled': settings.PAYMENT_GATEWAY_ENABLED,
            'max_login_attempts': settings.MAX_LOGIN_ATTEMPTS,
            'mfa_required': settings.MFA_REQUIRED
        }
        return Response(settings_data)

class AdminStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        users = Customer.objects.count()
        merchants = Merchant.objects.count()
        transactions = Transaction.objects.count()
        
        return api_success({
            'users': users,
            'merchants': merchants,
            'transactions': transactions
        })

class RecentActivityView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        # AdminActivity model not available - returning empty list
        return api_success([])

class SystemHealthView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        # Check database connection
        try:
            Customer.objects.count()
            db_status = True
        except:
            db_status = False
            
        # Check cache
        try:
            cache.set('health_check', 'ok', 1)
            cache_status = cache.get('health_check') == 'ok'
        except:
            cache_status = False
            
        return api_success({
            'database': db_status,
            'api': True,
            'cache': cache_status,
            'workers': settings.CELERY_WORKERS
        })

class FeeConfigurationViewSet(viewsets.ModelViewSet):
    """Admin API for managing fee configurations"""
    queryset = FeeConfiguration.objects.all()
    serializer_class = FeeConfigurationSerializer
    permission_classes = [permissions.IsAuthenticated, CanAccessSystemSettings]

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Get fee analytics for admin dashboard"""
        from django.db.models import Avg
        from django.db.models.functions import TruncMonth
        
        # Get all fee configurations
        all_configs = FeeConfiguration.objects.all()
        active_configs = all_configs.filter(is_active=True).count()
        inactive_configs = all_configs.filter(is_active=False).count()
        total_configs = all_configs.count()
        
        # Calculate fee revenue from FeeCalculationLog (fees collected)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        sixty_days_ago = timezone.now() - timedelta(days=60)
        
        current_month_fees = FeeCalculationLog.objects.filter(
            calculated_at__gte=thirty_days_ago
        ).aggregate(total_fees=Sum('calculated_fee'))['total_fees'] or 0
        
        last_month_fees = FeeCalculationLog.objects.filter(
            calculated_at__gte=sixty_days_ago,
            calculated_at__lt=thirty_days_ago
        ).aggregate(total_fees=Sum('calculated_fee'))['total_fees'] or 0
        
        # Calculate change percentages
        revenue_change = 0
        if last_month_fees > 0:
            revenue_change = round(((float(current_month_fees) - float(last_month_fees)) / float(last_month_fees)) * 100, 1)
        
        # Average fee per transaction
        current_avg = FeeCalculationLog.objects.filter(
            calculated_at__gte=thirty_days_ago
        ).aggregate(avg_fee=Avg('calculated_fee'))['avg_fee'] or 0
        
        last_avg = FeeCalculationLog.objects.filter(
            calculated_at__gte=sixty_days_ago,
            calculated_at__lt=thirty_days_ago
        ).aggregate(avg_fee=Avg('calculated_fee'))['avg_fee'] or 0
        
        avg_change = 0
        if last_avg > 0:
            avg_change = round(((float(current_avg) - float(last_avg)) / float(last_avg)) * 100, 1)
        
        # Find peak month
        monthly_fees = FeeCalculationLog.objects.annotate(
            month=TruncMonth('calculated_at')
        ).values('month').annotate(
            total=Sum('calculated_fee')
        ).order_by('-total')[:1]
        
        peak_revenue = 0
        peak_month = 'N/A'
        if monthly_fees:
            peak_data = monthly_fees[0]
            peak_revenue = float(peak_data['total'] or 0)
            if peak_data['month']:
                peak_month = peak_data['month'].strftime('%B %Y')
        
        return Response({
            'total_fee_revenue': float(current_month_fees),
            'revenue_change_percent': revenue_change,
            'average_fee_per_transaction': round(float(current_avg), 2),
            'avg_fee_change_percent': avg_change,
            'total_configurations': total_configs,
            'active_configurations': active_configs,
            'inactive_configurations': inactive_configs,
            'peak_revenue': peak_revenue,
            'peak_month': peak_month,
        })
