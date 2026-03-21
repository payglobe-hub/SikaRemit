from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .customer_reports import (
    CustomerStatementAPIView,
    CustomerStatementPreviewAPIView,
    CustomerStatsAPIView,
    CustomerTransactionsAPIView,
    CustomerSpendingByCategoryAPIView,
    CustomerBalanceHistoryAPIView,
    CustomerBalanceAPIView
)
from .advanced_admin_reports import (
    SystemMetricsAPIView,
    ComplianceReportAPIView,
    MerchantPerformanceAPIView,
    CustomerAnalyticsAPIView,
    FinancialSummaryAPIView,
    ScheduleReportAPIView,
    GetScheduledReportsAPIView,
    CancelScheduledReportAPIView
)

# Create router for customer reports
customer_reports_router = DefaultRouter()
customer_reports_router.register(r'statements', CustomerStatementAPIView, basename='customer-statements')

urlpatterns = [
    # Customer Reporting URLs
    path('statements/', CustomerStatementAPIView.as_view(), name='customer-statements'),
    path('statements/generate/', CustomerStatementAPIView.as_view(), name='customer-statement-generate'),
    path('statements/preview/', CustomerStatementPreviewAPIView.as_view(), name='customer-statement-preview'),
    path('statements/<int:pk>/download/', CustomerStatementAPIView.as_view(), name='customer-statement-download'),
    path('stats/', CustomerStatsAPIView.as_view(), name='customer-stats'),
    path('transactions/', CustomerTransactionsAPIView.as_view(), name='customer-transactions'),
    path('spending-by-category/', CustomerSpendingByCategoryAPIView.as_view(), name='customer-spending-by-category'),
    path('balance-history/', CustomerBalanceHistoryAPIView.as_view(), name='customer-balance-history'),
    path('balance/', CustomerBalanceAPIView.as_view(), name='customer-balance'),
    
    # Advanced Admin Reporting URLs
    path('admin/reports/system-metrics/', SystemMetricsAPIView.as_view(), name='admin-system-metrics'),
    path('admin/reports/compliance/', ComplianceReportAPIView.as_view(), name='admin-compliance-report'),
    path('admin/reports/merchant-performance/', MerchantPerformanceAPIView.as_view(), name='admin-merchant-performance'),
    path('admin/reports/customer-analytics/', CustomerAnalyticsAPIView.as_view(), name='admin-customer-analytics'),
    path('admin/reports/financial-summary/', FinancialSummaryAPIView.as_view(), name='admin-financial-summary'),
    path('admin/reports/schedule/', ScheduleReportAPIView.as_view(), name='admin-schedule-report'),
    path('admin/reports/scheduled/', GetScheduledReportsAPIView.as_view(), name='admin-get-scheduled-reports'),
    path('admin/reports/scheduled/<int:pk>/cancel/', CancelScheduledReportAPIView.as_view(), name='admin-cancel-scheduled-report'),
]

# Export URL patterns for inclusion
customer_reports_urls = [
    path('statements/', CustomerStatementAPIView.as_view(), name='customer-statements'),
    path('statements/preview/', CustomerStatementPreviewAPIView.as_view(), name='customer-statement-preview'),
    path('statements/<int:pk>/download/', CustomerStatementAPIView.as_view(), name='customer-statement-download'),
    path('stats/', CustomerStatsAPIView.as_view(), name='customer-stats'),
    path('transactions/', CustomerTransactionsAPIView.as_view(), name='customer-transactions'),
    path('spending-by-category/', CustomerSpendingByCategoryAPIView.as_view(), name='customer-spending-by-category'),
    path('balance-history/', CustomerBalanceHistoryAPIView.as_view(), name='customer-balance-history'),
    path('balance/', CustomerBalanceAPIView.as_view(), name='customer-balance'),
]

advanced_admin_reports_urls = [
    path('system-metrics/', SystemMetricsAPIView.as_view(), name='admin-system-metrics'),
    path('compliance/', ComplianceReportAPIView.as_view(), name='admin-compliance-report'),
    path('merchant-performance/', MerchantPerformanceAPIView.as_view(), name='admin-merchant-performance'),
    path('customer-analytics/', CustomerAnalyticsAPIView.as_view(), name='admin-customer-analytics'),
    path('financial-summary/', FinancialSummaryAPIView.as_view(), name='admin-financial-summary'),
    path('schedule/', ScheduleReportAPIView.as_view(), name='admin-schedule-report'),
    path('scheduled/', GetScheduledReportsAPIView.as_view(), name='admin-get-scheduled-reports'),
    path('scheduled/<int:pk>/cancel/', CancelScheduledReportAPIView.as_view(), name='admin-cancel-scheduled-report'),
]
