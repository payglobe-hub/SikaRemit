from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator
from decimal import Decimal
import uuid

User = get_user_model()

class ReferralCode(models.Model):
    """
    Unique referral codes that users can share with others
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='referral_code')
    code = models.CharField(max_length=20, unique=True, blank=True)
    is_active = models.BooleanField(default=True)

    # Usage tracking
    total_uses = models.PositiveIntegerField(default=0)
    successful_referrals = models.PositiveIntegerField(default=0)

    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user}'s referral code: {self.code}"

    def save(self, *args, **kwargs):
        # Generate unique code if not provided
        if not self.code:
            self.code = self._generate_unique_code()
        super().save(*args, **kwargs)

    def _generate_unique_code(self):
        """Generate a unique referral code"""
        while True:
            # Generate 8-character alphanumeric code
            code = str(uuid.uuid4())[:8].upper()
            if not ReferralCode.objects.filter(code=code).exists():
                return code

    @property
    def success_rate(self):
        """Calculate success rate of referrals"""
        if self.total_uses == 0:
            return 0
        return (self.successful_referrals / self.total_uses) * 100

    def increment_uses(self):
        """Increment total uses counter"""
        self.total_uses += 1
        self.save()

    def increment_successful_referrals(self):
        """Increment successful referrals counter"""
        self.successful_referrals += 1
        self.save()

class Referral(models.Model):
    """
    Tracks the relationship between referrer and referee
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),  # Referee signed up but hasn't completed verification
        ('qualified', 'Qualified'),  # Referee completed all requirements
        ('rewarded', 'Rewarded'),  # Both parties have received rewards
        ('expired', 'Expired'),  # Referral expired
        ('cancelled', 'Cancelled'),  # Referral was cancelled
    ]

    referrer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='referrals_made')
    referee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='referrals_received')

    referral_code = models.ForeignKey(ReferralCode, on_delete=models.CASCADE, related_name='referrals')

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Qualification tracking
    qualified_at = models.DateTimeField(null=True, blank=True)
    rewarded_at = models.DateTimeField(null=True, blank=True)

    # Requirements tracking
    has_completed_kyc = models.BooleanField(default=False)
    has_made_first_transaction = models.BooleanField(default=False)
    has_reached_transaction_threshold = models.BooleanField(default=False)

    # Referral source tracking
    referral_source = models.CharField(max_length=50, choices=[
        ('link', 'Referral Link'),
        ('code', 'Referral Code'),
        ('social', 'Social Media'),
        ('email', 'Email'),
        ('sms', 'SMS'),
    ], default='link')

    # Metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['referrer', 'referee']
        ordering = ['-created_at']

    def __str__(self):
        return f"Referral: {self.referrer} → {self.referee} ({self.status})"

    @property
    def is_qualified(self):
        """Check if referral meets all qualification criteria"""
        return (
            self.has_completed_kyc and
            self.has_made_first_transaction and
            self.has_reached_transaction_threshold
        )

    @property
    def days_since_created(self):
        """Calculate days since referral was created"""
        return (timezone.now() - self.created_at).days

    @property
    def is_expired(self):
        """Check if referral has expired (30 days)"""
        return self.days_since_created > 30

    def check_qualification(self):
        """Check and update qualification status"""
        if self.is_qualified and self.status == 'pending':
            self.status = 'qualified'
            self.qualified_at = timezone.now()
            self.save()

            # Increment successful referrals for the referrer's code
            self.referral_code.increment_successful_referrals()

            # Trigger reward creation
            self._create_rewards()

    def _create_rewards(self):
        """Create rewards for both referrer and referee"""
        # Referrer reward
        referrer_reward = Reward.objects.create(
            user=self.referrer,
            reward_type='referral_bonus',
            amount=Decimal('10.00'),  # $10 bonus
            description=f'Referral bonus for {self.referee.get_full_name() or self.referee.email}',
            metadata={'referral_id': self.id, 'referee_id': self.referee.id}
        )

        # Referee reward
        referee_reward = Reward.objects.create(
            user=self.referee,
            reward_type='signup_bonus',
            amount=Decimal('5.00'),  # $5 welcome bonus
            description='Welcome bonus for joining via referral',
            metadata={'referral_id': self.id, 'referrer_id': self.referrer.id}
        )

        # Mark referral as rewarded
        self.status = 'rewarded'
        self.rewarded_at = timezone.now()
        self.save()

class Reward(models.Model):
    """
    Rewards that users can earn through referrals and other activities
    """
    REWARD_TYPES = [
        ('referral_bonus', 'Referral Bonus'),
        ('signup_bonus', 'Signup Bonus'),
        ('transaction_bonus', 'Transaction Bonus'),
        ('loyalty_points', 'Loyalty Points'),
        ('cashback', 'Cashback'),
        ('premium_feature', 'Premium Feature Access'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('available', 'Available'),
        ('redeemed', 'Redeemed'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='rewards')
    reward_type = models.CharField(max_length=20, choices=REWARD_TYPES)

    # Reward value
    amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    points = models.PositiveIntegerField(null=True, blank=True)

    # Description and metadata
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    # Status and validity
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    is_redeemable = models.BooleanField(default=True)

    # Validity period
    expires_at = models.DateTimeField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    redeemed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Reward: {self.user} - {self.title} ({self.status})"

    @property
    def is_expired(self):
        """Check if reward has expired"""
        return self.expires_at and timezone.now() > self.expires_at

    @property
    def days_until_expiry(self):
        """Calculate days until expiry"""
        if self.expires_at:
            return max((self.expires_at - timezone.now()).days, 0)
        return None

    def make_available(self):
        """Make reward available for redemption"""
        if self.status == 'pending':
            self.status = 'available'
            self.save()

    def redeem(self, transaction=None):
        """Redeem the reward"""
        if self.status != 'available':
            raise ValueError("Reward is not available for redemption")

        self.status = 'redeemed'
        self.redeemed_at = timezone.now()
        self.save()

        # Create reward transaction record
        RewardTransaction.objects.create(
            reward=self,
            transaction=transaction,
            redeemed_amount=self.amount,
            redeemed_points=self.points
        )

        return self

class RewardTransaction(models.Model):
    """
    Records of reward redemptions and usages
    """
    TRANSACTION_TYPES = [
        ('redemption', 'Reward Redemption'),
        ('expiry', 'Reward Expiry'),
        ('transfer', 'Reward Transfer'),
        ('adjustment', 'Manual Adjustment'),
    ]

    reward = models.ForeignKey(Reward, on_delete=models.CASCADE, related_name='transactions')
    transaction = models.ForeignKey(
        'accounts.Transaction',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reward_transactions'
    )

    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES, default='redemption')

    # Amounts
    redeemed_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    redeemed_points = models.PositiveIntegerField(null=True, blank=True)

    # Description
    notes = models.TextField(blank=True)

    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Reward Transaction: {self.reward} - {self.transaction_type}"

class ReferralCampaign(models.Model):
    """
    Manages different referral campaigns and their rules
    """
    CAMPAIGN_TYPES = [
        ('signup', 'User Signup'),
        ('transaction', 'First Transaction'),
        ('milestone', 'Milestone Achievement'),
        ('seasonal', 'Seasonal Campaign'),
    ]

    name = models.CharField(max_length=200)
    campaign_type = models.CharField(max_length=20, choices=CAMPAIGN_TYPES, default='signup')

    # Reward configuration
    referrer_reward_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('10.00'))
    referee_reward_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('5.00'))

    # Campaign settings
    is_active = models.BooleanField(default=True)
    max_rewards_per_user = models.PositiveIntegerField(default=50)  # Prevent abuse
    min_transaction_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('1.00'))

    # Qualification criteria
    require_kyc = models.BooleanField(default=True)
    require_transaction = models.BooleanField(default=True)
    transaction_threshold = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('50.00'))

    # Campaign period
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField(null=True, blank=True)

    # Statistics
    total_referrals = models.PositiveIntegerField(default=0)
    successful_referrals = models.PositiveIntegerField(default=0)
    total_rewards_given = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))

    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Campaign: {self.name} ({'Active' if self.is_active else 'Inactive'})"

    @property
    def is_expired(self):
        """Check if campaign has expired"""
        return self.end_date and timezone.now() > self.end_date

    @property
    def success_rate(self):
        """Calculate campaign success rate"""
        if self.total_referrals == 0:
            return 0
        return (self.successful_referrals / self.total_referrals) * 100

    def can_user_participate(self, user):
        """Check if user can participate in this campaign"""
        if not self.is_active or self.is_expired:
            return False

        # Check max rewards limit
        user_rewards = Reward.objects.filter(
            user=user,
            metadata__campaign_id=self.id,
            status__in=['available', 'redeemed']
        ).count()

        return user_rewards < self.max_rewards_per_user

    def process_successful_referral(self, referral):
        """Process a successful referral for this campaign"""
        # Create rewards for both parties
        referrer_reward = Reward.objects.create(
            user=referral.referrer,
            reward_type='referral_bonus',
            amount=self.referrer_reward_amount,
            title=f'Referral Bonus - {self.name}',
            description=f'Bonus for referring {referral.referee.get_full_name() or referral.referee.email}',
            metadata={'campaign_id': self.id, 'referral_id': referral.id},
            expires_at=timezone.now() + timezone.timedelta(days=90)  # 90 days expiry
        )

        referee_reward = Reward.objects.create(
            user=referral.referee,
            reward_type='signup_bonus',
            amount=self.referee_reward_amount,
            title=f'Welcome Bonus - {self.name}',
            description='Welcome bonus for joining via referral program',
            metadata={'campaign_id': self.id, 'referral_id': referral.id},
            expires_at=timezone.now() + timezone.timedelta(days=90)
        )

        # Update campaign statistics
        self.successful_referrals += 1
        self.total_rewards_given += self.referrer_reward_amount + self.referee_reward_amount
        self.save()

        return referrer_reward, referee_reward
