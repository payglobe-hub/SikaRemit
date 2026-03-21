from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from accounts.views import MyTokenObtainPairView
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from core.api.views import AuditLogAPIView
from rest_framework.routers import DefaultRouter
from payments.views.webhook_views import WebhookViewSet, WebhookEventViewSet
from accounts.admin_reports import AdminReportViewSet, get_admin_report_stats, generate_admin_report
from accounts.api.advanced_admin_reports import (
    SystemMetricsAPIView,
    ComplianceReportAPIView,
    MerchantPerformanceAPIView,
    CustomerAnalyticsAPIView,
    FinancialSummaryAPIView,
    ScheduleReportAPIView,
    GetScheduledReportsAPIView,
    CancelScheduledReportAPIView
)

# Webhook router
webhook_router = DefaultRouter()
webhook_router.register(r'webhooks', WebhookViewSet, basename='webhooks')
webhook_router.register(r'webhook-events', WebhookEventViewSet, basename='webhook-events')

# Admin reports router
admin_router = DefaultRouter()
admin_router.register(r'report-files', AdminReportViewSet, basename='admin-reports')

# Advanced admin reporting - direct URL patterns for APIViews
# Note: These are APIViews, not ViewSets, so they can't be registered in a router

def simple_health_check(request):
    return JsonResponse({'status': 'healthy', 'message': 'Backend is running'})

def debug_hosts(request):
    """Debug endpoint to check ALLOWED_HOSTS"""
    from django.conf import settings
    return JsonResponse({
        'ALLOWED_HOSTS': settings.ALLOWED_HOSTS,
        'HTTP_HOST': request.get_host(),
        'ENVIRONMENT': getattr(settings, 'ENVIRONMENT', 'unknown')
    })

@method_decorator(csrf_exempt, name='dispatch')
class SimpleCurrenciesView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        try:
            currencies = [
                {'code': 'GHS', 'name': 'Ghana Cedi', 'symbol': '₵'},
                {'code': 'USD', 'name': 'US Dollar', 'symbol': '$'},
                {'code': 'EUR', 'name': 'Euro', 'symbol': '€'},
                {'code': 'GBP', 'name': 'British Pound', 'symbol': '£'}
            ]
            return JsonResponse({
                'success': True,
                'data': currencies,
                'results': currencies  # For frontend compatibility
            })
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e),
                'results': []
            }, status=500)

urlpatterns = [
    # Root and Admin
    path('', RedirectView.as_view(url='/api/docs/'), name='home'),
    path('admin/', admin.site.urls),
    
    # Health Check
    path('health/', simple_health_check, name='health-check'),
    path('api/v1/health/', simple_health_check, name='api-health-check'),
    path('debug/hosts/', debug_hosts, name='debug-hosts'),

    # Accounts API (includes customers, support tickets, etc.)
    path('api/v1/accounts/', include('accounts.urls')),
    
    # Users API (merchants, customers, KYC)
    path('api/v1/users/', include('users.urls')),
    
    # Admin Management (direct route for frontend compatibility)
    path('admin/admin-management/', include('users.urls_admin')),
    
    # Admin API - proper v1 API route for admin profiles
    path('api/v1/users/admin/', include('users.urls_admin')),
    
    # Payments API
    path('api/v1/payments/', include('payments.urls')),

    # Notifications API
    path('api/v1/notifications/', include('notifications.urls')),

    # Merchants API (Customer-facing)
    path('api/v1/merchants/', include('merchants.urls_customer')),
    
    # E-commerce API
    path('api/v1/ecommerce/', include('ecommerce.urls')),
    
    # KYC API
    path('api/v1/kyc/', include('kyc.urls')),
    
    # Compliance API
    path('api/v1/compliance/', include('compliance.urls')),
    
    # Dashboard/Admin API
    path('api/v1/dashboard/', include('dashboard.urls')),
    path('api/v1/admin/', include('dashboard.urls')),
    path('api/v1/admin/merchants/', include('merchants.urls_admin')),  # Admin merchant management
    path('api/v1/admin/ussd/', include('ussd.urls')),  # Admin USSD management
    path('api/v1/admin/', include(webhook_router.urls)),  # Admin webhooks management
    path('api/admin/reports/stats/', get_admin_report_stats, name='admin-report-stats'),
    path('api/admin/reports/generate/', generate_admin_report, name='admin-report-generate'),
    path('api/admin/', include(admin_router.urls)),  # Admin reports
    
    # Advanced Admin Reports (APIViews - direct URL patterns)
    path('api/admin/reports/system-metrics/', SystemMetricsAPIView.as_view(), name='admin-system-metrics'),
    path('api/admin/reports/compliance/', ComplianceReportAPIView.as_view(), name='admin-compliance'),
    path('api/admin/reports/merchant-performance/', MerchantPerformanceAPIView.as_view(), name='admin-merchant-performance'),
    path('api/admin/reports/customer-analytics/', CustomerAnalyticsAPIView.as_view(), name='admin-customer-analytics'),
    path('api/admin/reports/financial-summary/', FinancialSummaryAPIView.as_view(), name='admin-financial-summary'),
    path('api/admin/reports/schedule/', ScheduleReportAPIView.as_view(), name='admin-schedule'),
    path('api/admin/reports/scheduled/', GetScheduledReportsAPIView.as_view(), name='admin-scheduled-reports'),
    path('api/admin/reports/scheduled/<uuid:pk>/cancel/', CancelScheduledReportAPIView.as_view(), name='admin-cancel-scheduled-report'),
    
    # Audit Logs API
    path('api/audit-logs/', AuditLogAPIView.as_view(), name='audit-logs'),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(permission_classes=[]), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # Authentication (allauth)
    path('accounts/', include('allauth.urls')),

    # Metrics endpoint for Prometheus
    path('', include('django_prometheus.urls')),
]

# Serve static files during development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
