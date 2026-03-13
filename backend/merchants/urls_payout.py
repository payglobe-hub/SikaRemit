"""
Merchant Payout System URL Patterns - API endpoints for financial settlement
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_payout import MerchantPayoutViewSet, MerchantSettlementSettingsViewSet

# Create router for payout APIs
payout_router = DefaultRouter()
payout_router.register(r'payouts', MerchantPayoutViewSet, basename='merchant-payouts')
payout_router.register(r'settlement-settings', MerchantSettlementSettingsViewSet, basename='merchant-settlement-settings')

# URL patterns for payout system
urlpatterns = [
    # Include the router URLs
    path('', include(payout_router.urls)),

    # Additional custom URLs can be added here if needed
    # path('revenue-summary/', MerchantRevenueSummaryView.as_view(), name='merchant-revenue-summary'),
]
