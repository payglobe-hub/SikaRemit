from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import models
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
from datetime import datetime, timedelta
import uuid

from accounts.models import Transaction
from .models.budgeting import (
    BudgetCategory, Budget, BudgetItem, BudgetTransaction, BudgetAlert
)
from .serializers.budgeting import (
    BudgetCategorySerializer, BudgetSerializer, BudgetCreateSerializer,
    BudgetItemSerializer, BudgetAlertSerializer
)

# Budget Categories
class BudgetCategoryViewSet(generics.ListAPIView):
    """
    List available budget categories
    """
    permission_classes = [IsAuthenticated]
    serializer_class = BudgetCategorySerializer
    pagination_class = None

    def get_queryset(self):
        category_type = self.request.query_params.get('type')
        queryset = BudgetCategory.objects.filter(is_active=True)

        if category_type:
            queryset = queryset.filter(category_type=category_type)

        return queryset.order_by('category_type', 'name')

# Budgets
class BudgetViewSet(ModelViewSet):
    """
    ViewSet for managing budgets
    """
    permission_classes = [IsAuthenticated]
    serializer_class = BudgetSerializer

    def get_queryset(self):
        return Budget.objects.filter(user=self.request.user).prefetch_related(
            'items__category', 'alerts'
        )

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return BudgetCreateSerializer
        return BudgetSerializer

    def perform_create(self, serializer):
        with transaction.atomic():
            budget = serializer.save(user=self.request.user)

            # Create budget items based on the categories provided
            categories_data = self.request.data.get('categories', [])
            for category_data in categories_data:
                category_id = category_data.get('category_id')
                planned_amount = category_data.get('planned_amount', 0)

                try:
                    category = BudgetCategory.objects.get(id=category_id)
                    BudgetItem.objects.create(
                        budget=budget,
                        category=category,
                        planned_amount=planned_amount
                    )
                except BudgetCategory.DoesNotExist:
                    continue

    @action(detail=True, methods=['post'])
    def add_transaction(self, request, pk=None):
        """Manually add a transaction to a budget item"""
        budget = self.get_object()
        transaction_id = request.data.get('transaction_id')
        budget_item_id = request.data.get('budget_item_id')
        amount = request.data.get('amount')

        if not all([transaction_id, budget_item_id, amount]):
            return Response(
                {'error': 'transaction_id, budget_item_id, and amount are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            budget_item = BudgetItem.objects.get(
                id=budget_item_id,
                budget=budget
            )
            transaction_obj = get_object_or_404(
                Transaction,
                id=transaction_id,
                sender__user=request.user
            )

            # Create budget transaction link
            BudgetTransaction.objects.create(
                budget_item=budget_item,
                transaction=transaction_obj,
                amount_applied=amount,
                auto_assigned=False
            )

            # Update budget item actual amount
            budget_item.actual_amount += amount
            budget_item.save()

            # Update budget totals
            budget.current_expenses += amount
            budget.save()

            serializer = BudgetSerializer(budget)
            return Response(serializer.data)

        except BudgetItem.DoesNotExist:
            return Response(
                {'error': 'Budget item not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def generate_report(self, request, pk=None):
        """Generate a budget performance report"""
        budget = self.get_object()

        report = {
            'budget_id': budget.id,
            'budget_name': budget.name,
            'period': f"{budget.start_date} to {budget.end_date}",
            'progress': {
                'percentage': budget.progress_percentage,
                'days_remaining': budget.days_remaining,
                'days_elapsed': budget.days_elapsed,
            },
            'financial_summary': {
                'income_target': budget.total_income_target,
                'income_actual': budget.current_income,
                'income_percentage': budget.income_percentage,
                'expense_limit': budget.total_expense_limit,
                'expense_actual': budget.current_expenses,
                'expense_percentage': budget.expense_percentage,
                'savings_target': budget.total_savings_target,
                'savings_actual': budget.current_savings,
                'savings_percentage': budget.savings_percentage,
            },
            'status': {
                'is_over_budget': budget.is_over_budget,
                'is_income_on_track': budget.is_income_on_track,
                'is_savings_on_track': budget.is_savings_on_track,
            },
            'category_breakdown': [
                {
                    'category': item.category.name,
                    'planned': item.planned_amount,
                    'actual': item.actual_amount,
                    'remaining': item.remaining_amount,
                    'percentage_used': item.percentage_used,
                    'status': item.status,
                }
                for item in budget.items.all()
            ]
        }

        return Response(report)

# Budget Items
class BudgetItemViewSet(ModelViewSet):
    """
    ViewSet for managing individual budget items
    """
    permission_classes = [IsAuthenticated]
    serializer_class = BudgetItemSerializer

    def get_queryset(self):
        budget_id = self.request.query_params.get('budget_id')
        if budget_id:
            return BudgetItem.objects.filter(
                budget__user=self.request.user,
                budget_id=budget_id
            ).select_related('budget', 'category')
        return BudgetItem.objects.filter(
            budget__user=self.request.user
        ).select_related('budget', 'category')

    def perform_create(self, serializer):
        budget_id = self.request.data.get('budget_id')
        budget = get_object_or_404(Budget, id=budget_id, user=self.request.user)
        serializer.save(budget=budget)

# Budget Alerts
class BudgetAlertViewSet(generics.ListAPIView):
    """
    List budget alerts for the user
    """
    permission_classes = [IsAuthenticated]
    serializer_class = BudgetAlertSerializer

    def get_queryset(self):
        return BudgetAlert.objects.filter(
            user=self.request.user,
            is_active=True
        ).select_related('budget', 'budget_item').order_by('-created_at')

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark an alert as read"""
        alert = self.get_object()
        alert.mark_as_read()
        serializer = self.get_serializer(alert)
        return Response(serializer.data)

# Utility APIs
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def budget_analytics(request):
    """
    Get overall budget analytics for the user
    ---
    parameters:
      - name: period
        type: string
        enum: [month, quarter, year]
        default: month
        description: Analysis period
    """
    period = request.query_params.get('period', 'month')

    # Calculate date range
    now = timezone.now().date()
    if period == 'month':
        start_date = now.replace(day=1)
        end_date = (start_date + timedelta(days=32)).replace(day=1) - timedelta(days=1)
    elif period == 'quarter':
        quarter = (now.month - 1) // 3 + 1
        start_month = (quarter - 1) * 3 + 1
        start_date = now.replace(month=start_month, day=1)
        end_month = quarter * 3
        end_date = now.replace(month=end_month, day=1) + timedelta(days=32)
        end_date = end_date.replace(day=1) - timedelta(days=1)
    else:  # year
        start_date = now.replace(month=1, day=1)
        end_date = now.replace(month=12, day=31)

    # Get user's budgets for the period
    budgets = Budget.objects.filter(
        user=request.user,
        start_date__lte=end_date,
        end_date__gte=start_date
    )

    analytics = {
        'period': {
            'start': start_date,
            'end': end_date,
            'type': period,
        },
        'summary': {
            'total_budgets': budgets.count(),
            'active_budgets': budgets.filter(is_active=True).count(),
            'over_budget_count': budgets.filter(current_expenses__gt=models.F('total_expense_limit')).count(),
            'on_track_count': budgets.filter(
                current_income__gte=models.F('total_income_target') * 0.8,
                current_expenses__lte=models.F('total_expense_limit')
            ).count(),
        },
        'totals': {
            'planned_income': budgets.aggregate(total=models.Sum('total_income_target'))['total'] or 0,
            'actual_income': budgets.aggregate(total=models.Sum('current_income'))['total'] or 0,
            'planned_expenses': budgets.aggregate(total=models.Sum('total_expense_limit'))['total'] or 0,
            'actual_expenses': budgets.aggregate(total=models.Sum('current_expenses'))['total'] or 0,
            'planned_savings': budgets.aggregate(total=models.Sum('total_savings_target'))['total'] or 0,
            'actual_savings': budgets.aggregate(total=models.Sum('current_savings'))['total'] or 0,
        },
        'alerts': BudgetAlert.objects.filter(
            user=request.user,
            created_at__date__range=[start_date, end_date],
            is_active=True
        ).count(),
    }

    return Response(analytics)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_default_budget(request):
    """
    Create a default monthly budget with common categories
    ---
    parameters:
      - name: name
        type: string
        required: true
        description: Budget name
      - name: income_target
        type: number
        required: true
        description: Monthly income target
      - name: start_date
        type: string
        format: date
        description: Budget start date (defaults to current month)
    """
    name = request.data.get('name', 'Monthly Budget')
    income_target = request.data.get('income_target')
    start_date_str = request.data.get('start_date')

    if not income_target:
        return Response(
            {'error': 'income_target is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Calculate date range
    if start_date_str:
        start_date = datetime.fromisoformat(start_date_str).date()
    else:
        today = timezone.now().date()
        start_date = today.replace(day=1)

    # Calculate end date (last day of month)
    if start_date.month == 12:
        end_date = start_date.replace(year=start_date.year + 1, month=1, day=1) - timedelta(days=1)
    else:
        end_date = start_date.replace(month=start_date.month + 1, day=1) - timedelta(days=1)

    # Calculate expense limit (80% of income) and savings target (20%)
    expense_limit = float(income_target) * 0.8
    savings_target = float(income_target) * 0.2

    with transaction.atomic():
        # Create budget
        budget = Budget.objects.create(
            user=request.user,
            name=name,
            budget_type='monthly',
            frequency='monthly',
            start_date=start_date,
            end_date=end_date,
            total_income_target=income_target,
            total_expense_limit=expense_limit,
            total_savings_target=savings_target,
        )

        # Add default categories
        default_categories = BudgetCategory.objects.filter(is_default=True, is_active=True)

        for category in default_categories:
            # Suggest amounts based on category type
            if category.category_type == 'expense':
                planned_amount = expense_limit * 0.15  # Distribute expenses across categories
            elif category.category_type == 'saving':
                planned_amount = savings_target * 0.5
            else:  # income
                planned_amount = float(income_target) * 0.8

            BudgetItem.objects.create(
                budget=budget,
                category=category,
                planned_amount=planned_amount,
            )

    serializer = BudgetSerializer(budget)
    return Response(serializer.data, status=status.HTTP_201_CREATED)
