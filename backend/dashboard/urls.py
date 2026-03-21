from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DashboardStatsView, BusinessSummaryView, SalesTrendsView, DashboardStatsViewSet,
    AdminStatsView, RecentActivityView, SystemHealthView, FeeConfigurationViewSet
)
from .api.views import MetricsAPIView, AdminDashboardStatsAPIView

router = DefaultRouter()
router.register(r'stats', DashboardStatsViewSet)
router.register(r'fee-configurations', FeeConfigurationViewSet, basename='fee-configurations')

urlpatterns = [
    path('metrics/', MetricsAPIView.as_view(), name='dashboard-metrics'),
    path('stats/', AdminDashboardStatsAPIView.as_view(), name='admin-dashboard-stats'),
    path('dashboard-stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('business-summary/', BusinessSummaryView.as_view(), name='business-summary'),
    path('sales-trends/', SalesTrendsView.as_view(), name='sales-trends'),
    path('admin-stats/', AdminStatsView.as_view(), name='admin-stats'),
    path('recent-activity/', RecentActivityView.as_view(), name='recent-activity'),
    path('system-health/', SystemHealthView.as_view(), name='system-health'),
    path('fee-configurations/', FeeConfigurationViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='fee-configurations'),
    path('fee-configurations/<int:pk>/', FeeConfigurationViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='fee-configurations-detail'),
    path('fee-configurations/analytics/', FeeConfigurationViewSet.as_view({
        'get': 'analytics'
    }), name='fee-configurations-analytics'),
    path('', include(router.urls)),
]
