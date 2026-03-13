"""
Shopping Cart Models and Services

Complete cart management for customer shopping experience
"""

from django.db import models, transaction
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
from merchants.models import Product
import uuid

User = get_user_model()


class ShoppingCart(models.Model):
    """Customer shopping cart"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='shopping_cart')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'created_at']),
        ]
    
    def __str__(self):
        return f"Cart for {self.user.email}"
    
    @property
    def total_items(self):
        return self.items.aggregate(total=models.Sum('quantity'))['total'] or 0
    
    @property
    def subtotal(self):
        return sum(item.subtotal for item in self.items.all())
    
    @property
    def total_with_tax(self):
        """Calculate total with 5% tax"""
        return self.subtotal * Decimal('1.05')
    
    @property
    def is_empty(self):
        return self.items.exists() is False


class CartItem(models.Model):
    """Individual items in shopping cart"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cart = models.ForeignKey(ShoppingCart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='cart_items')
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['cart', 'product']
        indexes = [
            models.Index(fields=['cart', 'added_at']),
            models.Index(fields=['product', 'cart']),
        ]
    
    def __str__(self):
        return f"{self.quantity}x {self.product.name}"
    
    @property
    def subtotal(self):
        return self.product.price * self.quantity
    
    @property
    def is_available(self):
        """Check if product is still available"""
        return (
            self.product.is_available and 
            self.product.stock_quantity > 0 and
            self.product.store.is_active
        )
    
    def clean(self):
        """Validate cart item"""
        if self.quantity <= 0:
            raise ValidationError("Quantity must be positive")
        
        if self.quantity > self.product.stock_quantity:
            raise ValidationError(
                f"Only {self.product.stock_quantity} items available. "
                f"You tried to add {self.quantity}."
            )
        
        if not self.product.is_available:
            raise ValidationError("Product is not available")
        
        if not self.product.store.is_active:
            raise ValidationError("Store is not active")


class Wishlist(models.Model):
    """Customer wishlist for saved products"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='wishlist')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'created_at']),
        ]
    
    def __str__(self):
        return f"Wishlist for {self.user.email}"
    
    @property
    def item_count(self):
        return self.items.count()


class WishlistItem(models.Model):
    """Individual items in wishlist"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wishlist = models.ForeignKey(Wishlist, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='wishlist_items')
    added_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['wishlist', 'product']
        indexes = [
            models.Index(fields=['wishlist', 'added_at']),
            models.Index(fields=['product', 'wishlist']),
        ]
    
    def __str__(self):
        return f"{self.product.name} in wishlist"


class CartService:
    """Business logic for shopping cart operations"""
    
    @staticmethod
    def get_or_create_cart(user):
        """Get or create user's shopping cart"""
        cart, created = ShoppingCart.objects.get_or_create(user=user)
        return cart
    
    @staticmethod
    def add_item(user, product_id, quantity=1):
        """Add item to cart"""
        with transaction.atomic():
            cart = CartService.get_or_create_cart(user)
            
            try:
                product = Product.objects.get(
                    id=product_id,
                    is_available=True,
                    stock_quantity__gt=0,
                    store__is_active=True
                )
            except Product.DoesNotExist:
                raise ValidationError("Product not available")
            
            cart_item, created = CartItem.objects.get_or_create(
                cart=cart,
                product=product,
                defaults={'quantity': quantity}
            )
            
            if not created:
                # Update existing item
                new_quantity = cart_item.quantity + quantity
                if new_quantity > product.stock_quantity:
                    raise ValidationError(
                        f"Only {product.stock_quantity} items available. "
                        f"You have {cart_item.quantity} in cart."
                    )
                cart_item.quantity = new_quantity
                cart_item.save()
            
            return cart_item
    
    @staticmethod
    def update_item_quantity(user, item_id, quantity):
        """Update cart item quantity"""
        with transaction.atomic():
            try:
                cart_item = CartItem.objects.get(
                    id=item_id,
                    cart__user=user
                )
                
                if quantity <= 0:
                    cart_item.delete()
                    return None
                
                if quantity > cart_item.product.stock_quantity:
                    raise ValidationError(
                        f"Only {cart_item.product.stock_quantity} items available"
                    )
                
                cart_item.quantity = quantity
                cart_item.save()
                return cart_item
                
            except CartItem.DoesNotExist:
                raise ValidationError("Item not found in cart")
    
    @staticmethod
    def remove_item(user, item_id):
        """Remove item from cart"""
        try:
            cart_item = CartItem.objects.get(
                id=item_id,
                cart__user=user
            )
            cart_item.delete()
            return True
        except CartItem.DoesNotExist:
            raise ValidationError("Item not found in cart")
    
    @staticmethod
    def clear_cart(user):
        """Clear entire cart"""
        cart = CartService.get_or_create_cart(user)
        cart.items.all().delete()
        return cart
    
    @staticmethod
    def validate_cart(user):
        """Validate all items in cart (remove unavailable items)"""
        cart = CartService.get_or_create_cart(user)
        unavailable_items = []
        
        for item in cart.items.all():
            if not item.is_available:
                unavailable_items.append(item)
                item.delete()
        
        return unavailable_items


class WishlistService:
    """Business logic for wishlist operations"""
    
    @staticmethod
    def get_or_create_wishlist(user):
        """Get or create user's wishlist"""
        wishlist, created = Wishlist.objects.get_or_create(user=user)
        return wishlist
    
    @staticmethod
    def add_item(user, product_id):
        """Add product to wishlist"""
        with transaction.atomic():
            wishlist = WishlistService.get_or_create_wishlist(user)
            
            try:
                product = Product.objects.get(
                    id=product_id,
                    is_available=True,
                    store__is_active=True
                )
            except Product.DoesNotExist:
                raise ValidationError("Product not available")
            
            wishlist_item, created = WishlistItem.objects.get_or_create(
                wishlist=wishlist,
                product=product
            )
            
            return wishlist_item
    
    @staticmethod
    def remove_item(user, product_id):
        """Remove product from wishlist"""
        try:
            wishlist_item = WishlistItem.objects.get(
                product_id=product_id,
                wishlist__user=user
            )
            wishlist_item.delete()
            return True
        except WishlistItem.DoesNotExist:
            raise ValidationError("Product not in wishlist")
    
    @staticmethod
    def move_to_cart(user, product_id):
        """Move item from wishlist to cart"""
        with transaction.atomic():
            try:
                wishlist_item = WishlistItem.objects.get(
                    product_id=product_id,
                    wishlist__user=user
                )
                
                # Add to cart
                CartService.add_item(user, product_id, 1)
                
                # Remove from wishlist
                wishlist_item.delete()
                
                return True
            except (WishlistItem.DoesNotExist, ValidationError):
                raise ValidationError("Cannot move item to cart")
