from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    USSDSessionsView,
    USSDTransactionsView,
    USSDStatsView,
    USSDSimulateView,
    USSDSimulateResetView,
    USSDAdminViewSet,
    USSDMenuListView,
    USSDMenuDetailView,
    USSDMenuTypesView
)

# URL patterns
urlpatterns = [
    # Admin USSD endpoints using APIView classes
    path('sessions/', USSDSessionsView.as_view(), name='ussd-sessions'),
    path('transactions/', USSDTransactionsView.as_view(), name='ussd-transactions'),
    path('stats/', USSDStatsView.as_view(), name='ussd-stats'),
    path('simulate/', USSDSimulateView.as_view(), name='ussd-simulate'),
    path('simulate/reset/', USSDSimulateResetView.as_view(), name='ussd-simulate-reset'),
    
    # USSD Menu management endpoints
    path('menus/', USSDMenuListView.as_view(), name='ussd-menus'),
    path('menus/types/', USSDMenuTypesView.as_view(), name='ussd-menu-types'),
    path('menus/<int:pk>/', USSDMenuDetailView.as_view(), name='ussd-menu-detail'),
]
