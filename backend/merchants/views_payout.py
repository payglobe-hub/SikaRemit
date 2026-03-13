"""
Merchant Payout System Views - Real financial settlement processing
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q, Sum, Count
from django.utils import timezone
from decimal import Decimal

from .models_payout import (
    MerchantRevenue,
    MerchantPayout,
    MerchantSettlementSettings,
    MerchantRevenueSummary
)
from ecommerce.models import Order, OrderItem
from merchants.models import Store
from .serializers_merchant_dashboard import MerchantOrderSerializer


class MerchantPayoutViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Merchant payout history and management
    """
    serializer_class = MerchantOrderSerializer  # We'll create a payout serializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Only return payouts for the authenticated merchant"""
        return MerchantPayout.objects.filter(merchant=self.request.user)

    @action(detail=False, methods=['get'])
    def pending_revenue(self, request):
        """Get pending revenue that hasn't been paid out yet"""
        # Get unsettled revenue for this merchant
        unsettled_revenue = MerchantRevenue.objects.filter(
            merchant=request.user,
            is_settled=False
        ).select_related('order', 'order_item', 'store')

        # Aggregate by store
        revenue_by_store = {}
        for revenue in unsettled_revenue:
            store_id = revenue.store.id
            if store_id not in revenue_by_store:
                revenue_by_store[store_id] = {
                    'store': {
                        'id': revenue.store.id,
                        'name': revenue.store.name,
                        'merchant_name': revenue.store.merchant.business_name
                    },
                    'total_amount': Decimal('0'),
                    'order_count': 0,
                    'item_count': 0,
                    'orders': []
                }

            store_data = revenue_by_store[store_id]
            store_data['total_amount'] += revenue.net_amount
            store_data['item_count'] += 1

            # Track unique orders
            order_id = revenue.order.id
            if order_id not in [o['id'] for o in store_data['orders']]:
                store_data['orders'].append({
                    'id': order_id,
                    'order_number': revenue.order.order_number,
                    'date': revenue.order.created_at.date()
                })
                store_data['order_count'] += 1

        return Response({
            'total_pending_revenue': sum(s['total_amount'] for s in revenue_by_store.values()),
            'revenue_by_store': list(revenue_by_store.values())
        })

    @action(detail=False, methods=['post'])
    def request_payout(self, request):
        """Request a payout for pending revenue"""
        # Get settlement settings
        try:
            settings = MerchantSettlementSettings.objects.get(merchant=request.user)
        except MerchantSettlementSettings.DoesNotExist:
            return Response(
                {'error': 'Settlement settings not configured. Please set up payout preferences first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get unsettled revenue
        unsettled_revenue = MerchantRevenue.objects.filter(
            merchant=request.user,
            is_settled=False
        )

        if not unsettled_revenue.exists():
            return Response(
                {'error': 'No pending revenue available for payout'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Calculate total amount
        total_amount = unsettled_revenue.aggregate(
            total=Sum('net_amount')
        )['total'] or Decimal('0')

        # Check minimum payout amount
        if total_amount < settings.minimum_payout_amount:
            return Response(
                {
                    'error': f'Minimum payout amount is {settings.minimum_payout_amount}. Current pending: {total_amount}',
                    'current_amount': total_amount,
                    'minimum_required': settings.minimum_payout_amount
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create payout record
        payout = MerchantPayout.objects.create(
            merchant=request.user,
            payout_method=settings.default_payout_method,
            total_amount=total_amount,
            net_amount=total_amount,  # No additional fees for now
            bank_name=settings.bank_name,
            account_number=settings.account_number,
            account_holder_name=settings.account_holder_name,
            mobile_number=settings.mobile_money_number
        )

        # Link revenue records to payout
        payout.revenue_records.set(unsettled_revenue)

        return Response({
            'message': 'Payout request submitted successfully',
            'payout_reference': payout.payout_reference,
            'amount': str(total_amount),
            'method': payout.get_payout_method_display(),
            'status': 'pending'
        })

    @action(detail=False, methods=['get'])
    def revenue_summary(self, request):
        """Get revenue summary for the merchant"""
        # Get date range from query params
        period = request.query_params.get('period', '30')  # days
        try:
            days = int(period)
        except ValueError:
            days = 30

        start_date = timezone.now() - timezone.timedelta(days=days)

        # Get revenue for this merchant
        revenue_records = MerchantRevenue.objects.filter(
            merchant=request.user,
            created_at__gte=start_date
        )

        # Calculate summary
        summary = revenue_records.aggregate(
            total_gross=Sum('gross_amount'),
            total_fees=Sum('platform_fee'),
            total_net=Sum('net_amount'),
            settled_amount=Sum('net_amount', filter=Q(is_settled=True)),
            pending_amount=Sum('net_amount', filter=Q(is_settled=False))
        )

        # Get order and item counts
        order_count = Order.objects.filter(
            items__product__store__merchant__user=request.user,
            created_at__gte=start_date
        ).distinct().count()

        item_count = OrderItem.objects.filter(
            product__store__merchant__user=request.user,
            order__created_at__gte=start_date
        ).count()

        return Response({
            'period_days': days,
            'summary': {
                'gross_revenue': str(summary['total_gross'] or 0),
                'platform_fees': str(summary['total_fees'] or 0),
                'net_revenue': str(summary['total_net'] or 0),
                'settled_amount': str(summary['settled_amount'] or 0),
                'pending_amount': str(summary['pending_amount'] or 0)
            },
            'statistics': {
                'total_orders': order_count,
                'total_items_sold': item_count
            }
        })


class MerchantSettlementSettingsViewSet(viewsets.ModelViewSet):
    """
    Merchant payout and settlement settings management
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Only return settings for the authenticated merchant"""
        return MerchantSettlementSettings.objects.filter(merchant=self.request.user)

    def get_object(self):
        """Get or create settings for the merchant"""
        obj, created = MerchantSettlementSettings.objects.get_or_create(
            merchant=self.request.user
        )
        return obj

    def perform_create(self, serializer):
        """Ensure only one settings record per merchant"""
        if MerchantSettlementSettings.objects.filter(merchant=self.request.user).exists():
            raise serializers.ValidationError("Settlement settings already exist for this merchant")

        serializer.save(merchant=self.request.user)
