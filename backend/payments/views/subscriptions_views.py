from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
from django.core.exceptions import ValidationError
from decimal import Decimal
from datetime import datetime, timedelta

from ..models.subscriptions import (
    SubscriptionPlan, Subscription, SubscriptionPayment,
    SubscriptionUsage, SubscriptionFeature, PlanFeature,
    SubscriptionDiscount
)
from ..serializers.subscriptions import (
    SubscriptionPlanSerializer, SubscriptionSerializer,
    SubscriptionCreateSerializer, SubscriptionPaymentSerializer,
    SubscriptionUsageSerializer, SubscriptionFeatureSerializer,
    SubscriptionAnalyticsSerializer
)

# Subscription Plans
class SubscriptionPlanViewSet(generics.ListAPIView):
    """
    ViewSet for viewing subscription plans
    """
    permission_classes = [IsAuthenticated]
    serializer_class = SubscriptionPlanSerializer
    pagination_class = None

    def get_queryset(self):
        plan_type = self.request.query_params.get('type')
        queryset = SubscriptionPlan.objects.filter(is_active=True)

        if plan_type:
            queryset = queryset.filter(plan_type=plan_type)

        return queryset.order_by('display_order', 'price')

# User Subscriptions
class SubscriptionViewSet(ModelViewSet):
    """
    ViewSet for managing user subscriptions
    """
    permission_classes = [IsAuthenticated]
    serializer_class = SubscriptionSerializer

    def get_queryset(self):
        return Subscription.objects.filter(user=self.request.user).select_related(
            'plan', 'user'
        ).prefetch_related('payments', 'usage_records')

    def get_serializer_class(self):
        if self.action in ['create']:
            return SubscriptionCreateSerializer
        return SubscriptionSerializer

    def perform_create(self, serializer):
        with transaction.atomic():
            subscription = serializer.save(user=self.request.user)

            # If no trial, activate immediately
            if not subscription.plan.has_trial:
                subscription.activate()

            return subscription

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a subscription"""
        subscription = self.get_object()
        reason = request.data.get('reason', '')
        cancel_immediately = request.data.get('cancel_immediately', False)

        if subscription.user != request.user:
            return Response(
                {'error': 'You can only cancel your own subscriptions'},
                status=status.HTTP_403_FORBIDDEN
            )

        subscription.cancel(reason, cancel_immediately)
        serializer = self.get_serializer(subscription)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reactivate(self, request, pk=None):
        """Reactivate a canceled subscription"""
        subscription = self.get_object()

        if subscription.user != request.user:
            return Response(
                {'error': 'You can only reactivate your own subscriptions'},
                status=status.HTTP_403_FORBIDDEN
            )

        if subscription.status != 'canceled':
            return Response(
                {'error': 'Only canceled subscriptions can be reactivated'},
                status=status.HTTP_400_BAD_REQUEST
            )

        subscription.reactivate()
        serializer = self.get_serializer(subscription)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def change_plan(self, request, pk=None):
        """Change subscription plan"""
        subscription = self.get_object()
        new_plan_id = request.data.get('new_plan_id')
        prorate = request.data.get('prorate', True)

        if not new_plan_id:
            return Response(
                {'error': 'new_plan_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            new_plan = SubscriptionPlan.objects.get(id=new_plan_id, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            return Response(
                {'error': 'Plan not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Prevent changing to same plan
        if subscription.plan.id == new_plan.id:
            return Response(
                {'error': 'Already subscribed to this plan'},
                status=status.HTTP_400_BAD_REQUEST
            )

        old_plan = subscription.plan

        # Calculate prorated billing
        now = timezone.now()
        period_start = subscription.current_period_start
        period_end = subscription.current_period_end
        if period_start and period_end and period_end > period_start:
            total_days = (period_end - period_start).days or 1
            remaining_days = max((period_end - now).days, 0)
            # Credit for unused portion of old plan
            old_daily_rate = old_plan.price / total_days
            credit = old_daily_rate * remaining_days
            # Charge for remaining portion of new plan
            new_daily_rate = new_plan.price / total_days
            proration_charge = (new_daily_rate * remaining_days) - credit
        else:
            proration_charge = new_plan.price - old_plan.price

        subscription.plan = new_plan
        subscription.save()

        # If upgrading (positive charge), process payment
        if proration_charge > 0:
            proration_payment = SubscriptionPayment.objects.create(
                subscription=subscription,
                amount=proration_charge,
                currency=new_plan.currency,
                billing_period_start=now,
                billing_period_end=period_end,
                payment_method=subscription.payment_method_id,
            )
            try:
                import stripe
                from django.conf import settings
                stripe.api_key = settings.STRIPE_SECRET_KEY
                charge = stripe.PaymentIntent.create(
                    amount=int(proration_charge * 100),
                    currency=new_plan.currency.lower(),
                    payment_method=subscription.payment_method_id,
                    confirm=True,
                    automatic_payment_methods={'enabled': True, 'allow_redirects': 'never'},
                    metadata={'subscription_id': str(subscription.id), 'type': 'proration'},
                )
                try:
                    from django.db import transaction as db_transaction
                    with db_transaction.atomic():
                        proration_payment.mark_completed(charge.id)
                except Exception as db_err:
                    logger.error(f"DB save failed after proration charge, issuing refund: {db_err}")
                    try:
                        stripe.Refund.create(payment_intent=charge.id)
                    except Exception as refund_err:
                        logger.critical(
                            f"REFUND ALSO FAILED for proration charge {charge.id}, "
                            f"subscription={subscription.id}, "
                            f"amount={proration_charge}: {refund_err}"
                        )
                    proration_payment.status = 'failed'
                    proration_payment.save()
            except Exception as e:
                logger.error(f"Proration payment failed for subscription {subscription.id}: {e}")
                proration_payment.status = 'failed'
                proration_payment.save()

        return Response({
            'message': f'Plan changed from {old_plan.name} to {new_plan.name}',
            'proration_charge': float(proration_charge) if proration_charge > 0 else 0,
            'subscription': SubscriptionSerializer(subscription).data
        })

    @action(detail=True, methods=['get'])
    def usage(self, request, pk=None):
        """Get usage statistics for subscription"""
        subscription = self.get_object()

        usage_records = SubscriptionUsage.objects.filter(
            subscription=subscription,
            period_start__lte=timezone.now(),
            period_end__gte=timezone.now()
        ).select_related('feature')

        usage_data = []
        for usage in usage_records:
            usage_data.append({
                'feature': usage.feature.display_name,
                'current_usage': usage.current_usage,
                'limit': usage.limit,
                'percentage': usage.usage_percentage,
                'is_over_limit': usage.is_over_limit,
            })

        return Response({
            'subscription_id': subscription.id,
            'usage': usage_data,
        })

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Get subscription analytics for the user"""
        user = request.user

        subscriptions = Subscription.objects.filter(user=user)
        active_subscriptions = subscriptions.filter(status__in=['active', 'trial'])
        total_spent = SubscriptionPayment.objects.filter(
            subscription__user=user,
            status='completed'
        ).aggregate(total=models.Sum('amount'))['total'] or 0

        analytics = {
            'overview': {
                'total_subscriptions': subscriptions.count(),
                'active_subscriptions': active_subscriptions.count(),
                'total_spent': float(total_spent),
                'current_monthly_spend': self._calculate_monthly_spend(user),
            },
            'subscriptions': [
                {
                    'id': sub.id,
                    'plan_name': sub.plan.name,
                    'status': sub.status,
                    'current_period_end': sub.current_period_end,
                    'days_until_renewal': sub.days_until_next_billing,
                    'is_on_trial': sub.is_on_trial,
                    'trial_days_remaining': sub.trial_days_remaining,
                }
                for sub in subscriptions
            ],
            'billing_history': self._get_billing_history(user),
        }

        return Response(analytics)

    def _calculate_monthly_spend(self, user):
        """Calculate current monthly subscription spend"""
        thirty_days_ago = timezone.now() - timedelta(days=30)
        monthly_spent = SubscriptionPayment.objects.filter(
            subscription__user=user,
            status='completed',
            created_at__gte=thirty_days_ago
        ).aggregate(total=models.Sum('amount'))['total'] or 0

        return float(monthly_spent)

    def _get_billing_history(self, user, limit=10):
        """Get recent billing history"""
        payments = SubscriptionPayment.objects.filter(
            subscription__user=user
        ).select_related('subscription__plan').order_by('-created_at')[:limit]

        return [
            {
                'id': payment.id,
                'plan_name': payment.subscription.plan.name,
                'amount': float(payment.amount),
                'currency': payment.currency,
                'status': payment.status,
                'billing_period': f"{payment.billing_period_start.date()} - {payment.billing_period_end.date()}",
                'processed_at': payment.processed_at,
            }
            for payment in payments
        ]

# Subscription Payments
class SubscriptionPaymentViewSet(generics.ListAPIView):
    """
    ViewSet for viewing subscription payment history
    """
    permission_classes = [IsAuthenticated]
    serializer_class = SubscriptionPaymentSerializer

    def get_queryset(self):
        return SubscriptionPayment.objects.filter(
            subscription__user=self.request.user
        ).select_related('subscription__plan').order_by('-created_at')

# Subscription Usage
class SubscriptionUsageViewSet(generics.ListAPIView):
    """
    ViewSet for viewing subscription usage
    """
    permission_classes = [IsAuthenticated]
    serializer_class = SubscriptionUsageSerializer

    def get_queryset(self):
        subscription_id = self.request.query_params.get('subscription_id')
        if subscription_id:
            return SubscriptionUsage.objects.filter(
                subscription__user=self.request.user,
                subscription_id=subscription_id
            ).select_related('feature')
        return SubscriptionUsage.objects.filter(
            subscription__user=self.request.user
        ).select_related('feature')

# Utility APIs
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_subscription(request):
    """
    Create a new subscription with payment processing
    ---
    parameters:
      - name: plan_id
        type: integer
        required: true
      - name: payment_method_id
        type: string
        required: true
      - name: discount_code
        type: string
    """
    plan_id = request.data.get('plan_id')
    payment_method_id = request.data.get('payment_method_id')
    discount_code = request.data.get('discount_code')

    if not plan_id or not payment_method_id:
        return Response(
            {'error': 'plan_id and payment_method_id are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        plan = SubscriptionPlan.objects.get(id=plan_id, is_active=True)
    except SubscriptionPlan.DoesNotExist:
        return Response(
            {'error': 'Plan not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check if user already has this subscription
    existing_subscription = Subscription.objects.filter(
        user=request.user,
        plan=plan,
        status__in=['active', 'trial', 'pending']
    ).first()

    if existing_subscription:
        return Response(
            {'error': 'You already have an active subscription to this plan'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Apply discount if provided
    final_price = plan.price
    discount_applied = None

    if discount_code:
        try:
            discount = SubscriptionDiscount.objects.get(
                code__iexact=discount_code,
                is_active=True
            )

            if discount.can_apply_to_plan(plan) and discount.is_valid:
                final_price = discount.apply_discount(plan.price)
                discount_applied = discount
            else:
                return Response(
                    {'error': 'Invalid or expired discount code'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except SubscriptionDiscount.DoesNotExist:
            return Response(
                {'error': 'Discount code not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    with transaction.atomic():
        # Create subscription
        subscription = Subscription.objects.create(
            user=request.user,
            plan=plan,
            payment_method_id=payment_method_id,
            metadata={'discount_applied': discount_applied.id if discount_applied else None}
        )

        # Process initial payment if no trial
        if not plan.has_trial:
            # Create payment record
            payment = SubscriptionPayment.objects.create(
                subscription=subscription,
                amount=final_price,
                currency=plan.currency,
                billing_period_start=subscription.current_period_start,
                billing_period_end=subscription.current_period_end,
                payment_method=payment_method_id,
            )

            # Process payment through Stripe gateway
            try:
                import stripe
                from django.conf import settings as django_settings
                stripe.api_key = django_settings.STRIPE_SECRET_KEY
                payment_intent = stripe.PaymentIntent.create(
                    amount=int(final_price * 100),
                    currency=plan.currency.lower(),
                    payment_method=payment_method_id,
                    confirm=True,
                    automatic_payment_methods={'enabled': True, 'allow_redirects': 'never'},
                    metadata={
                        'subscription_id': str(subscription.id),
                        'plan_id': str(plan.id),
                        'type': 'subscription_initial',
                    },
                )
                try:
                    from django.db import transaction as db_transaction
                    with db_transaction.atomic():
                        payment.mark_completed(payment_intent.id)
                except Exception as db_err:
                    logger.error(f"DB save failed after subscription charge, issuing refund: {db_err}")
                    try:
                        stripe.Refund.create(payment_intent=payment_intent.id)
                    except Exception as refund_err:
                        logger.critical(
                            f"REFUND ALSO FAILED for subscription charge {payment_intent.id}, "
                            f"subscription={subscription.id}, "
                            f"amount={final_price}: {refund_err}"
                        )
                    payment.status = 'failed'
                    payment.save()
                    subscription.status = 'payment_failed'
                    subscription.save()
                    return Response(
                        {'error': 'Payment charged but recording failed. A refund has been initiated.'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
            except Exception as e:
                logger.error(f"Subscription payment failed: {e}")
                payment.status = 'failed'
                payment.save()
                subscription.status = 'payment_failed'
                subscription.save()
                return Response(
                    {'error': f'Payment failed: {str(e)}'},
                    status=status.HTTP_402_PAYMENT_REQUIRED
                )

            # Activate subscription
            subscription.activate()

            # Update discount usage
            if discount_applied:
                discount_applied.total_uses += 1
                discount_applied.save()

        serializer = SubscriptionSerializer(subscription)
        return Response({
            'message': 'Subscription created successfully',
            'subscription': serializer.data,
            'initial_payment': final_price if not plan.has_trial else 0,
            'trial_days': plan.trial_days if plan.has_trial else 0,
        })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def validate_discount_code(request):
    """
    Validate a discount code for a specific plan
    ---
    parameters:
      - name: code
        type: string
        required: true
      - name: plan_id
        type: integer
        required: true
    """
    code = request.data.get('code')
    plan_id = request.data.get('plan_id')

    if not code or not plan_id:
        return Response(
            {'error': 'code and plan_id are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        plan = SubscriptionPlan.objects.get(id=plan_id, is_active=True)
        discount = SubscriptionDiscount.objects.get(
            code__iexact=code,
            is_active=True
        )

        if not discount.can_apply_to_plan(plan):
            return Response(
                {'error': 'Discount code not applicable to this plan'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not discount.is_valid:
            return Response(
                {'error': 'Discount code is expired or invalid'},
                status=status.HTTP_400_BAD_REQUEST
            )

        original_price = plan.price
        discounted_price = discount.apply_discount(original_price)
        savings = original_price - discounted_price

        return Response({
            'valid': True,
            'discount': {
                'id': discount.id,
                'name': discount.name,
                'description': discount.description,
                'type': discount.discount_type,
                'value': float(discount.discount_value),
            },
            'pricing': {
                'original_price': float(original_price),
                'discounted_price': float(discounted_price),
                'savings': float(savings),
                'currency': plan.currency,
            }
        })

    except SubscriptionPlan.DoesNotExist:
        return Response(
            {'error': 'Plan not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except SubscriptionDiscount.DoesNotExist:
        return Response(
            {'error': 'Discount code not found'},
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def subscription_features(request):
    """
    Get available subscription features
    """
    features = SubscriptionFeature.objects.filter(is_active=True).order_by('name')

    serializer = SubscriptionFeatureSerializer(features, many=True)
    return Response({
        'features': serializer.data
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_feature_access(request):
    """
    Check if user has access to specific features
    ---
    parameters:
      - name: features
        type: array
        required: true
        description: List of feature names to check
    """
    feature_names = request.data.get('features', [])

    if not feature_names:
        return Response(
            {'error': 'features list is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = request.user
    results = {}

    for feature_name in feature_names:
        try:
            feature = SubscriptionFeature.objects.get(name=feature_name, is_active=True)

            # Check user's active subscriptions
            subscriptions = Subscription.objects.filter(
                user=user,
                status__in=['active', 'trial']
            ).select_related('plan')

            has_access = False
            usage_info = None

            for subscription in subscriptions:
                # Check if plan includes this feature
                plan_feature = PlanFeature.objects.filter(
                    plan=subscription.plan,
                    feature=feature
                ).first()

                if plan_feature and plan_feature.value:
                    has_access = True

                    # Get usage information if applicable
                    if feature.feature_type == 'limit':
                        usage = SubscriptionUsage.objects.filter(
                            subscription=subscription,
                            feature=feature,
                            period_start__lte=timezone.now(),
                            period_end__gte=timezone.now()
                        ).first()

                        if usage:
                            usage_info = {
                                'current': usage.current_usage,
                                'limit': usage.limit,
                                'percentage': usage.usage_percentage,
                                'is_over_limit': usage.is_over_limit,
                            }

                    break

            results[feature_name] = {
                'has_access': has_access,
                'usage': usage_info,
            }

        except SubscriptionFeature.DoesNotExist:
            results[feature_name] = {
                'has_access': False,
                'error': 'Feature not found'
            }

    return Response(results)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_usage(request):
    """
    Update usage for a subscription feature (called by system)
    ---
    parameters:
      - name: feature_name
        type: string
        required: true
      - name: amount
        type: integer
        default: 1
    """
    feature_name = request.data.get('feature_name')
    amount = request.data.get('amount', 1)

    if not feature_name:
        return Response(
            {'error': 'feature_name is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        feature = SubscriptionFeature.objects.get(name=feature_name, is_active=True)

        # Find user's active subscriptions that include this feature
        subscriptions = Subscription.objects.filter(
            user=request.user,
            status__in=['active', 'trial']
        ).select_related('plan')

        updated = False
        for subscription in subscriptions:
            plan_feature = PlanFeature.objects.filter(
                plan=subscription.plan,
                feature=feature
            ).first()

            if plan_feature and plan_feature.value:
                # Get or create usage record for current period
                usage, created = SubscriptionUsage.objects.get_or_create(
                    subscription=subscription,
                    feature=feature,
                    period_start=subscription.current_period_start,
                    period_end=subscription.current_period_end,
                    defaults={'limit': plan_feature.limit_value}
                )

                usage.increment_usage(amount)
                updated = True
                break

        if not updated:
            return Response(
                {'error': 'No active subscription with this feature'},
                status=status.HTTP_403_FORBIDDEN
            )

        return Response({
            'message': f'Usage updated for {feature_name}',
            'amount_added': amount
        })

    except SubscriptionFeature.DoesNotExist:
        return Response(
            {'error': 'Feature not found'},
            status=status.HTTP_404_NOT_FOUND
        )
