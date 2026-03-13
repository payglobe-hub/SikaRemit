from rest_framework.permissions import BasePermission
from shared.constants import (
    USER_TYPE_SUPER_ADMIN, USER_TYPE_BUSINESS_ADMIN,
    ADMIN_HIERARCHY_LEVELS
)


class IsSuperAdmin(BasePermission):
    """
    Allows access only to super admins (user_type=1).
    """
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.user_type == USER_TYPE_SUPER_ADMIN
        )


class IsBusinessAdmin(BasePermission):
    """
    Allows access to business admins (user_type=2) and super admins (user_type=1).
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.user_type in (
            USER_TYPE_SUPER_ADMIN, USER_TYPE_BUSINESS_ADMIN
        )


class IsAdminUser(BasePermission):
    """
    Allows access only to any admin-level user (user_type in 1-4).
    """
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.user_type in ADMIN_HIERARCHY_LEVELS
        )
