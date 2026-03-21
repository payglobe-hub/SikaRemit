import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from django.db.models import Sum, Count, Avg, Q
from django.utils import timezone
from django.contrib.auth import get_user_model

from accounts.models import Transaction
from payments.models.currency import Currency
from .analytics_service import AnalyticsService

User = get_user_model()
logger = logging.getLogger(__name__)

class AIFinancialAdvisorService:
    """
    AI-powered financial advisor service that provides personalized insights,
    spending analysis, and financial recommendations based on user behavior.
    """

    def __init__(self):
        self.analytics_service = AnalyticsService()

    def get_financial_insights(self, user, days: int = 90) -> Dict[str, Any]:
        """
        Generate comprehensive financial insights for a user
        """
        try:
            # Get transaction data
            transactions = self._get_user_transactions(user, days)

            if not transactions.exists():
                return self._get_empty_insights_response()

            insights = {
                'overview': self._generate_overview_insights(user, transactions, days),
                'spending_analysis': self._analyze_spending_patterns(transactions),
                'recommendations': self._generate_recommendations(user, transactions),
                'predictions': self._generate_financial_predictions(user, transactions),
                'goals_progress': self._analyze_goals_progress(user),
                'risk_assessment': self._assess_financial_risk(user, transactions),
                'generated_at': timezone.now(),
                'analysis_period_days': days
            }

            return insights

        except Exception as e:
            logger.error(f"Error generating financial insights for user {user.id}: {str(e)}")
            return self._get_error_response(str(e))

    def _get_user_transactions(self, user, days: int):
        """Get user's transactions for analysis period"""
        start_date = timezone.now() - timedelta(days=days)
        return Transaction.objects.filter(
            Q(sender__user=user) | Q(recipient__user=user),
            created_at__gte=start_date
        ).select_related('sender', 'recipient')

    def _generate_overview_insights(self, user, transactions, days: int) -> Dict[str, Any]:
        """Generate high-level financial overview"""
        # Calculate total income and expenses
        income = transactions.filter(recipient__user=user).aggregate(
            total=Sum('amount'))['total'] or 0

        expenses = transactions.filter(sender__user=user).aggregate(
            total=Sum('amount'))['total'] or 0

        net_flow = income - expenses

        # Calculate averages
        daily_avg = net_flow / days if days > 0 else 0
        monthly_avg = daily_avg * 30

        # Transaction frequency
        transaction_count = transactions.count()
        avg_transactions_per_day = transaction_count / days if days > 0 else 0

        return {
            'total_income': float(income),
            'total_expenses': float(expenses),
            'net_flow': float(net_flow),
            'daily_average': float(daily_avg),
            'monthly_average': float(monthly_avg),
            'total_transactions': transaction_count,
            'avg_transactions_per_day': float(avg_transactions_per_day),
            'analysis_period_days': days
        }

    def _analyze_spending_patterns(self, transactions) -> Dict[str, Any]:
        """Analyze spending patterns and categorize expenses"""
        # Group transactions by category (simplified categorization)
        spending_categories = {}
        income_categories = {}

        for transaction in transactions:
            amount = float(transaction.amount)
            category = self._categorize_transaction(transaction)

            if transaction.sender.user == transactions.first().sender.user:  # Expense
                spending_categories[category] = spending_categories.get(category, 0) + amount
            else:  # Income
                income_categories[category] = income_categories.get(category, 0) + amount

        # Calculate percentages
        total_spending = sum(spending_categories.values())
        total_income = sum(income_categories.values())

        spending_breakdown = {}
        for category, amount in spending_categories.items():
            spending_breakdown[category] = {
                'amount': amount,
                'percentage': (amount / total_spending * 100) if total_spending > 0 else 0
            }

        # Identify top spending categories
        top_categories = sorted(spending_breakdown.items(),
                              key=lambda x: x[1]['amount'], reverse=True)[:5]

        # Detect unusual spending patterns
        unusual_patterns = self._detect_unusual_patterns(transactions)

        return {
            'spending_breakdown': spending_breakdown,
            'top_spending_categories': top_categories,
            'unusual_patterns': unusual_patterns,
            'total_spending': total_spending,
            'total_income': total_income
        }

    def _categorize_transaction(self, transaction) -> str:
        """Simple transaction categorization based on description and type"""
        description = (transaction.description or '').lower()
        transaction_type = transaction.transaction_type

        # Basic categorization logic
        if 'food' in description or 'restaurant' in description or 'dining' in description:
            return 'Food & Dining'
        elif 'transport' in description or 'taxi' in description or 'uber' in description:
            return 'Transportation'
        elif 'shopping' in description or 'retail' in description:
            return 'Shopping'
        elif 'utility' in description or 'electric' in description or 'water' in description:
            return 'Utilities'
        elif 'entertainment' in description or 'movie' in description or 'game' in description:
            return 'Entertainment'
        elif transaction_type == 'remittance':
            return 'Money Transfers'
        elif transaction_type == 'bill_payment':
            return 'Bill Payments'
        elif 'salary' in description or 'income' in description:
            return 'Income'
        else:
            return 'Other'

    def _detect_unusual_patterns(self, transactions) -> List[Dict[str, Any]]:
        """Detect unusual spending patterns"""
        patterns = []

        # Check for large transactions
        avg_amount = transactions.aggregate(avg=Avg('amount'))['avg'] or 0
        large_transactions = transactions.filter(amount__gt=avg_amount * 3)

        if large_transactions.exists():
            patterns.append({
                'type': 'large_transactions',
                'severity': 'medium',
                'message': f"Found {large_transactions.count()} unusually large transactions",
                'suggestion': "Review large transactions for potential savings opportunities"
            })

        # Check for frequent small transactions
        small_transactions = transactions.filter(amount__lt=avg_amount * 0.1)
        if small_transactions.count() > len(transactions) * 0.3:
            patterns.append({
                'type': 'frequent_small_spending',
                'severity': 'low',
                'message': "High frequency of small transactions detected",
                'suggestion': "Consider consolidating small purchases or using cash for micro-transactions"
            })

        return patterns

    def _generate_recommendations(self, user, transactions) -> List[Dict[str, Any]]:
        """Generate personalized financial recommendations"""
        recommendations = []

        # Analyze spending patterns for recommendations
        spending_analysis = self._analyze_spending_patterns(transactions)

        # Budget recommendations
        if spending_analysis['total_spending'] > spending_analysis['total_income'] * 0.9:
            recommendations.append({
                'type': 'budget_alert',
                'priority': 'high',
                'title': 'Spending exceeds 90% of income',
                'description': 'Your spending is very close to your income. Consider creating a budget.',
                'action': 'Create a monthly budget',
                'potential_savings': spending_analysis['total_spending'] * 0.1
            })

        # Top spending category analysis
        top_categories = spending_analysis.get('top_spending_categories', [])
        if top_categories:
            top_category = top_categories[0]
            category_name = top_category[0]
            category_data = top_category[1]

            if category_data['percentage'] > 30:
                recommendations.append({
                    'type': 'category_optimization',
                    'priority': 'medium',
                    'title': f'High spending in {category_name}',
                    'description': f'{category_name} accounts for {category_data["percentage"]:.1f}% of your spending.',
                    'action': f'Find ways to reduce {category_name.lower()} expenses',
                    'potential_savings': category_data['amount'] * 0.2
                })

        # Savings recommendations
        if spending_analysis['total_income'] > 0:
            savings_rate = (spending_analysis['total_income'] - spending_analysis['total_spending']) / spending_analysis['total_income']
            if savings_rate < 0.1:  # Less than 10% savings
                recommendations.append({
                    'type': 'savings_goal',
                    'priority': 'high',
                    'title': 'Low savings rate detected',
                    'description': f'Your current savings rate is {savings_rate*100:.1f}%. Aim for at least 20%.',
                    'action': 'Set up automatic savings transfers',
                    'potential_savings': spending_analysis['total_income'] * 0.1
                })

        # Round-up savings recommendation
        daily_spending = spending_analysis['total_spending'] / 90  # Assuming 90-day analysis
        round_up_potential = daily_spending * 0.5  # Average round-up
        if round_up_potential > 10:  # Worth recommending
            recommendations.append({
                'type': 'round_up_savings',
                'priority': 'low',
                'title': 'Enable round-up savings',
                'description': f'Round up transactions to save an average of ${round_up_potential:.2f} per day.',
                'action': 'Enable automatic round-up savings',
                'potential_savings': round_up_potential * 30
            })

        return recommendations[:5]  # Return top 5 recommendations

    def _generate_financial_predictions(self, user, transactions) -> Dict[str, Any]:
        """Generate financial predictions and projections"""
        # Simple linear projections based on recent trends
        recent_transactions = transactions.order_by('-created_at')[:30]  # Last 30 transactions

        if len(recent_transactions) < 10:
            return {'available': False, 'reason': 'Insufficient transaction history'}

        # Calculate trend
        amounts = [float(t.amount) for t in recent_transactions]
        avg_recent = sum(amounts) / len(amounts)

        # Simple trend analysis (positive = increasing spending)
        trend = 'stable'
        if len(amounts) >= 10:
            first_half = sum(amounts[:5]) / 5
            second_half = sum(amounts[5:]) / 5
            if second_half > first_half * 1.1:
                trend = 'increasing'
            elif second_half < first_half * 0.9:
                trend = 'decreasing'

        # Monthly projection
        monthly_projection = avg_recent * 30

        return {
            'available': True,
            'monthly_spending_projection': monthly_projection,
            'spending_trend': trend,
            'confidence_level': 'medium',  # Based on data quality
            'next_month_prediction': {
                'estimated_spending': monthly_projection,
                'range': [monthly_projection * 0.8, monthly_projection * 1.2]
            }
        }

    def _analyze_goals_progress(self, user) -> Dict[str, Any]:
        """Analyze progress towards financial goals"""
        # This would integrate with a goals system
        # For now, return placeholder structure
        return {
            'goals_set': 0,
            'goals_achieved': 0,
            'goals_in_progress': 0,
            'total_saved_towards_goals': 0,
            'recommendations': []
        }

    def _assess_financial_risk(self, user, transactions) -> Dict[str, Any]:
        """Assess overall financial risk level"""
        # Simple risk assessment based on spending patterns
        spending_analysis = self._analyze_spending_patterns(transactions)

        risk_score = 50  # Base score

        # Adjust based on factors
        if spending_analysis['total_spending'] > spending_analysis['total_income']:
            risk_score += 30  # Overspending

        if spending_analysis['unusual_patterns']:
            risk_score += 15  # Unusual patterns

        # Determine risk level
        if risk_score < 30:
            risk_level = 'low'
            risk_description = 'Your financial patterns appear stable and healthy.'
        elif risk_score < 70:
            risk_level = 'medium'
            risk_description = 'Some areas could benefit from attention.'
        else:
            risk_level = 'high'
            risk_description = 'Consider reviewing your spending patterns.'

        return {
            'risk_score': min(risk_score, 100),
            'risk_level': risk_level,
            'description': risk_description,
            'factors': spending_analysis['unusual_patterns']
        }

    def _get_empty_insights_response(self) -> Dict[str, Any]:
        """Return response when no transaction data is available"""
        return {
            'overview': {
                'total_income': 0,
                'total_expenses': 0,
                'net_flow': 0,
                'message': 'No transaction data available yet'
            },
            'spending_analysis': {
                'spending_breakdown': {},
                'top_spending_categories': [],
                'unusual_patterns': [],
                'total_spending': 0,
                'total_income': 0
            },
            'recommendations': [{
                'type': 'welcome',
                'priority': 'info',
                'title': 'Welcome to AI Financial Advisor!',
                'description': 'Start making transactions to receive personalized financial insights.',
                'action': 'Make your first transaction'
            }],
            'predictions': {'available': False, 'reason': 'No transaction history'},
            'goals_progress': self._analyze_goals_progress(None),
            'risk_assessment': {
                'risk_score': 0,
                'risk_level': 'unknown',
                'description': 'Insufficient data for risk assessment'
            },
            'generated_at': timezone.now()
        }

    def _get_error_response(self, error: str) -> Dict[str, Any]:
        """Return error response"""
        return {
            'error': error,
            'generated_at': timezone.now(),
            'recommendations': [{
                'type': 'error',
                'priority': 'high',
                'title': 'Unable to generate insights',
                'description': f'Error: {error}',
                'action': 'Try again later'
            }]
        }
