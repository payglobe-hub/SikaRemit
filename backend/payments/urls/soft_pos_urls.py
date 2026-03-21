"""
Soft POS API URLs
Configure all Soft POS related endpoints
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from ..views import soft_pos_views

# Create router for Soft POS endpoints
router = DefaultRouter()
router.register(r'soft-pos', soft_pos_views.SoftPOSViewSet, basename='soft-pos')
router.register(r'mobile-money', soft_pos_views.MobileMoneyViewSet, basename='mobile-money')
router.register(r'nfc-payments', soft_pos_views.NFCPaymentViewSet, basename='nfc-payments')
router.register(r'dashboard', soft_pos_views.SoftPOSDashboardViewSet, basename='soft-pos-dashboard')

app_name = 'soft_pos'

urlpatterns = [
    # Soft POS device management
    path('api/soft-pos/', include(router.urls)),
    
    # Direct API endpoints
    path('api/soft-pos/heartbeat/', soft_pos_views.soft_pos_heartbeat, name='heartbeat'),
    path('api/soft-pos/security-event/', soft_pos_views.soft_pos_security_event, name='security_event'),
    
    # Legacy POS endpoints (for backward compatibility)
    path('api/pos/', include('apps.payments.urls.pos')),
]
