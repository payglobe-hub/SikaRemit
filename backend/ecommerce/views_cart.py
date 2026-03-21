"""
Shopping Cart API Views

Complete cart management for customer shopping experience
"""

from rest_framework import generics, status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError
from merchants.models import Product
from .models_cart import ShoppingCart, CartItem, Wishlist, WishlistItem
from .models import Order
from .serializers_cart import (
    CartSerializer, CartItemSerializer, CartDetailSerializer,
    WishlistSerializer, WishlistItemSerializer
)
from .models_cart import CartService, WishlistService

class CartViewSet(viewsets.ModelViewSet):
    """Shopping cart management"""
    permission_classes = [IsAuthenticated]
    serializer_class = CartSerializer
    
    def get_object(self):
        """Get user's cart"""
        return CartService.get_or_create_cart(self.request.user)
    
    def list(self, request):
        """Get user's cart with items"""
        cart = self.get_object()
        
        # Validate cart (remove unavailable items)
        unavailable_items = CartService.validate_cart(request.user)
        
        serializer = CartDetailSerializer(cart)
        response_data = serializer.data.copy()
        
        if unavailable_items:
            response_data['unavailable_items_removed'] = [
                {
                    'product_name': item.product.name,
                    'reason': 'Product no longer available'
                }
                for item in unavailable_items
            ]
        
        return Response(response_data)
    
    @action(detail=False, methods=['post'])
    def add_item(self, request):
        """Add item to cart"""
        product_id = request.data.get('product_id')
        quantity = request.data.get('quantity', 1)
        
        if not product_id:
            return Response(
                {'error': 'product_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            cart_item = CartService.add_item(request.user, product_id, quantity)
            serializer = CartItemSerializer(cart_item)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Product.DoesNotExist:
            return Response(
                {'error': 'Product not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['put'])
    def update_item(self, request):
        """Update cart item quantity"""
        item_id = request.data.get('item_id')
        quantity = request.data.get('quantity')
        
        if not item_id or quantity is None:
            return Response(
                {'error': 'item_id and quantity are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            cart_item = CartService.update_item_quantity(
                request.user, item_id, quantity
            )
            
            if cart_item:
                serializer = CartItemSerializer(cart_item)
                return Response(serializer.data)
            else:
                return Response(
                    {'message': 'Item removed from cart'}, 
                    status=status.HTTP_200_OK
                )
        except ValidationError as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['delete'])
    def remove_item(self, request):
        """Remove item from cart"""
        item_id = request.data.get('item_id')
        
        if not item_id:
            return Response(
                {'error': 'item_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            CartService.remove_item(request.user, item_id)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ValidationError as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['delete'])
    def clear(self, request):
        """Clear entire cart"""
        cart = CartService.clear_cart(request.user)
        serializer = CartSerializer(cart)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get cart summary for checkout"""
        cart = self.get_object()
        
        return Response({
            'total_items': cart.total_items,
            'subtotal': float(cart.subtotal),
            'tax': float(cart.subtotal * Decimal('0.05')),
            'total_with_tax': float(cart.total_with_tax),
            'is_empty': cart.is_empty,
            'items_count': cart.items.count()
        })

class WishlistViewSet(viewsets.ModelViewSet):
    """Wishlist management"""
    permission_classes = [IsAuthenticated]
    serializer_class = WishlistSerializer
    
    def get_object(self):
        """Get user's wishlist"""
        return WishlistService.get_or_create_wishlist(self.request.user)
    
    def list(self, request):
        """Get user's wishlist with items"""
        wishlist = self.get_object()
        serializer = WishlistSerializer(wishlist)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def add_item(self, request):
        """Add product to wishlist"""
        product_id = request.data.get('product_id')
        
        if not product_id:
            return Response(
                {'error': 'product_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            wishlist_item = WishlistService.add_item(request.user, product_id)
            serializer = WishlistItemSerializer(wishlist_item)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Product.DoesNotExist:
            return Response(
                {'error': 'Product not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['delete'])
    def remove_item(self, request):
        """Remove product from wishlist"""
        product_id = request.data.get('product_id')
        
        if not product_id:
            return Response(
                {'error': 'product_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            WishlistService.remove_item(request.user, product_id)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ValidationError as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def move_to_cart(self, request):
        """Move item from wishlist to cart"""
        product_id = request.data.get('product_id')
        
        if not product_id:
            return Response(
                {'error': 'product_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            WishlistService.move_to_cart(request.user, product_id)
            return Response(
                {'message': 'Item moved to cart'}, 
                status=status.HTTP_200_OK
            )
        except ValidationError as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def cart_count(request):
    """Get cart item count"""
    cart = CartService.get_or_create_cart(request.user)
    return Response({
        'count': cart.total_items,
        'is_empty': cart.is_empty
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_add_to_cart(request):
    """Add multiple items to cart"""
    items = request.data.get('items', [])
    
    if not items:
        return Response(
            {'error': 'items array is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    results = []
    errors = []
    
    with transaction.atomic():
        for item_data in items:
            try:
                product_id = item_data.get('product_id')
                quantity = item_data.get('quantity', 1)
                
                cart_item = CartService.add_item(
                    request.user, product_id, quantity
                )
                results.append({
                    'product_id': product_id,
                    'quantity': quantity,
                    'status': 'added'
                })
            except Exception as e:
                errors.append({
                    'product_id': item_data.get('product_id'),
                    'error': str(e)
                })
    
    return Response({
        'results': results,
        'errors': errors,
        'added_count': len(results),
        'error_count': len(errors)
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recommended_products(request):
    """Get recommended products for user"""
    # Simple recommendation based on cart items and wishlist
    cart = CartService.get_or_create_cart(request.user)
    wishlist = WishlistService.get_or_create_wishlist(request.user)
    
    # Get categories from cart and wishlist
    cart_categories = set(
        item.product.category 
        for item in cart.items.all() 
        if item.product.category
    )
    wishlist_categories = set(
        item.product.category 
        for item in wishlist.items.all() 
        if item.product.category
    )
    
    all_categories = cart_categories.union(wishlist_categories)
    
    # Get products from same categories (exclude items already in cart/wishlist)
    cart_product_ids = set(item.product.id for item in cart.items.all())
    wishlist_product_ids = set(item.product.id for item in wishlist.items.all())
    excluded_ids = cart_product_ids.union(wishlist_product_ids)
    
    recommended = Product.objects.filter(
        category__in=all_categories,
        is_available=True,
        stock_quantity__gt=0,
        store__is_active=True
    ).exclude(id__in=excluded_ids).distinct()[:10]
    
    # If no recommendations, return featured products
    if not recommended and not all_categories:
        recommended = Product.objects.filter(
            is_featured=True,
            is_available=True,
            stock_quantity__gt=0,
            store__is_active=True
        )[:10]
    
    from merchants.serializers import ProductSerializer
    serializer = ProductSerializer(recommended, many=True, context={'request': request})
    
    return Response({
        'recommended_products': serializer.data,
        'recommendation_type': 'category_based' if all_categories else 'featured'
    })

# Import Decimal for calculations
from decimal import Decimal
