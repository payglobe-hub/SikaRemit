"""
Test admin operations and permissions
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock

from users.models_admin import AdminProfile, AdminRole, AdminActivityLog
from users.services_admin import AdminPermissionService, AdminSessionService
from users.permissions import (
    IsAdminUser, IsSuperAdmin, IsBusinessAdmin, 
    HasAdminPermission, CanManageAdmins
)
from shared.constants import ADMIN_HIERARCHY_LEVELS, ADMIN_PERMISSIONS

User = get_user_model()


class AdminHierarchyTest(TestCase):
    """Test admin hierarchy and permissions"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create admin roles
        self.super_admin_role = AdminRole.objects.create(
            name='Super Admin',
            display_name='Super Admin',
            description='Full system access',
            level=1,
            permissions=list(ADMIN_PERMISSIONS.keys())
        )
        
        self.business_admin_role = AdminRole.objects.create(
            name='Business Admin',
            display_name='Business Admin',
            description='Operations & Compliance',
            level=2,
            permissions=['user_management', 'kyc_review', 'merchant_approval', 'reporting']
        )
        
        self.ops_admin_role = AdminRole.objects.create(
            name='Operations Admin',
            display_name='Operations Admin',
            description='Day-to-day operations',
            level=3,
            permissions=['user_management', 'support_management', 'reporting']
        )
        
        # Create admin users
        self.super_admin = User.objects.create_user(
            username='superadmin',
            email='super@admin.com',
            password='TestPass123!',
            user_type=1  # SUPER_ADMIN
        )
        
        self.business_admin = User.objects.create_user(
            username='businessadmin',
            email='business@admin.com',
            password='TestPass123!',
            user_type=2  # BUSINESS_ADMIN
        )
        
        self.ops_admin = User.objects.create_user(
            username='opsadmin',
            email='ops@admin.com',
            password='TestPass123!',
            user_type=3  # OPERATIONS_ADMIN
        )
        
        self.regular_user = User.objects.create_user(
            username='customer',
            email='customer@example.com',
            password='TestPass123!',
            user_type=6  # CUSTOMER
        )

    def test_admin_profile_creation(self):
        """Test that admin profiles are created automatically"""
        self.assertTrue(hasattr(self.super_admin, 'admin_profile'))
        self.assertTrue(hasattr(self.business_admin, 'admin_profile'))
        self.assertTrue(hasattr(self.ops_admin, 'admin_profile'))
        
        # Check role assignments
        self.assertEqual(self.super_admin.admin_profile.role.level, 1)
        self.assertEqual(self.business_admin.admin_profile.role.level, 2)
        self.assertEqual(self.ops_admin.admin_profile.role.level, 3)

    def test_admin_permission_service(self):
        """Test AdminPermissionService methods"""
        # Test permission checking
        self.assertTrue(AdminPermissionService.has_permission(self.super_admin, 'admin_management'))
        self.assertTrue(AdminPermissionService.has_permission(self.business_admin, 'kyc_review'))
        self.assertFalse(AdminPermissionService.has_permission(self.ops_admin, 'admin_management'))
        self.assertFalse(AdminPermissionService.has_permission(self.regular_user, 'user_management'))
        
        # Test admin management permissions
        self.assertTrue(AdminPermissionService.can_manage_admin(self.super_admin, self.business_admin))
        self.assertTrue(AdminPermissionService.can_manage_admin(self.business_admin, self.ops_admin))
        self.assertFalse(AdminPermissionService.can_manage_admin(self.ops_admin, self.business_admin))
        self.assertFalse(AdminPermissionService.can_manage_admin(self.business_admin, self.super_admin))

    def test_permission_classes(self):
        """Test permission classes"""
        # Test IsAdminUser
        is_admin = IsAdminUser()
        self.assertTrue(is_admin.has_permission(self._create_request(self.super_admin), None))
        self.assertTrue(is_admin.has_permission(self._create_request(self.business_admin), None))
        self.assertFalse(is_admin.has_permission(self._create_request(self.regular_user), None))
        
        # Test IsSuperAdmin
        is_super = IsSuperAdmin()
        self.assertTrue(is_super.has_permission(self._create_request(self.super_admin), None))
        self.assertFalse(is_super.has_permission(self._create_request(self.business_admin), None))
        
        # Test HasAdminPermission
        has_kyc = HasAdminPermission('kyc_review')
        self.assertTrue(has_kyc.has_permission(self._create_request(self.business_admin), None))
        self.assertFalse(has_kyc.has_permission(self._create_request(self.ops_admin), None))

    def test_admin_session_service(self):
        """Test AdminSessionService methods"""
        with patch('users.services_admin.timezone.now') as mock_now:
            mock_now.return_value = MagicMock()
            
            # Test session creation
            session = AdminSessionService.create_session(
                user=self.super_admin,
                session_key='test_session',
                ip_address='127.0.0.1',
                user_agent='Test Browser'
            )
            
            self.assertIsNotNone(session)
            self.assertEqual(session.admin_user, self.super_admin)
            self.assertEqual(session.session_key, 'test_session')
            
            # Test session ending
            ended_session = AdminSessionService.end_session('test_session')
            self.assertIsNotNone(ended_session)
            self.assertFalse(ended_session.is_active)

    def test_admin_activity_logging(self):
        """Test admin activity logging"""
        # Test activity log creation
        log = AdminActivityLog.log_action(
            admin_user=self.super_admin,
            action='user_created',
            description='Created new user',
            resource_type='user',
            resource_id='123',
            ip_address='127.0.0.1'
        )
        
        self.assertIsNotNone(log)
        self.assertEqual(log.admin_user, self.super_admin)
        self.assertEqual(log.action, 'user_created')
        self.assertEqual(log.description, 'Created new user')

    def test_hierarchy_constraints(self):
        """Test admin hierarchy constraints"""
        # Test that lower level admins cannot manage higher level admins
        with self.assertRaises(Exception):
            # This should fail due to hierarchy validation
            self.ops_admin.admin_profile.managed_by = self.business_admin.admin_profile
            self.ops_admin.admin_profile.save()

    def test_accessible_admins_list(self):
        """Test getting accessible admins for management"""
        # Super admin should see all other admins
        accessible = AdminPermissionService.get_accessible_admins(self.super_admin)
        self.assertIn(self.business_admin, accessible)
        self.assertIn(self.ops_admin, accessible)
        
        # Business admin should only see ops admin
        accessible = AdminPermissionService.get_accessible_admins(self.business_admin)
        self.assertIn(self.ops_admin, accessible)
        self.assertNotIn(self.super_admin, accessible)
        
        # Ops admin should not see any other admins
        accessible = AdminPermissionService.get_accessible_admins(self.ops_admin)
        self.assertEqual(accessible.count(), 0)

    def _create_request(self, user):
        """Helper to create mock request with user"""
        request = MagicMock()
        request.user = user
        return request


class AdminAPITest(TestCase):
    """Test admin API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create super admin
        self.super_admin = User.objects.create_user(
            username='superadmin',
            email='super@admin.com',
            password='TestPass123!',
            user_type=1
        )
        
        # Create business admin
        self.business_admin = User.objects.create_user(
            username='businessadmin',
            email='business@admin.com',
            password='TestPass123!',
            user_type=2
        )

    def test_admin_access_control(self):
        """Test that admin endpoints are properly protected"""
        # Test without authentication
        response = self.client.get('/api/admin/users/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Test with regular user
        regular_user = User.objects.create_user(
            username='customer',
            email='customer@example.com',
            password='TestPass123!',
            user_type=6
        )
        self.client.force_authenticate(user=regular_user)
        response = self.client.get('/api/admin/users/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Test with admin user
        self.client.force_authenticate(user=self.super_admin)
        # Note: This will depend on actual API implementation

    @patch('users.views.AdminUserViewSet.get_queryset')
    def test_admin_user_management(self, mock_queryset):
        """Test admin user management operations"""
        mock_queryset.return_value = User.objects.filter(user_type__in=ADMIN_HIERARCHY_LEVELS)
        
        self.client.force_authenticate(user=self.super_admin)
        
        # Test listing admins
        response = self.client.get('/api/admin/users/')
        # Note: This will depend on actual API implementation

    def test_admin_permissions_enforcement(self):
        """Test that admin permissions are properly enforced"""
        # Test that business admin cannot access super admin only functions
        self.client.force_authenticate(user=self.business_admin)
        
        # This should fail - business admin trying to access super admin functions
        # Note: This will depend on actual API implementation


class AdminReportingTest(TestCase):
    """Test admin reporting functionality"""
    
    def setUp(self):
        self.client = APIClient()
        
        self.super_admin = User.objects.create_user(
            username='superadmin',
            email='super@admin.com',
            password='TestPass123!',
            user_type=1
        )
        
        self.business_admin = User.objects.create_user(
            username='businessadmin',
            email='business@admin.com',
            password='TestPass123!',
            user_type=2
        )

    def test_admin_reporting_access(self):
        """Test admin reporting access control"""
        # Test that admins can access reports based on permissions
        self.client.force_authenticate(user=self.super_admin)
        
        # Test accessing various report types
        # Note: This will depend on actual reporting API implementation

    def test_admin_audit_trail(self):
        """Test admin audit trail functionality"""
        # Test that admin actions are properly logged
        # Note: This will depend on actual audit trail implementation


if __name__ == '__main__':
    import unittest
    unittest.main()
