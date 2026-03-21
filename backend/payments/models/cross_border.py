from django.db import models
from django.utils import timezone
import uuid
# Ghana remittance compliance exempt entity types
EXEMPT_ENTITIES = [
    ('government', 'Government Entity'),
    ('ngo', 'Non-Governmental Organization'),
    ('diplomatic', 'Diplomatic Mission'),
    ('international_org', 'International Organization'),
    ('licensed_dealer', 'Licensed Forex Dealer'),
]

class CrossBorderRemittance(models.Model):
    """Model for international money transfers"""
    PENDING = 'pending'
    PROCESSING = 'processing'
    COMPLETED = 'completed'
    FAILED = 'failed'
    
    STATUS_CHOICES = [
        (PENDING, 'Pending'),
        (PROCESSING, 'Processing'),
        (COMPLETED, 'Completed'),
        (FAILED, 'Failed'),
    ]
    
    EXEMPTION_STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('revoked', 'Revoked')
    ]
    
    # Sender Information (KYC Compliance Fields)
    sender = models.ForeignKey('users.Customer', on_delete=models.SET_NULL, null=True, related_name='sent_remittances')
    sender_id_type = models.CharField(max_length=50, blank=True, help_text="Type of ID used for verification (e.g. Passport, Driver's License)")
    sender_id_number = models.CharField(max_length=50, blank=True, help_text="ID number used for verification")
    sender_id_issuing_authority = models.CharField(max_length=100, blank=True, help_text="Issuing authority for sender's ID")
    sender_account_type = models.CharField(max_length=50, blank=True, help_text="Sender's account type (bank account, mobile wallet)")
    sender_account_number = models.CharField(max_length=100, blank=True, help_text="Sender's account or wallet number")
    purpose_of_transfer = models.CharField(max_length=255, blank=True, help_text="Purpose of the transfer")
    
    # Recipient Information
    recipient_name = models.CharField(max_length=100)
    recipient_phone = models.CharField(max_length=20)
    recipient_address = models.TextField(blank=True, help_text="Recipient's address")
    recipient_account_type = models.CharField(max_length=50, blank=True, help_text="Type of account held by the recipient (e.g. Checking, Savings)")
    recipient_account_number = models.CharField(max_length=50, blank=True, help_text="Recipient's account number")
    recipient_country = models.CharField(max_length=3)  # ISO code
    beneficiary_institution_name = models.CharField(max_length=100, blank=True, help_text="Name of beneficiary bank or PSP")
    beneficiary_institution_address = models.TextField(blank=True, help_text="Address of beneficiary institution")
    recipient_verified = models.BooleanField(default=False)
    
    # Transaction Details
    amount_sent = models.DecimalField(max_digits=12, decimal_places=2)
    currency_sent = models.CharField(max_length=3, default='USD')  # ISO currency code
    amount_received = models.DecimalField(max_digits=12, decimal_places=2)
    currency_received = models.CharField(max_length=3, blank=True)  # ISO currency code
    exchange_rate = models.DecimalField(max_digits=8, decimal_places=4)
    fee = models.DecimalField(max_digits=8, decimal_places=2)
    fee_currency = models.CharField(max_length=3, default='USD')  # ISO currency code
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=PENDING)
    reference_number = models.CharField(max_length=50, unique=True, default=uuid.uuid4)
    user_reference_number = models.CharField(max_length=50, blank=True, help_text="User-provided reference number (e.g., invoice, claim number)")
    payment_method = models.CharField(max_length=50, blank=True, help_text="Method of payment (wire transfer, cash, mobile money)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    reported_to_regulator = models.BooleanField(default=False)
    report_reference = models.CharField(max_length=50, blank=True)
    
    # Exemption Details
    exempt_status = models.CharField(
        max_length=20,
        blank=True,
        choices=EXEMPT_ENTITIES,
    )
    exemption_status = models.CharField(
        max_length=10,
        choices=EXEMPTION_STATUS_CHOICES,
        blank=True,
        null=True
    )
    exemption_approver = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_exemptions'
    )
    exemption_notes = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.reference_number}: {self.amount_sent}→{self.recipient_country}"
    
    def requires_reporting(self):
        """Check if transaction meets BoG reporting threshold"""
        from django.conf import settings
        return self.amount_sent >= settings.REPORTING_THRESHOLD
    
    def can_request_exemption(self):
        """Check if exemption can be requested"""
        return self.exemption_status in [None, 'rejected', 'revoked']
    
    def approve_exemption(self, user, notes=''):
        """Approve exemption request"""
        self.exemption_status = 'approved'
        self.exemption_approver = user
        self.exemption_notes = notes
        self.save()
    
    def reject_exemption(self, user, notes):
        """Reject exemption request"""
        if not notes:
            raise ValueError("Rejection reason is required")
        self.exemption_status = 'rejected'
        self.exemption_approver = user
        self.exemption_notes = notes
        self.save()
    
    class Meta:
        verbose_name = 'Cross-Border Remittance'
        verbose_name_plural = 'Cross-Border Remittances'
