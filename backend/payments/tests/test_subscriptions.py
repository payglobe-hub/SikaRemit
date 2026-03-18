"""
Subscription Billing Tests.

Tests subscription plans, features, user subscriptions,
billing cycles, trial periods, and status transitions.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta

from payments.models.subscriptions import (
    SubscriptionPlan, SubscriptionFeature, PlanFeature, Subscription
)
from shared.constants import USER_TYPE_CUSTOMER

User = get_user_model()

class SubscriptionPlanTests(TestCase):
    """Test subscription plan creation and pricing."""

    def test_create_monthly_plan(self):
        plan = SubscriptionPlan.objects.create(
            name='Basic', description='Basic plan',
            plan_type='personal', billing_cycle='monthly',
            price=Decimal('9.99'), currency='USD'
        )
        self.assertEqual(plan.name, 'Basic')
        self.assertEqual(plan.billing_cycle, 'monthly')
        self.assertTrue(plan.is_active)

    def test_create_yearly_plan(self):
        plan = SubscriptionPlan.objects.create(
            name='Pro Annual', plan_type='business',
            billing_cycle='yearly', price=Decimal('99.99')
        )
        self.assertEqual(plan.billing_cycle, 'yearly')

    def test_plan_with_trial(self):
        plan = SubscriptionPlan.objects.create(
            name='Trial Plan', plan_type='personal',
            billing_cycle='monthly', price=Decimal('19.99'),
            trial_days=14
        )
        self.assertTrue(plan.has_trial)
        self.assertEqual(plan.trial_days, 14)

    def test_plan_without_trial(self):
        plan = SubscriptionPlan.objects.create(
            name='No Trial', plan_type='personal',
            billing_cycle='monthly', price=Decimal('9.99'),
            trial_days=0
        )
        self.assertFalse(plan.has_trial)

    def test_annual_price_monthly(self):
        plan = SubscriptionPlan.objects.create(
            name='Monthly', plan_type='personal',
            billing_cycle='monthly', price=Decimal('10.00')
        )
        self.assertEqual(plan.get_annual_price(), Decimal('120.00'))

    def test_annual_price_quarterly(self):
        plan = SubscriptionPlan.objects.create(
            name='Quarterly', plan_type='personal',
            billing_cycle='quarterly', price=Decimal('25.00')
        )
        self.assertEqual(plan.get_annual_price(), Decimal('100.00'))

    def test_annual_price_yearly(self):
        plan = SubscriptionPlan.objects.create(
            name='Yearly', plan_type='personal',
            billing_cycle='yearly', price=Decimal('90.00')
        )
        self.assertEqual(plan.get_annual_price(), Decimal('90.00'))

    def test_all_plan_types(self):
        for plan_type, _ in SubscriptionPlan.PLAN_TYPES:
            plan = SubscriptionPlan.objects.create(
                name=f'{plan_type} plan', plan_type=plan_type,
                billing_cycle='monthly', price=Decimal('10.00')
            )
            self.assertEqual(plan.plan_type, plan_type)

    def test_plan_limits(self):
        plan = SubscriptionPlan.objects.create(
            name='Enterprise', plan_type='enterprise',
            billing_cycle='monthly', price=Decimal('99.99'),
            max_users=50, max_transactions_per_month=10000,
            max_invoices_per_month=500
        )
        self.assertEqual(plan.max_users, 50)
        self.assertEqual(plan.max_transactions_per_month, 10000)

    def test_plan_price_display(self):
        plan = SubscriptionPlan.objects.create(
            name='Display', plan_type='personal',
            billing_cycle='monthly', price=Decimal('9.99'), currency='USD'
        )
        display = plan.get_price_display()
        self.assertIn('9.99', display)
        self.assertIn('USD', display)
        self.assertIn('/month', display)

class SubscriptionFeatureTests(TestCase):
    """Test subscription features and plan-feature relationships."""

    def test_create_boolean_feature(self):
        feature = SubscriptionFeature.objects.create(
            name='api_access', display_name='API Access',
            feature_type='boolean'
        )
        self.assertEqual(feature.feature_type, 'boolean')

    def test_create_limit_feature(self):
        feature = SubscriptionFeature.objects.create(
            name='monthly_transactions', display_name='Monthly Transactions',
            feature_type='limit', default_limit=100
        )
        self.assertEqual(feature.feature_type, 'limit')
        self.assertEqual(feature.default_limit, 100)

    def test_create_unlimited_feature(self):
        feature = SubscriptionFeature.objects.create(
            name='storage', display_name='Storage',
            feature_type='unlimited'
        )
        self.assertEqual(feature.feature_type, 'unlimited')

    def test_plan_feature_boolean_value(self):
        plan = SubscriptionPlan.objects.create(
            name='Test', plan_type='personal',
            billing_cycle='monthly', price=Decimal('10.00')
        )
        feature = SubscriptionFeature.objects.create(
            name='test_feat', display_name='Test', feature_type='boolean'
        )
        pf = PlanFeature.objects.create(
            plan=plan, feature=feature, enabled=True
        )
        self.assertTrue(pf.value)

    def test_plan_feature_limit_value(self):
        plan = SubscriptionPlan.objects.create(
            name='Test', plan_type='personal',
            billing_cycle='monthly', price=Decimal('10.00')
        )
        feature = SubscriptionFeature.objects.create(
            name='txn_limit', display_name='Transaction Limit',
            feature_type='limit'
        )
        pf = PlanFeature.objects.create(
            plan=plan, feature=feature, limit_value=500
        )
        self.assertEqual(pf.value, 500)

    def test_unique_plan_feature(self):
        plan = SubscriptionPlan.objects.create(
            name='Unique', plan_type='personal',
            billing_cycle='monthly', price=Decimal('10.00')
        )
        feature = SubscriptionFeature.objects.create(
            name='unique_feat', display_name='Unique', feature_type='boolean'
        )
        PlanFeature.objects.create(plan=plan, feature=feature, enabled=True)
        with self.assertRaises(Exception):
            PlanFeature.objects.create(plan=plan, feature=feature, enabled=False)

class SubscriptionTests(TestCase):
    """Test user subscriptions and status transitions."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='subuser', email='sub@test.com',
            password='testpass123', user_type=USER_TYPE_CUSTOMER
        )
        self.plan = SubscriptionPlan.objects.create(
            name='Pro', plan_type='personal',
            billing_cycle='monthly', price=Decimal('19.99')
        )

    def test_create_active_subscription(self):
        now = timezone.now()
        sub = Subscription.objects.create(
            user=self.user, plan=self.plan,
            status='active',
            start_date=now,
            current_period_start=now,
            current_period_end=now + timedelta(days=30)
        )
        self.assertEqual(sub.status, 'active')
        self.assertEqual(sub.plan, self.plan)

    def test_create_trial_subscription(self):
        now = timezone.now()
        sub = Subscription.objects.create(
            user=self.user, plan=self.plan,
            status='trial',
            start_date=now,
            current_period_start=now,
            current_period_end=now + timedelta(days=14),
            trial_end=now + timedelta(days=14)
        )
        self.assertEqual(sub.status, 'trial')
        self.assertIsNotNone(sub.trial_end)

    def test_subscription_status_transitions(self):
        now = timezone.now()
        sub = Subscription.objects.create(
            user=self.user, plan=self.plan,
            status='pending',
            start_date=now,
            current_period_start=now,
            current_period_end=now + timedelta(days=30)
        )
        for status in ['active', 'past_due', 'canceled', 'expired']:
            sub.status = status
            sub.save()
            sub.refresh_from_db()
            self.assertEqual(sub.status, status)

    def test_cancel_subscription(self):
        now = timezone.now()
        sub = Subscription.objects.create(
            user=self.user, plan=self.plan,
            status='active',
            start_date=now,
            current_period_start=now,
            current_period_end=now + timedelta(days=30)
        )
        sub.status = 'canceled'
        sub.canceled_at = timezone.now()
        sub.save()
        sub.refresh_from_db()
        self.assertEqual(sub.status, 'canceled')
        self.assertIsNotNone(sub.canceled_at)

    def test_multiple_subscriptions_per_user(self):
        now = timezone.now()
        plan2 = SubscriptionPlan.objects.create(
            name='Enterprise', plan_type='enterprise',
            billing_cycle='yearly', price=Decimal('199.99')
        )
        Subscription.objects.create(
            user=self.user, plan=self.plan, status='canceled',
            start_date=now - timedelta(days=60),
            current_period_start=now - timedelta(days=60),
            current_period_end=now - timedelta(days=30)
        )
        Subscription.objects.create(
            user=self.user, plan=plan2, status='active',
            start_date=now,
            current_period_start=now,
            current_period_end=now + timedelta(days=365)
        )
        self.assertEqual(self.user.subscriptions.count(), 2)
