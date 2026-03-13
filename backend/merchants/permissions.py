from rest_framework import permissions
from payments.models.subscriptions import Subscription
from django.utils import timezone
from shared.constants import USER_TYPE_SUPER_ADMIN

class HasActiveSubscription(permissions.BasePermission):
    """Check if merchant has an active subscription with required tier"""
    message = 'You need an active subscription to perform this action'
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
            
        if request.user.user_type == USER_TYPE_SUPER_ADMIN:  # admin
            return True
            
        try:
            merchant = request.user.merchant_profile
            subscription = Subscription.objects.filter(
                merchant=merchant,
                is_active=True,
                end_date__gte=timezone.now()
            ).first()
            
            if not subscription:
                return False
                
            # Check view-specific requirements
            if hasattr(view, 'required_tier'):
                tier_order = [Subscription.BASIC, Subscription.STANDARD, Subscription.PREMIUM]
                return tier_order.index(subscription.tier) >= tier_order.index(view.required_tier)
                
            return True
        except:
            return False

class SubscriptionRequiredMixin:
    """Mixin to add subscription checks to views"""
    permission_classes = [permissions.IsAuthenticated, HasActiveSubscription]
