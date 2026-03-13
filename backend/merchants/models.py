from django.db import models
from django.conf import settings
from users.models import Merchant
import uuid

# ... existing models ...

# B2B Models for Enterprise Business Accounts
class BusinessAccount(models.Model):
    """
    Enterprise business account for B2B customers
    """
    ACCOUNT_TYPES = [
        ('enterprise', 'Enterprise'),
        ('corporate', 'Corporate'),
        ('sme', 'Small/Medium Enterprise'),
        ('government', 'Government'),
        ('ngo', 'Non-Governmental Organization'),
    ]

    ACCOUNT_TIERS = [
        ('starter', 'Starter'),
        ('professional', 'Professional'),
        ('enterprise', 'Enterprise'),
        ('custom', 'Custom'),
    ]

    # Basic Information
    business_name = models.CharField(max_length=255, unique=True)
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPES, default='sme')
    account_tier = models.CharField(max_length=20, choices=ACCOUNT_TIERS, default='starter')

    # Legal Information
    registration_number = models.CharField(max_length=100, blank=True)
    tax_id = models.CharField(max_length=100, blank=True)
    business_address = models.TextField()
    business_phone = models.CharField(max_length=20)
    business_email = models.EmailField()

    # Contact Person (Primary Admin)
    primary_contact = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='primary_business_accounts')

    # Business Details
    industry = models.CharField(max_length=100, blank=True)
    employee_count = models.PositiveIntegerField(blank=True, null=True)
    annual_revenue = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)

    # Account Settings
    is_active = models.BooleanField(default=True)
    credit_limit = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    payment_terms = models.CharField(max_length=50, default='net_30')  # net_15, net_30, net_60

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    activated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Business Account"
        verbose_name_plural = "Business Accounts"

    def __str__(self):
        return f"{self.business_name} ({self.get_account_type_display()})"

    @property
    def total_users(self):
        return self.business_users.count()

    @property
    def active_users(self):
        return self.business_users.filter(is_active=True).count()


class BusinessRole(models.Model):
    """
    Roles for business account users
    """
    ROLE_TYPES = [
        ('owner', 'Owner'),
        ('admin', 'Administrator'),
        ('manager', 'Manager'),
        ('accountant', 'Accountant'),
        ('approver', 'Approver'),
        ('employee', 'Employee'),
        ('viewer', 'Viewer'),
    ]

    business_account = models.ForeignKey(BusinessAccount, on_delete=models.CASCADE, related_name='roles')
    name = models.CharField(max_length=100)
    role_type = models.CharField(max_length=20, choices=ROLE_TYPES)

    # Permissions
    can_create_payments = models.BooleanField(default=False)
    can_approve_payments = models.BooleanField(default=False)
    can_manage_users = models.BooleanField(default=False)
    can_view_reports = models.BooleanField(default=True)
    can_manage_settings = models.BooleanField(default=False)

    # Approval Limits
    single_transaction_limit = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    daily_limit = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    monthly_limit = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    # Metadata
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['business_account', 'role_type']
        ordering = ['name']

    def __str__(self):
        return f"{self.business_account.business_name} - {self.name}"


class BusinessUser(models.Model):
    """
    Users within a business account
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('suspended', 'Suspended'),
        ('pending', 'Pending Approval'),
    ]

    business_account = models.ForeignKey(BusinessAccount, on_delete=models.CASCADE, related_name='business_users')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='business_memberships')
    role = models.ForeignKey(BusinessRole, on_delete=models.CASCADE, related_name='users')

    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    invited_at = models.DateTimeField(auto_now_add=True)
    joined_at = models.DateTimeField(blank=True, null=True)

    # Personal Information
    employee_id = models.CharField(max_length=50, blank=True)
    department = models.CharField(max_length=100, blank=True)
    position = models.CharField(max_length=100, blank=True)

    class Meta:
        unique_together = ['business_account', 'user']
        ordering = ['joined_at']

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.business_account.business_name}"


class ApprovalWorkflow(models.Model):
    """
    Approval workflows for business payments
    """
    WORKFLOW_TYPES = [
        ('sequential', 'Sequential'),
        ('parallel', 'Parallel'),
        ('hierarchical', 'Hierarchical'),
    ]

    business_account = models.ForeignKey(BusinessAccount, on_delete=models.CASCADE, related_name='approval_workflows')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    workflow_type = models.CharField(max_length=20, choices=WORKFLOW_TYPES, default='sequential')

    # Rules
    min_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    max_amount = models.DecimalField(max_digits=15, decimal_places=2, default=10000)
    requires_dual_approval = models.BooleanField(default=False)

    # Approvers
    required_roles = models.ManyToManyField(BusinessRole, related_name='approval_workflows')
    required_approvers = models.PositiveSmallIntegerField(default=1)

    # Status
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['min_amount']

    def __str__(self):
        return f"{self.business_account.business_name} - {self.name}"


class BulkPayment(models.Model):
    """
    Bulk payment batches for business accounts
    """
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending_approval', 'Pending Approval'),
        ('approved', 'Approved'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]

    business_account = models.ForeignKey(BusinessAccount, on_delete=models.CASCADE, related_name='bulk_payments')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_bulk_payments')

    # Payment Details
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3, default='GHS')

    # Status & Workflow
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    approval_workflow = models.ForeignKey(ApprovalWorkflow, on_delete=models.SET_NULL, blank=True, null=True)

    # Approvals
    approved_by = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='approved_bulk_payments', blank=True)
    approved_at = models.DateTimeField(blank=True, null=True)

    # Processing
    processed_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)

    # Metadata
    reference_number = models.CharField(max_length=50, unique=True, blank=True)
    notes = models.TextField(blank=True)

    # File attachments (for bulk upload)
    csv_file = models.FileField(upload_to='bulk_payments/', blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.business_account.business_name} - {self.name}"

    def save(self, *args, **kwargs):
        if not self.reference_number:
            self.reference_number = f"BULK_{uuid.uuid4().hex[:12].upper()}"
        super().save(*args, **kwargs)


class BulkPaymentItem(models.Model):
    """
    Individual payment items within a bulk payment
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]

    bulk_payment = models.ForeignKey(BulkPayment, on_delete=models.CASCADE, related_name='payment_items')

    # Recipient Information
    recipient_name = models.CharField(max_length=255)
    recipient_phone = models.CharField(max_length=20, blank=True)
    recipient_email = models.EmailField(blank=True)
    recipient_account = models.CharField(max_length=50, blank=True)  # Bank account or mobile money number

    # Payment Details
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    description = models.TextField(blank=True)
    payment_method = models.CharField(max_length=50, default='bank_transfer')

    # Processing
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    transaction_id = models.CharField(max_length=100, blank=True)
    processed_at = models.DateTimeField(blank=True, null=True)
    failure_reason = models.TextField(blank=True)

    # Metadata
    reference = models.CharField(max_length=50, unique=True, blank=True)
    custom_fields = models.JSONField(default=dict)  # For additional recipient data

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.bulk_payment.name} - {self.recipient_name}"

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = f"ITEM_{uuid.uuid4().hex[:12].upper()}"
        super().save(*args, **kwargs)


class BusinessAnalytics(models.Model):
    """
    Advanced analytics for business accounts
    """
    business_account = models.OneToOneField(BusinessAccount, on_delete=models.CASCADE, related_name='analytics')

    # Financial Metrics
    total_payments = models.PositiveIntegerField(default=0)
    total_volume = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    average_transaction = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    # Time-based Metrics
    monthly_volume = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    monthly_transactions = models.PositiveIntegerField(default=0)

    # User Activity
    active_users = models.PositiveIntegerField(default=0)
    total_users = models.PositiveIntegerField(default=0)

    # Compliance & Risk
    failed_payments = models.PositiveIntegerField(default=0)
    high_value_transactions = models.PositiveIntegerField(default=0)

    # Last Updated
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Analytics for {self.business_account.business_name}"


    def __str__(self):
        return f"{self.business_account.business_name} - {self.get_integration_type_display()}"


# Enhanced KYC and Compliance Models for Businesses
class BusinessKYC(models.Model):
    """
    Enhanced KYC information for business accounts
    """
    RISK_LEVELS = [
        ('low', 'Low Risk'),
        ('medium', 'Medium Risk'),
        ('high', 'High Risk'),
        ('very_high', 'Very High Risk'),
    ]

    COMPLIANCE_STATUS = [
        ('pending', 'Pending Review'),
        ('under_review', 'Under Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('requires_attention', 'Requires Attention'),
    ]

    business_account = models.OneToOneField(BusinessAccount, on_delete=models.CASCADE, related_name='kyc')

    # Risk Assessment
    risk_level = models.CharField(max_length=20, choices=RISK_LEVELS, default='medium')
    risk_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    last_risk_assessment = models.DateTimeField(blank=True, null=True)

    # Compliance Status
    compliance_status = models.CharField(max_length=20, choices=COMPLIANCE_STATUS, default='pending')
    compliance_notes = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name='reviewed_business_kyc')
    reviewed_at = models.DateTimeField(blank=True, null=True)

    # Enhanced Business Information
    legal_entity_type = models.CharField(max_length=100, blank=True)  # LLC, Corporation, etc.
    business_description_detailed = models.TextField(blank=True)
    website = models.URLField(blank=True)
    linkedin_profile = models.URLField(blank=True)

    # Financial Information
    expected_monthly_volume = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    primary_bank_name = models.CharField(max_length=255, blank=True)
    primary_bank_account = models.CharField(max_length=100, blank=True)

    # Regulatory Information
    is_regulated_entity = models.BooleanField(default=False)
    regulatory_authority = models.CharField(max_length=255, blank=True)
    regulatory_license_number = models.CharField(max_length=100, blank=True)

    # Compliance Flags
    pep_associated = models.BooleanField(default=False)  # Politically Exposed Person
    sanctions_check_passed = models.BooleanField(default=False)
    adverse_media_check = models.BooleanField(default=False)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Business KYC"
        verbose_name_plural = "Business KYC"

    def __str__(self):
        return f"KYC for {self.business_account.business_name}"

    def update_risk_score(self):
        """Calculate and update risk score based on various factors"""
        score = 50  # Base score

        # Business type risk
        if self.business_account.account_type in ['government', 'ngo']:
            score -= 20  # Lower risk for government/NGOs
        elif self.business_account.account_type == 'sme':
            score += 10  # Higher risk for SMEs

        # Size-based risk
        if self.business_account.employee_count:
            if self.business_account.employee_count < 10:
                score += 15
            elif self.business_account.employee_count > 100:
                score -= 10

        # Volume-based risk
        if self.expected_monthly_volume:
            if self.expected_monthly_volume > 100000:
                score += 20
            elif self.expected_monthly_volume < 10000:
                score -= 5

        # Compliance flags
        if not self.sanctions_check_passed:
            score += 30
        if self.pep_associated:
            score += 40
        if not self.adverse_media_check:
            score += 20

        # Regulatory status
        if self.is_regulated_entity:
            score -= 15

        # Clamp score between 0-100
        self.risk_score = max(0, min(100, score))

        # Update risk level based on score
        if self.risk_score >= 80:
            self.risk_level = 'very_high'
        elif self.risk_score >= 60:
            self.risk_level = 'high'
        elif self.risk_score >= 40:
            self.risk_level = 'medium'
        else:
            self.risk_level = 'low'

        self.last_risk_assessment = timezone.now()
        self.save()


class BusinessDocument(models.Model):
    """
    Business verification documents
    """
    DOCUMENT_TYPES = [
        ('business_registration', 'Business Registration Certificate'),
        ('tax_certificate', 'Tax Clearance Certificate'),
        ('bank_statement', 'Bank Statement'),
        ('financial_statement', 'Financial Statement'),
        ('identity_proof', 'Director Identity Proof'),
        ('address_proof', 'Business Address Proof'),
        ('regulatory_license', 'Regulatory License'),
        ('partnership_deed', 'Partnership Deed'),
        ('memorandum_articles', 'Memorandum & Articles of Association'),
        ('other', 'Other Document'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('under_review', 'Under Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired'),
    ]

    business_account = models.ForeignKey(BusinessAccount, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=50, choices=DOCUMENT_TYPES)

    # Document Information
    document_name = models.CharField(max_length=255)
    document_description = models.TextField(blank=True)

    # File Storage
    document_file = models.FileField(upload_to='business_documents/', blank=True, null=True)
    document_url = models.URLField(blank=True)  # For external documents

    # Verification
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    verification_notes = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name='reviewed_business_documents')
    reviewed_at = models.DateTimeField(blank=True, null=True)

    # Expiry
    expiry_date = models.DateField(blank=True, null=True)
    is_required = models.BooleanField(default=True)

    # Metadata
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name='uploaded_business_documents')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-uploaded_at']
        unique_together = ['business_account', 'document_type']

    def __str__(self):
        return f"{self.business_account.business_name} - {self.get_document_type_display()}"

    @property
    def is_expired(self):
        """Check if document is expired"""
        if self.expiry_date:
            return timezone.now().date() > self.expiry_date
        return False

    @property
    def days_until_expiry(self):
        """Calculate days until document expires"""
        if self.expiry_date:
            today = timezone.now().date()
            return (self.expiry_date - today).days
        return None


class ComplianceReport(models.Model):
    """
    Regulatory compliance reports for business accounts
    """
    REPORT_TYPES = [
        ('monthly', 'Monthly Compliance Report'),
        ('quarterly', 'Quarterly Compliance Report'),
        ('annual', 'Annual Compliance Report'),
        ('suspicious_activity', 'Suspicious Activity Report'),
        ('transaction_monitoring', 'Transaction Monitoring Report'),
        ('kyc_update', 'KYC Update Report'),
    ]

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('under_review', 'Under Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    business_account = models.ForeignKey(BusinessAccount, on_delete=models.CASCADE, related_name='compliance_reports')

    # Report Information
    report_type = models.CharField(max_length=50, choices=REPORT_TYPES)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    # Date Range
    report_period_start = models.DateField()
    report_period_end = models.DateField()

    # Report Content
    report_data = models.JSONField(default=dict)  # Structured report data
    findings = models.TextField(blank=True)
    recommendations = models.TextField(blank=True)

    # Status and Review
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    submitted_at = models.DateTimeField(blank=True, null=True)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name='reviewed_compliance_reports')
    reviewed_at = models.DateTimeField(blank=True, null=True)
    review_notes = models.TextField(blank=True)

    # Risk Assessment
    risk_identified = models.BooleanField(default=False)
    risk_level = models.CharField(max_length=20, choices=BusinessKYC.RISK_LEVELS, blank=True)
    escalation_required = models.BooleanField(default=False)

    # File Storage
    report_file = models.FileField(upload_to='compliance_reports/', blank=True, null=True)

    # Metadata
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name='created_compliance_reports')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.business_account.business_name} - {self.title}"

    def submit_report(self, user):
        """Submit report for review"""
        self.status = 'submitted'
        self.submitted_at = timezone.now()
        self.created_by = user
        self.save()

        # TODO: Trigger notification to compliance team


class BusinessComplianceLog(models.Model):
    """
    Audit log for business compliance activities
    """
    ACTION_TYPES = [
        ('kyc_update', 'KYC Information Updated'),
        ('document_upload', 'Document Uploaded'),
        ('document_review', 'Document Reviewed'),
        ('risk_assessment', 'Risk Assessment Performed'),
        ('compliance_report', 'Compliance Report Generated'),
        ('sanctions_check', 'Sanctions Check Performed'),
        ('pep_check', 'PEP Check Performed'),
        ('account_flagged', 'Account Flagged for Review'),
        ('account_cleared', 'Account Cleared'),
    ]

    business_account = models.ForeignKey(BusinessAccount, on_delete=models.CASCADE, related_name='compliance_logs')

    # Action Information
    action_type = models.CharField(max_length=50, choices=ACTION_TYPES)
    description = models.TextField()
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name='business_compliance_actions')

    # Additional Data
    old_value = models.TextField(blank=True)  # For tracking changes
    new_value = models.TextField(blank=True)
    metadata = models.JSONField(default=dict)  # Additional context

    # Risk and Compliance Impact
    risk_impact = models.CharField(max_length=20, choices=BusinessKYC.RISK_LEVELS, blank=True)
    compliance_status_changed = models.BooleanField(default=False)

    # Timestamp
    performed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-performed_at']

    def __str__(self):
        return f"{self.business_account.business_name} - {self.get_action_type_display()} - {self.performed_at.date()}"




class Store(models.Model):
    """
    Merchant store for e-commerce operations
    """
    STORE_TYPES = [
        ('retail', 'Retail Store'),
        ('restaurant', 'Restaurant'),
        ('service', 'Service Provider'),
        ('online', 'Online Only'),
        ('hybrid', 'Online & Physical'),
    ]

    # Basic Information
    merchant = models.OneToOneField('users.Merchant', on_delete=models.CASCADE, related_name='store')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    store_type = models.CharField(max_length=20, choices=STORE_TYPES, default='retail')

    # Contact Information
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)

    # Address Information (for physical stores)
    address_line_1 = models.CharField(max_length=255, blank=True)
    address_line_2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, blank=True)

    # Business Hours
    business_hours = models.JSONField(default=dict, blank=True)  # Store operating hours

    # Store Settings
    is_active = models.BooleanField(default=True)
    accepts_online_orders = models.BooleanField(default=True)
    delivery_available = models.BooleanField(default=False)
    pickup_available = models.BooleanField(default=True)

    # Branding
    logo = models.ImageField(upload_to='store_logos/', blank=True, null=True)
    banner_image = models.ImageField(upload_to='store_banners/', blank=True, null=True)

    # Analytics
    total_products = models.PositiveIntegerField(default=0)
    total_orders = models.PositiveIntegerField(default=0)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Store"
        verbose_name_plural = "Stores"

    def __str__(self):
        return f"{self.name} - {self.merchant.business_name}"

    @property
    def full_address(self):
        """Return formatted full address"""
        address_parts = [
            self.address_line_1,
            self.address_line_2,
            self.city,
            self.state,
            self.postal_code,
            self.country
        ]
        return ', '.join(filter(None, address_parts))

    def update_product_count(self):
        """Update total products count"""
        self.total_products = self.products.count()
        self.save(update_fields=['total_products'])


class Product(models.Model):
    """
    Product model for merchant stores
    """
    PRODUCT_STATUS = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('discontinued', 'Discontinued'),
        ('out_of_stock', 'Out of Stock'),
    ]

    # Basic Information
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='products')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    compare_at_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    # Identification
    sku = models.CharField(max_length=50, unique=True, blank=True, null=True)
    barcode = models.CharField(max_length=100, blank=True, null=True)

    # Inventory
    stock_quantity = models.PositiveIntegerField(default=0)
    low_stock_threshold = models.PositiveIntegerField(default=5)
    track_inventory = models.BooleanField(default=True)

    # Status and Visibility
    status = models.CharField(max_length=20, choices=PRODUCT_STATUS, default='active')
    is_available = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)

    # Customer-facing fields
    category = models.CharField(
        max_length=100,
        blank=True,
        help_text='Product category for customer browsing'
    )
    tags = models.JSONField(default=list, blank=True)  # List of tags

    # Images (multiple images support)
    primary_image = models.ImageField(
        upload_to='product_images/',
        blank=True,
        null=True,
        help_text='Primary product image'
    )

    # Additional images stored as JSON
    additional_images = models.JSONField(default=list, blank=True)

    # Shipping and Delivery
    weight = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True)  # in kg
    dimensions = models.JSONField(default=dict, blank=True)  # width, height, depth
    requires_shipping = models.BooleanField(default=True)

    # SEO and Marketing
    seo_title = models.CharField(max_length=255, blank=True)
    seo_description = models.TextField(blank=True)
    meta_tags = models.JSONField(default=dict, blank=True)

    # Analytics
    view_count = models.PositiveIntegerField(default=0)
    purchase_count = models.PositiveIntegerField(default=0)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['store', 'status']),
            models.Index(fields=['category']),
            models.Index(fields=['is_featured']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.name} - {self.store.name}"

    def save(self, *args, **kwargs):
        """Auto-generate SKU if not provided"""
        if not self.sku:
            import uuid
            self.sku = f"{self.store.id}-{self.name[:3].upper()}-{str(uuid.uuid4())[:8].upper()}"
        super().save(*args, **kwargs)

        # Update store's product count
        self.store.update_product_count()

    @property
    def is_low_stock(self):
        """Check if product is low on stock"""
        return self.track_inventory and self.stock_quantity <= self.low_stock_threshold

    @property
    def is_in_stock(self):
        """Check if product is in stock"""
        return not self.track_inventory or self.stock_quantity > 0

    @property
    def discount_percentage(self):
        """Calculate discount percentage if compare_at_price is set"""
        if self.compare_at_price and self.compare_at_price > self.price:
            return round(((self.compare_at_price - self.price) / self.compare_at_price) * 100, 2)
        return 0

    def update_stock(self, quantity_change):
        """Update stock quantity"""
        self.stock_quantity = max(0, self.stock_quantity + quantity_change)
        self.save(update_fields=['stock_quantity', 'updated_at'])


class ProductImage(models.Model):
    """
    Individual product images
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='product_images/')
    alt_text = models.CharField(max_length=255, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_primary = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['sort_order', '-created_at']
        unique_together = ['product', 'is_primary']  # Only one primary image per product

    def __str__(self):
        return f"Image for {self.product.name}"

    def save(self, *args, **kwargs):
        """Ensure only one primary image per product"""
        if self.is_primary:
            ProductImage.objects.filter(product=self.product, is_primary=True).update(is_primary=False)
        super().save(*args, **kwargs)


class ProductVariant(models.Model):
    """
    Product variants (size, color, etc.)
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    name = models.CharField(max_length=100)  # e.g., "Size", "Color"
    value = models.CharField(max_length=100)  # e.g., "Large", "Red"
    sku = models.CharField(max_length=50, blank=True)
    price_modifier = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    stock_quantity = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['product', 'name', 'value']

    def __str__(self):
        return f"{self.product.name} - {self.name}: {self.value}"


class Category(models.Model):
    """
    Product categories
    """
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, blank=True, null=True, related_name='subcategories')
    image = models.ImageField(upload_to='category_images/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort_order', 'name']
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name

    @property
    def full_path(self):
        """Return full category path"""
        if self.parent:
            return f"{self.parent.full_path} > {self.name}"
        return self.name

class MerchantApplication(models.Model):
    """Merchant applications submitted by uninvited merchants"""
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    BUSINESS_TYPES = [
        ('sole-proprietorship', 'Sole Proprietorship'),
        ('partnership', 'Partnership'),
        ('corporation', 'Corporation'),
        ('llc', 'LLC'),
        ('non-profit', 'Non-Profit'),
        ('other', 'Other'),
    ]

    INDUSTRIES = [
        ('retail', 'Retail/E-commerce'),
        ('restaurant', 'Restaurant/Food Service'),
        ('healthcare', 'Healthcare'),
        ('education', 'Education'),
        ('professional', 'Professional Services'),
        ('technology', 'Technology'),
        ('manufacturing', 'Manufacturing'),
        ('other', 'Other'),
    ]

    EMPLOYEE_RANGES = [
        ('1-5', '1-5 employees'),
        ('6-20', '6-20 employees'),
        ('21-50', '21-50 employees'),
        ('51-100', '51-100 employees'),
        ('100+', '100+ employees'),
    ]

    REVENUE_RANGES = [
        ('under-10k', 'Under $10,000'),
        ('10k-50k', '$10,000 - $50,000'),
        ('50k-100k', '$50,000 - $100,000'),
        ('100k-500k', '$100,000 - $500,000'),
        ('over-500k', 'Over $500,000'),
    ]

    # Business Information
    business_name = models.CharField(max_length=255)
    business_type = models.CharField(max_length=50, choices=BUSINESS_TYPES)
    business_description = models.TextField()
    business_address = models.TextField()
    business_phone = models.CharField(max_length=20)
    business_email = models.EmailField()

    # Optional Business Fields
    website = models.URLField(blank=True)
    tax_id = models.CharField(max_length=50, blank=True)
    registration_number = models.CharField(max_length=50, blank=True)

    # Contact Person
    contact_first_name = models.CharField(max_length=100)
    contact_last_name = models.CharField(max_length=100)
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=20)
    contact_position = models.CharField(max_length=100, blank=True)

    # Business Details
    industry = models.CharField(max_length=50, choices=INDUSTRIES)
    employee_count = models.CharField(max_length=20, choices=EMPLOYEE_RANGES, blank=True)
    monthly_revenue = models.CharField(max_length=20, choices=REVENUE_RANGES, blank=True)

    # Payment Methods (JSON array of selected methods)
    payment_methods = models.JSONField(default=list)

    # Additional Information
    hear_about_us = models.CharField(max_length=50, blank=True)
    special_requirements = models.TextField(blank=True)

    # Status and Review
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    review_notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-submitted_at']

    def __str__(self):
        return f"{self.business_name} - {self.get_status_display()}"

class MerchantInvitation(models.Model):
    """Invitations sent to potential merchants"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
    ]

    BUSINESS_TYPES = [
        ('restaurant', 'Restaurant/Food Service'),
        ('retail', 'Retail/Shop'),
        ('services', 'Professional Services'),
        ('ecommerce', 'E-commerce'),
        ('healthcare', 'Healthcare'),
        ('education', 'Education'),
        ('other', 'Other'),
    ]

    # Invitation Details
    email = models.EmailField()
    business_name = models.CharField(max_length=255)
    business_type = models.CharField(max_length=50, choices=BUSINESS_TYPES, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    notes = models.TextField(blank=True)

    # Invitation Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    invitation_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    invited_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    invited_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    # Acceptance Details
    accepted_at = models.DateTimeField(null=True, blank=True)
    merchant_profile = models.OneToOneField(Merchant, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ['-invited_at']

    def __str__(self):
        return f"Invitation to {self.business_name} ({self.email})"

    @property
    def is_expired(self):
        from django.utils import timezone
        return timezone.now() > self.expires_at and self.status == 'pending'

class MerchantOnboarding(models.Model):
    """Tracks merchant onboarding progress"""
    PENDING = 'pending'
    BUSINESS_INFO = 'business_info'
    BANK_DETAILS = 'bank_details'
    VERIFICATION = 'verification'
    COMPLETED = 'completed'
    
    STATUS_CHOICES = [
        (PENDING, 'Pending'),
        (BUSINESS_INFO, 'Business Info'),
        (BANK_DETAILS, 'Bank Details'),
        (VERIFICATION, 'Verification'),
        (COMPLETED, 'Completed')
    ]
    
    merchant = models.OneToOneField('users.Merchant', on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=PENDING)
    current_step = models.PositiveSmallIntegerField(default=1)
    total_steps = models.PositiveSmallIntegerField(default=4)
    is_verified = models.BooleanField(default=False)
    data = models.JSONField(default=dict)  # Stores temporary onboarding data
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Onboarding for {self.merchant.business_name}"
    
    def save(self, *args, **kwargs):
        """Update verification status when reaching final step"""
        if self.status == self.COMPLETED:
            self.is_verified = True
        super().save(*args, **kwargs)

class MerchantVerificationDocument(models.Model):
    """Documents submitted for merchant verification"""
    DOCUMENT_TYPES = [
        ('business_registration', 'Business Registration'),
        ('tax_id', 'Tax ID Document'),
        ('bank_statement', 'Bank Statement'),
        ('identity_proof', 'Identity Proof'),
        ('address_proof', 'Address Proof'),
        ('financial_statement', 'Financial Statement'),
    ]
    
    STATUS_CHOICES = [
        ('pending_review', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired'),
    ]
    
    merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name='verification_documents')
    document_type = models.CharField(max_length=50, choices=DOCUMENT_TYPES)
    document_data = models.JSONField()
    submitted_at = models.DateTimeField()
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    rejection_reason = models.TextField(blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-submitted_at']
    
    def __str__(self):
        return f"{self.merchant.business_name} - {self.get_document_type_display()} - {self.get_status_display()}"
    
    def save(self, *args, **kwargs):
        """Update verification status when reaching final step"""
        if self.status == 'completed':
            self.is_verified = True
        super().save(*args, **kwargs)

class ReportTemplate(models.Model):
    """Pre-defined report templates for merchants"""
    REPORT_TYPES = [
        ('sales_summary', 'Sales Summary'),
        ('transaction_detail', 'Transaction Detail'),
        ('customer_analysis', 'Customer Analysis'),
        ('product_performance', 'Product Performance'),
        ('financial_overview', 'Financial Overview'),
        ('payout_history', 'Payout History'),
    ]

    FREQUENCY_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
    ]

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    report_type = models.CharField(max_length=50, choices=REPORT_TYPES)
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Report(models.Model):
    """Generated reports for merchants"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('generating', 'Generating'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    FORMAT_CHOICES = [
        ('pdf', 'PDF'),
        ('csv', 'CSV'),
        ('excel', 'Excel'),
        ('json', 'JSON'),
    ]

    merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE)
    template = models.ForeignKey(ReportTemplate, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    format = models.CharField(max_length=10, choices=FORMAT_CHOICES, default='pdf')

    # Date range
    start_date = models.DateField()
    end_date = models.DateField()

    # Filters and parameters
    filters = models.JSONField(default=dict)  # Store filter parameters

    # File storage
    file_url = models.URLField(blank=True, null=True)
    file_size = models.PositiveIntegerField(blank=True, null=True)

    # Metadata
    record_count = models.PositiveIntegerField(default=0)
    processing_time = models.DurationField(blank=True, null=True)
    error_message = models.TextField(blank=True)

    # Scheduling
    is_scheduled = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.merchant.business_name} - {self.name}"

    @property
    def duration_days(self):
        """Calculate report duration in days"""
        return (self.end_date - self.start_date).days + 1

class MerchantSettings(models.Model):
    """Merchant business and operational settings"""
    merchant = models.OneToOneField('users.Merchant', on_delete=models.CASCADE)
    
    # Business Information
    business_name = models.CharField(max_length=255, blank=True)
    tax_id = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    
    # Address Information
    address_street = models.CharField(max_length=255, blank=True)
    address_city = models.CharField(max_length=100, blank=True)
    address_country = models.CharField(max_length=100, blank=True)
    address_postal_code = models.CharField(max_length=20, blank=True)
    
    # Operational Settings
    default_currency = models.CharField(max_length=3, default='USD')
    timezone = models.CharField(max_length=50, default='UTC')
    language = models.CharField(max_length=10, default='en')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Settings for {self.merchant.business_name}"
    
    class Meta:
        verbose_name = "Merchant Settings"
        verbose_name_plural = "Merchant Settings"

class MerchantNotificationSettings(models.Model):
    """Merchant notification preferences"""
    merchant = models.OneToOneField('users.Merchant', on_delete=models.CASCADE)
    
    # Email notifications
    email_enabled = models.BooleanField(default=True)
    
    # SMS notifications
    sms_enabled = models.BooleanField(default=False)
    sms_number = models.CharField(max_length=20, blank=True)
    
    # Push notifications
    push_enabled = models.BooleanField(default=True)
    
    # Alert types
    transaction_alerts = models.BooleanField(default=True)
    payout_alerts = models.BooleanField(default=True)
    security_alerts = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Notification settings for {self.merchant.business_name}"
    
    class Meta:
        verbose_name = "Merchant Notification Settings"
        verbose_name_plural = "Merchant Notification Settings"

class MerchantPayoutSettings(models.Model):
    """Merchant payout configuration"""
    PAYOUT_METHOD_CHOICES = [
        ('bank_transfer', 'Bank Transfer'),
        ('mobile_money', 'Mobile Money'),
    ]
    
    merchant = models.OneToOneField('users.Merchant', on_delete=models.CASCADE)
    
    # Payout method
    default_method = models.CharField(
        max_length=20, 
        choices=PAYOUT_METHOD_CHOICES, 
        default='bank_transfer'
    )
    
    # Payout automation
    auto_payout = models.BooleanField(default=False)
    minimum_payout = models.DecimalField(max_digits=10, decimal_places=2, default=100.00)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Payout settings for {self.merchant.business_name}"
    
    class Meta:
        verbose_name = "Merchant Payout Settings"
        verbose_name_plural = "Merchant Payout Settings"

class ScheduledReport(models.Model):
    """Scheduled reports for automated generation"""
    FREQUENCY_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
    ]

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('expired', 'Expired'),
    ]

    merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name='merchant_scheduled_reports')
    template = models.ForeignKey(ReportTemplate, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    # Scheduling
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES)
    next_run = models.DateTimeField()
    last_run = models.DateTimeField(blank=True, null=True)

    # Configuration
    format = models.CharField(max_length=10, choices=Report.FORMAT_CHOICES, default='pdf')
    filters = models.JSONField(default=dict)
    email_recipients = models.JSONField(default=list)  # List of email addresses

    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    is_active = models.BooleanField(default=True)

    # Metadata
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='merchant_scheduled_reports')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['next_run']

    def __str__(self):
        return f"{self.merchant.business_name} - {self.name} ({self.frequency})"

# NOTE: MerchantCustomer model has been moved to users app (users.MerchantCustomer)
# This class is DEPRECATED - use users.MerchantCustomer instead
# Keeping for backwards compatibility with existing migrations
class MerchantCustomerLegacy(models.Model):
    """
    DEPRECATED: Use users.MerchantCustomer instead.
    This model is kept for migration compatibility only.
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('suspended', 'Suspended'),
        ('inactive', 'Inactive'),
    ]

    KYC_STATUS_CHOICES = [
        ('not_required', 'Not Required'),
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name='merchants_merchant_customers')
    customer_email = models.EmailField()
    customer_name = models.CharField(max_length=255, blank=True)
    customer_phone = models.CharField(max_length=20, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    kyc_status = models.CharField(max_length=20, choices=KYC_STATUS_CHOICES, default='not_required')
    kyc_required = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    onboarded_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['merchant', 'customer_email']
        ordering = ['-onboarded_at']
        db_table = 'merchants_merchantcustomer'  # Keep original table name

    def __str__(self):
        return f"{self.customer_email} - {self.merchant.business_name}"


class _ScheduledReportMixin:
    """Mixin for calculate_next_run - moved from MerchantCustomer"""
    def calculate_next_run(self):
        """Calculate the next run date based on frequency"""
        from datetime import timedelta
        from django.utils import timezone

        now = timezone.now()

        if self.frequency == 'daily':
            self.next_run = now + timedelta(days=1)
        elif self.frequency == 'weekly':
            # Next Monday
            days_ahead = (7 - now.weekday()) % 7
            if days_ahead == 0:
                days_ahead = 7
            self.next_run = now + timedelta(days=days_ahead)
        elif self.frequency == 'monthly':
            # First day of next month
            if now.month == 12:
                self.next_run = now.replace(year=now.year + 1, month=1, day=1, hour=9, minute=0, second=0)
            else:
                self.next_run = now.replace(month=now.month + 1, day=1, hour=9, minute=0, second=0)
        elif self.frequency == 'quarterly':
            # First day of next quarter
            current_quarter = ((now.month - 1) // 3) + 1
            if current_quarter == 4:
                next_quarter_month = 1
                next_year = now.year + 1
            else:
                next_quarter_month = (current_quarter * 3) + 1
                next_year = now.year
            self.next_run = now.replace(year=next_year, month=next_quarter_month, day=1, hour=9, minute=0, second=0)
