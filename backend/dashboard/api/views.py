from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from accounts.permissions import IsAdminUser
from django.db.models import Count, Sum, Q
from django.utils import timezone
from datetime import timedelta
# from ..models import AdminMetrics  # Model not available
from django.contrib.auth import get_user_model
from payments.models.transaction import Transaction
from payments.models.payment import Payment

User = get_user_model()

class MetricsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        # AdminMetrics model not available - returning empty list
        return Response([])

class AdminDashboardStatsAPIView(APIView):
    """
    Admin dashboard statistics endpoint
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        try:
            # Get all users
            total_users = User.objects.count()
            active_users = User.objects.filter(is_active=True).count()
            
            # Get transaction stats
            total_transactions = Transaction.objects.count()
            
            # Get revenue stats
            total_revenue = Transaction.objects.filter(
                status='completed'
            ).aggregate(Sum('amount'))['amount__sum'] or 0
            
            # Calculate growth (comparing last 30 days to previous 30 days)
            now = timezone.now()
            last_30_days = now - timedelta(days=30)
            previous_30_days = now - timedelta(days=60)
            
            current_revenue = Transaction.objects.filter(
                status='completed',
                created_at__gte=last_30_days
            ).aggregate(Sum('amount'))['amount__sum'] or 0
            
            previous_revenue = Transaction.objects.filter(
                status='completed',
                created_at__gte=previous_30_days,
                created_at__lt=last_30_days
            ).aggregate(Sum('amount'))['amount__sum'] or 1
            
            revenue_growth = ((current_revenue - previous_revenue) / previous_revenue * 100) if previous_revenue > 0 else 0
            
            current_transactions = Transaction.objects.filter(
                created_at__gte=last_30_days
            ).count()
            
            previous_transactions = Transaction.objects.filter(
                created_at__gte=previous_30_days,
                created_at__lt=last_30_days
            ).count() or 1
            
            transaction_growth = ((current_transactions - previous_transactions) / previous_transactions * 100) if previous_transactions > 0 else 0
            
            # Get pending verifications (with error handling)
            pending_verifications = 0
            try:
                from users.models import KYCDocument
                pending_verifications = KYCDocument.objects.filter(status='PENDING').count()
            except Exception:
                pass
            
            # Get failed payments
            failed_payments = Payment.objects.filter(status='failed').count()
            
            # Revenue by period (last 7 days)
            revenue_by_period = []
            for i in range(7):
                date = now - timedelta(days=i)
                day_revenue = Transaction.objects.filter(
                    status='completed',
                    created_at__date=date.date()
                ).aggregate(Sum('amount'))['amount__sum'] or 0
                
                day_count = Transaction.objects.filter(
                    created_at__date=date.date()
                ).count()
                
                revenue_by_period.append({
                    'period': date.strftime('%Y-%m-%d'),
                    'amount': float(day_revenue),
                    'count': day_count
                })
            
            # Transactions by status
            transactions_by_status = {
                'completed': Transaction.objects.filter(status='completed').count(),
                'pending': Transaction.objects.filter(status='pending').count(),
                'failed': Transaction.objects.filter(status='failed').count(),
                'cancelled': Transaction.objects.filter(status='cancelled').count(),
            }
            
            # Users by type - count admins by is_staff/is_superuser as well
            admin_count = User.objects.filter(Q(user_type=1) | Q(is_staff=True) | Q(is_superuser=True)).distinct().count()
            users_by_type = {
                'admin': admin_count,
                'merchant': User.objects.filter(user_type=2).count(),
                'customer': User.objects.filter(user_type=3).count(),
            }
            
            # Top merchants by revenue
            top_merchants = []
            try:
                merchant_revenue = Transaction.objects.filter(
                    status='completed',
                    merchant__isnull=False
                ).values('merchant__business_name').annotate(
                    total_revenue=Sum('amount'),
                    transaction_count=Count('id')
                ).order_by('-total_revenue')[:5]
                
                for merchant_data in merchant_revenue:
                    top_merchants.append({
                        'name': merchant_data['merchant__business_name'],
                        'revenue': float(merchant_data['total_revenue'] or 0),
                        'transactions': merchant_data['transaction_count']
                    })
            except Exception:
                pass
            
            # Recent activities (last 10 transactions)
            recent_activities = []
            try:
                recent_transactions = Transaction.objects.select_related('customer__user').order_by('-created_at')[:10]
                for txn in recent_transactions:
                    recent_activities.append({
                        'id': txn.id,
                        'type': 'transaction',
                        'description': f"{txn.get_transaction_type_display()} - {txn.amount} {txn.currency}",
                        'user': txn.customer.user.email if txn.customer and txn.customer.user else 'Unknown',
                        'timestamp': txn.created_at.isoformat(),
                        'status': txn.status
                    })
            except Exception:
                pass
            
            # Payment methods distribution
            payment_methods = {}
            try:
                payment_method_counts = Payment.objects.values('payment_method__method_type').annotate(
                    count=Count('id')
                ).order_by('-count')
                
                total_payments = Payment.objects.count()
                if total_payments > 0:
                    for pm in payment_method_counts:
                        method_type = pm['payment_method__method_type'] or 'unknown'
                        percentage = round((pm['count'] / total_payments) * 100)
                        payment_methods[method_type.lower()] = percentage
            except Exception:
                pass
            
            # Geographic distribution - simplified to avoid address lookup errors
            geographic_distribution = {}
            
            stats = {
                'overview': {
                    'total_users': total_users,
                    'active_users': active_users,
                    'total_revenue': float(total_revenue),
                    'revenue_growth': round(revenue_growth, 2),
                    'total_transactions': total_transactions,
                    'transaction_growth': round(transaction_growth, 2),
                    'pending_verifications': pending_verifications,
                    'failed_payments': failed_payments,
                },
                'revenue_by_period': revenue_by_period,
                'transactions_by_status': transactions_by_status,
                'users_by_type': users_by_type,
                'top_merchants': top_merchants,
                'recent_activities': recent_activities,
                'payment_methods': payment_methods,
                'geographic_distribution': geographic_distribution,
            }
            
            return Response(stats)
        except Exception as e:
            # Return minimal stats on error
            return Response({
                'overview': {
                    'total_users': User.objects.count(),
                    'active_users': User.objects.filter(is_active=True).count(),
                    'total_revenue': 0,
                    'revenue_growth': 0,
                    'total_transactions': 0,
                    'transaction_growth': 0,
                    'pending_verifications': 0,
                    'failed_payments': 0,
                },
                'revenue_by_period': [],
                'transactions_by_status': {},
                'users_by_type': {},
                'top_merchants': [],
                'recent_activities': [],
                'payment_methods': {},
                'geographic_distribution': {},
                'error': str(e)
            })

class MerchantMetricsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]  # Allow authenticated merchants
    
    def get(self, request):
        merchants = User.objects.filter(user_type=2)  # 2 = merchant
        stats = {
            'total': merchants.count(),
            'active': merchants.filter(is_active=True).count(),
            'revenue_30d': Transaction.objects.filter(
                created_at__gte=timezone.now() - timedelta(days=30)
            ).aggregate(Sum('amount'))['amount__sum'] or 0
        }
        return Response(stats)
