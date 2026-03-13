"""
E-commerce Cart URLs

URL patterns for shopping cart and wishlist APIs
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views_cart

router = DefaultRouter()
router.register(r'cart', views_cart.CartViewSet, basename='cart')
router.register(r'wishlist', views_cart.WishlistViewSet, basename='wishlist')

urlpatterns = [
    # Cart and Wishlist ViewSets
    path('', include(router.urls)),
    
    # Additional Cart Endpoints
    path('cart/count/', views_cart.cart_count, name='cart-count'),
    path('cart/bulk-add/', views_cart.bulk_add_to_cart, name='bulk-add-to-cart'),
    path('products/recommended/', views_cart.recommended_products, name='recommended-products'),
]
