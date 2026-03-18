"""
E-commerce API Views

Complete shopping cart, checkout, and order management
"""

from rest_framework import generics, status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
from django.shortcuts import get_object_or_404
from merchants.models import Product
from .models_cart import ShoppingCart, CartItem
from .models import Order, OrderItem, Payment, ShippingAddress
from .serializers_cart import (
    CartSerializer, CartItemSerializer, OrderSerializer, 
    OrderDetailSerializer, PaymentSerializer, ShippingAddressSerializer
)
from .models_cart import CartService
from .services import OrderService, PaymentService
from .services_wallet import WalletPaymentService

class CartViewSet(viewsets.ModelViewSet):
    """Shopping cart management"""
    permission_classes = [IsAuthenticated]
    serializer_class = CartSerializer
    
    def get_object(self):
        cart, created = ShoppingCart.objects.get_or_create(user=self.request.user)
        return cart
    
    def list(self, request):
        """Get user's cart"""
        cart = self.get_object()
        serializer = CartSerializer(cart)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def add_item(self, request):
        """Add item to cart"""
        cart = self.get_object()
        product_id = request.data.get('product_id')
        quantity = request.data.get('quantity', 1)
        
        try:
            product = Product.objects.get(id=product_id, is_available=True, stock_quantity__gt=0)
            cart_item = CartService.add_item(cart, product, quantity)
            serializer = CartItemSerializer(cart_item)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Product.DoesNotExist:
            return Response(
                {'error': 'Product not available'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except ValueError as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['put'])
    def update_item(self, request):
        """Update cart item quantity"""
        cart = self.get_object()
        item_id = request.data.get('item_id')
        quantity = request.data.get('quantity')
        
        try:
            cart_item = CartService.update_item_quantity(cart, item_id, quantity)
            serializer = CartItemSerializer(cart_item)
            return Response(serializer.data)
        except CartItem.DoesNotExist:
            return Response(
                {'error': 'Item not found in cart'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except ValueError as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['delete'])
    def remove_item(self, request):
        """Remove item from cart"""
        cart = self.get_object()
        item_id = request.data.get('item_id')
        
        try:
            CartService.remove_item(cart, item_id)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except CartItem.DoesNotExist:
            return Response(
                {'error': 'Item not found in cart'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['delete'])
    def clear(self, request):
        """Clear entire cart"""
        cart = self.get_object()
        CartService.clear_cart(cart)
        return Response(status=status.HTTP_204_NO_CONTENT)

class OrderViewSet(viewsets.ModelViewSet):
    """Order management for customers"""
    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer
    
    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)
    
    def retrieve(self, request, pk=None):
        """Get order details"""
        order = get_object_or_404(Order, id=pk, user=request.user)
        serializer = OrderDetailSerializer(order)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def create_order(self, request):
        """Create order from cart"""
        try:
            with transaction.atomic():
                order = OrderService.create_order_from_cart(
                    user=request.user,
                    shipping_data=request.data
                )
                serializer = OrderDetailSerializer(order)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel order"""
        order = get_object_or_404(Order, id=pk, user=request.user)
        
        if order.status not in ['pending', 'confirmed']:
            return Response(
                {'error': 'Order cannot be cancelled'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        order.status = 'cancelled'
        order.save()
        
        # Restore stock
        OrderService.restore_stock(order)
        
        return Response({'message': 'Order cancelled successfully'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_order(request):
    """Create order from cart"""
    try:
        with transaction.atomic():
            order = OrderService.create_order_from_cart(
                user=request.user,
                shipping_data=request.data
            )
            serializer = OrderDetailSerializer(order)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
    except ValueError as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_methods(request):
    """Get available payment methods"""
    methods = [
        {'code': 'card', 'name': 'Credit/Debit Card', 'enabled': True},
        {'code': 'paypal', 'name': 'PayPal', 'enabled': True},
        {'code': 'mobile_money', 'name': 'Mobile Money', 'enabled': True},
        {'code': 'bank_transfer', 'name': 'Bank Transfer', 'enabled': False},
    ]
    return Response({'methods': methods})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def process_payment(request, order_id):
    """Process payment for an order"""
    order = get_object_or_404(Order, id=order_id, user=request.user)
    
    if order.payment_status != 'pending':
        return Response(
            {'error': 'Order already processed'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    payment_method = request.data.get('payment_method')
    payment_details = request.data.get('payment_details', {})
    
    try:
        payment = PaymentService.process_payment(
            order=order,
            payment_method=payment_method,
            payment_details=payment_details
        )
        
        if payment.status == 'succeeded':
            order.status = 'confirmed'
            order.payment_status = 'paid'
            order.save()
            
            # Reduce stock
            OrderService.reduce_stock(order)
        
        serializer = PaymentSerializer(payment)
        return Response(serializer.data)
        
    except ValueError as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def calculate_shipping(request):
    """Calculate shipping costs"""
    cart = get_object_or_404(ShoppingCart, user=request.user)
    address_data = request.data.get('address', {})
    
    # Simple shipping calculation (can be enhanced with real shipping APIs)
    shipping_cost = OrderService.calculate_shipping(cart, address_data)
    
    return Response({
        'shipping_cost': shipping_cost,
        'subtotal': cart.subtotal,
        'tax': cart.subtotal * Decimal('0.05'),
        'total': cart.subtotal + shipping_cost + (cart.subtotal * Decimal('0.05'))
    })

class ShippingAddressViewSet(viewsets.ModelViewSet):
    """Manage customer shipping addresses"""
    permission_classes = [IsAuthenticated]
    serializer_class = ShippingAddressSerializer
    
    def get_queryset(self):
        return ShippingAddress.objects.filter(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        """Set address as default"""
        address = get_object_or_404(ShippingAddress, id=pk, user=request.user)
        address.is_default = True
        address.save()
        return Response({'message': 'Default address updated'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def process_payment(request, order_id):
    """Process payment for an order"""
    order = get_object_or_404(Order, id=order_id, user=request.user)
    
    if order.payment_status != 'pending':
        return Response(
            {'error': 'Order already processed'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    payment_method = request.data.get('payment_method')
    payment_details = request.data.get('payment_details', {})
    
    try:
        payment = PaymentService.process_payment(
            order=order,
            payment_method=payment_method,
            payment_details=payment_details
        )
        
        if payment.status == 'succeeded':
            order.status = 'confirmed'
            order.payment_status = 'paid'
            order.save()
            
            # Reduce stock
            OrderService.reduce_stock(order)
        
        serializer = PaymentSerializer(payment)
        return Response(serializer.data)
        
    except ValueError as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_methods(request):
    """Get available payment methods"""
    methods = [
        {'code': 'card', 'name': 'Credit/Debit Card', 'enabled': True},
        {'code': 'paypal', 'name': 'PayPal', 'enabled': True},
        {'code': 'mobile_money', 'name': 'Mobile Money', 'enabled': True},
        {'code': 'bank_transfer', 'name': 'Bank Transfer', 'enabled': False},
    ]
    return Response({'methods': methods})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def calculate_shipping(request):
    """Calculate shipping costs"""
    cart = get_object_or_404(Cart, user=request.user)
    address_data = request.data.get('address', {})
    
    # Simple shipping calculation (can be enhanced with real shipping APIs)
    shipping_cost = OrderService.calculate_shipping(cart, address_data)
    
    return Response({
        'shipping_cost': shipping_cost,
        'subtotal': cart.total_price,
        'tax': cart.total_price * Decimal('0.05'),  # 5% tax
        'total': cart.total_price + shipping_cost + (cart.total_price * Decimal('0.05'))
    })
