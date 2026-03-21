from django.db import models
from django.conf import settings
from .transaction import Transaction

class Dispute(models.Model):
    OPEN = 'open'
    UNDER_REVIEW = 'under_review'
    RESOLVED = 'resolved'
    CLOSED = 'closed'
    MERCHANT_RESPONSE = 'merchant_response'
    PENDING_ESCALATION = 'pending_escalation'

    STATUS_CHOICES = [
        (OPEN, 'Open'),
        (UNDER_REVIEW, 'Under Review'),
        (MERCHANT_RESPONSE, 'Awaiting Merchant Response'),
        (PENDING_ESCALATION, 'Pending Escalation'),
        (RESOLVED, 'Resolved'),
        (CLOSED, 'Closed'),
    ]

    # Dispute types for multi-tier system
    CUSTOMER_MERCHANT = 'customer_merchant'
    MERCHANT_ADMIN = 'merchant_admin'
    CUSTOMER_ADMIN = 'customer_admin'

    DISPUTE_TYPE_CHOICES = [
        (CUSTOMER_MERCHANT, 'Customer vs Merchant'),
        (MERCHANT_ADMIN, 'Merchant vs Admin'),
        (CUSTOMER_ADMIN, 'Customer vs Admin'),
    ]

    transaction = models.OneToOneField(Transaction, on_delete=models.CASCADE, related_name='dispute')
    dispute_type = models.CharField(max_length=20, choices=DISPUTE_TYPE_CHOICES, default=CUSTOMER_MERCHANT)
    reason = models.TextField(help_text="Reason for the dispute")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=OPEN)
    resolution = models.TextField(null=True, blank=True, help_text="Resolution details")

    # Customer-merchant dispute fields
    merchant_response = models.TextField(null=True, blank=True, help_text="Merchant's response to dispute")
    merchant_responded_at = models.DateTimeField(null=True, blank=True)
    merchant_resolution = models.TextField(null=True, blank=True, help_text="Merchant's resolution details")
    merchant_resolved_at = models.DateTimeField(null=True, blank=True)
    
    # Escalation tracking
    escalated_to_admin = models.BooleanField(default=False)
    escalated_at = models.DateTimeField(null=True, blank=True)
    escalation_reason = models.TextField(blank=True, help_text="Reason for escalation to admin")
    
    # Customer satisfaction
    customer_satisfied = models.BooleanField(null=True, blank=True)
    customer_feedback = models.TextField(blank=True, help_text="Customer feedback on resolution")

    # Tracking
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='created_disputes')
    resolved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name='resolved_disputes')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Dispute for Transaction {self.transaction.id}"

    def resolve(self, admin_user, resolution_text):
        """Resolve the dispute"""
        from django.utils import timezone

        self.status = self.RESOLVED
        self.resolution = resolution_text
        self.resolved_by = admin_user
        self.resolved_at = timezone.now()
        self.save()

    def close(self, admin_user):
        """Close the dispute without resolution"""
        from django.utils import timezone

        self.status = self.CLOSED
        self.resolved_by = admin_user
        self.resolved_at = timezone.now()
        self.save()

    def merchant_respond(self, response_text):
        """Merchant responds to dispute"""
        from django.utils import timezone

        self.merchant_response = response_text
        self.merchant_responded_at = timezone.now()
        self.status = self.UNDER_REVIEW
        self.save()

    def merchant_resolve(self, resolution_text, merchant_user):
        """Merchant resolves the dispute"""
        from django.utils import timezone

        self.merchant_resolution = resolution_text
        self.merchant_resolved_at = timezone.now()
        self.status = self.RESOLVED
        self.resolved_by = merchant_user
        self.resolved_at = timezone.now()
        self.resolution = f"[MERCHANT RESOLVED] {resolution_text}"
        self.save()

    def escalate_to_admin(self, escalation_reason):
        """Escalate dispute to admin"""
        from django.utils import timezone

        self.escalated_to_admin = True
        self.escalated_at = timezone.now()
        self.escalation_reason = escalation_reason
        self.status = self.PENDING_ESCALATION
        self.save()

    def provide_customer_feedback(self, satisfied, feedback_text):
        """Customer provides feedback on resolution"""
        self.customer_satisfied = satisfied
        self.customer_feedback = feedback_text
        if satisfied:
            self.status = self.CLOSED
        self.save()

    @property
    def is_customer_merchant_dispute(self):
        """Check if this is a customer-merchant dispute"""
        return self.dispute_type == self.CUSTOMER_MERCHANT

    @property
    def is_escalated(self):
        """Check if dispute is escalated to admin"""
        return self.escalated_to_admin

    @property
    def merchant(self):
        """Get the merchant from transaction"""
        return self.transaction.merchant

    @property
    def customer(self):
        """Get the customer from transaction"""
        return self.transaction.customer

    @property
    def days_open(self):
        """Calculate how many days dispute has been open"""
        from django.utils import timezone
        if self.resolved_at:
            return (self.resolved_at - self.created_at).days
        return (timezone.now() - self.created_at).days
