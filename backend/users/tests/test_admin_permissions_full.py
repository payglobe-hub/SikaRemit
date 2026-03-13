"""
Comprehensive tests for Admin Permission Hierarchy.

Tests all 4 admin types (super_admin, business_admin, operations_admin, verification_admin)
and all granular permission classes (CanManageAdmins, CanManageUsers, CanReviewKYC,
CanApproveMerchants, CanOverrideTransactions, etc.)
"""
from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from unittest.mock import MagicMock

from users.permissions import (
    IsAdminUser, IsSuperAdmin, IsBusinessAdmin, IsOperationsAdmin,
    IsVerificationAdmin, HasAdminPermission, CanManageAdmins,
    CanManageUsers, CanReviewKYC, CanApproveMerchants, CanOverrideTransactions
)
from users.services_admin import AdminPermissionService
from shared.constants import (
    USER_TYPE_SUPER_ADMIN, USER_TYPE_BUSINESS_ADMIN,
    USER_TYPE_OPERATIONS_ADMIN, USER_TYPE_VERIFICATION_ADMIN,
    USER_TYPE_MERCHANT, USER_TYPE_CUSTOMER,
    ADMIN_PERMISSIONS, ADMIN_HIERARCHY_LEVELS
)

User = get_user_model()


class AdminPermissionHierarchyTests(TestCase):
    """Test the full admin hierarchy and permission system."""

    def setUp(self):
        self.factory = RequestFactory()
        self.super_admin = User.objects.create_user(
            username='superadmin', email='super@test.com',
            password='testpass123', user_type=USER_TYPE_SUPER_ADMIN
        )
        self.business_admin = User.objects.create_user(
            username='businessadmin', email='business@test.com',
            password='testpass123', user_type=USER_TYPE_BUSINESS_ADMIN
        )
        self.ops_admin = User.objects.create_user(
            username='opsadmin', email='ops@test.com',
            password='testpass123', user_type=USER_TYPE_OPERATIONS_ADMIN
        )
        self.verification_admin = User.objects.create_user(
            username='verifyadmin', email='verify@test.com',
            password='testpass123', user_type=USER_TYPE_VERIFICATION_ADMIN
        )
        self.merchant = User.objects.create_user(
            username='merchant', email='merchant@test.com',
            password='testpass123', user_type=USER_TYPE_MERCHANT
        )
        self.customer = User.objects.create_user(
            username='customer', email='customer@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )

    def _make_request(self, user):
        request = self.factory.get('/')
        request.user = user
        return request

    # ── IsAdminUser ──────────────────────────────────────────────────────
    def test_is_admin_user_allows_all_admin_types(self):
        perm = IsAdminUser()
        for admin in [self.super_admin, self.business_admin, self.ops_admin, self.verification_admin]:
            self.assertTrue(perm.has_permission(self._make_request(admin), None),
                            f"{admin.username} should be recognized as admin")

    def test_is_admin_user_rejects_non_admins(self):
        perm = IsAdminUser()
        for user in [self.merchant, self.customer]:
            self.assertFalse(perm.has_permission(self._make_request(user), None),
                             f"{user.username} should NOT be recognized as admin")

    def test_is_admin_user_rejects_unauthenticated(self):
        perm = IsAdminUser()
        request = self.factory.get('/')
        request.user = MagicMock(is_authenticated=False)
        self.assertFalse(perm.has_permission(request, None))

    # ── IsSuperAdmin ─────────────────────────────────────────────────────
    def test_is_super_admin_only_allows_super_admin(self):
        perm = IsSuperAdmin()
        self.assertTrue(perm.has_permission(self._make_request(self.super_admin), None))
        self.assertFalse(perm.has_permission(self._make_request(self.business_admin), None))
        self.assertFalse(perm.has_permission(self._make_request(self.ops_admin), None))
        self.assertFalse(perm.has_permission(self._make_request(self.verification_admin), None))
        self.assertFalse(perm.has_permission(self._make_request(self.merchant), None))
        self.assertFalse(perm.has_permission(self._make_request(self.customer), None))

    # ── IsBusinessAdmin ──────────────────────────────────────────────────
    def test_is_business_admin_only_allows_business_admin(self):
        perm = IsBusinessAdmin()
        self.assertFalse(perm.has_permission(self._make_request(self.super_admin), None))
        self.assertTrue(perm.has_permission(self._make_request(self.business_admin), None))
        self.assertFalse(perm.has_permission(self._make_request(self.ops_admin), None))

    # ── IsOperationsAdmin ────────────────────────────────────────────────
    def test_is_operations_admin_only_allows_ops_admin(self):
        perm = IsOperationsAdmin()
        self.assertFalse(perm.has_permission(self._make_request(self.super_admin), None))
        self.assertFalse(perm.has_permission(self._make_request(self.business_admin), None))
        self.assertTrue(perm.has_permission(self._make_request(self.ops_admin), None))

    # ── IsVerificationAdmin ──────────────────────────────────────────────
    def test_is_verification_admin_only_allows_verification_admin(self):
        perm = IsVerificationAdmin()
        self.assertFalse(perm.has_permission(self._make_request(self.super_admin), None))
        self.assertTrue(perm.has_permission(self._make_request(self.verification_admin), None))
        self.assertFalse(perm.has_permission(self._make_request(self.customer), None))

    # ── CanManageAdmins ──────────────────────────────────────────────────
    def test_can_manage_admins_only_super_admin(self):
        """Only super admin has admin_management permission by default."""
        perm = CanManageAdmins()
        self.assertTrue(perm.has_permission(self._make_request(self.super_admin), None))
        self.assertFalse(perm.has_permission(self._make_request(self.business_admin), None))
        self.assertFalse(perm.has_permission(self._make_request(self.ops_admin), None))
        self.assertFalse(perm.has_permission(self._make_request(self.verification_admin), None))

    def test_can_manage_admins_rejects_non_admins(self):
        perm = CanManageAdmins()
        self.assertFalse(perm.has_permission(self._make_request(self.merchant), None))
        self.assertFalse(perm.has_permission(self._make_request(self.customer), None))

    # ── CanManageUsers ───────────────────────────────────────────────────
    def test_can_manage_users_only_super_admin(self):
        """Only super admin has user_management permission by default."""
        perm = CanManageUsers()
        self.assertTrue(perm.has_permission(self._make_request(self.super_admin), None))
        self.assertFalse(perm.has_permission(self._make_request(self.business_admin), None))
        self.assertFalse(perm.has_permission(self._make_request(self.ops_admin), None))

    # ── CanReviewKYC ─────────────────────────────────────────────────────
    def test_can_review_kyc_business_and_verification_admin(self):
        """Super admin and business admin can review KYC via their AdminRole.
        Verification admin only has 'verification_only' per migration defaults."""
        perm = CanReviewKYC()
        self.assertTrue(perm.has_permission(self._make_request(self.super_admin), None))
        self.assertTrue(perm.has_permission(self._make_request(self.business_admin), None))
        self.assertFalse(perm.has_permission(self._make_request(self.verification_admin), None))
        self.assertFalse(perm.has_permission(self._make_request(self.ops_admin), None))
        self.assertFalse(perm.has_permission(self._make_request(self.customer), None))

    # ── CanApproveMerchants ──────────────────────────────────────────────
    def test_can_approve_merchants_super_and_business_admin(self):
        """Super admin and business admin can approve merchant applications."""
        perm = CanApproveMerchants()
        self.assertTrue(perm.has_permission(self._make_request(self.super_admin), None))
        self.assertTrue(perm.has_permission(self._make_request(self.business_admin), None))
        self.assertFalse(perm.has_permission(self._make_request(self.ops_admin), None))
        self.assertFalse(perm.has_permission(self._make_request(self.verification_admin), None))

    # ── CanOverrideTransactions ──────────────────────────────────────────
    def test_can_override_transactions_super_and_business(self):
        """Super admin and business admin can override transactions."""
        perm = CanOverrideTransactions()
        self.assertTrue(perm.has_permission(self._make_request(self.super_admin), None))
        self.assertTrue(perm.has_permission(self._make_request(self.business_admin), None))
        self.assertFalse(perm.has_permission(self._make_request(self.ops_admin), None))
        self.assertFalse(perm.has_permission(self._make_request(self.verification_admin), None))
        self.assertFalse(perm.has_permission(self._make_request(self.merchant), None))

    # ── HasAdminPermission (generic) ─────────────────────────────────────
    def test_has_admin_permission_system_settings_super_only(self):
        perm = HasAdminPermission('system_settings')
        self.assertTrue(perm.has_permission(self._make_request(self.super_admin), None))
        self.assertFalse(perm.has_permission(self._make_request(self.business_admin), None))

    def test_has_admin_permission_reporting_business_and_ops(self):
        perm = HasAdminPermission('reporting')
        self.assertTrue(perm.has_permission(self._make_request(self.business_admin), None))
        self.assertTrue(perm.has_permission(self._make_request(self.ops_admin), None))
        self.assertFalse(perm.has_permission(self._make_request(self.verification_admin), None))

    def test_has_admin_permission_support_management_ops_only(self):
        perm = HasAdminPermission('support_management')
        self.assertTrue(perm.has_permission(self._make_request(self.ops_admin), None))
        self.assertFalse(perm.has_permission(self._make_request(self.business_admin), None))

    def test_has_admin_permission_emergency_override_super_only(self):
        perm = HasAdminPermission('emergency_override')
        self.assertTrue(perm.has_permission(self._make_request(self.super_admin), None))
        self.assertFalse(perm.has_permission(self._make_request(self.business_admin), None))

    def test_has_admin_permission_audit_logs_super_and_business(self):
        perm = HasAdminPermission('audit_logs')
        self.assertTrue(perm.has_permission(self._make_request(self.super_admin), None))
        self.assertTrue(perm.has_permission(self._make_request(self.business_admin), None))
        self.assertFalse(perm.has_permission(self._make_request(self.ops_admin), None))

    def test_has_admin_permission_verification_only_verification_admin(self):
        perm = HasAdminPermission('verification_only')
        self.assertTrue(perm.has_permission(self._make_request(self.verification_admin), None))
        self.assertFalse(perm.has_permission(self._make_request(self.ops_admin), None))

    def test_has_admin_permission_invalid_key_returns_false(self):
        perm = HasAdminPermission('nonexistent_permission')
        self.assertFalse(perm.has_permission(self._make_request(self.super_admin), None))

    # ── AdminPermissionService ───────────────────────────────────────────
    def test_permission_service_get_user_permissions_non_admin(self):
        perms = AdminPermissionService.get_user_permissions(self.customer)
        self.assertEqual(perms, [])

    def test_permission_service_has_permission_non_admin(self):
        self.assertFalse(AdminPermissionService.has_permission(self.customer, 'admin_management'))
        self.assertFalse(AdminPermissionService.has_permission(self.merchant, 'kyc_review'))

    def test_permission_service_super_admin_has_all_super_perms(self):
        """Super admin should have all permissions assigned to their role."""
        for perm_key, config in ADMIN_PERMISSIONS.items():
            if USER_TYPE_SUPER_ADMIN in config['roles']:
                self.assertTrue(
                    AdminPermissionService.has_permission(self.super_admin, perm_key),
                    f"Super admin should have permission: {perm_key}"
                )

    def test_permission_service_business_admin_perms(self):
        for perm_key, config in ADMIN_PERMISSIONS.items():
            expected = USER_TYPE_BUSINESS_ADMIN in config['roles']
            actual = AdminPermissionService.has_permission(self.business_admin, perm_key)
            self.assertEqual(actual, expected,
                             f"Business admin perm '{perm_key}' expected={expected} got={actual}")

    def test_permission_service_ops_admin_perms(self):
        for perm_key, config in ADMIN_PERMISSIONS.items():
            expected = USER_TYPE_OPERATIONS_ADMIN in config['roles']
            actual = AdminPermissionService.has_permission(self.ops_admin, perm_key)
            self.assertEqual(actual, expected,
                             f"Ops admin perm '{perm_key}' expected={expected} got={actual}")

    def test_permission_service_verification_admin_perms(self):
        """Verification admin only has 'verification_only' per migration-defined AdminRole."""
        migration_perms = ['verification_only']
        for perm_key, config in ADMIN_PERMISSIONS.items():
            expected = perm_key in migration_perms
            actual = AdminPermissionService.has_permission(self.verification_admin, perm_key)
            self.assertEqual(actual, expected,
                             f"Verification admin perm '{perm_key}' expected={expected} got={actual}")

    # ── Constants Sanity ─────────────────────────────────────────────────
    def test_admin_hierarchy_levels_match_user_types(self):
        self.assertIn(USER_TYPE_SUPER_ADMIN, ADMIN_HIERARCHY_LEVELS)
        self.assertIn(USER_TYPE_BUSINESS_ADMIN, ADMIN_HIERARCHY_LEVELS)
        self.assertIn(USER_TYPE_OPERATIONS_ADMIN, ADMIN_HIERARCHY_LEVELS)
        self.assertIn(USER_TYPE_VERIFICATION_ADMIN, ADMIN_HIERARCHY_LEVELS)
        self.assertNotIn(USER_TYPE_MERCHANT, ADMIN_HIERARCHY_LEVELS)
        self.assertNotIn(USER_TYPE_CUSTOMER, ADMIN_HIERARCHY_LEVELS)

    def test_every_permission_has_at_least_one_role(self):
        for perm_key, config in ADMIN_PERMISSIONS.items():
            self.assertTrue(len(config['roles']) > 0,
                            f"Permission '{perm_key}' has no assigned roles")

    def test_no_customer_or_merchant_in_any_admin_permission(self):
        for perm_key, config in ADMIN_PERMISSIONS.items():
            self.assertNotIn(USER_TYPE_MERCHANT, config['roles'],
                             f"Merchant should not be in '{perm_key}' roles")
            self.assertNotIn(USER_TYPE_CUSTOMER, config['roles'],
                             f"Customer should not be in '{perm_key}' roles")
