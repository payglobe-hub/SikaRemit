"""
Order Fulfillment Tracking System - Real merchant order management
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q, Sum, F
from django.utils import timezone
from decimal import Decimal

from ecommerce.models import Order, OrderItem, Payment
from merchants.models import Store
from .serializers_merchant_dashboard import (
    MerchantOrderSerializer,
    MerchantOrderItemSerializer
)

class OrderFulfillmentViewSet(viewsets.ViewSet):
    """
    Order fulfillment tracking and management for merchants
    """
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """List all orders that need fulfillment action from this merchant"""
        # Get orders containing products from this merchant's stores
        merchant_orders = Order.objects.filter(
            items__product__store__merchant__user=request.user
        ).distinct()

        # Filter by fulfillment status
        status_filter = request.query_params.get('status')
        if status_filter:
            if status_filter == 'pending':
                merchant_orders = merchant_orders.filter(
                    Q(status='confirmed') | Q(status='processing')
                )
            elif status_filter == 'fulfilled':
                merchant_orders = merchant_orders.filter(
                    Q(status='shipped') | Q(status='delivered')
                )
            else:
                merchant_orders = merchant_orders.filter(status=status_filter)

        # Order by urgency (newest first)
        merchant_orders = merchant_orders.order_by('-created_at')

        # Paginate results
        from django.core.paginator import Paginator
        page = request.query_params.get('page', 1)
        per_page = request.query_params.get('per_page', 20)

        paginator = Paginator(merchant_orders, per_page)
        page_obj = paginator.get_page(page)

        serializer = MerchantOrderSerializer(
            page_obj.object_list,
            many=True,
            context={'request': request}
        )

        return Response({
            'orders': serializer.data,
            'pagination': {
                'page': page_obj.number,
                'total_pages': paginator.num_pages,
                'total_orders': paginator.count,
                'has_next': page_obj.has_next(),
                'has_previous': page_obj.has_previous()
            }
        })

    def retrieve(self, request, pk=None):
        """Get detailed order information for fulfillment"""
        try:
            order = Order.objects.get(id=pk)
        except Order.DoesNotExist:
            return Response(
                {'error': 'Order not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if merchant has products in this order
        merchant_items = order.items.filter(
            product__store__merchant__user=request.user
        )

        if not merchant_items.exists():
            return Response(
                {'error': 'Order does not contain products from your stores'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get order data with merchant-specific information
        order_data = MerchantOrderSerializer(order, context={'request': request}).data
        items_data = MerchantOrderItemSerializer(
            merchant_items,
            many=True
        ).data

        return Response({
            'order': order_data,
            'merchant_items': items_data,
            'fulfillment_summary': {
                'total_merchant_items': len(items_data),
                'total_merchant_value': sum(
                    Decimal(item['subtotal']) for item in items_data
                ),
                'requires_shipping': any(
                    item['product']['requires_shipping'] for item in items_data
                )
            }
        })

    @action(detail=True, methods=['post'])
    def start_processing(self, request, pk=None):
        """Mark order as being processed by merchant"""
        order = self._get_merchant_order(request, pk)
        if isinstance(order, Response):
            return order

        if order.status != 'confirmed':
            return Response(
                {'error': 'Order must be confirmed before processing'},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.status = 'processing'
        order.save()

        return Response({
            'message': 'Order processing started',
            'order': MerchantOrderSerializer(order).data
        })

    @action(detail=True, methods=['post'])
    def mark_shipped(self, request, pk=None):
        """Mark order as shipped with tracking information"""
        order = self._get_merchant_order(request, pk)
        if isinstance(order, Response):
            return order

        tracking_number = request.data.get('tracking_number')
        carrier = request.data.get('carrier')
        shipping_notes = request.data.get('shipping_notes', '')

        if not tracking_number or not carrier:
            return Response(
                {'error': 'Tracking number and carrier are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update order status
        order.status = 'shipped'
        order.shipped_at = timezone.now()

        # Store shipping information in order notes or create separate model
        shipping_info = f"Shipped via {carrier} - Tracking: {tracking_number}"
        if shipping_notes:
            shipping_info += f" - Notes: {shipping_notes}"

        # For now, store in order notes (you might want a separate Shipping model)
        if order.notes:
            order.notes += f"\n\nShipping: {shipping_info}"
        else:
            order.notes = f"Shipping: {shipping_info}"

        order.save()

        return Response({
            'message': 'Order marked as shipped',
            'tracking_number': tracking_number,
            'carrier': carrier,
            'order': MerchantOrderSerializer(order).data
        })

    @action(detail=True, methods=['post'])
    def mark_delivered(self, request, pk=None):
        """Mark order as delivered"""
        order = self._get_merchant_order(request, pk)
        if isinstance(order, Response):
            return order

        if order.status != 'shipped':
            return Response(
                {'error': 'Order must be shipped before marking as delivered'},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.status = 'delivered'
        order.delivered_at = timezone.now()
        order.save()

        return Response({
            'message': 'Order marked as delivered',
            'order': MerchantOrderSerializer(order).data
        })

    @action(detail=True, methods=['post'])
    def add_fulfillment_note(self, request, pk=None):
        """Add a note to the order for fulfillment tracking"""
        order = self._get_merchant_order(request, pk)
        if isinstance(order, Response):
            return order

        note = request.data.get('note')
        if not note:
            return Response(
                {'error': 'Note content is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        timestamp = timezone.now().strftime('%Y-%m-%d %H:%M:%S')
        formatted_note = f"[{timestamp}] Merchant Note: {note}"

        if order.notes:
            order.notes += f"\n\n{formatted_note}"
        else:
            order.notes = formatted_note

        order.save()

        return Response({
            'message': 'Fulfillment note added',
            'order': MerchantOrderSerializer(order).data
        })

    @action(detail=False, methods=['get'])
    def fulfillment_stats(self, request):
        """Get fulfillment statistics for the merchant"""
        # Get all orders with merchant's products
        base_orders = Order.objects.filter(
            items__product__store__merchant__user=request.user
        ).distinct()

        stats = {
            'pending_orders': base_orders.filter(status='confirmed').count(),
            'processing_orders': base_orders.filter(status='processing').count(),
            'shipped_orders': base_orders.filter(status='shipped').count(),
            'delivered_orders': base_orders.filter(status='delivered').count(),
            'cancelled_orders': base_orders.filter(status='cancelled').count(),
            'total_orders': base_orders.count(),
        }

        # Calculate fulfillment rate
        completed_orders = stats['delivered_orders']
        total_completed = completed_orders + stats['cancelled_orders']
        if total_completed > 0:
            stats['fulfillment_rate'] = round((completed_orders / total_completed) * 100, 2)
        else:
            stats['fulfillment_rate'] = 0

        # Average fulfillment time (simplified)
        delivered_orders = base_orders.filter(
            status='delivered',
            shipped_at__isnull=False,
            created_at__isnull=False
        )

        if delivered_orders.exists():
            avg_time = delivered_orders.annotate(
                fulfillment_time=F('shipped_at') - F('created_at')
            ).aggregate(avg_time=Sum('fulfillment_time'))['avg_time']
            stats['avg_fulfillment_days'] = avg_time.days if avg_time else 0
        else:
            stats['avg_fulfillment_days'] = 0

        return Response(stats)

    def _get_merchant_order(self, request, order_id):
        """Helper method to get and validate merchant's order"""
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response(
                {'error': 'Order not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify merchant has products in this order
        merchant_items = order.items.filter(
            product__store__merchant__user=request.user
        )

        if not merchant_items.exists():
            return Response(
                {'error': 'Order does not contain products from your stores'},
                status=status.HTTP_403_FORBIDDEN
            )

        return order
