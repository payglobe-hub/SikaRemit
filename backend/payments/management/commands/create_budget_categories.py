from django.core.management.base import BaseCommand
from payments.models.budgeting import BudgetCategory

class Command(BaseCommand):
    help = 'Create default budget categories'

    def handle(self, *args, **options):
        categories = [
            # Income categories
            {'name': 'Salary', 'category_type': 'income', 'icon': 'work', 'color': '#10b981', 'is_default': True},
            {'name': 'Freelance', 'category_type': 'income', 'icon': 'person', 'color': '#3b82f6', 'is_default': True},
            {'name': 'Business', 'category_type': 'income', 'icon': 'business', 'color': '#8b5cf6', 'is_default': True},
            {'name': 'Investments', 'category_type': 'income', 'icon': 'trending-up', 'color': '#f59e0b', 'is_default': True},
            {'name': 'Other Income', 'category_type': 'income', 'icon': 'attach-money', 'color': '#6b7280', 'is_default': True},

            # Expense categories
            {'name': 'Food & Dining', 'category_type': 'expense', 'icon': 'restaurant', 'color': '#ef4444', 'is_default': True},
            {'name': 'Transportation', 'category_type': 'expense', 'icon': 'directions-car', 'color': '#f97316', 'is_default': True},
            {'name': 'Shopping', 'category_type': 'expense', 'icon': 'shopping-cart', 'color': '#eab308', 'is_default': True},
            {'name': 'Entertainment', 'category_type': 'expense', 'icon': 'movie', 'color': '#22c55e', 'is_default': True},
            {'name': 'Bills & Utilities', 'category_type': 'expense', 'icon': 'receipt', 'color': '#06b6d4', 'is_default': True},
            {'name': 'Healthcare', 'category_type': 'expense', 'icon': 'local-hospital', 'color': '#ec4899', 'is_default': True},
            {'name': 'Education', 'category_type': 'expense', 'icon': 'school', 'color': '#8b5cf6', 'is_default': True},
            {'name': 'Housing', 'category_type': 'expense', 'icon': 'home', 'color': '#6366f1', 'is_default': True},
            {'name': 'Insurance', 'category_type': 'expense', 'icon': 'security', 'color': '#14b8a6', 'is_default': True},
            {'name': 'Personal Care', 'category_type': 'expense', 'icon': 'spa', 'color': '#f97316', 'is_default': True},
            {'name': 'Travel', 'category_type': 'expense', 'icon': 'flight', 'color': '#84cc16', 'is_default': True},
            {'name': 'Other Expenses', 'category_type': 'expense', 'icon': 'category', 'color': '#6b7280', 'is_default': True},

            # Savings categories
            {'name': 'Emergency Fund', 'category_type': 'saving', 'icon': 'savings', 'color': '#10b981', 'is_default': True},
            {'name': 'Retirement', 'category_type': 'saving', 'icon': 'account-balance', 'color': '#3b82f6', 'is_default': True},
            {'name': 'Vacation', 'category_type': 'saving', 'icon': 'beach-access', 'color': '#8b5cf6', 'is_default': True},
            {'name': 'Car Purchase', 'category_type': 'saving', 'icon': 'directions-car', 'color': '#f59e0b', 'is_default': True},
            {'name': 'Home Down Payment', 'category_type': 'saving', 'icon': 'home', 'color': '#ef4444', 'is_default': True},
            {'name': 'Education Fund', 'category_type': 'saving', 'icon': 'school', 'color': '#22c55e', 'is_default': True},
            {'name': 'Investment', 'category_type': 'saving', 'icon': 'trending-up', 'color': '#06b6d4', 'is_default': True},
        ]

        created_count = 0
        updated_count = 0

        for category_data in categories:
            category, created = BudgetCategory.objects.get_or_create(
                name=category_data['name'],
                category_type=category_data['category_type'],
                defaults=category_data
            )

            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created category: {category.name}')
                )
            else:
                # Update existing category if needed
                updated = False
                for field, value in category_data.items():
                    if getattr(category, field) != value:
                        setattr(category, field, value)
                        updated = True

                if updated:
                    category.save()
                    updated_count += 1
                    self.stdout.write(
                        self.style.WARNING(f'Updated category: {category.name}')
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully processed {created_count} new and {updated_count} updated budget categories'
            )
        )
