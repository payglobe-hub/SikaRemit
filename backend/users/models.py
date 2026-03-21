from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils.translation import gettext_lazy as _
from django.core.validators import MaxValueValidator
import uuid
from shared.constants import (
    USER_TYPE_CHOICES, USER_TYPE_SUPER_ADMIN, USER_TYPE_BUSINESS_ADMIN, USER_TYPE_OPERATIONS_ADMIN, USER_TYPE_VERIFICATION_ADMIN, USER_TYPE_MERCHANT, USER_TYPE_CUSTOMER,
    KYC_DOCUMENT_TYPES, KYC_DOCUMENT_STATUS_CHOICES, KYC_STATUS_CHOICES,
    MERCHANT_CUSTOMER_STATUS_CHOICES, PRIORITY_CHOICES,
    STATUS_PENDING, KYC_STATUS_NOT_STARTED, KYC_STATUS_APPROVED, KYC_STATUS_REJECTED,
    KYC_STATUS_IN_PROGRESS, KYC_STATUS_PENDING_REVIEW, KYC_STATUS_NOT_REQUIRED,
)

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        extra_fields.setdefault('username', email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    # Override email to make it unique since it's used as USERNAME_FIELD
    email = models.EmailField(unique=True)
    
    user_type = models.PositiveSmallIntegerField(choices=USER_TYPE_CHOICES, default=USER_TYPE_CUSTOMER)
    
    objects = CustomUserManager()
    phone = models.CharField(max_length=20, blank=True)
    is_verified = models.BooleanField(default=False)
    verification_token = models.UUIDField(default=uuid.uuid4, editable=False)
    biometric_data = models.JSONField(default=dict)  # {face_match: {}, liveness: {}}
    verification_level = models.PositiveSmallIntegerField(
        default=0,
        validators=[MaxValueValidator(3)]  # 0=unverified, 3=fully verified
    )
    last_biometric_verify = models.DateTimeField(null=True)
    auth_provider = models.CharField(max_length=20, default='email')
    social_id = models.CharField(max_length=255, blank=True)
    mfa_secret = models.CharField(max_length=100, blank=True)
    mfa_enabled = models.BooleanField(default=False)
    mfa_backup_codes = models.JSONField(default=list)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']
    
    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')

    def __str__(self):
        return self.email
    
    @property
    def is_admin(self):
        """Check if user is an admin"""
        return self.user_type in [USER_TYPE_SUPER_ADMIN, USER_TYPE_BUSINESS_ADMIN, USER_TYPE_OPERATIONS_ADMIN, USER_TYPE_VERIFICATION_ADMIN]
    
    @property
    def is_merchant(self):
        """Check if user is a merchant"""
        return self.user_type == USER_TYPE_MERCHANT
    
    @property
    def is_customer(self):
        """Check if user is a customer"""
        return self.user_type == USER_TYPE_CUSTOMER
    
    @property
    def role(self):
        """Get string representation of user role"""
        role_mapping = {
            USER_TYPE_SUPER_ADMIN: 'super_admin',
            USER_TYPE_BUSINESS_ADMIN: 'business_admin',
            USER_TYPE_OPERATIONS_ADMIN: 'operations_admin',
            USER_TYPE_VERIFICATION_ADMIN: 'verification_admin',
            USER_TYPE_MERCHANT: 'merchant',
            USER_TYPE_CUSTOMER: 'customer'
        }
        return role_mapping.get(self.user_type, 'customer')

class KYCDocument(models.Model):
    """
    Primary KYC Document model for user identity verification.
    Note: The kyc app's KYCDocument model is deprecated - use this one.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='kyc_documents')
    document_type = models.CharField(max_length=20, choices=KYC_DOCUMENT_TYPES)
    front_image = models.ImageField(upload_to='kyc/')
    back_image = models.ImageField(upload_to='kyc/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=KYC_DOCUMENT_STATUS_CHOICES, default=STATUS_PENDING)
    reviewed_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name='reviewed_kycs')
    reviewed_at = models.DateTimeField(null=True)
    rejection_reason = models.TextField(blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    is_expired = models.BooleanField(default=False)
    last_checked = models.DateTimeField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    risk_score = models.FloatField(default=0.0)
    scan_data = models.JSONField(default=dict)
    
    def __str__(self):
        return f"{self.get_document_type_display()} - {self.user.email}"

class Merchant(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='merchant_profile')
    business_name = models.CharField(max_length=255)
    tax_id = models.CharField(max_length=50)
    bank_account_number = models.CharField(max_length=50, blank=True)
    is_approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name='approved_merchants')
    approved_at = models.DateTimeField(null=True)
    
    # Payment specialization fields
    is_biller = models.BooleanField(default=False)
    is_subscription_provider = models.BooleanField(default=False)
    is_remittance_agent = models.BooleanField(default=False)
    
    # Biller specific fields
    biller_code = models.CharField(max_length=50, blank=True)
    biller_category = models.CharField(max_length=50, blank=True)
    
    # Subscription provider fields
    subscription_terms = models.TextField(blank=True)
    
    # Remittance agent fields
    remittance_license = models.CharField(max_length=100, blank=True)
    supported_countries = models.JSONField(default=list)
    
    def __str__(self):
        return self.business_name

class Customer(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='customer_profile')
    date_of_birth = models.DateField(null=True, blank=True)

    # KYC Status Tracking for Lazy Verification
    kyc_status = models.CharField(
        max_length=15,
        choices=KYC_STATUS_CHOICES,
        default=KYC_STATUS_NOT_STARTED,
        help_text="KYC verification status for lazy verification flow"
    )
    kyc_started_at = models.DateTimeField(null=True, blank=True, help_text="When user first initiated KYC")
    kyc_completed_at = models.DateTimeField(null=True, blank=True, help_text="When KYC was completed")
    kyc_last_attempt = models.DateTimeField(null=True, blank=True, help_text="Last KYC attempt timestamp")

    # Transaction Blocking (for lazy verification)
    first_transaction_attempt = models.DateTimeField(null=True, blank=True, help_text="First time user tried to make a transaction")
    transaction_attempts_count = models.PositiveIntegerField(default=0, help_text="Number of transaction attempts before KYC")

    # Legacy field (keeping for compatibility)
    kyc_verified = models.BooleanField(default=False)
    kyc_verified_at = models.DateTimeField(null=True)

    address = models.JSONField(default=dict)  # {street, city, country, postal_code}

    # Notification preferences
    email_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=False)
    push_notifications = models.BooleanField(default=True)
    transaction_alerts = models.BooleanField(default=True)
    security_alerts = models.BooleanField(default=True)
    marketing_emails = models.BooleanField(default=False)
    low_balance_alert = models.BooleanField(default=True)
    balance_threshold = models.DecimalField(max_digits=12, decimal_places=2, default=100.00)

    class Meta:
        indexes = [
            models.Index(fields=['kyc_status']),
            models.Index(fields=['first_transaction_attempt']),
            models.Index(fields=['kyc_started_at']),
        ]

    def __str__(self):
        return f"{self.user.email} (KYC: {self.get_kyc_status_display()})"

    @property
    def can_make_transactions(self):
        """Check if user can perform financial transactions"""
        return self.kyc_status in [KYC_STATUS_APPROVED, KYC_STATUS_NOT_REQUIRED]

    @property
    def needs_kyc_verification(self):
        """Check if user needs to complete KYC to make transactions"""
        return self.kyc_status in [KYC_STATUS_NOT_STARTED, KYC_STATUS_IN_PROGRESS, KYC_STATUS_PENDING_REVIEW, KYC_STATUS_REJECTED]

    @property
    def is_kyc_pending_review(self):
        """Check if KYC is under review"""
        return self.kyc_status == KYC_STATUS_PENDING_REVIEW

    @property
    def is_kyc_approved(self):
        """Check if KYC is fully approved"""
        return self.kyc_status == KYC_STATUS_APPROVED

    def record_transaction_attempt(self):
        """Record when user attempts to make a transaction"""
        from django.utils import timezone

        if not self.first_transaction_attempt:
            self.first_transaction_attempt = timezone.now()
        self.transaction_attempts_count += 1
        self.save(update_fields=['first_transaction_attempt', 'transaction_attempts_count'])

    def start_kyc_process(self):
        """Mark KYC process as started"""
        from django.utils import timezone

        if self.kyc_status == KYC_STATUS_NOT_STARTED:
            self.kyc_status = KYC_STATUS_IN_PROGRESS
            self.kyc_started_at = timezone.now()
            self.save(update_fields=['kyc_status', 'kyc_started_at'])

    def complete_kyc(self, approved=True):
        """Complete KYC process"""
        from django.utils import timezone

        self.kyc_completed_at = timezone.now()
        self.kyc_verified = approved  # Legacy compatibility
        self.kyc_verified_at = self.kyc_completed_at if approved else None

        if approved:
            self.kyc_status = KYC_STATUS_APPROVED
        else:
            self.kyc_status = KYC_STATUS_REJECTED

        self.save(update_fields=[
            'kyc_status', 'kyc_completed_at',
            'kyc_verified', 'kyc_verified_at'
        ])

    def update_kyc_status(self, new_status, notes=None):
        """Update KYC status with optional notes"""
        from django.utils import timezone

        valid_statuses = [choice[0] for choice in KYC_STATUS_CHOICES]
        if new_status not in valid_statuses:
            raise ValueError(f"Invalid KYC status: {new_status}")

        self.kyc_status = new_status
        self.kyc_last_attempt = timezone.now()

        if new_status == KYC_STATUS_APPROVED:
            self.kyc_completed_at = timezone.now()
            self.kyc_verified = True
            self.kyc_verified_at = self.kyc_completed_at
        elif new_status == KYC_STATUS_REJECTED:
            self.kyc_completed_at = timezone.now()
            self.kyc_verified = False

        self.save()

class MerchantCustomer(models.Model):
    """
    Merchant's end-customers they onboard and manage.
    This is the primary MerchantCustomer model - the one in merchants app is deprecated.
    """
    merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name='users_merchant_customers')
    customer = models.OneToOneField(Customer, on_delete=models.CASCADE, related_name='merchant_relationship')
    onboarded_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=MERCHANT_CUSTOMER_STATUS_CHOICES, default='active')
    kyc_required = models.BooleanField(default=True)
    kyc_status = models.CharField(max_length=20, choices=KYC_STATUS_CHOICES, default=KYC_STATUS_NOT_STARTED)
    kyc_completed_at = models.DateTimeField(null=True, blank=True)
    risk_score = models.FloatField(default=0.0)
    risk_level = models.CharField(max_length=20, default='low')
    last_kyc_check = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    
    # Suspension tracking
    suspended_at = models.DateTimeField(null=True, blank=True)
    suspended_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name='suspended_merchant_customers')
    suspension_reason = models.TextField(blank=True)
    
    class Meta:
        unique_together = ['merchant', 'customer']
        ordering = ['-onboarded_at']
        indexes = [
            models.Index(fields=['merchant', 'status']),
            models.Index(fields=['merchant', 'kyc_status']),
            models.Index(fields=['status', 'kyc_status']),
        ]
    
    def __str__(self):
        return f"{self.merchant.business_name} - {self.customer.user.email}"
    
    @property
    def is_active(self):
        return self.status == 'active'
    
    @property
    def kyc_passed(self):
        return self.kyc_status in [KYC_STATUS_APPROVED, KYC_STATUS_NOT_REQUIRED]
    
    @property
    def needs_admin_review(self):
        return self.kyc_status == KYC_STATUS_PENDING_REVIEW

class MerchantKYCSubmission(models.Model):
    """KYC submissions for merchant's customers that need admin review"""
    KYC_SUBMISSION_STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending Review'),
        (KYC_STATUS_APPROVED, 'Approved'),
        (KYC_STATUS_REJECTED, 'Rejected'),
        ('escalated', 'Escalated'),
    ]
    
    merchant_customer = models.ForeignKey(MerchantCustomer, on_delete=models.CASCADE, related_name='kyc_submissions')
    kyc_document = models.ForeignKey(KYCDocument, on_delete=models.CASCADE, related_name='merchant_submissions')
    submitted_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=KYC_SUBMISSION_STATUS_CHOICES, default=STATUS_PENDING)
    
    # Admin review
    reviewed_by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name='reviewed_merchant_kyc')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    admin_notes = models.TextField(blank=True)
    review_priority = models.CharField(max_length=20, default='normal', choices=PRIORITY_CHOICES)
    
    # Escalation tracking
    escalated_at = models.DateTimeField(null=True, blank=True)
    escalation_reason = models.TextField(blank=True)
    
    # Risk assessment
    risk_score = models.FloatField(default=0.0)
    risk_factors = models.JSONField(default=list)
    compliance_flags = models.JSONField(default=list)
    
    class Meta:
        ordering = ['-submitted_at']
        indexes = [
            models.Index(fields=['status', 'submitted_at']),
            models.Index(fields=['merchant_customer', 'status']),
            models.Index(fields=['review_priority', 'submitted_at']),
        ]
    
    def __str__(self):
        return f"KYC Review: {self.merchant_customer} - {self.status}"
    
    @property
    def is_pending(self):
        return self.status == STATUS_PENDING
    
    @property
    def days_pending(self):
        if self.status != STATUS_PENDING:
            return 0
        from django.utils import timezone
        return (timezone.now() - self.submitted_at).days
