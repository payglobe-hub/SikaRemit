"""
Enhanced Wishlist Models and Services

Advanced wishlist functionality with recommendations and social features
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
from merchants.models import Product, Store
from django.core.cache import cache
from django.db.models import Q, Count, Avg
from datetime import timedelta
import random

User = get_user_model()

class EnhancedWishlist(models.Model):
    """Enhanced wishlist with recommendations and social features"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='enhanced_wishlist')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.email}'s Wishlist"
    
    @property
    def item_count(self):
        return self.items.count()
    
    @property
    def total_value(self):
        return sum(item.product.price for item in self.items.all())
    
    @property
    def is_public(self):
        return self.user.profile.is_public if hasattr(self.user, 'profile') else False

class EnhancedWishlistItem(models.Model):
    """Enhanced wishlist item with tracking and recommendations"""
    wishlist = models.ForeignKey(EnhancedWishlist, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)
    moved_to_cart_at = models.DateTimeField(null=True, blank=True)
    is_purchased = models.BooleanField(default=False)
    purchase_date = models.DateTimeField(null=True, blank=True)
    recommendation_source = models.CharField(
        max_length=50,
        choices=[
            ('manual', 'Manual'),
            ('ai', 'AI Recommendation'),
            ('trending', 'Trending'),
            ('similar', 'Similar Products'),
            ('popular', 'Popular'),
        ],
        default='manual'
    )
    recommendation_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    last_viewed = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['wishlist', 'product']
        indexes = [
            models.Index(fields=['wishlist', 'added_at']),
            models.Index(fields=['product', 'added_at']),
            models.Index(fields=['recommendation_source']),
        ]
    
    def __str__(self):
        return f"{self.wishlist.user.email} - {self.product.name}"
    
    @property
    def days_in_wishlist(self):
        return (timezone.now() - self.added_at).days
    
    @property
    def is_hot_item(self):
        return self.days_in_wishlist <= 7 and self.recommendation_score and self.recommendation_score >= 4.0
    
    def mark_as_purchased(self):
        self.is_purchased = True
        self.purchase_date = timezone.now()
        self.save()

class ProductRecommendation(models.Model):
    """AI-powered product recommendations"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recommendations')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    score = models.DecimalField(max_digits=5, decimal_places=2)
    reason = models.TextField()
    algorithm = models.CharField(
        max_length=50,
        choices=[
            ('collaborative_filtering', 'Collaborative Filtering'),
            ('content_based', 'Content-Based'),
            ('popularity_based', 'Popularity-Based'),
            ('trending', 'Trending'),
            ('category_based', 'Category-Based'),
            ('price_based', 'Price-Based'),
        ]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'score']),
            models.Index(fields=['algorithm']),
            models.Index(fields=['created_at']),
            models.Index(fields=['expires_at']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.product.name} ({self.score})"
    
    def is_expired(self):
        return timezone.now() > self.expires_at

class WishlistAnalytics(models.Model):
    """Wishlist analytics and insights"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wishlist_analytics')
    date = models.DateField()
    total_items = models.PositiveIntegerField(default=0)
    items_added = models.PositiveIntegerField(default=0)
    items_removed = models.PositiveIntegerField(default=0)
    items_moved_to_cart = models.PositiveIntegerField(default=0)
    items_purchased = models.PositiveIntegerField(default=0)
    most_expensive_item = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    average_item_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    top_category = models.CharField(max_length=50, null=True, blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'date']),
            models.Index(fields=['date']),
        ]
    
    @classmethod
    def record_analytics(cls, user, date):
        analytics, created = cls.objects.get_or_create(user=user, date=date)
        
        # Calculate metrics
        wishlist = user.enhanced_wishlist
        if wishlist:
            analytics.total_items = wishlist.item_count
            analytics.items_added = wishlist.items.filter(added_at__date=date).count()
            analytics.items_removed = wishlist.items.filter(moved_to_cart_at__date=date).count()
            analytics.items_moved_to_cart = wishlist.items.filter(moved_to_cart_at__date=date).count()
            analytics.items_purchased = wishlist.items.filter(purchase_date__date=date).count()
            
            # Calculate price metrics
            items = wishlist.items.all()
            if items.exists():
                prices = [item.product.price for item in items]
                analytics.most_expensive_item = max(prices)
                analytics.average_item_price = sum(prices) / len(prices)
                
                # Find top category
                categories = items.values('product__category').annotate(count=Count('category')).order_by('-count')[:1]
                if categories:
                    analytics.top_category = categories[0]['category']
        
        analytics.save()
        return analytics

class EnhancedWishlistService:
    """Service for enhanced wishlist functionality"""
    
    @staticmethod
    def get_or_create_wishlist(user):
        """Get or create enhanced wishlist for user"""
        wishlist, created = EnhancedWishlist.objects.get_or_create(user=user)
        return wishlist
    
    @staticmethod
    def add_to_wishlist(user, product_id, source='manual'):
        """Add product to wishlist with tracking"""
        wishlist = EnhancedWishlistService.get_or_create_wishlist(user)
        product = get_object_or_404(Product, id=product_id)
        
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
        
        return item
    
    @staticmethod
    def remove_from_wishlist(user, product_id):
        """Remove product from wishlist"""
        wishlist = EnhancedWishlistService.get_or_create_wishlist(user)
        product = get_object_or_404(Product, id=product_id)
        
        try:
            item = wishlist.items.get(product=product)
            item.delete()
            EnhancedWishlistService.update_analytics(user)
        except EnhancedWishlistItem.DoesNotExist:
            pass
    
    @staticmethod
    def move_to_cart(user, product_id):
        """Move wishlist item to cart"""
        wishlist = EnhancedWishlistService.get_or_create_wishlist(user)
        product = get_object_or_404(Product, id=product_id)
        
        try:
            item = wishlist.items.get(product=product)
            item.moved_to_cart_at = timezone.now()
            item.save()
            
            # Update analytics
            EnhancedWishlistService.update_analytics(user)
            
            # Here you would integrate with cart service
            # cart_service.add_to_cart(product_id, 1)
            
        except EnhancedWishlistItem.DoesNotExist:
            pass
    
    @staticmethod
    def get_recommendations(user, limit=10):
        """Get AI-powered product recommendations"""
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
        
        return EnhancedWishlistAnalytics.objects.filter(
            user=user,
            date__range=[start_date, end_date]
        ).order_by('-date')
    
    @staticmethod
    def update_analytics(user):
        """Update daily analytics for user"""
        today = timezone.now().date()
        EnhancedWishlistAnalytics.record_analytics(user, today)
    
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

class WishlistSocialService:
    """Social features for wishlist sharing and discovery"""
    
    @staticmethod
    def get_public_wishlists(limit=20):
        """Get public wishlists for discovery"""
        return EnhancedWishlist.objects.filter(
            user__profile__is_public=True
        ).annotate(
            item_count=Count('items')
        ).filter(
            item_count__gt=0
        ).order_by('-updated_at')[:limit]
    
    @staticmethod
    def get_trending_wishlists(limit=10):
        """Get wishlists with most recent activity"""
        return EnhancedWishlist.objects.annotate(
            recent_additions=Count('items', filter=Q(added_at__gte=timezone.now() - timedelta(days=7))
        ).filter(
            recent_additions__gt=0
        ).order_by('-recent_additions')[:limit]
    
    @staticmethod
    def get_influencer_wishlists(limit=10):
        """Get wishlists of users with many followers"""
        # This would integrate with a followers/following system
        return EnhancedWishlist.objects.annotate(
            follower_count=Count('user__profile__followers')
        ).filter(
            follower_count__gte=10,
            item_count__gt=5
        ).order_by('-follower_count')[:limit]

class WishlistExportService:
    """Service for exporting wishlist data"""
    
    @staticmethod
    def export_wishlist_csv(user):
        """Export wishlist to CSV format"""
        wishlist = EnhancedWishlistService.get_or_create_wishlist(user)
        items = wishlist.items.select(
            'product__id',
            'product__name',
            'product__price',
            'product__category',
            'product__store__name',
            'added_at',
            'moved_to_cart_at',
            'is_purchased',
            'purchase_date',
            'recommendation_source',
            'recommendation_score'
        ).order_by('-added_at')
        
        # This would generate a CSV file for download
        return {
            'filename': f'wishlist_{user.email}_{timezone.now().strftime("%Y%m%d")}.csv',
            'items': items
        }
    
    @staticmethod
    def export_wishlist_json(user):
        """Export wishlist to JSON format"""
        wishlist = EnhancedWishlistService.get_or_create_wishlist(user)
        
        return {
            'user': user.email,
            'wishlist_id': wishlist.id,
            'created_at': wishlist.created_at.isoformat(),
            'updated_at': wishlist.updated_at.isoformat(),
            'item_count': wishlist.item_count,
            'total_value': float(wishlist.total_value),
            'items': [
                {
                    'product_id': item.product.id,
                    'product_name': item.product.name,
                    'product_price': float(item.product.price),
                    'product_category': item.product.category,
                    'store_name': item.product.store.name,
                    'added_at': item.added_at.isoformat(),
                    'moved_to_cart_at': item.moved_to_cart_at.isoformat() if item.moved_to_cart_at else None,
                    'is_purchased': item.is_purchased,
                    'purchase_date': item.purchase_date.isoformat() if item.purchase_date else None,
                    'recommendation_source': item.recommendation_source,
                    'recommendation_score': float(item.recommendation_score) if item.recommendation_score else None,
                    'days_in_wishlist': item.days_in_wishlist,
                    'is_hot_item': item.is_hot_item
                }
                for item in wishlist.items.all()
            ]
        }
