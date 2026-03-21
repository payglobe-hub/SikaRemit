from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet

router = DefaultRouter()
router.register(r'', NotificationViewSet, basename='notifications')

urlpatterns = [
    path('notifications/<int:pk>/mark_read/', 
         NotificationViewSet.as_view({'post': 'mark_read'}), 
         name='notification-mark-read')
] + router.urls
