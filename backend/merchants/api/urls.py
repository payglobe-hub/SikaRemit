from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .merchant_reports import (
    ReportTemplateViewSet,
    MerchantReportViewSet,
    ScheduledReportViewSet,
    RegenerateReportView,
    CancelReportView,
    DeleteReportView,
    DownloadReportView,
    PauseScheduledReportView,
    ResumeScheduledReportView,
    RunScheduledReportNowView,
    DeleteScheduledReportView
)

# Create routers
report_templates_router = DefaultRouter()
report_templates_router.register(r'templates', ReportTemplateViewSet, basename='report-templates')

merchant_reports_router = DefaultRouter()
merchant_reports_router.register(r'reports', MerchantReportViewSet, basename='merchant-reports')

scheduled_reports_router = DefaultRouter()
scheduled_reports_router.register(r'scheduled', ScheduledReportViewSet, basename='scheduled-reports')

urlpatterns = [
    # Report Templates
    path('templates/', include(report_templates_router.urls)),
    
    # Merchant Reports
    path('', include(merchant_reports_router.urls)),
    path('<int:pk>/regenerate/', RegenerateReportView.as_view(), name='merchant-regenerate-report'),
    path('<int:pk>/cancel/', CancelReportView.as_view(), name='merchant-cancel-report'),
    path('<int:pk>/delete/', DeleteReportView.as_view(), name='merchant-delete-report'),
    path('<int:pk>/download/', DownloadReportView.as_view(), name='merchant-download-report'),
    
    # Scheduled Reports
    path('scheduled/', include(scheduled_reports_router.urls)),
    path('scheduled/<int:pk>/pause/', PauseScheduledReportView.as_view(), name='merchant-pause-scheduled-report'),
    path('scheduled/<int:pk>/resume/', ResumeScheduledReportView.as_view(), name='merchant-resume-scheduled-report'),
    path('scheduled/<int:pk>/run-now/', RunScheduledReportNowView.as_view(), name='merchant-run-scheduled-report-now'),
    path('scheduled/<int:pk>/delete/', DeleteScheduledReportView.as_view(), name='merchant-delete-scheduled-report'),
]

# Export URL patterns for inclusion
merchant_reports_urls = [
    # Report Templates
    path('templates/', include(report_templates_router.urls)),
    
    # Merchant Reports
    path('', include(merchant_reports_router.urls)),
    path('<int:pk>/regenerate/', RegenerateReportView.as_view(), name='merchant-regenerate-report'),
    path('<int:pk>/cancel/', CancelReportView.as_view(), name='merchant-cancel-report'),
    path('<int:pk>/delete/', DeleteReportView.as_view(), name='merchant-delete-report'),
    path('<int:pk>/download/', DownloadReportView.as_view(), name='merchant-download-report'),
    
    # Scheduled Reports
    path('scheduled/', include(scheduled_reports_router.urls)),
    path('scheduled/<int:pk>/pause/', PauseScheduledReportView.as_view(), name='merchant-pause-scheduled-report'),
    path('scheduled/<int:pk>/resume/', ResumeScheduledReportView.as_view(), name='merchant-resume-scheduled-report'),
    path('scheduled/<int:pk>/run-now/', RunScheduledReportNowView.as_view(), name='merchant-run-scheduled-report-now'),
    path('scheduled/<int:pk>/delete/', DeleteScheduledReportView.as_view(), name='merchant-delete-scheduled-report'),
]
