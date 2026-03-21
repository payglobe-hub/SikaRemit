from payments.models.subscriptions import Subscription

class SubscriptionService:
    """Handles subscription business logic"""
    
    def create_subscription(self, customer, plan, payment_method):
        """Create a new subscription"""
        return Subscription.objects.create(
            customer=customer,
            plan=plan,
            payment_method=payment_method,
            status=Subscription.ACTIVE
        )
    
    def cancel_subscription(self, subscription):
        """Cancel an existing subscription"""
        subscription.status = Subscription.CANCELLED
        subscription.save()
        return subscription
    
    def renew_subscription(self, subscription):
        """Renew an expiring subscription"""
        if subscription.status != Subscription.ACTIVE:
            raise ValueError('Only active subscriptions can be renewed')
            
        # Update expiration date and save
        subscription.save()
        return subscription
