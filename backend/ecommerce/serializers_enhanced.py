"""
Enhanced Wishlist Serializers

Data serialization for enhanced wishlist functionality
"""

from rest_framework import serializers
from merchants.models import Product, Store
from .models_enhanced_wishlist import (
    EnhancedWishlist, EnhancedWishlistItem, ProductRecommendation,
    WishlistAnalytics, EnhancedWishlistService
)

class EnhancedWishlistItemSerializer(serializers.ModelSerializer):
    """Serializer for enhanced wishlist items"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_price = serializers.DecimalField(source='product.price', read_only=True)
    product_image = serializers.ImageField(source='product.image', read_only=True)
    product_thumbnail = serializers.ImageField(source='product.thumbnail', read_only=True)
    store_name = serializers.CharField(source='product.store.name', read_only=True)
    category = serializers.CharField(source='product.category', read_only=True)
    stock_quantity = serializers.IntegerField(source='product.stock_quantity', read_only=True)
    is_available = serializers.BooleanField(source='product.is_available', read_only=True)
    is_featured = serializers.BooleanField(source='product.is_featured', read_only=True)
    added_at = serializers.DateTimeField(read_only=True)
    moved_to_cart_at = serializers.DateTimeField(allow_null=True)
    is_purchased = serializers.BooleanField(read_only=True)
    purchase_date = serializers.DateTimeField(allow_null=True)
    recommendation_source = serializers.CharField(max_length=50, read_only=True)
    recommendation_score = serializers.DecimalField(max_digits=5, decimal_places=2, allow_null=True)
    last_viewed = serializers.DateTimeField(read_only=True)
    days_in_wishlist = serializers.SerializerMethodField()
    
    class Meta:
        model = EnhancedWishlistItem
        fields = [
            'id', 'product_name', 'product_price', 'product_image', 'product_thumbnail',
            'store_name', 'category', 'stock_quantity', 'is_available', 'is_featured',
            'added_at', 'moved_to_cart_at', 'is_purchased', 'purchase_date',
            'recommendation_source', 'recommendation_score', 'last_viewed', 'days_in_wishlist'
        ]
    
    def get_days_in_wishlist(self, obj):
        return (timezone.now() - obj.added_at).days

class EnhancedWishlistSerializer(serializers.ModelSerializer):
    """Serializer for enhanced wishlist"""
    items = EnhancedWishlistItemSerializer(many=True, read_only=True)
    item_count = serializers.IntegerField(source='items_count', read_only=True)
    total_value = serializers.DecimalField(source='total_value', read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    
    class Meta:
        model = EnhancedWishlist
        fields = [
            'id', 'items', 'item_count', 'total_value', 'created_at', 'updated_at'
        ]

class ProductRecommendationSerializer(serializers.ModelSerializer):
    """Serializer for product recommendations"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_price = serializers.DecimalField(source='product.price', read_only=True)
    product_image = serializers.ImageField(source='product.image', read_only=True)
    product_thumbnail = serializers.ImageField(source='product.thumbnail', read_only=True)
    store_name = serializers.CharField(source='product.store.name', read_only=True)
    category = serializers.CharField(source='product.category')
    stock_quantity = serializers.IntegerField(source='product.stock_quantity')
    is_available = serializers.BooleanField(source='product.is_available')
    is_featured = serializers.BooleanField(source='product.is_featured')
    recommendation_reason = serializers.CharField(max_length=500, read_only=True)
    recommendation_score = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    algorithm = serializers.CharField(max_length=50, read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    expires_at = serializers.DateTimeField(read_only=True)
    
    class Meta:
        model = ProductRecommendation
        fields = [
            'id', 'product_name', 'product_price', 'product_image', 'product_thumbnail',
            'store_name', 'category', 'stock_quantity', 'is_available', 'is_featured',
            'recommendation_reason', 'recommendation_score', 'algorithm',
            'created_at', 'expires_at'
        ]

class WishlistAnalyticsSerializer(serializers.ModelSerializer):
    """Serializer for wishlist analytics"""
    date = serializers.DateField(read_only=True)
    total_items = serializers.IntegerField(read_only=True)
    items_added = serializers.IntegerField(read_only=True)
    items_removed = serializers.IntegerField(read_only=True)
    items_moved_to_cart = serializers.IntegerField(read_only=True)
    items_purchased = serializers.IntegerField(read_only=True)
    most_expensive_item = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    average_item_price = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    top_category = serializers.CharField(max_length=50, allow_null=True)
    
    class Meta:
        model = WishlistAnalytics
        fields = [
            'date', 'total_items', 'items_added', 'items_removed', 'items_moved_to_cart',
            'items_purchased', 'most_expensive_item', 'average_item_price', 'top_category'
        ]

class PublicWishlistSerializer(serializers.ModelSerializer):
    """Serializer for public wishlists"""
    user_email = serializers.CharField(source='user.email', read_only=True)
    item_count = serializers.IntegerField(source='item_count', read_only=True)
    total_value = serializers.DecimalField(source='total_value', read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    is_public = serializers.BooleanField(source='user__profile__is_public', read_only=True)
    
    class Meta:
        model = EnhancedWishlist
        fields = [
            'id', 'user_email', 'item_count', 'total_value', 'created_at', 'updated_at', 'is_public'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class WishlistExportSerializer(serializers.Serializer):
    """Serializer for wishlist export"""
    filename = serializers.CharField(read_only=True)
    items = serializers.ListField(
        child=serializers.DictField()
    )
    
    class Meta:
        fields = ['filename', 'items']

class BulkAddToWishlistRequest(serializers.Serializer):
    """Request serializer for bulk adding to wishlist"""
    product_ids = serializers.ListField(child=serializers.CharField())
    source = serializers.CharField(default='manual')

class BulkAddToWishlistResponse(serializers.Serializer):
    """Response serializer for bulk add operations"""
    results = serializers.ListField(
        child=serializers.DictField()
    )
    errors = serializers.ListField(
        child=serializers.DictField()
    )
    added = serializers.IntegerField()
    failed = serializers.IntegerField()

class TrackProductViewRequest(serializers.Serializer):
    """Request serializer for tracking product views"""
    product_id = serializers.UUIDField()

class ProductViewTrackingResponse(serializers.Serializer):
    """Response serializer for product view tracking"""
    message = serializers.CharField()

class RecommendationRefreshRequest(serializers.Serializer):
    """Request serializer for refreshing recommendations"""
    limit = serializers.IntegerField(default=20)
