from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_admin import (
    AdminRoleViewSet, AdminProfileViewSet, AdminActivityLogViewSet,
    AdminSessionViewSet, admin_permissions_overview, accessible_admins
)

router = DefaultRouter()
router.register(r'roles', AdminRoleViewSet, basename='admin-roles')
router.register(r'profiles', AdminProfileViewSet, basename='admin-profiles')
router.register(r'activity-logs', AdminActivityLogViewSet, basename='admin-activity-logs')
router.register(r'sessions', AdminSessionViewSet, basename='admin-sessions')

urlpatterns = [
    path('admin/', include(router.urls)),
    path('admin/permissions-overview/', admin_permissions_overview, name='admin_permissions_overview'),
    path('admin/accessible-admins/', accessible_admins, name='accessible_admins'),
]
