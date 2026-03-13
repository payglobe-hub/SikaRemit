from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework.views import APIView

from .ai_financial_advisor_service import AIFinancialAdvisorService


class FinancialInsightsView(APIView):
    """
    API endpoint for AI-powered financial insights and recommendations
    """
    permission_classes = [IsAuthenticated]

    @method_decorator(cache_page(60 * 15))  # Cache for 15 minutes
    def get(self, request):
        """
        Get comprehensive financial insights for the authenticated user
        ---
        parameters:
          - name: days
            type: integer
            default: 90
            description: Number of days to analyze (30, 90, 180, 365)
        responses:
          200:
            description: Financial insights and recommendations
          400:
            description: Invalid parameters
        """
        try:
            days = int(request.query_params.get('days', 90))

            # Validate days parameter
            if days not in [30, 90, 180, 365]:
                return Response(
                    {'error': 'Invalid days parameter. Must be 30, 90, 180, or 365'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Generate insights
            advisor_service = AIFinancialAdvisorService()
            insights = advisor_service.get_financial_insights(request.user, days)

            return Response(insights)

        except ValueError as e:
            return Response(
                {'error': 'Invalid days parameter'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to generate insights: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def spending_patterns(request):
    """
    Get detailed spending pattern analysis
    ---
    parameters:
      - name: category
        type: string
        description: Filter by spending category
      - name: days
        type: integer
        default: 90
        description: Analysis period in days
    responses:
      200:
        description: Detailed spending pattern analysis
    """
    try:
        days = int(request.query_params.get('days', 90))
        category_filter = request.query_params.get('category')

        advisor_service = AIFinancialAdvisorService()
        insights = advisor_service.get_financial_insights(request.user, days)

        spending_data = insights.get('spending_analysis', {})

        # Filter by category if specified
        if category_filter:
            breakdown = spending_data.get('spending_breakdown', {})
            if category_filter in breakdown:
                spending_data = {
                    'category': category_filter,
                    'data': breakdown[category_filter]
                }
            else:
                return Response(
                    {'error': f'Category "{category_filter}" not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

        return Response(spending_data)

    except Exception as e:
        return Response(
            {'error': f'Failed to get spending patterns: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def financial_recommendations(request):
    """
    Get personalized financial recommendations
    ---
    parameters:
      - name: priority
        type: string
        enum: [high, medium, low]
        description: Filter by recommendation priority
      - name: limit
        type: integer
        default: 5
        description: Maximum number of recommendations to return
    responses:
      200:
        description: Personalized financial recommendations
    """
    try:
        priority_filter = request.query_params.get('priority')
        limit = int(request.query_params.get('limit', 5))

        advisor_service = AIFinancialAdvisorService()
        insights = advisor_service.get_financial_insights(request.user)

        recommendations = insights.get('recommendations', [])

        # Filter by priority if specified
        if priority_filter:
            recommendations = [
                rec for rec in recommendations
                if rec.get('priority') == priority_filter
            ]

        # Limit results
        recommendations = recommendations[:limit]

        return Response({
            'recommendations': recommendations,
            'total_available': len(insights.get('recommendations', [])),
            'filtered_count': len(recommendations)
        })

    except Exception as e:
        return Response(
            {'error': f'Failed to get recommendations: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def financial_predictions(request):
    """
    Get financial predictions and projections
    ---
    responses:
      200:
        description: Financial predictions and projections
    """
    try:
        advisor_service = AIFinancialAdvisorService()
        insights = advisor_service.get_financial_insights(request.user)

        predictions = insights.get('predictions', {})

        return Response(predictions)

    except Exception as e:
        return Response(
            {'error': f'Failed to get predictions: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def financial_health_score(request):
    """
    Get overall financial health score and assessment
    ---
    responses:
      200:
        description: Financial health assessment
    """
    try:
        advisor_service = AIFinancialAdvisorService()
        insights = advisor_service.get_financial_insights(request.user)

        health_data = {
            'overall_score': insights.get('risk_assessment', {}).get('risk_score', 0),
            'risk_level': insights.get('risk_assessment', {}).get('risk_level', 'unknown'),
            'description': insights.get('risk_assessment', {}).get('description', ''),
            'key_metrics': {
                'monthly_net_flow': insights.get('overview', {}).get('monthly_average', 0),
                'savings_rate': self._calculate_savings_rate(insights),
                'transaction_frequency': insights.get('overview', {}).get('avg_transactions_per_day', 0),
            },
            'recommendations': insights.get('recommendations', [])[:3],  # Top 3 recommendations
            'generated_at': insights.get('generated_at')
        }

        return Response(health_data)

    except Exception as e:
        return Response(
            {'error': f'Failed to calculate health score: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    def _calculate_savings_rate(self, insights):
        """Calculate savings rate from insights"""
        overview = insights.get('overview', {})
        income = overview.get('total_income', 0)
        expenses = overview.get('total_expenses', 0)

        if income == 0:
            return 0

        return ((income - expenses) / income) * 100


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_financial_goal(request):
    """
    Save a financial goal for tracking
    ---
    parameters:
      - name: name
        type: string
        required: true
        description: Goal name
      - name: target_amount
        type: number
        required: true
        description: Target amount to save
      - name: target_date
        type: string
        format: date
        description: Target completion date
      - name: category
        type: string
        enum: [emergency_fund, vacation, car, home, education, retirement]
        description: Goal category
    responses:
      201:
        description: Goal saved successfully
      400:
        description: Invalid goal data
    """
    try:
        from payments.models.budgeting import Budget
        from decimal import Decimal
        from datetime import datetime

        name = request.data.get('name')
        target_amount = request.data.get('target_amount')
        target_date = request.data.get('target_date')
        category = request.data.get('category', 'savings')

        if not name or not target_amount:
            return Response(
                {'error': 'name and target_amount are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Parse target_date or default to 1 year from now
        if target_date:
            end_date = datetime.strptime(target_date, '%Y-%m-%d').date()
        else:
            end_date = (timezone.now() + timezone.timedelta(days=365)).date()

        goal = Budget.objects.create(
            user=request.user,
            name=name,
            description=f"Financial goal: {category}",
            budget_type='custom',
            frequency='monthly',
            start_date=timezone.now().date(),
            end_date=end_date,
            total_savings_target=Decimal(str(target_amount)),
            total_income_target=Decimal('0'),
            total_expense_limit=Decimal('0'),
            is_active=True,
        )

        goal_data = {
            'id': goal.id,
            'name': goal.name,
            'target_amount': float(goal.total_savings_target),
            'current_amount': float(goal.current_savings),
            'target_date': goal.end_date.isoformat(),
            'category': category,
            'progress_percentage': float(goal.savings_percentage),
            'created_at': goal.created_at.isoformat(),
        }

        return Response(goal_data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response(
            {'error': f'Failed to save goal: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
