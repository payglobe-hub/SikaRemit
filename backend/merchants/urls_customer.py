"""
Customer URL patterns for merchant APIs
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StoreViewSet, ProductViewSet, onboarding_status, upload_verification,
    MerchantDashboardViewSet, MerchantApplicationViewSet, MerchantInvitationViewSet,
    validate_invitation_token, accept_invitation, ReportTemplateViewSet, ReportViewSet, 
    ScheduledReportViewSet, MerchantCustomerViewSet, MerchantTransactionViewSet, 
    MerchantNotificationViewSet, MerchantAnalyticsViewSet, MerchantInvoiceViewSet, 
    MerchantSettingsViewSet
)
from .api.urls import merchant_reports_urls
from . import urls_public

router = DefaultRouter()
router.register(r'stores', StoreViewSet, basename='stores')
router.register(r'products', ProductViewSet, basename='products')
router.register(r'dashboard', MerchantDashboardViewSet, basename='merchant-dashboard')
router.register(r'applications', MerchantApplicationViewSet, basename='applications')
router.register(r'invitations', MerchantInvitationViewSet, basename='invitations')
router.register(r'report-templates', ReportTemplateViewSet, basename='report-templates')
router.register(r'reports', ReportViewSet, basename='reports')
router.register(r'scheduled-reports', ScheduledReportViewSet, basename='scheduled-reports')
router.register(r'customers', MerchantCustomerViewSet, basename='customers')
router.register(r'transactions', MerchantTransactionViewSet, basename='transactions')
router.register(r'notifications', MerchantNotificationViewSet, basename='notifications')
router.register(r'analytics', MerchantAnalyticsViewSet, basename='analytics')
router.register(r'invoices', MerchantInvoiceViewSet, basename='invoices')
router.register(r'settings', MerchantSettingsViewSet, basename='settings')

urlpatterns = [
    path('onboarding/', onboarding_status, name='onboarding-status'),
    path('onboarding/verify/', upload_verification, name='upload-verification'),
    path('invitations/validate/<uuid:token>/', validate_invitation_token, name='validate-invitation-token'),
    path('invitations/accept/<uuid:token>/', accept_invitation, name='accept-invitation'),
    # Merchant Reporting API
    path('reports/', include(merchant_reports_urls)),
    # Public Customer APIs
    path('public/', include(urls_public)),
] + router.urls
