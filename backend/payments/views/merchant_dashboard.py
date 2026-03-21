"""
Merchant Dashboard API Views
Provides real-time dashboard data for merchants
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q, Sum, Count, Avg
from django.utils import timezone
from datetime import timedelta
import logging

from ..models import Transaction, PaymentMethod
from users.models import Merchant

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def merchant_dashboard_stats(request):
    """
    Get comprehensive dashboard statistics for merchants
    
    Returns:
    - Total revenue
    - Transaction counts by status
    - Recent transactions
    - Payment method breakdown
    - Daily/weekly/monthly trends
    """
    try:
        # Get merchant profile - check if user has merchant profile first
        if not hasattr(request.user, 'merchant_profile'):
            return Response(
                {'error': 'Merchant profile not found', 'detail': f'User {request.user.id} (type: {request.user.user_type}) does not have a merchant profile'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        merchant = request.user.merchant_profile
    except Merchant.DoesNotExist:
        return Response(
            {'error': 'Merchant profile not found', 'detail': f'Merchant profile does not exist for user {request.user.id}'},
            status=status.HTTP_404_NOT_FOUND
        )
        
        # Time periods for analysis
        now = timezone.now()
        today = now.date()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        
        # Base query for merchant transactions
        merchant_transactions = Transaction.objects.filter(
            merchant=merchant
        )
        
        # Revenue calculations
        total_revenue = merchant_transactions.filter(
            status='completed'
        ).aggregate(
            total=Sum('amount')
        )['total'] or 0
        
        today_revenue = merchant_transactions.filter(
            status='completed',
            created_at__date=today
        ).aggregate(
            total=Sum('amount')
        )['total'] or 0
        
        week_revenue = merchant_transactions.filter(
            status='completed',
            created_at__gte=week_ago
        ).aggregate(
            total=Sum('amount')
        )['total'] or 0
        
        month_revenue = merchant_transactions.filter(
            status='completed',
            created_at__gte=month_ago
        ).aggregate(
            total=Sum('amount')
        )['total'] or 0
        
        # Transaction counts by status
        transaction_stats = merchant_transactions.aggregate(
            total=Count('id'),
            completed=Count('id', filter=Q(status='completed')),
            pending=Count('id', filter=Q(status='pending')),
            processing=Count('id', filter=Q(status='processing')),
            failed=Count('id', filter=Q(status='failed'))
        )
        
        # Payment method breakdown
        payment_method_stats = merchant_transactions.filter(
            status='completed'
        ).values('payment_method__method_type').annotate(
            count=Count('id'),
            total_amount=Sum('amount')
        ).order_by('-total_amount')
        
        # Recent transactions (last 10)
        recent_transactions = merchant_transactions.order_by('-created_at')[:10]
        recent_data = []
        for tx in recent_transactions:
            recent_data.append({
                'id': str(tx.id),
                'amount': float(tx.amount),
                'currency': tx.currency,
                'status': tx.status,
                'created_at': tx.created_at.isoformat(),
                'customer_email': tx.customer.user.email if tx.customer else None,
                'payment_method': tx.payment_method.method_type if tx.payment_method else 'unknown',
                'reference': f'TX-{tx.id}',
                'description': tx.description
            })
        
        # Daily revenue for last 7 days
        daily_revenue = []
        for i in range(7):
            date = (now - timedelta(days=i)).date()
            daily_total = merchant_transactions.filter(
                status='completed',
                created_at__date=date
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            daily_revenue.append({
                'date': date.isoformat(),
                'revenue': float(daily_total)
            })
        
        daily_revenue.reverse()  # Show oldest to newest
        
        # Calculate growth rates
        previous_week_revenue = merchant_transactions.filter(
            status='completed',
            created_at__gte=week_ago - timedelta(days=7),
            created_at__lt=week_ago
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        week_growth = ((week_revenue - previous_week_revenue) / previous_week_revenue * 100) if previous_week_revenue > 0 else 0
        
        # Average transaction value
        avg_transaction = merchant_transactions.filter(
            status='completed'
        ).aggregate(
            avg=Avg('amount')
        )['avg'] or 0
        
        dashboard_data = {
            'revenue': {
                'total': float(total_revenue),
                'today': float(today_revenue),
                'this_week': float(week_revenue),
                'this_month': float(month_revenue),
                'week_growth_percent': round(week_growth, 2)
            },
            'transactions': {
                'total': transaction_stats['total'],
                'completed': transaction_stats['completed'],
                'pending': transaction_stats['pending'],
                'processing': transaction_stats['processing'],
                'failed': transaction_stats['failed'],
                'completion_rate': round((transaction_stats['completed'] / transaction_stats['total'] * 100) if transaction_stats['total'] > 0 else 0, 2)
            },
            'payment_methods': list(payment_method_stats),
            'recent_transactions': recent_data,
            'daily_revenue': daily_revenue,
            'analytics': {
                'average_transaction_value': float(avg_transaction),
                'total_customers': merchant_transactions.filter(
                    status='completed'
                ).values('customer').distinct().count(),
                'peak_day': max(daily_revenue, key=lambda x: x['revenue'])['date'] if daily_revenue else None
            },
            'merchant_info': {
                'business_name': merchant.business_name,
                'merchant_id': str(merchant.id),
                'status': merchant.status,
                'is_verified': merchant.is_verified
            }
        }
        
        return Response(dashboard_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching merchant dashboard stats: {str(e)}")
        return Response(
            {'error': 'Failed to fetch dashboard data'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def merchant_recent_transactions(request):
    """
    Get recent transactions for merchant dashboard
    
    Query parameters:
    - limit: Number of transactions to return (default: 10, max: 50)
    - status: Filter by transaction status (optional)
    - payment_method: Filter by payment method (optional)
    """
    try:
        # Get merchant profile - simplified for debugging
        merchant = request.user.merchant_profile
        
        # Get query parameters
        limit = min(int(request.GET.get('limit', 10)), 50)  # Max 50 transactions
        status_filter = request.GET.get('status')
        payment_method_filter = request.GET.get('payment_method')
        
        # Build query
        query = Transaction.objects.filter(merchant=merchant)
        
        # Apply filters
        if status_filter:
            query = query.filter(status=status_filter)
        if payment_method_filter:
            query = query.filter(payment_method__name=payment_method_filter)
        
        # Get recent transactions
        transactions = query.order_by('-created_at')[:limit]
        
        # Simple serialization for debugging
        transaction_data = []
        for tx in transactions:
            transaction_data.append({
                'id': tx.id,
                'amount': str(tx.amount),
                'currency': tx.currency,
                'status': tx.status,
                'created_at': tx.created_at.isoformat(),
                'customer_email': tx.customer.user.email if tx.customer else 'Anonymous',
                'payment_method': tx.payment_method.method_type if tx.payment_method else 'unknown',
                'reference': f'TX-{tx.id}',
                'description': tx.description,
            })
        
        return Response({
            'results': transaction_data,
            'count': len(transaction_data),
            'filters_applied': {
                'status': status_filter,
                'payment_method': payment_method_filter,
                'limit': limit
            }
        })
        
    except Merchant.DoesNotExist:
        return Response(
            {'error': 'Merchant profile not found', 'detail': f'Merchant profile does not exist for user {request.user.id}'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        # Log the error for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error in merchant_recent_transactions: {e}")
        
        return Response(
            {'error': 'Internal server error', 'detail': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def merchant_analytics(request):
    """
    Get detailed analytics for merchant
    
    Returns:
    - Revenue trends
    - Customer analytics
    - Payment method performance
    - Peak hours analysis
    """
    try:
        # Get merchant profile - check if user has merchant profile first
        if not hasattr(request.user, 'merchant_profile'):
            return Response(
                {'error': 'Merchant profile not found', 'detail': f'User {request.user.id} (type: {request.user.user_type}) does not have a merchant profile'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        merchant = request.user.merchant_profile
    except Merchant.DoesNotExist:
        return Response(
            {'error': 'Merchant profile not found', 'detail': f'Merchant profile does not exist for user {request.user.id}'},
            status=status.HTTP_404_NOT_FOUND
        )
        
        # Time periods
        now = timezone.now()
        month_ago = now - timedelta(days=30)
        
        # Base query
        completed_transactions = Transaction.objects.filter(
            merchant=merchant,
            status='completed',
            created_at__gte=month_ago
        )
        
        # Hourly breakdown (last 24 hours)
        hourly_data = []
        for i in range(24):
            hour_start = now - timedelta(hours=i+1)
            hour_end = now - timedelta(hours=i)
            
            hour_transactions = completed_transactions.filter(
                created_at__gte=hour_start,
                created_at__lt=hour_end
            )
            
            hourly_data.append({
                'hour': hour_start.hour,
                'transactions': hour_transactions.count(),
                'revenue': float(hour_transactions.aggregate(Sum('amount'))['amount'] or 0)
            })
        
        hourly_data.reverse()  # Show oldest to newest
        
        # Customer analytics
        customer_stats = completed_transactions.values('customer').annotate(
            transaction_count=Count('id'),
            total_spent=Sum('amount'),
            avg_transaction=Avg('amount')
        ).order_by('-total_spent')[:10]  # Top 10 customers
        
        # Payment method performance
        payment_performance = completed_transactions.values('payment_method__method_type').annotate(
            count=Count('id'),
            total_amount=Sum('amount'),
            avg_amount=Avg('amount'),
            success_rate=Count('id', filter=Q(status='completed')) * 100.0 / Count('id')
        ).order_by('-total_amount')
        
        analytics_data = {
            'hourly_breakdown': hourly_data,
            'top_customers': list(customer_stats),
            'payment_performance': list(payment_performance),
            'summary': {
                'total_revenue': float(completed_transactions.aggregate(Sum('amount'))['amount'] or 0),
                'total_transactions': completed_transactions.count(),
                'unique_customers': completed_transactions.values('customer').distinct().count(),
                'avg_transaction_value': float(completed_transactions.aggregate(Avg('amount'))['avg'] or 0)
            }
        }
        
        return Response(analytics_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching merchant analytics: {str(e)}")
        return Response(
            {'error': 'Failed to fetch analytics'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
