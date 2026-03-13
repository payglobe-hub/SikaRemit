"""
Merchant Dashboard URL Patterns - API endpoints for merchant operations
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_merchant_dashboard import (
    MerchantStoreViewSet,
    MerchantProductViewSet,
    MerchantProductImageViewSet,
    MerchantOrderViewSet,
    MerchantDashboardViewSet
)
from .views import MerchantDashboardViewSet as MainMerchantDashboardViewSet

# Create router for merchant APIs
merchant_router = DefaultRouter()
merchant_router.register(r'stores', MerchantStoreViewSet, basename='merchant-stores')
merchant_router.register(r'products', MerchantProductViewSet, basename='merchant-products')
merchant_router.register(r'product-images', MerchantProductImageViewSet, basename='merchant-product-images')
merchant_router.register(r'orders', MerchantOrderViewSet, basename='merchant-orders')
merchant_router.register(r'dashboard', MerchantDashboardViewSet, basename='merchant-dashboard')

# URL patterns for merchant dashboard
urlpatterns = [
    # Include the router URLs
    path('', include(merchant_router.urls)),

    # Additional dashboard endpoints
    path('dashboard/sales_trend/', MainMerchantDashboardViewSet.as_view({'get': 'sales_trend'}), name='merchant-sales-trend'),

    # Additional custom URLs can be added here if needed
    # path('analytics/', MerchantAnalyticsView.as_view(), name='merchant-analytics'),
    # path('reports/', MerchantReportsView.as_view(), name='merchant-reports'),
]
