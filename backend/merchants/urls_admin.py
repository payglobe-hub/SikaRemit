"""
Admin URL patterns for merchant management APIs
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

router = DefaultRouter()
router.register(r'stores', StoreViewSet, basename='admin-stores')
router.register(r'products', ProductViewSet, basename='admin-products')
router.register(r'dashboard', MerchantDashboardViewSet, basename='admin-merchant-dashboard')
router.register(r'applications', MerchantApplicationViewSet, basename='admin-applications')
router.register(r'invitations', MerchantInvitationViewSet, basename='admin-invitations')
router.register(r'report-templates', ReportTemplateViewSet, basename='admin-report-templates')
router.register(r'reports', ReportViewSet, basename='admin-reports')
router.register(r'scheduled-reports', ScheduledReportViewSet, basename='admin-scheduled-reports')
router.register(r'customers', MerchantCustomerViewSet, basename='admin-customers')
router.register(r'transactions', MerchantTransactionViewSet, basename='admin-transactions')
router.register(r'notifications', MerchantNotificationViewSet, basename='admin-notifications')
router.register(r'analytics', MerchantAnalyticsViewSet, basename='admin-analytics')
router.register(r'invoices', MerchantInvoiceViewSet, basename='admin-invoices')
router.register(r'settings', MerchantSettingsViewSet, basename='admin-settings')

urlpatterns = [
    path('onboarding/', onboarding_status, name='admin-onboarding-status'),
    path('onboarding/verify/', upload_verification, name='admin-upload-verification'),
    path('invitations/validate/<uuid:token>/', validate_invitation_token, name='admin-validate-invitation-token'),
    path('invitations/accept/<uuid:token>/', accept_invitation, name='admin-accept-invitation'),
    # Merchant Reporting API
    path('reports/', include(merchant_reports_urls)),
] + router.urls
