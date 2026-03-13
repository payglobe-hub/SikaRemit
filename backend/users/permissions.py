from rest_framework.permissions import BasePermission
from shared.constants import (
    ADMIN_HIERARCHY_LEVELS, ADMIN_PERMISSIONS,
    USER_TYPE_SUPER_ADMIN, USER_TYPE_BUSINESS_ADMIN,
    USER_TYPE_OPERATIONS_ADMIN, USER_TYPE_VERIFICATION_ADMIN,
    USER_TYPE_MERCHANT, USER_TYPE_CUSTOMER
)
from .services_admin import AdminPermissionService


class IsAdminUser(BasePermission):
    """Check if user is any type of admin"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.user_type in ADMIN_HIERARCHY_LEVELS


class IsSuperAdmin(BasePermission):
    """Check if user is a Super Admin (Level 1)"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.user_type == USER_TYPE_SUPER_ADMIN


class IsBusinessAdmin(BasePermission):
    """Check if user is a Business Admin (Level 2)"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.user_type == USER_TYPE_BUSINESS_ADMIN


class IsOperationsAdmin(BasePermission):
    """Check if user is an Operations Admin (Level 3)"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.user_type == USER_TYPE_OPERATIONS_ADMIN


class IsVerificationAdmin(BasePermission):
    """Check if user is a Verification Admin (Level 4)"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.user_type == USER_TYPE_VERIFICATION_ADMIN


class HasAdminPermission(BasePermission):
    """Check if admin user has specific permission"""
    def __init__(self, permission_key):
        self.permission_key = permission_key
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.user.user_type not in ADMIN_HIERARCHY_LEVELS:
            return False
        
        return AdminPermissionService.has_permission(request.user, self.permission_key)


class CanManageAdmins(BasePermission):
    """Check if admin can manage other admins"""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.user.user_type not in ADMIN_HIERARCHY_LEVELS:
            return False
        
        return AdminPermissionService.has_permission(request.user, 'admin_management')


class CanManageUsers(BasePermission):
    """Check if admin can manage user accounts"""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.user.user_type not in ADMIN_HIERARCHY_LEVELS:
            return False
        
        return AdminPermissionService.has_permission(request.user, 'user_management')


class CanReviewKYC(BasePermission):
    """Check if admin can review KYC documents"""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.user.user_type not in ADMIN_HIERARCHY_LEVELS:
            return False
        
        return AdminPermissionService.has_permission(request.user, 'kyc_review')


class CanApproveMerchants(BasePermission):
    """Check if admin can approve merchant applications"""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.user.user_type not in ADMIN_HIERARCHY_LEVELS:
            return False
        
        return AdminPermissionService.has_permission(request.user, 'merchant_approval')


class CanOverrideTransactions(BasePermission):
    """Check if admin can override transaction restrictions"""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.user.user_type not in ADMIN_HIERARCHY_LEVELS:
            return False
        
        return AdminPermissionService.has_permission(request.user, 'transaction_override')


class CanAccessAuditLogs(BasePermission):
    """Check if admin can access audit logs"""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.user.user_type not in ADMIN_HIERARCHY_LEVELS:
            return False
        
        return AdminPermissionService.has_permission(request.user, 'audit_logs')


class CanAccessSystemSettings(BasePermission):
    """Check if admin can access system settings"""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.user.user_type not in ADMIN_HIERARCHY_LEVELS:
            return False
        
        return AdminPermissionService.has_permission(request.user, 'system_settings')


class CanAccessReporting(BasePermission):
    """Check if admin can access reports"""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.user.user_type not in ADMIN_HIERARCHY_LEVELS:
            return False
        
        return AdminPermissionService.has_permission(request.user, 'reporting')


class CanManageSupport(BasePermission):
    """Check if admin can manage support operations"""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.user.user_type not in ADMIN_HIERARCHY_LEVELS:
            return False
        
        return AdminPermissionService.has_permission(request.user, 'support_management')


class IsOwnerOrAdmin(BasePermission):
    """Check if user owns the object or is an admin"""
    def has_object_permission(self, request, view, obj):
        if request.user.user_type in ADMIN_HIERARCHY_LEVELS:
            return True
        return obj.user == request.user


class IsHigherLevelAdmin(BasePermission):
    """Check if admin is higher level than target admin"""
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        
        if request.user.user_type not in ADMIN_HIERARCHY_LEVELS:
            return False
        
        # Get target admin's user object
        target_user = None
        if hasattr(obj, 'user'):
            target_user = obj.user
        elif hasattr(obj, 'admin_user'):
            target_user = obj.admin_user
        elif hasattr(obj, 'admin_profile'):
            target_user = obj.admin_profile.user
        else:
            target_user = obj  # Assume obj is the user
        
        if target_user.user_type not in ADMIN_HIERARCHY_LEVELS:
            return True  # Non-admin objects can be managed by any admin
        
        return AdminPermissionService.can_manage_admin(request.user, target_user)


# Permission factory functions for easy usage
def require_permission(permission_key):
    """Factory function to create permission class for specific permission"""
    class CustomPermission(BasePermission):
        def has_permission(self, request, view):
            if not request.user.is_authenticated:
                return False
            
            if request.user.user_type not in ADMIN_HIERARCHY_LEVELS:
                return False
            
            return AdminPermissionService.has_permission(request.user, permission_key)
    
    return CustomPermission


def require_min_level(min_level):
    """Factory function to create permission class for minimum admin level"""
    class CustomPermission(BasePermission):
        def has_permission(self, request, view):
            if not request.user.is_authenticated:
                return False
            
            if request.user.user_type not in ADMIN_HIERARCHY_LEVELS:
                return False
            
            return ADMIN_HIERARCHY_LEVELS[request.user.user_type] <= min_level
    
    return CustomPermission


# Legacy permission classes for backward compatibility
class IsMerchantUser(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.user_type == USER_TYPE_MERCHANT


class IsCustomerUser(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.user_type == USER_TYPE_CUSTOMER
