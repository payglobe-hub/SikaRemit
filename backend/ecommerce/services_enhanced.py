"""
Enhanced Wishlist Services

Advanced wishlist functionality with recommendations and social features
"""

from django.db import transaction
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.cache import cache
from django.db.models import Q, Count, Avg
from decimal import Decimal
from datetime import timedelta
import random
import logging

from .models_enhanced_wishlist import (
    EnhancedWishlist, EnhancedWishlistItem, ProductRecommendation,
    WishlistAnalytics, WishlistSocialService, WishlistExportService
)
from merchants.models import Product

User = get_user_model()
logger = logging.getLogger(__name__)

class EnhancedWishlistService:
    """Service for enhanced wishlist functionality"""
    
    CACHE_TIMEOUT = 3600  # 1 hour
    
    @staticmethod
    def get_or_create_wishlist(user):
        """Get or create enhanced wishlist for user"""
        cache_key = f'wishlist_{user.id}'
        wishlist = cache.get(cache_key)
        
        if not wishlist:
            wishlist, created = EnhancedWishlist.objects.get_or_create(user=user)
            cache.set(cache_key, wishlist, EnhancedWishlistService.CACHE_TIMEOUT)
        
        return wishlist
    
    @staticmethod
    def add_to_wishlist(user, product_id, source='manual'):
        """Add product to wishlist with tracking"""
        with transaction.atomic():
            wishlist = EnhancedWishlistService.get_or_create_wishlist(user)
            product = Product.objects.get(id=product_id)
            
            # Check if already in wishlist
            if wishlist.items.filter(product=product).exists():
                raise ValueError("Product already in wishlist")
            
            # Create wishlist item
            item = EnhancedWishlistItem.objects.create(
                wishlist=wishlist,
                product=product,
                recommendation_source=source
            )
            
            # Update analytics
            EnhancedWishlistService.update_analytics(user)
            
            # Clear cache
            cache.delete(f'wishlist_{user.id}')
            
            return item
    
    @staticmethod
    def remove_from_wishlist(user, product_id):
        """Remove product from wishlist"""
        with transaction.atomic():
            wishlist = EnhancedWishlistService.get_or_create_wishlist(user)
            product = Product.objects.get(id=product_id)
            
            try:
                item = wishlist.items.get(product=product)
                item.delete()
                EnhancedWishlistService.update_analytics(user)
                cache.delete(f'wishlist_{user.id}')
            except EnhancedWishlistItem.DoesNotExist:
                pass
    
    @staticmethod
    def move_to_cart(user, product_id):
        """Move wishlist item to cart"""
        with transaction.atomic():
            wishlist = EnhancedWishlistService.get_or_create_wishlist(user)
            product = Product.objects.get(id=product_id)
            
            try:
                item = wishlist.items.get(product=product)
                item.moved_to_cart_at = timezone.now()
                item.save()
                
                # Update analytics
                EnhancedWishlistService.update_analytics(user)
                cache.delete(f'wishlist_{user.id}')
                
                # Here you would integrate with cart service
                # from .services_cart import CartService
                # CartService.add_item(user, product_id, 1)
                
            except EnhancedWishlistItem.DoesNotExist:
                pass
    
    @staticmethod
    def get_recommendations(user, limit=10):
        """Get AI-powered product recommendations"""
        cache_key = f'recommendations_{user.id}'
        cached_recommendations = cache.get(cache_key)
        
        if cached_recommendations:
            return cached_recommendations
        
        # Clear expired recommendations
        ProductRecommendation.objects.filter(
            user=user,
            expires_at__lt=timezone.now()
        ).delete()
        
        # Get user's wishlist items for analysis
        wishlist = EnhancedWishlistService.get_or_create_wishlist(user)
        wishlist_items = wishlist.items.select('product', 'product__category', 'product__store')
        
        # Get products not in wishlist
        wishlist_product_ids = wishlist_items.values_list('product_id')
        available_products = Product.objects.filter(
            is_available=True,
            stock_quantity__gt=0
        ).exclude(id__in=wishlist_product_ids)
        
        # Implement different recommendation algorithms
        recommendations = []
        
        # 1. Collaborative Filtering (simplified)
        recommendations.extend(
            EnhancedWishlistService._collaborative_filtering(user, available_products, limit // 3)
        )
        
        # 2. Content-Based Filtering
        recommendations.extend(
            EnhancedWishlistService._content_based_filtering(user, available_products, limit // 3)
        )
        
        # 3. Trending Products
        recommendations.extend(
            EnhancedWishlistService._trending_products(available_products, limit // 2)
        )
        
        # 4. Category-Based
        recommendations.extend(
            EnhancedWishlistService._category_based(user, available_products, limit // 2)
        )
        
        # Remove duplicates and limit
        seen_ids = set()
        unique_recommendations = []
        
        for rec in recommendations:
            if rec['product'].id not in seen_ids:
                seen_ids.add(rec['product'].id)
                unique_recommendations.append(rec)
                if len(unique_recommendations) >= limit:
                    break
        
        # Cache recommendations
        cache.set(cache_key, unique_recommendations, EnhancedWishlistService.CACHE_TIMEOUT)
        
        return unique_recommendations[:limit]
    
    @staticmethod
    def _collaborative_filtering(user, products, limit):
        """Simplified collaborative filtering"""
        # Get users with similar preferences
        similar_users = EnhancedWishlistService._get_similar_users(user)
        
        if not similar_users:
            return []
        
        # Get products liked by similar users
        similar_wishlist_items = EnhancedWishlistItem.objects.filter(
            wishlist__user__in=similar_users,
            recommendation_source='manual'
        ).select('product').distinct()
        
        # Filter to available products
        recommended_products = products.filter(
            id__in=similar_wishlist_items.values_list('product_id')
        ).order_by('-id')[:limit]
        
        return [
            {
                'product': {
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
                    'stock_quantity': product.stock_quantity,
                    'is_available': product.is_available,
                    'is_featured': product.is_featured,
                },
                'recommendation_reason': 'People with similar taste also liked this',
                'recommendation_score': 4.5,
                'algorithm': 'collaborative_filtering'
            }
            for product in recommended_products
        ]
    
    @staticmethod
    def _content_based_filtering(user, products, limit):
        """Content-based filtering using product attributes"""
        # Get user's wishlist categories
        user_categories = EnhancedWishlistItem.objects.filter(
            wishlist__user=user
        ).values_list('product__category')
        
        if not user_categories:
            return []
        
        # Find products in same categories
        category_counts = {}
        for category in user_categories:
            category_counts[category] = user_categories.count(category)
        
        # Get most frequent category
        top_category = max(category_counts, key=category_counts.get) if category_counts else None
        
        if top_category:
            recommended_products = products.filter(category=top_category).order_by('-id')[:limit]
        else:
            recommended_products = products.order_by('-id')[:limit]
        
        return [
            {
                'product': {
                    'id': product.id,
                    'name': product.name,
                    'price': product.price,
                    'image': product.image.url if product.image else None,
                    'thumbnail': product.thumbnail.url if product.thumbnail else None,
                    'store': {
                        'name': product.store.name,
                        'id': product.store.id
                    },
                    'category': product.category,
                    'stock_quantity': product.stock_quantity,
                    'is_available': product.is_available,
                    'is_featured': product.is_featured,
                },
                'recommendation_reason': f'Similar to items in your wishlist ({top_category})',
                'recommendation_score': 4.0,
                'algorithm': 'content_based'
            }
            for product in recommended_products
        ]
    
    @staticmethod
    def _trending_products(products, limit):
        """Get trending products based on recent additions"""
        # Get recently added wishlist items
        recent_items = EnhancedWishlistItem.objects.filter(
            added_at__gte=timezone.now() - timedelta(days=7)
        ).values_list('product_id')
        
        if not recent_items:
            return []
        
        # Count how many times each product appears in recent wishlists
        trending_counts = {}
        for product_id in recent_items:
            trending_counts[product_id] = trending_counts.get(product_id, 0) + 1
        
        # Sort by trending count
        trending_product_ids = sorted(
            trending_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )[:limit]
        
        trending_products = products.filter(
            id__in=[pid for pid, _ in trending_product_ids]
        ).order_by('-id')[:limit]
        
        return [
            {
                'product': {
                    'id': product.id,
                    'name': product.name,
                    'price': product.price,
                    'image': product.image.url if product.image else None,
                    'thumbnail': product.thumbnail.url if product.thumbnail else None,
                    'store': {
                        'name': product.store.name,
                        'id': product.store.id
                    },
                    'category': product.category,
                    'stock_quantity': product.stock_quantity,
                    'is_available': product.is_available,
                    'is_featured': product.is_featured,
                },
                'recommendation_reason': 'Trending in wishlists',
                'recommendation_score': 4.2,
                'algorithm': 'trending'
            }
            for product in trending_products
        ]
    
    @staticmethod
    def _category_based(user, products, limit):
        """Category-based recommendations"""
        # Get user's preferred categories
        user_categories = EnhancedWishlistItem.objects.filter(
            wishlist__user=user
        ).values_list('product__category')
        
        if not user_categories:
            return []
        
        # Count categories in user's wishlist
        category_counts = {}
        for category in user_categories:
            category_counts[category] = category_counts.get(category, 0) + 1
        
        # Get most frequent category
        top_category = max(category_counts, key=category_counts.get) if category_counts else None
        
        if top_category:
            recommended_products = products.filter(category=top_category).order_by('-id')[:limit]
        else:
            recommended_products = products.order_by('-id')[:limit]
        
        return [
            {
                'product': {
                    'id': product.id,
                    'name': product.name,
                    'price': product.price,
                    'image': product.image.url if product.image else None,
                    'thumbnail': product.thumbnail.url if product.thumbnail else None,
                    'store': {
                        'name': product.store.name,
                        'id': product.store.id
                    },
                    'category': product.category,
                    'stock_quantity': product.stock_quantity,
                    'is_available': product.is_available,
                    'is_featured': product.is_featured,
                },
                'recommendation_reason': f'Popular in {top_category}',
                'recommendation_score': 3.8,
                'algorithm': 'category_based'
            }
            for product in recommended_products
        ]
    
    @staticmethod
    def _get_similar_users(user, limit=10):
        """Get users with similar preferences"""
        # Get user's wishlist categories
        user_categories = set(
            EnhancedWishlistItem.objects.filter(
                wishlist__user=user
            ).values_list('product__category')
        )
        
        if not user_categories:
            return []
        
        # Find users with similar category preferences
        similar_users = []
        
        for category in user_categories:
            users_in_category = EnhancedWishlistItem.objects.filter(
                product__category=category
            ).values_list('wishlist__user_id')
            similar_users.extend(users_in_category)
        
        # Remove current user and limit
        similar_users = list(set(similar_users) - {user.id})[:limit]
        
        return similar_users
    
    @staticmethod
    def get_wishlist_analytics(user, days=30):
        """Get wishlist analytics for a user"""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        return WishlistAnalytics.objects.filter(
            user=user,
            date__range=[start_date, end_date]
        ).order_by('-date')
    
    @staticmethod
    def update_analytics(user):
        """Update daily analytics for user"""
        today = timezone.now().date()
        WishlistAnalytics.record_analytics(user, today)
    
    @staticmethod
    def get_popular_products(limit=10):
        """Get most popular products across all wishlists"""
        return Product.objects.filter(
            enhancedwishlistitem__isnull=False
        ).annotate(
            wishlist_count=Count('enhancedwishlistitem')
        ).filter(
            wishlist_count__gte=5
        ).order_by('-wishlist_count')[:limit]
    
    @staticmethod
    def get_hot_items(limit=10):
        """Get hot items (recently added, high-scoring)"""
        return EnhancedWishlistItem.objects.filter(
            added_at__gte=timezone.now() - timedelta(days=7),
            recommendation_score__gte=4.0,
            is_purchased=False
        ).select('product').order_by('-recommendation_score')[:limit]
    
    @staticmethod
    def get_abandoned_items(user, days=30):
        """Get items that have been in wishlist for a long time"""
        cutoff_date = timezone.now() - timedelta(days=days)
        return EnhancedWishlistItem.objects.filter(
            wishlist__user=user,
            added_at__lt=cutoff_date,
            is_purchased=False,
            moved_to_cart_at__isnull=True
        ).select('product', 'added_at').order_by('added_at')
    
    @staticmethod
    def clear_cache(user):
        """Clear user's wishlist cache"""
        cache.delete(f'wishlist_{user.id}')
        cache.delete(f'recommendations_{user.id}')
    
    @staticmethod
    def get_wishlist_summary(user):
        """Get comprehensive wishlist summary"""
        wishlist = EnhancedWishlistService.get_or_create_wishlist(user)
        
        # Get analytics data
        analytics = EnhancedWishlistService.get_wishlist_analytics(user, days=30)
        
        # Get abandoned items
        abandoned_items = EnhancedWishlistService.get_abandoned_items(user, days=30)
        
        # Get hot items
        hot_items = EnhancedWishlistService.get_hot_items(limit=5)
        
        return {
            'wishlist': {
                'id': wishlist.id,
                'item_count': wishlist.item_count,
                'total_value': float(wishlist.total_value),
                'created_at': wishlist.created_at.isoformat(),
                'updated_at': wishlist.updated_at.isoformat()
            },
            'analytics': {
                'total_items': analytics.count(),
                'items_added': sum(item.items_added for item in analytics),
                'items_purchased': sum(item.items_purchased for item in analytics),
                'average_item_price': float(sum(item.average_item_price or 0 for item in analytics) / len(analytics)) if analytics else 0
            },
            'abandoned_items': len(abandoned_items),
            'hot_items': len(hot_items)
        }
