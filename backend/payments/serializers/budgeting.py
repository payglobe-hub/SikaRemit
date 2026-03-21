from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone

from .budgeting import (
    BudgetCategory, Budget, BudgetItem, BudgetTransaction, BudgetAlert
)

User = get_user_model()

class BudgetCategorySerializer(serializers.ModelSerializer):
    """Serializer for budget categories"""
    class Meta:
        model = BudgetCategory
        fields = [
            'id', 'name', 'description', 'category_type', 'icon', 'color',
            'is_default', 'is_active'
        ]

class BudgetItemSerializer(serializers.ModelSerializer):
    """Serializer for budget items"""
    category = BudgetCategorySerializer(read_only=True)
    category_id = serializers.IntegerField(write_only=True)

    # Computed fields
    remaining_amount = serializers.ReadOnlyField()
    percentage_used = serializers.ReadOnlyField()
    is_over_budget = serializers.ReadOnlyField()
    status = serializers.ReadOnlyField()

    class Meta:
        model = BudgetItem
        fields = [
            'id', 'budget', 'category', 'category_id', 'planned_amount',
            'actual_amount', 'notes', 'remaining_amount', 'percentage_used',
            'is_over_budget', 'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'remaining_amount',
                          'percentage_used', 'is_over_budget', 'status']

class BudgetSerializer(serializers.ModelSerializer):
    """Serializer for budgets"""
    items = BudgetItemSerializer(many=True, read_only=True)

    # Computed fields
    income_percentage = serializers.ReadOnlyField()
    expense_percentage = serializers.ReadOnlyField()
    savings_percentage = serializers.ReadOnlyField()
    is_over_budget = serializers.ReadOnlyField()
    is_income_on_track = serializers.ReadOnlyField()
    is_savings_on_track = serializers.ReadOnlyField()
    days_remaining = serializers.ReadOnlyField()
    days_elapsed = serializers.ReadOnlyField()
    progress_percentage = serializers.ReadOnlyField()

    class Meta:
        model = Budget
        fields = [
            'id', 'name', 'description', 'budget_type', 'frequency', 'start_date',
            'end_date', 'total_income_target', 'total_expense_limit', 'total_savings_target',
            'current_income', 'current_expenses', 'current_savings', 'is_active',
            'auto_track_transactions', 'alert_threshold', 'items', 'income_percentage',
            'expense_percentage', 'savings_percentage', 'is_over_budget',
            'is_income_on_track', 'is_savings_on_track', 'days_remaining',
            'days_elapsed', 'progress_percentage', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'current_income', 'current_expenses', 'current_savings',
            'income_percentage', 'expense_percentage', 'savings_percentage',
            'is_over_budget', 'is_income_on_track', 'is_savings_on_track',
            'days_remaining', 'days_elapsed', 'progress_percentage',
            'created_at', 'updated_at'
        ]

class BudgetCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating budgets"""
    categories = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        help_text="List of categories with category_id and planned_amount"
    )

    class Meta:
        model = Budget
        fields = [
            'name', 'description', 'budget_type', 'frequency', 'start_date',
            'end_date', 'total_income_target', 'total_expense_limit',
            'total_savings_target', 'is_active', 'auto_track_transactions',
            'alert_threshold', 'categories'
        ]

    def validate(self, data):
        """Validate budget dates and financial targets"""
        start_date = data.get('start_date')
        end_date = data.get('end_date')

        if start_date and end_date and start_date >= end_date:
            raise serializers.ValidationError("End date must be after start date")

        return data

class BudgetAlertSerializer(serializers.ModelSerializer):
    """Serializer for budget alerts"""
    budget = BudgetSerializer(read_only=True)
    budget_item = BudgetItemSerializer(read_only=True)

    class Meta:
        model = BudgetAlert
        fields = [
            'id', 'budget', 'budget_item', 'alert_type', 'title', 'message',
            'is_read', 'is_active', 'threshold_value', 'current_value',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']

class BudgetReportSerializer(serializers.Serializer):
    """Serializer for budget reports"""
    budget_id = serializers.IntegerField()
    budget_name = serializers.CharField()
    period = serializers.CharField()
    progress = serializers.DictField()
    financial_summary = serializers.DictField()
    status = serializers.DictField()
    category_breakdown = serializers.ListField()

class BudgetAnalyticsSerializer(serializers.Serializer):
    """Serializer for budget analytics"""
    period = serializers.DictField()
    summary = serializers.DictField()
    totals = serializers.DictField()
    alerts = serializers.IntegerField()
