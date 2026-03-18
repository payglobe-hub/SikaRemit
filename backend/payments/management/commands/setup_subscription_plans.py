from django.core.management.base import BaseCommand
from django.utils import timezone
from payments.models.subscriptions import (
    SubscriptionPlan, SubscriptionFeature, PlanFeature
)

class Command(BaseCommand):
    help = 'Create default subscription plans and features'

    def handle(self, *args, **options):
        # Create default features
        features_data = [
            # Personal features
            {'name': 'ai_financial_advisor', 'display_name': 'AI Financial Advisor',
             'description': 'Personal AI assistant for financial guidance', 'feature_type': 'boolean'},
            {'name': 'basic_budgeting', 'display_name': 'Basic Budgeting',
             'description': 'Create and manage personal budgets', 'feature_type': 'boolean'},
            {'name': 'transaction_tracking', 'display_name': 'Transaction Tracking',
             'description': 'Track and categorize transactions', 'feature_type': 'boolean'},
            {'name': 'basic_reports', 'display_name': 'Basic Reports',
             'description': 'Monthly financial summaries', 'feature_type': 'boolean'},

            # Social features
            {'name': 'social_payments', 'display_name': 'Social Payments',
             'description': 'Split bills and group payments', 'feature_type': 'boolean'},
            {'name': 'group_savings', 'display_name': 'Group Savings',
             'description': 'Create savings goals with friends', 'feature_type': 'boolean'},
            {'name': 'referral_program', 'display_name': 'Referral Program',
             'description': 'Earn rewards by referring friends', 'feature_type': 'boolean'},

            # Business features
            {'name': 'professional_invoicing', 'display_name': 'Professional Invoicing',
             'description': 'Create and send branded invoices', 'feature_type': 'boolean'},
            {'name': 'client_management', 'display_name': 'Client Management',
             'description': 'Manage business clients and contacts', 'feature_type': 'boolean'},
            {'name': 'advanced_reporting', 'display_name': 'Advanced Reporting',
             'description': 'Detailed business analytics', 'feature_type': 'boolean'},
            {'name': 'multi_user_access', 'display_name': 'Multi-User Access',
             'description': 'Add team members to your account', 'feature_type': 'limit'},

            # Usage limits
            {'name': 'monthly_transactions', 'display_name': 'Monthly Transactions',
             'description': 'Number of transactions per month', 'feature_type': 'limit', 'default_limit': 1000},
            {'name': 'monthly_invoices', 'display_name': 'Monthly Invoices',
             'description': 'Number of invoices per month', 'feature_type': 'limit', 'default_limit': 50},
            {'name': 'storage_limit', 'display_name': 'Storage Limit',
             'description': 'File storage in GB', 'feature_type': 'limit', 'default_limit': 1},
        ]

        features_created = 0
        for feature_data in features_data:
            feature, created = SubscriptionFeature.objects.get_or_create(
                name=feature_data['name'],
                defaults=feature_data
            )
            if created:
                features_created += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created feature: {feature.display_name}')
                )

        # Create default subscription plans
        plans_data = [
            {
                'name': 'Free',
                'plan_type': 'personal',
                'billing_cycle': 'monthly',
                'price': 0.00,
                'trial_days': 0,
                'max_transactions_per_month': 50,
                'max_invoices_per_month': 5,
                'max_storage_gb': 0.5,
                'display_order': 1,
                'features': [
                    'transaction_tracking',
                    'basic_reports',
                ]
            },
            {
                'name': 'Personal',
                'plan_type': 'personal',
                'billing_cycle': 'monthly',
                'price': 9.99,
                'trial_days': 14,
                'max_transactions_per_month': 1000,
                'max_invoices_per_month': 50,
                'max_storage_gb': 5,
                'display_order': 2,
                'is_popular': False,
                'features': [
                    'ai_financial_advisor',
                    'basic_budgeting',
                    'transaction_tracking',
                    'basic_reports',
                    'social_payments',
                    'group_savings',
                    'referral_program',
                ]
            },
            {
                'name': 'Personal Pro',
                'plan_type': 'personal',
                'billing_cycle': 'monthly',
                'price': 19.99,
                'trial_days': 14,
                'max_transactions_per_month': 5000,
                'max_invoices_per_month': 200,
                'max_storage_gb': 25,
                'display_order': 3,
                'is_popular': True,
                'features': [
                    'ai_financial_advisor',
                    'basic_budgeting',
                    'transaction_tracking',
                    'basic_reports',
                    'social_payments',
                    'group_savings',
                    'referral_program',
                ]
            },
            {
                'name': 'Business',
                'plan_type': 'business',
                'billing_cycle': 'monthly',
                'price': 29.99,
                'trial_days': 30,
                'max_users': 5,
                'max_transactions_per_month': 10000,
                'max_invoices_per_month': 500,
                'max_storage_gb': 100,
                'display_order': 4,
                'features': [
                    'ai_financial_advisor',
                    'basic_budgeting',
                    'transaction_tracking',
                    'basic_reports',
                    'social_payments',
                    'group_savings',
                    'referral_program',
                    'professional_invoicing',
                    'client_management',
                    'advanced_reporting',
                ]
            },
            {
                'name': 'Enterprise',
                'plan_type': 'enterprise',
                'billing_cycle': 'yearly',
                'price': 299.00,  # $24.92/month when billed yearly
                'trial_days': 30,
                'max_users': 50,
                'max_transactions_per_month': 100000,
                'max_invoices_per_month': 5000,
                'max_storage_gb': 1000,
                'display_order': 5,
                'features': [
                    'ai_financial_advisor',
                    'basic_budgeting',
                    'transaction_tracking',
                    'basic_reports',
                    'social_payments',
                    'group_savings',
                    'referral_program',
                    'professional_invoicing',
                    'client_management',
                    'advanced_reporting',
                ]
            }
        ]

        plans_created = 0
        for plan_data in plans_data:
            features_list = plan_data.pop('features', [])

            plan, created = SubscriptionPlan.objects.get_or_create(
                name=plan_data['name'],
                defaults=plan_data
            )

            if created:
                plans_created += 1

                # Add features to the plan
                for feature_name in features_list:
                    try:
                        feature = SubscriptionFeature.objects.get(name=feature_name)

                        # Set feature values based on plan limits
                        enabled = True
                        limit_value = None

                        if feature.name == 'monthly_transactions':
                            limit_value = plan.max_transactions_per_month
                        elif feature.name == 'monthly_invoices':
                            limit_value = plan.max_invoices_per_month
                        elif feature.name == 'storage_limit':
                            limit_value = int(plan.max_storage_gb * 1024) if plan.max_storage_gb else None  # Convert to MB
                        elif feature.name == 'multi_user_access':
                            limit_value = plan.max_users

                        PlanFeature.objects.create(
                            plan=plan,
                            feature=feature,
                            enabled=enabled,
                            limit_value=limit_value
                        )

                    except SubscriptionFeature.DoesNotExist:
                        self.stdout.write(
                            self.style.WARNING(f'Feature {feature_name} not found for plan {plan.name}')
                        )

                self.stdout.write(
                    self.style.SUCCESS(f'Created plan: {plan.name} (${plan.price}/{plan.billing_cycle})')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created {features_created} features and {plans_created} subscription plans'
            )
        )
