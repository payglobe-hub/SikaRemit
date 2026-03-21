"""
Public URL patterns for customer-facing product APIs
"""

from django.urls import path
from . import views_public

app_name = 'public'

urlpatterns = [
    # Product URLs
    path('products/', views_public.PublicProductListView.as_view(), name='product-list'),
    path('products/<uuid:pk>/', views_public.PublicProductDetailView.as_view(), name='product-detail'),
    path('products/search/', views_public.search_products, name='product-search'),
    path('products/featured/', views_public.featured_products, name='featured-products'),
    path('products/trending/', views_public.trending_products, name='trending-products'),
    path('products/categories/', views_public.product_categories, name='product-categories'),
    
    # Store URLs
    path('stores/', views_public.PublicStoreListView.as_view(), name='store-list'),
    path('stores/<uuid:pk>/', views_public.PublicStoreDetailView.as_view(), name='store-detail'),
    path('stores/<uuid:store_id>/products/', views_public.StoreProductListView.as_view(), name='store-products'),
    
    # Merchant Application URL
    path('applications/', views_public.submit_merchant_application, name='submit-merchant-application'),
]
