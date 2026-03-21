from django.urls import path, include
from rest_framework.routers import DefaultRouter
from merchants.views.b2b_views import (
    BusinessAccountViewSet, BusinessRoleViewSet, BusinessUserViewSet,
    ApprovalWorkflowViewSet, BulkPaymentViewSet, BusinessAnalyticsViewSet,
    AccountingIntegrationViewSet, BusinessKYCViewSet, BusinessDocumentViewSet,
    ComplianceReportViewSet, BusinessComplianceLogViewSet, BusinessAccountDetailViewSet
)

# Create router for B2B endpoints
b2b_router = DefaultRouter()
b2b_router.register(r'business-accounts', BusinessAccountViewSet)
b2b_router.register(r'business-accounts-detail', BusinessAccountDetailViewSet, basename='business-accounts-detail')
b2b_router.register(r'business-roles', BusinessRoleViewSet)
b2b_router.register(r'business-users', BusinessUserViewSet)
b2b_router.register(r'approval-workflows', ApprovalWorkflowViewSet)
b2b_router.register(r'bulk-payments', BulkPaymentViewSet)
b2b_router.register(r'business-analytics', BusinessAnalyticsViewSet)
b2b_router.register(r'accounting-integrations', AccountingIntegrationViewSet)
b2b_router.register(r'business-kyc', BusinessKYCViewSet)
b2b_router.register(r'business-documents', BusinessDocumentViewSet)
b2b_router.register(r'compliance-reports', ComplianceReportViewSet)
b2b_router.register(r'compliance-logs', BusinessComplianceLogViewSet)

# B2B URL patterns
b2b_urlpatterns = [
    path('api/v1/merchants/', include(b2b_router.urls)),
]
