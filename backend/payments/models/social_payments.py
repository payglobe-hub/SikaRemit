from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator
from decimal import Decimal

User = get_user_model()

class PaymentRequest(models.Model):
    """
    Model for requesting payments from other users
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('cancelled', 'Cancelled'),
        ('expired', 'Expired'),
    ]

    requester = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payment_requests_sent')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payment_requests_received')

    amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    currency = models.CharField(max_length=3, default='USD')

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Optional payment method preference
    preferred_payment_method = models.CharField(max_length=50, blank=True)

    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    due_date = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    # Link to actual transaction if paid
    transaction = models.ForeignKey('accounts.Transaction', null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['requester', 'status']),
            models.Index(fields=['recipient', 'status']),
            models.Index(fields=['status', 'due_date']),
        ]

    def __str__(self):
        return f"Payment request: {self.requester} → {self.recipient} (${self.amount})"

    @property
    def is_overdue(self):
        if self.due_date and self.status == 'pending':
            return timezone.now() > self.due_date
        return False

    @property
    def days_until_due(self):
        if self.due_date:
            return (self.due_date - timezone.now()).days
        return None

class SplitBill(models.Model):
    """
    Model for splitting bills among multiple people
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('settled', 'Settled'),
        ('cancelled', 'Cancelled'),
    ]

    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='split_bills_created')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    total_amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    currency = models.CharField(max_length=3, default='USD')

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    # Split configuration
    split_type = models.CharField(max_length=20, choices=[
        ('equal', 'Equal Split'),
        ('custom', 'Custom Amounts'),
        ('percentage', 'Percentage Split'),
    ], default='equal')

    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    settled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Split bill: {self.title} (${self.total_amount}) by {self.creator}"

    @property
    def total_paid(self):
        return sum(payment.amount for payment in self.payments.all())

    @property
    def is_fully_paid(self):
        return self.total_paid >= self.total_amount

    def settle_bill(self):
        """Mark bill as settled"""
        self.status = 'settled'
        self.settled_at = timezone.now()
        self.save()

class SplitParticipant(models.Model):
    """
    Participants in a split bill with their share amounts
    """
    split_bill = models.ForeignKey(SplitBill, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='split_participations')

    # Amount this participant owes
    amount_owed = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(Decimal('0'))])

    # Amount actually paid
    amount_paid = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))

    # Status
    is_settled = models.BooleanField(default=False)
    settled_at = models.DateTimeField(null=True, blank=True)

    # Notes
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ['split_bill', 'user']
        ordering = ['split_bill', 'user']

    def __str__(self):
        return f"{self.user} in {self.split_bill.title}: ${self.amount_owed}"

    @property
    def amount_remaining(self):
        return self.amount_owed - self.amount_paid

    @property
    def is_paid_in_full(self):
        return self.amount_paid >= self.amount_owed

    def mark_as_paid(self, payment_amount=None):
        """Mark participant as fully paid"""
        if payment_amount:
            self.amount_paid += payment_amount
        else:
            self.amount_paid = self.amount_owed

        if self.is_paid_in_full and not self.is_settled:
            self.is_settled = True
            self.settled_at = timezone.now()

        self.save()

class SplitPayment(models.Model):
    """
    Individual payments made towards a split bill
    """
    split_bill = models.ForeignKey(SplitBill, on_delete=models.CASCADE, related_name='payments')
    payer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='split_payments_made')

    amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    currency = models.CharField(max_length=3, default='USD')

    # Description of what this payment covers
    description = models.CharField(max_length=200, blank=True)

    # Link to the actual transaction
    transaction = models.ForeignKey('accounts.Transaction', null=True, blank=True, on_delete=models.SET_NULL)

    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Split payment: {self.payer} paid ${self.amount} for {self.split_bill.title}"

class GroupSavings(models.Model):
    """
    Model for group savings goals where multiple people contribute
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('expired', 'Expired'),
    ]

    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='group_savings_created')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    # Savings goal
    target_amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    currency = models.CharField(max_length=3, default='USD')

    # Current progress
    current_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))

    # Timeline
    target_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    # Settings
    is_public = models.BooleanField(default=True)  # Can others see and join
    allow_auto_contributions = models.BooleanField(default=False)

    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Group savings: {self.title} (${self.current_amount}/${self.target_amount})"

    @property
    def progress_percentage(self):
        if self.target_amount > 0:
            return min((self.current_amount / self.target_amount) * 100, 100)
        return 0

    @property
    def days_remaining(self):
        if self.target_date:
            return max((self.target_date - timezone.now().date()).days, 0)
        return None

    @property
    def is_completed(self):
        return self.current_amount >= self.target_amount

    @property
    def is_expired(self):
        return timezone.now().date() > self.target_date and not self.is_completed

    def add_contribution(self, user, amount, transaction=None):
        """Add a contribution to the group savings"""
        contribution = GroupSavingsContribution.objects.create(
            group_savings=self,
            contributor=user,
            amount=amount,
            transaction=transaction
        )

        self.current_amount += amount
        self.save()

        # Check if goal is completed
        if self.is_completed and self.status == 'active':
            self.status = 'completed'
            self.completed_at = timezone.now()
            self.save()

        return contribution

class GroupSavingsParticipant(models.Model):
    """
    Participants in group savings goals
    """
    group_savings = models.ForeignKey(GroupSavings, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='group_savings_participations')

    # Contribution settings
    contribution_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    contribution_frequency = models.CharField(max_length=20, choices=[
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('manual', 'Manual Only'),
    ], default='manual')

    # Total contributed by this participant
    total_contributed = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))

    # Role in the group
    role = models.CharField(max_length=20, choices=[
        ('member', 'Member'),
        ('admin', 'Admin'),
    ], default='member')

    # Status
    is_active = models.BooleanField(default=True)
    joined_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ['group_savings', 'user']
        ordering = ['group_savings', 'joined_at']

    def __str__(self):
        return f"{self.user} in {self.group_savings.title} ({self.role})"

class GroupSavingsContribution(models.Model):
    """
    Individual contributions to group savings goals
    """
    group_savings = models.ForeignKey(GroupSavings, on_delete=models.CASCADE, related_name='contributions')
    contributor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='group_savings_contributions')

    amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    currency = models.CharField(max_length=3, default='USD')

    # Optional message with the contribution
    message = models.CharField(max_length=200, blank=True)

    # Link to transaction if it was a payment
    transaction = models.ForeignKey('accounts.Transaction', null=True, blank=True, on_delete=models.SET_NULL)

    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Contribution: {self.contributor} added ${self.amount} to {self.group_savings.title}"

class SocialPaymentInvite(models.Model):
    """
    Invitations sent to non-users for social payments
    """
    INVITE_TYPE_CHOICES = [
        ('payment_request', 'Payment Request'),
        ('split_bill', 'Split Bill'),
        ('group_savings', 'Group Savings'),
    ]

    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='social_invites_sent')

    # Recipient info (for non-registered users)
    recipient_email = models.EmailField()
    recipient_phone = models.CharField(max_length=20, blank=True)

    invite_type = models.CharField(max_length=20, choices=INVITE_TYPE_CHOICES)
    related_object_id = models.PositiveIntegerField()  # ID of the related object

    # Invite details
    title = models.CharField(max_length=200)
    message = models.TextField(blank=True)

    # Status
    status = models.CharField(max_length=20, choices=[
        ('sent', 'Sent'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
        ('expired', 'Expired'),
    ], default='sent')

    # Token for secure acceptance
    invite_token = models.CharField(max_length=100, unique=True)
    expires_at = models.DateTimeField()

    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['invite_token']),
            models.Index(fields=['recipient_email', 'status']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"Invite: {self.sender} → {self.recipient_email} ({self.invite_type})"

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at
