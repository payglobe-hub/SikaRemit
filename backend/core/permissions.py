from rest_framework.permissions import BasePermission

class IsAdminOrReadOnly(BasePermission):
    """
    Allows full access to admin users, read-only to others.
    """
    def has_permission(self, request, view):
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        return request.user and request.user.is_admin
