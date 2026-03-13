"""
Shopping Cart Serializers

Data serialization for cart and wishlist operations
"""

from rest_framework import serializers
from merchants.models import Product
from .models_cart import ShoppingCart, CartItem, Wishlist, WishlistItem
from .models import Order, OrderItem, Payment, ShippingAddress


class CartItemSerializer(serializers.ModelSerializer):
    """Serializer for cart items"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_price = serializers.DecimalField(source='product.price', max_digits=10, decimal_places=2, read_only=True)
    product_image = serializers.ImageField(source='product.image', read_only=True)
    product_thumbnail = serializers.ImageField(source='product.thumbnail', read_only=True)
    store_name = serializers.CharField(source='product.store.name', read_only=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    is_available = serializers.BooleanField(read_only=True)
    stock_quantity = serializers.IntegerField(source='product.stock_quantity', read_only=True)
    
    class Meta:
        model = CartItem
        fields = [
            'id', 'product', 'product_name', 'product_price', 'product_image', 
            'product_thumbnail', 'store_name', 'quantity', 'subtotal', 
            'is_available', 'stock_quantity', 'added_at', 'updated_at'
        ]
        read_only_fields = ['id', 'added_at', 'updated_at']


class CartSerializer(serializers.ModelSerializer):
    """Basic cart serializer"""
    total_items = serializers.IntegerField(read_only=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_with_tax = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    is_empty = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = ShoppingCart
        fields = [
            'id', 'total_items', 'subtotal', 'total_with_tax', 
            'is_empty', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CartDetailSerializer(CartSerializer):
    """Detailed cart serializer with items"""
    items = CartItemSerializer(many=True, read_only=True)
    unavailable_items = serializers.ListField(
        child=serializers.DictField(),
        read_only=True,
        required=False
    )
    
    class Meta(CartSerializer.Meta):
        fields = CartSerializer.Meta.fields + ['items', 'unavailable_items']


class WishlistItemSerializer(serializers.ModelSerializer):
    """Serializer for wishlist items"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_price = serializers.DecimalField(source='product.price', max_digits=10, decimal_places=2, read_only=True)
    product_image = serializers.ImageField(source='product.image', read_only=True)
    product_thumbnail = serializers.ImageField(source='product.thumbnail', read_only=True)
    store_name = serializers.CharField(source='product.store.name', read_only=True)
    is_available = serializers.BooleanField(read_only=True)
    is_featured = serializers.BooleanField(source='product.is_featured', read_only=True)
    category = serializers.CharField(source='product.category', read_only=True)
    stock_quantity = serializers.IntegerField(source='product.stock_quantity', read_only=True)
    
    class Meta:
        model = WishlistItem
        fields = [
            'id', 'product', 'product_name', 'product_price', 'product_image',
            'product_thumbnail', 'store_name', 'is_available', 'is_featured',
            'category', 'stock_quantity', 'added_at'
        ]
        read_only_fields = ['id', 'added_at']


class WishlistSerializer(serializers.ModelSerializer):
    """Wishlist serializer"""
    items = WishlistItemSerializer(many=True, read_only=True)
    item_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Wishlist
        fields = [
            'id', 'items', 'item_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AddToCartSerializer(serializers.Serializer):
    """Serializer for adding items to cart"""
    product_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1, default=1)
    
    def validate_product_id(self, value):
        """Validate product exists and is available"""
        try:
            product = Product.objects.get(
                id=value,
                is_available=True,
                stock_quantity__gt=0,
                store__is_active=True
            )
            return value
        except Product.DoesNotExist:
            raise serializers.ValidationError("Product not available")


class UpdateCartItemSerializer(serializers.Serializer):
    """Serializer for updating cart item quantity"""
    item_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=0)
    
    def validate_quantity(self, value):
        """Validate quantity"""
        if value < 0:
            raise serializers.ValidationError("Quantity cannot be negative")
        return value


class RemoveFromCartSerializer(serializers.Serializer):
    """Serializer for removing items from cart"""
    item_id = serializers.UUIDField()


class BulkAddToCartSerializer(serializers.Serializer):
    """Serializer for bulk adding items to cart"""
    items = serializers.ListField(
        child=serializers.DictField(),
        min_length=1
    )
    
    def validate_items(self, value):
        """Validate items structure"""
        for item in value:
            if 'product_id' not in item:
                raise serializers.ValidationError("Each item must have product_id")
            
            if 'quantity' in item and item['quantity'] <= 0:
                raise serializers.ValidationError("Quantity must be positive")
        
        return value


class AddToWishlistSerializer(serializers.Serializer):
    """Serializer for adding items to wishlist"""
    product_id = serializers.UUIDField()
    
    def validate_product_id(self, value):
        """Validate product exists"""
        try:
            product = Product.objects.get(
                id=value,
                is_available=True,
                store__is_active=True
            )
            return value
        except Product.DoesNotExist:
            raise serializers.ValidationError("Product not found")


class RemoveFromWishlistSerializer(serializers.Serializer):
    """Serializer for removing items from wishlist"""
    product_id = serializers.UUIDField()


class CartSummarySerializer(serializers.Serializer):
    """Serializer for cart summary response"""
    total_items = serializers.IntegerField()
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2)
    tax = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_with_tax = serializers.DecimalField(max_digits=10, decimal_places=2)
    is_empty = serializers.BooleanField()
    items_count = serializers.IntegerField()


class RecommendedProductsSerializer(serializers.Serializer):
    """Serializer for recommended products response"""
    recommended_products = serializers.ListField()
    recommendation_type = serializers.CharField()


# Order and Payment Serializers
class OrderItemSerializer(serializers.ModelSerializer):
    """Serializer for order items"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_price = serializers.DecimalField(source='product.price', max_digits=10, decimal_places=2, read_only=True)
    product_image = serializers.ImageField(source='product.image', read_only=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = OrderItem
        fields = [
            'id', 'product', 'product_name', 'product_price', 'product_image',
            'quantity', 'price', 'subtotal'
        ]
        read_only_fields = ['id']


class OrderSerializer(serializers.ModelSerializer):
    """Basic order serializer"""
    items = OrderItemSerializer(many=True, read_only=True)
    items_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'user', 'subtotal', 'shipping_cost',
            'tax', 'total', 'status', 'payment_status', 'items', 'items_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'order_number', 'created_at', 'updated_at']


class OrderDetailSerializer(OrderSerializer):
    """Detailed order serializer"""
    payment = serializers.SerializerMethodField()
    
    class Meta(OrderSerializer.Meta):
        fields = OrderSerializer.Meta.fields + ['payment']
    
    def get_payment(self, obj):
        try:
            payment = obj.payment
            return PaymentSerializer(payment).data
        except Payment.DoesNotExist:
            return None


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for payment records"""
    
    class Meta:
        model = Payment
        fields = [
            'id', 'order', 'payment_method', 'amount', 'currency',
            'status', 'gateway_transaction_id', 'created_at', 'processed_at'
        ]
        read_only_fields = ['id', 'created_at', 'processed_at']


class ShippingAddressSerializer(serializers.ModelSerializer):
    """Serializer for shipping addresses"""
    
    class Meta:
        model = ShippingAddress
        fields = [
            'id', 'name', 'address_line_1', 'address_line_2', 'city',
            'state', 'postal_code', 'country', 'phone', 'is_default',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
