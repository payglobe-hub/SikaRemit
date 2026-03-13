"""
Merchant Dashboard Views - Product and Order Management
No mock data - all functionality connects to real models and services
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q, Sum, Count
from django.utils import timezone
from decimal import Decimal

from merchants.models import Store, Product, ProductImage, ProductVariant
from ecommerce.models import Order, OrderItem
from .serializers import (
    MerchantStoreSerializer,
    MerchantProductSerializer,
    MerchantProductCreateSerializer,
    MerchantProductImageSerializer,
    MerchantOrderSerializer,
    MerchantOrderItemSerializer,
    MerchantDashboardStatsSerializer
)


class MerchantStoreViewSet(viewsets.ModelViewSet):
    """
    Merchant store management - allows merchants to manage their store details
    """
    serializer_class = MerchantStoreSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Only return stores owned by the authenticated merchant"""
        return Store.objects.filter(merchant__user=self.request.user)

    def perform_create(self, serializer):
        """Associate the store with the authenticated merchant"""
        from users.models import Merchant
        merchant = get_object_or_404(Merchant, user=self.request.user)
        serializer.save(merchant=merchant)

    @action(detail=True, methods=['post'])
    def update_product_count(self, request, pk=None):
        """Update the store's product count"""
        store = self.get_object()
        store.update_product_count()
        return Response({'message': 'Product count updated successfully'})


class MerchantProductViewSet(viewsets.ModelViewSet):
    """
    Merchant product management - full CRUD operations for products
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Only return products from stores owned by the authenticated merchant"""
        return Product.objects.filter(store__merchant__user=self.request.user)

    def get_serializer_class(self):
        """Use different serializers for create vs other operations"""
        if self.action == 'create':
            return MerchantProductCreateSerializer
        return MerchantProductSerializer

    def perform_create(self, serializer):
        """Associate the product with the merchant's store"""
        from users.models import Merchant
        merchant = get_object_or_404(Merchant, user=self.request.user)

        # Get the merchant's store (create if doesn't exist)
        store, created = Store.objects.get_or_create(
            merchant=merchant,
            defaults={'name': f"{merchant.business_name} Store"}
        )

        serializer.save(store=store)

    @action(detail=True, methods=['post'])
    def update_stock(self, request, pk=None):
        """Update product stock quantity"""
        product = self.get_object()
        quantity_change = request.data.get('quantity_change', 0)

        try:
            quantity_change = int(quantity_change)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid quantity_change value'},
                status=status.HTTP_400_BAD_REQUEST
            )

        product.update_stock(quantity_change)
        return Response({
            'message': 'Stock updated successfully',
            'new_stock_quantity': product.stock_quantity
        })

    @action(detail=True, methods=['post'])
    def toggle_featured(self, request, pk=None):
        """Toggle product's featured status"""
        product = self.get_object()
        product.is_featured = not product.is_featured
        product.save(update_fields=['is_featured'])
        return Response({
            'message': f'Product {"marked as" if product.is_featured else "unmarked as"} featured',
            'is_featured': product.is_featured
        })

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Get products with low stock"""
        threshold = request.query_params.get('threshold', 5)
        try:
            threshold = int(threshold)
        except ValueError:
            threshold = 5

        products = self.get_queryset().filter(
            track_inventory=True,
            stock_quantity__lte=threshold
        )

        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Get featured products"""
        products = self.get_queryset().filter(is_featured=True)
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)


class MerchantProductImageViewSet(viewsets.ModelViewSet):
    """
    Product image management for merchants
    """
    serializer_class = MerchantProductImageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Only return images for products owned by the authenticated merchant"""
        return ProductImage.objects.filter(
            product__store__merchant__user=self.request.user
        )

    def perform_create(self, serializer):
        """Associate the image with a product owned by the merchant"""
        product = serializer.validated_data['product']

        # Verify the product belongs to the merchant
        if product.store.merchant.user != self.request.user:
            raise PermissionError("You can only add images to your own products")

        serializer.save()

    @action(detail=True, methods=['post'])
    def set_primary(self, request, pk=None):
        """Set this image as the primary image for the product"""
        image = self.get_object()
        image.is_primary = True
        image.save()

        # The save method will automatically unset other primary images
        return Response({'message': 'Image set as primary successfully'})

    @action(detail=True, methods=['post'])
    def reorder(self, request, pk=None):
        """Update the sort order of the image"""
        image = self.get_object()
        new_order = request.data.get('sort_order')

        if new_order is None:
            return Response(
                {'error': 'sort_order is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            new_order = int(new_order)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid sort_order value'},
                status=status.HTTP_400_BAD_REQUEST
            )

        image.sort_order = new_order
        image.save(update_fields=['sort_order'])
        return Response({'message': 'Image reordered successfully'})


class MerchantOrderViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Merchant order management - view and manage orders containing merchant's products
    """
    serializer_class = MerchantOrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Only return orders containing products from the authenticated merchant's stores"""
        return Order.objects.filter(
            items__product__store__merchant__user=self.request.user
        ).distinct()

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update order status"""
        order = self.get_object()
        new_status = request.data.get('status')

        if new_status not in dict(Order.STATUS_CHOICES):
            return Response(
                {'error': 'Invalid status value'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Only allow merchants to update to certain statuses
        allowed_statuses = ['processing', 'shipped', 'delivered']
        if new_status not in allowed_statuses:
            return Response(
                {'error': f'Merchants can only update status to: {", ".join(allowed_statuses)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        old_status = order.status
        order.status = new_status

        # Set timestamps based on status
        if new_status == 'shipped' and not order.shipped_at:
            order.shipped_at = timezone.now()
        elif new_status == 'delivered' and not order.delivered_at:
            order.delivered_at = timezone.now()

        order.save()

        return Response({
            'message': f'Order status updated from {old_status} to {new_status}',
            'order': self.get_serializer(order).data
        })

    @action(detail=True, methods=['get'])
    def items(self, request, pk=None):
        """Get order items for this order"""
        order = self.get_object()

        # Only show items from this merchant's products
        items = order.items.filter(product__store__merchant__user=self.request.user)

        serializer = MerchantOrderItemSerializer(items, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get orders pending merchant action"""
        orders = self.get_queryset().filter(
            Q(status='confirmed') | Q(status='processing')
        )

        serializer = self.get_serializer(orders, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent orders (last 30 days)"""
        thirty_days_ago = timezone.now() - timezone.timedelta(days=30)
        orders = self.get_queryset().filter(created_at__gte=thirty_days_ago)

        serializer = self.get_serializer(orders, many=True)
        return Response(serializer.data)


class MerchantDashboardViewSet(viewsets.ViewSet):
    """
    Merchant dashboard statistics and overview
    """
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """
        Get main dashboard overview - redirects to stats for consistency
        """
        return self.stats(request)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get comprehensive dashboard statistics for the merchant"""
        from users.models import Merchant

        try:
            merchant = Merchant.objects.get(user=request.user)
        except Merchant.DoesNotExist:
            return Response(
                {'error': 'Merchant profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get merchant's stores
        stores = Store.objects.filter(merchant=merchant)

        # Calculate statistics
        total_products = Product.objects.filter(store__merchant=merchant).count()
        active_products = Product.objects.filter(
            store__merchant=merchant,
            status='active'
        ).count()

        # Order statistics
        merchant_orders = Order.objects.filter(
            items__product__store__merchant=merchant
        ).distinct()

        total_orders = merchant_orders.count()
        pending_orders = merchant_orders.filter(status__in=['confirmed', 'processing']).count()
        completed_orders = merchant_orders.filter(status='delivered').count()

        # Revenue calculations
        completed_order_items = OrderItem.objects.filter(
            order__status='delivered',
            product__store__merchant=merchant
        )

        total_revenue = completed_order_items.aggregate(
            total=Sum('price') * Count('quantity')
        )['total'] or Decimal('0')

        monthly_revenue = completed_order_items.filter(
            order__created_at__month=timezone.now().month,
            order__created_at__year=timezone.now().year
        ).aggregate(
            total=Sum('price') * Count('quantity')
        )['total'] or Decimal('0')

        # Low stock alerts
        low_stock_products = Product.objects.filter(
            store__merchant=merchant,
            track_inventory=True,
            stock_quantity__lte=5
        ).count()

        stats_data = {
            'merchant_info': {
                'business_name': merchant.business_name,
                'store_count': stores.count(),
                'joined_date': merchant.created_at.date()
            },
            'product_stats': {
                'total_products': total_products,
                'active_products': active_products,
                'low_stock_alerts': low_stock_products
            },
            'order_stats': {
                'total_orders': total_orders,
                'pending_orders': pending_orders,
                'completed_orders': completed_orders
            },
            'revenue_stats': {
                'total_revenue': str(total_revenue),
                'monthly_revenue': str(monthly_revenue)
            },
            'recent_activity': {
                'recent_orders': Order.objects.filter(
                    items__product__store__merchant=merchant
                ).distinct().order_by('-created_at')[:5].values(
                    'id', 'order_number', 'status', 'total', 'created_at'
                )
            }
        }

        return Response(stats_data)

    @action(detail=False, methods=['get'])
    def sales_trend(self, request):
        """Get daily sales for last 30 days - redirect to main MerchantDashboardViewSet"""
        from .views import MerchantDashboardViewSet as MainMerchantDashboardViewSet
        main_viewset = MainMerchantDashboardViewSet()
        main_viewset.request = request
        return main_viewset.sales_trend(request)
