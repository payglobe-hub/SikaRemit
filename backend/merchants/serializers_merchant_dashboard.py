"""
Merchant Dashboard Serializers - Real data serialization for merchant operations
"""

from rest_framework import serializers
from merchants.models import Store, Product, ProductImage, ProductVariant, Category
from ecommerce.models import Order, OrderItem
from django.utils import timezone

class MerchantStoreSerializer(serializers.ModelSerializer):
    """Serializer for merchant store management"""
    merchant_name = serializers.CharField(source='merchant.business_name', read_only=True)
    product_count = serializers.IntegerField(source='total_products', read_only=True)

    class Meta:
        model = Store
        fields = [
            'id', 'name', 'description', 'store_type', 'merchant_name',
            'phone', 'email', 'website', 'is_active', 'accepts_online_orders',
            'delivery_available', 'pickup_available', 'product_count',
            'total_orders', 'average_rating', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'merchant_name', 'product_count']

class MerchantProductCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new products"""
    store_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Product
        fields = [
            'store_id', 'name', 'description', 'price', 'compare_at_price',
            'sku', 'barcode', 'stock_quantity', 'low_stock_threshold',
            'track_inventory', 'category', 'tags', 'is_featured',
            'weight', 'dimensions', 'requires_shipping', 'seo_title',
            'seo_description', 'meta_tags'
        ]

    def validate_store_id(self, value):
        """Ensure the store belongs to the authenticated merchant"""
        request = self.context.get('request')
        if not request or not request.user:
            raise serializers.ValidationError("Authentication required")

        try:
            store = Store.objects.get(id=value, merchant__user=request.user)
            return store
        except Store.DoesNotExist:
            raise serializers.ValidationError("Store not found or access denied")

    def create(self, validated_data):
        store = validated_data.pop('store_id')
        return Product.objects.create(store=store, **validated_data)

class MerchantProductSerializer(serializers.ModelSerializer):
    """Serializer for product details and updates"""
    store_name = serializers.CharField(source='store.name', read_only=True)
    primary_image_url = serializers.SerializerMethodField()
    images_count = serializers.SerializerMethodField()
    variants_count = serializers.SerializerMethodField()
    is_low_stock = serializers.BooleanField(read_only=True)
    is_in_stock = serializers.BooleanField(read_only=True)
    discount_percentage = serializers.DecimalField(
        max_digits=5, decimal_places=2, read_only=True
    )

    class Meta:
        model = Product
        fields = [
            'id', 'store', 'store_name', 'name', 'description', 'price',
            'compare_at_price', 'sku', 'barcode', 'stock_quantity',
            'low_stock_threshold', 'track_inventory', 'status', 'is_available',
            'is_featured', 'category', 'tags', 'primary_image_url',
            'additional_images', 'weight', 'dimensions', 'requires_shipping',
            'seo_title', 'seo_description', 'meta_tags', 'view_count',
            'purchase_count', 'average_rating', 'images_count', 'variants_count',
            'is_low_stock', 'is_in_stock', 'discount_percentage',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'store', 'store_name', 'primary_image_url', 'images_count',
            'variants_count', 'is_low_stock', 'is_in_stock', 'discount_percentage',
            'created_at', 'updated_at'
        ]

    def get_primary_image_url(self, obj):
        """Get the URL of the primary product image"""
        if obj.primary_image:
            return obj.primary_image.url
        # Fallback to first image
        first_image = obj.images.filter(is_primary=True).first()
        if first_image:
            return first_image.image.url
        return None

    def get_images_count(self, obj):
        """Get total number of images for this product"""
        return obj.images.count()

    def get_variants_count(self, obj):
        """Get total number of variants for this product"""
        return obj.variants.count()

class MerchantProductImageSerializer(serializers.ModelSerializer):
    """Serializer for product image management"""
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = ProductImage
        fields = [
            'id', 'product', 'product_name', 'image', 'alt_text',
            'sort_order', 'is_primary', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'product_name']

class MerchantOrderItemSerializer(serializers.ModelSerializer):
    """Serializer for order items in merchant context"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    product_image_url = serializers.SerializerMethodField()
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            'id', 'product', 'product_name', 'product_sku', 'product_image_url',
            'quantity', 'price', 'subtotal'
        ]
        read_only_fields = ['id', 'product', 'product_name', 'product_sku', 'product_image_url', 'subtotal']

    def get_product_image_url(self, obj):
        """Get product image URL"""
        if obj.product.primary_image:
            return obj.product.primary_image.url
        return None

class MerchantOrderSerializer(serializers.ModelSerializer):
    """Serializer for orders in merchant context"""
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.CharField(source='user.email', read_only=True)
    items_count = serializers.IntegerField(read_only=True)
    merchant_items_total = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'user', 'customer_name', 'customer_email',
            'shipping_address', 'shipping_city', 'shipping_state',
            'shipping_postal_code', 'shipping_country', 'shipping_phone',
            'subtotal', 'shipping_cost', 'tax', 'total', 'status',
            'status_display', 'payment_status', 'payment_status_display',
            'items_count', 'merchant_items_total', 'created_at', 'updated_at',
            'shipped_at', 'delivered_at'
        ]
        read_only_fields = [
            'id', 'order_number', 'user', 'customer_name', 'customer_email',
            'status_display', 'payment_status_display', 'items_count',
            'merchant_items_total', 'created_at', 'updated_at',
            'shipped_at', 'delivered_at'
        ]

    def get_customer_name(self, obj):
        """Get customer full name"""
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email

    def get_merchant_items_total(self, obj):
        """Calculate total value of items from this merchant"""
        request = self.context.get('request')
        if not request or not request.user:
            return Decimal('0')

        merchant_items = obj.items.filter(product__store__merchant__user=request.user)
        return sum(item.subtotal for item in merchant_items)

class MerchantDashboardStatsSerializer(serializers.Serializer):
    """Serializer for merchant dashboard statistics"""
    merchant_info = serializers.DictField()
    product_stats = serializers.DictField()
    order_stats = serializers.DictField()
    revenue_stats = serializers.DictField()
    recent_activity = serializers.DictField()
