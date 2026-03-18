"""
Enhanced Wishlist API Views

Advanced wishlist functionality with recommendations and social features
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count, Avg
from django.utils import timezone
from datetime import timedelta
from .models_enhanced_wishlist import (
    EnhancedWishlist, EnhancedWishlistItem, ProductRecommendation,
    WishlistAnalytics, WishlistSocialService, WishlistExportService
)
from .serializers_enhanced import (
    EnhancedWishlistSerializer, EnhancedWishlistItemSerializer,
    ProductRecommendationSerializer, WishlistAnalyticsSerializer,
    PublicWishlistSerializer
)
from .services_enhanced import EnhancedWishlistService

class EnhancedWishlistViewSet(viewsets.ModelViewSet):
    """Enhanced wishlist management"""
    permission_classes = [IsAuthenticated]
    serializer_class = EnhancedWishlistSerializer
    
    def get_object(self):
        """Get user's enhanced wishlist"""
        return EnhancedWishlistService.get_or_create_wishlist(self.request.user)
    
    @action(detail=False, methods=['post'])
    def add_item(self, request):
        """Add item to wishlist"""
        product_id = request.data.get('product_id')
        source = request.data.get('source', 'manual')
        
        try:
            item = EnhancedWishlistService.add_to_wishlist(
                user=self.request.user,
                product_id=product_id,
                source=source
            )
            serializer = EnhancedWishlistItemSerializer(item)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def remove_item(self, request):
        """Remove item from wishlist"""
        product_id = request.data.get('product_id')
        
        try:
            EnhancedWishlistService.remove_from_wishlist(
                user=self.request.user,
                product_id=product_id
            )
            return Response(
                {'message': 'Item removed from wishlist'}, 
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def move_to_cart(self, request):
        """Move wishlist item to cart"""
        product_id = request.data.get('product_id')
        
        try:
            EnhancedWishlistService.move_to_cart(
                user=self.request.user,
                product_id=product_id
            )
            return Response(
                {'message': 'Item moved to cart'}, 
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def recommendations(self, request):
        """Get personalized recommendations"""
        limit = int(request.GET.get('limit', 10))
        
        recommendations = EnhancedWishlistService.get_recommendations(
            user=self.request.user,
            limit=limit
        )
        
        serializer = ProductRecommendationSerializer(recommendations, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Get wishlist analytics"""
        days = int(request.GET.get('days', 30))
        
        analytics = EnhancedWishlistService.get_wishlist_analytics(
            user=self.request.user,
            days=days
        )
        
        serializer = WishlistAnalyticsSerializer(analytics, many=True)
        return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def public_wishlists(request):
    """Get public wishlists for discovery"""
    limit = int(request.GET.get('limit', 20))
    
    wishlists = WishlistSocialService.get_public_wishlists(limit=limit)
    serializer = PublicWishlistSerializer(wishlists, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def trending_wishlists(request):
    """Get trending wishlists"""
    limit = int(request.GET.get('limit', 10))
    
    wishlists = WishlistSocialService.get_trending_wishlists(limit=limit)
    serializer = PublicWishlistSerializer(wishlists, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def influencer_wishlists(request):
    """Get influencer wishlists"""
    limit = int(request.GET.get('limit', 10))
    
    wishlists = WishlistSocialService.get_influencer_wishlists(limit=limit)
    serializer = PublicWishlistSerializer(wishlists, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def popular_products(request):
    """Get most popular products across all wishlists"""
    limit = int(request.GET.get('limit', 10))
    
    products = EnhancedWishlistService.get_popular_products(limit=limit)
    
    return Response({
        'popular_products': [
            {
                'id': product.id,
                'name': product.name,
                'price': float(product.price),
                'image': product.image.url if product.image else None,
                'thumbnail': product.thumbnail.url if product.thumbnail else None,
                'store': {
                    'name': product.store.name,
                    'id': product.store.id
                },
                'category': product.category,
                'wishlist_count': product.wishlistitem_count
            }
            for product in products
        ]
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def hot_items(request):
    """Get hot items in wishlists"""
    limit = int(request.GET.get('limit', 10))
    
    items = EnhancedWishlistService.get_hot_items(limit=limit)
    
    return Response({
        'hot_items': [
            {
                'product': {
                    'id': item.product.id,
                    'name': item.product.name,
                    'price': float(item.product.price),
                    'image': item.product.image.url if item.product.image else None,
                    'thumbnail': item.product.thumbnail.url if item.product.thumbnail else None,
                    'store': {
                        'name': item.product.store.name,
                        'id': item.product.store.id
                    },
                    'category': item.product.category,
                    'wishlist_count': item.product.wishlistitem_count
                },
                'recommendation_score': float(item.recommendation_score),
                'days_in_wishlist': item.days_in_wishlist,
                'added_at': item.added_at.isoformat()
            }
            for item in items
        ]
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def abandoned_items(request):
    """Get abandoned wishlist items"""
    days = int(request.GET.get('days', 30))
    
    items = EnhancedWishlistService.get_abandoned_items(
        user=request.user,
        days=days
    )
    
    return Response({
        'abandoned_items': [
            {
                'product': {
                    'id': item.product.id,
                    'name': item.product.name,
                    'price': float(item.product.price),
                    'image': item.product.image.url if item.product.image else None,
                    'thumbnail': item.product.thumbnail.url if item.product.thumbnail else None,
                    'store': {
                        'name': item.product.store.name,
                        'id': item.product.store.id
                    },
                    'category': item.product.category,
                    'added_at': item.added_at.isoformat(),
                    'days_in_wishlist': item.days_in_wishlist
                }
            }
            for item in items
        ]
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_wishlist_csv(request):
    """Export wishlist to CSV"""
    try:
        export_data = WishlistExportService.export_wishlist_csv(request.user)
        return Response({
            'filename': export_data['filename'],
            'items': export_data['items']
        })
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_wishlist_json(request):
    """Export wishlist to JSON"""
    try:
        export_data = WishlistExportService.export_wishlist_json(request.user)
        return Response(export_data)
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

class ProductRecommendationViewSet(viewsets.ModelViewSet):
    """Product recommendation management"""
    permission_classes = [IsAuthenticated]
    serializer_class = ProductRecommendationSerializer
    
    def get_queryset(self):
        """Get user's recommendations"""
        return ProductRecommendation.objects.filter(
            user=self.request.user,
            expires_at__gt=timezone.now()
        ).order_by('-score')
    
    @action(detail=False, methods=['post'])
    def refresh_recommendations(self, request):
        """Refresh user's recommendations"""
        # Clear existing recommendations
        ProductRecommendation.objects.filter(user=self.request.user).delete()
        
        # Generate new recommendations
        recommendations = EnhancedWishlistService.get_recommendations(
            user=self.request.user,
            limit=20
        )
        
        # Save new recommendations
        for rec in recommendations:
            ProductRecommendation.objects.create(
                user=self.request.user,
                product_id=rec['product']['id'],
                score=rec['recommendation_score'],
                reason=rec['recommendation_reason'],
                algorithm=rec['algorithm'],
                expires_at=timezone.now() + timedelta(days=7)
            )
        
        serializer = ProductRecommendationSerializer(recommendations, many=True)
        return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def track_product_view(request):
    """Track product view for recommendations"""
    product_id = request.data.get('product_id')
    user = request.user
    
    try:
        product = get_object_or_404(Product, id=product_id)
        
        # Update last viewed timestamp
        wishlist_items = EnhancedWishlistItem.objects.filter(
            product=product,
            wishlist__user=user
        )
        
        for item in wishlist_items:
            item.last_viewed = timezone.now()
            item.save()
        
        return Response({'message': 'Product view tracked'})
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_add_to_wishlist(request):
    """Bulk add multiple products to wishlist"""
    product_ids = request.data.get('product_ids', [])
    source = request.data.get('source', 'manual')
    
    results = []
    errors = []
    
    for product_id in product_ids:
        try:
            item = EnhancedWishlistService.add_to_wishlist(
                user=request.user,
                product_id=product_id,
                source=source
            )
            results.append({
                'product_id': product_id,
                'status': 'success'
            })
        except ValueError as e:
            errors.append({
                'product_id': product_id,
                'error': str(e)
            })
    
    return Response({
        'results': results,
        'errors': errors,
        'added': len(results),
        'failed': len(errors)
    })
