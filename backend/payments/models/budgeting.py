from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator
from decimal import Decimal

User = get_user_model()

class BudgetCategory(models.Model):
    """
    Predefined budget categories that users can choose from
    """
    CATEGORY_TYPES = [
        ('income', 'Income'),
        ('expense', 'Expense'),
        ('saving', 'Saving'),
    ]

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    category_type = models.CharField(max_length=20, choices=CATEGORY_TYPES)
    icon = models.CharField(max_length=50, blank=True)  # Icon identifier
    color = models.CharField(max_length=7, default='#2563eb')  # Hex color code
    is_default = models.BooleanField(default=False)  # Built-in categories
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = 'Budget Categories'
        ordering = ['category_type', 'name']

    def __str__(self):
        return f"{self.name} ({self.category_type})"

class Budget(models.Model):
    """
    Main budget model for tracking income, expenses, and savings goals
    """
    BUDGET_TYPES = [
        ('monthly', 'Monthly'),
        ('weekly', 'Weekly'),
        ('yearly', 'Yearly'),
        ('custom', 'Custom Period'),
    ]

    FREQUENCY_CHOICES = [
        ('monthly', 'Monthly'),
        ('weekly', 'Weekly'),
        ('yearly', 'Yearly'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='budgets')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    budget_type = models.CharField(max_length=20, choices=BUDGET_TYPES, default='monthly')
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default='monthly')

    # Date ranges
    start_date = models.DateField()
    end_date = models.DateField()

    # Financial targets
    total_income_target = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    total_expense_limit = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    total_savings_target = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))

    # Current status
    current_income = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    current_expenses = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    current_savings = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))

    # Settings
    is_active = models.BooleanField(default=True)
    auto_track_transactions = models.BooleanField(default=True)
    alert_threshold = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('80'))  # Alert at 80%

    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['user', 'name', 'start_date']  # Prevent duplicate budgets

    def __str__(self):
        return f"{self.user}'s {self.name} ({self.start_date} - {self.end_date})"

    @property
    def income_percentage(self):
        if self.total_income_target > 0:
            return min((self.current_income / self.total_income_target) * 100, 100)
        return 0

    @property
    def expense_percentage(self):
        if self.total_expense_limit > 0:
            return min((self.current_expenses / self.total_expense_limit) * 100, 100)
        return 0

    @property
    def savings_percentage(self):
        if self.total_savings_target > 0:
            return min((self.current_savings / self.total_savings_target) * 100, 100)
        return 0

    @property
    def is_over_budget(self):
        return self.current_expenses > self.total_expense_limit

    @property
    def is_income_on_track(self):
        return self.current_income >= (self.total_income_target * Decimal('0.8'))

    @property
    def is_savings_on_track(self):
        return self.current_savings >= (self.total_savings_target * Decimal('0.8'))

    @property
    def days_remaining(self):
        if self.end_date:
            return max((self.end_date - timezone.now().date()).days, 0)
        return None

    @property
    def days_elapsed(self):
        if self.start_date and self.end_date:
            total_days = (self.end_date - self.start_date).days
            elapsed_days = (timezone.now().date() - self.start_date).days
            return max(min(elapsed_days, total_days), 0)
        return 0

    @property
    def progress_percentage(self):
        if self.start_date and self.end_date:
            total_days = (self.end_date - self.start_date).days
            if total_days > 0:
                elapsed_days = (timezone.now().date() - self.start_date).days
                return min(max((elapsed_days / total_days) * 100, 0), 100)
        return 0

class BudgetItem(models.Model):
    """
    Individual budget items within a budget (income, expense, or savings categories)
    """
    ITEM_TYPES = [
        ('income', 'Income'),
        ('expense', 'Expense'),
        ('saving', 'Saving'),
    ]

    budget = models.ForeignKey(Budget, on_delete=models.CASCADE, related_name='items')
    category = models.ForeignKey(BudgetCategory, on_delete=models.CASCADE)

    # Financial targets
    planned_amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    actual_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))

    # Notes
    notes = models.TextField(blank=True)

    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['budget', 'category']
        ordering = ['category__name']

    def __str__(self):
        return f"{self.budget.name} - {self.category.name}: ${self.planned_amount}"

    @property
    def remaining_amount(self):
        return self.planned_amount - self.actual_amount

    @property
    def percentage_used(self):
        if self.planned_amount > 0:
            return min((self.actual_amount / self.planned_amount) * 100, 100)
        return 0

    @property
    def is_over_budget(self):
        return self.actual_amount > self.planned_amount

    @property
    def status(self):
        if self.is_over_budget:
            return 'over'
        elif self.actual_amount >= self.planned_amount * Decimal('0.9'):
            return 'warning'
        else:
            return 'good'

class BudgetTransaction(models.Model):
    """
    Links transactions to budget items for automatic tracking
    """
    budget_item = models.ForeignKey(BudgetItem, on_delete=models.CASCADE, related_name='transactions')
    transaction = models.ForeignKey('accounts.Transaction', on_delete=models.CASCADE, related_name='budget_items')

    # How much of this transaction applies to this budget item
    amount_applied = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])

    # Auto-detected or manually assigned
    auto_assigned = models.BooleanField(default=True)

    # Notes
    notes = models.TextField(blank=True)

    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ['budget_item', 'transaction']
        ordering = ['-created_at']

    def __str__(self):
        return f"Transaction link: {self.transaction} → {self.budget_item}"

class BudgetAlert(models.Model):
    """
    Alerts and notifications for budget status
    """
    ALERT_TYPES = [
        ('over_budget', 'Over Budget'),
        ('budget_warning', 'Budget Warning'),
        ('goal_achieved', 'Goal Achieved'),
        ('milestone', 'Milestone Reached'),
        ('period_end', 'Period Ending'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='budget_alerts')
    budget = models.ForeignKey(Budget, on_delete=models.CASCADE, related_name='alerts')
    budget_item = models.ForeignKey(BudgetItem, on_delete=models.CASCADE, null=True, blank=True, related_name='alerts')

    alert_type = models.CharField(max_length=20, choices=ALERT_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()

    # Status
    is_read = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    # Additional data
    threshold_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    current_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Alert: {self.user} - {self.title}"

    def mark_as_read(self):
        self.is_read = True
        self.save()
