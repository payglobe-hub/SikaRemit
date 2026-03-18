"""
B2B Bulk Payments Tests.

Tests business accounts, roles, users, approval workflows,
bulk payment creation, items, and status transitions.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal

from merchants.models import (
    BusinessAccount, BusinessRole, BusinessUser,
    ApprovalWorkflow, BulkPayment, BulkPaymentItem
)
from shared.constants import USER_TYPE_MERCHANT, USER_TYPE_CUSTOMER

User = get_user_model()

class BusinessAccountTests(TestCase):
    """Test B2B business account creation and properties."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username='bizowner', email='bizowner@test.com',
            password='testpass123', user_type=USER_TYPE_MERCHANT
        )

    def test_create_business_account(self):
        account = BusinessAccount.objects.create(
            business_name='Enterprise Corp',
            account_type='enterprise',
            account_tier='professional',
            business_address='1 Business Park',
            business_phone='+233241234567',
            business_email='corp@enterprise.com',
            primary_contact=self.owner
        )
        self.assertEqual(account.business_name, 'Enterprise Corp')
        self.assertTrue(account.is_active)
        self.assertEqual(account.payment_terms, 'net_30')

    def test_business_account_types(self):
        for acc_type, _ in BusinessAccount.ACCOUNT_TYPES:
            account = BusinessAccount.objects.create(
                business_name=f'{acc_type} Corp',
                account_type=acc_type,
                business_address='Test', business_phone='024',
                business_email=f'{acc_type}@test.com',
                primary_contact=self.owner
            )
            self.assertEqual(account.account_type, acc_type)

    def test_business_account_tiers(self):
        for tier, _ in BusinessAccount.ACCOUNT_TIERS:
            account = BusinessAccount.objects.create(
                business_name=f'{tier} Corp',
                account_tier=tier,
                business_address='Test', business_phone='024',
                business_email=f'{tier}@test.com',
                primary_contact=self.owner
            )
            self.assertEqual(account.account_tier, tier)

    def test_business_account_credit_limit(self):
        account = BusinessAccount.objects.create(
            business_name='Credit Corp',
            business_address='Test', business_phone='024',
            business_email='credit@test.com',
            primary_contact=self.owner,
            credit_limit=Decimal('50000.00')
        )
        self.assertEqual(account.credit_limit, Decimal('50000.00'))

class BusinessRoleTests(TestCase):
    """Test business roles and permissions."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username='roleowner', email='roleowner@test.com',
            password='testpass123', user_type=USER_TYPE_MERCHANT
        )
        self.account = BusinessAccount.objects.create(
            business_name='Role Corp',
            business_address='Test', business_phone='024',
            business_email='role@test.com',
            primary_contact=self.owner
        )

    def test_create_admin_role(self):
        role = BusinessRole.objects.create(
            business_account=self.account,
            name='Admin',
            role_type='admin',
            can_create_payments=True,
            can_approve_payments=True,
            can_manage_users=True,
            can_view_reports=True,
            can_manage_settings=True,
            single_transaction_limit=Decimal('10000.00'),
            daily_limit=Decimal('50000.00')
        )
        self.assertTrue(role.can_create_payments)
        self.assertTrue(role.can_approve_payments)
        self.assertTrue(role.can_manage_users)

    def test_create_viewer_role(self):
        role = BusinessRole.objects.create(
            business_account=self.account,
            name='Viewer',
            role_type='viewer',
            can_create_payments=False,
            can_approve_payments=False,
            can_manage_users=False,
            can_view_reports=True,
            can_manage_settings=False
        )
        self.assertFalse(role.can_create_payments)
        self.assertTrue(role.can_view_reports)

    def test_all_role_types(self):
        for role_type, _ in BusinessRole.ROLE_TYPES:
            role = BusinessRole.objects.create(
                business_account=self.account,
                name=f'{role_type} Role',
                role_type=role_type
            )
            self.assertEqual(role.role_type, role_type)

class BusinessUserTests(TestCase):
    """Test business user membership."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username='buowner', email='buowner@test.com',
            password='testpass123', user_type=USER_TYPE_MERCHANT
        )
        self.employee = User.objects.create_user(
            username='employee1', email='emp1@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )
        self.account = BusinessAccount.objects.create(
            business_name='BU Corp',
            business_address='Test', business_phone='024',
            business_email='bu@test.com',
            primary_contact=self.owner
        )
        self.role = BusinessRole.objects.create(
            business_account=self.account,
            name='Employee', role_type='employee'
        )

    def test_add_user_to_business(self):
        bu = BusinessUser.objects.create(
            business_account=self.account,
            user=self.employee,
            role=self.role,
            status='pending'
        )
        self.assertEqual(bu.status, 'pending')
        self.assertEqual(bu.business_account, self.account)

    def test_activate_business_user(self):
        bu = BusinessUser.objects.create(
            business_account=self.account,
            user=self.employee,
            role=self.role,
            status='pending'
        )
        bu.status = 'active'
        bu.save()
        bu.refresh_from_db()
        self.assertEqual(bu.status, 'active')

    def test_total_users_count(self):
        BusinessUser.objects.create(
            business_account=self.account,
            user=self.employee, role=self.role, status='active'
        )
        self.assertEqual(self.account.total_users, 1)

    def test_unique_user_per_business(self):
        BusinessUser.objects.create(
            business_account=self.account,
            user=self.employee, role=self.role
        )
        with self.assertRaises(Exception):
            BusinessUser.objects.create(
                business_account=self.account,
                user=self.employee, role=self.role
            )

class BulkPaymentTests(TestCase):
    """Test bulk payment batches."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username='bulkowner', email='bulk@test.com',
            password='testpass123', user_type=USER_TYPE_MERCHANT
        )
        self.account = BusinessAccount.objects.create(
            business_name='Bulk Corp',
            business_address='Test', business_phone='024',
            business_email='bulk@corp.com',
            primary_contact=self.owner
        )

    def test_create_bulk_payment(self):
        bulk = BulkPayment.objects.create(
            business_account=self.account,
            created_by=self.owner,
            name='January Salaries',
            description='Monthly salary payments',
            total_amount=Decimal('50000.00'),
            currency='GHS',
            status='draft'
        )
        self.assertEqual(bulk.status, 'draft')
        self.assertTrue(bulk.reference_number.startswith('BULK_'))

    def test_bulk_payment_status_transitions(self):
        bulk = BulkPayment.objects.create(
            business_account=self.account,
            created_by=self.owner,
            name='Test Batch',
            total_amount=Decimal('10000.00')
        )
        for status in ['pending_approval', 'approved', 'processing', 'completed']:
            bulk.status = status
            bulk.save()
            bulk.refresh_from_db()
            self.assertEqual(bulk.status, status)

    def test_bulk_payment_cancellation(self):
        bulk = BulkPayment.objects.create(
            business_account=self.account,
            created_by=self.owner,
            name='Cancel Batch',
            total_amount=Decimal('5000.00'),
            status='pending_approval'
        )
        bulk.status = 'cancelled'
        bulk.save()
        bulk.refresh_from_db()
        self.assertEqual(bulk.status, 'cancelled')

class BulkPaymentItemTests(TestCase):
    """Test individual items in bulk payments."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username='itemowner', email='item@test.com',
            password='testpass123', user_type=USER_TYPE_MERCHANT
        )
        self.account = BusinessAccount.objects.create(
            business_name='Item Corp',
            business_address='Test', business_phone='024',
            business_email='item@corp.com',
            primary_contact=self.owner
        )
        self.bulk = BulkPayment.objects.create(
            business_account=self.account,
            created_by=self.owner,
            name='Test Items',
            total_amount=Decimal('3000.00')
        )

    def test_create_payment_item(self):
        item = BulkPaymentItem.objects.create(
            bulk_payment=self.bulk,
            recipient_name='John Doe',
            recipient_phone='0241234567',
            recipient_email='john@test.com',
            amount=Decimal('1000.00'),
            description='Salary',
            payment_method='bank_transfer'
        )
        self.assertEqual(item.status, 'pending')
        self.assertTrue(item.reference.startswith('ITEM_'))

    def test_multiple_items_in_bulk(self):
        for i in range(5):
            BulkPaymentItem.objects.create(
                bulk_payment=self.bulk,
                recipient_name=f'Employee {i}',
                amount=Decimal('600.00'),
                payment_method='mobile_money'
            )
        self.assertEqual(self.bulk.payment_items.count(), 5)

    def test_item_status_transitions(self):
        item = BulkPaymentItem.objects.create(
            bulk_payment=self.bulk,
            recipient_name='Test Person',
            amount=Decimal('500.00')
        )
        for status in ['processing', 'completed']:
            item.status = status
            item.save()
            item.refresh_from_db()
            self.assertEqual(item.status, status)

    def test_failed_item_with_reason(self):
        item = BulkPaymentItem.objects.create(
            bulk_payment=self.bulk,
            recipient_name='Fail Person',
            amount=Decimal('500.00')
        )
        item.status = 'failed'
        item.failure_reason = 'Insufficient funds in provider account'
        item.save()
        item.refresh_from_db()
        self.assertEqual(item.status, 'failed')
        self.assertEqual(item.failure_reason, 'Insufficient funds in provider account')
