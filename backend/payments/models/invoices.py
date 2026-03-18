from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator
from decimal import Decimal
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import os
import uuid

User = get_user_model()

class BusinessClient(models.Model):
    """
    Business clients/customers for invoicing
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='business_clients')

    # Client information
    company_name = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=100, blank=True)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)

    # Address information
    address_line_1 = models.CharField(max_length=255)
    address_line_2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100)

    # Business details
    tax_id = models.CharField(max_length=50, blank=True)
    registration_number = models.CharField(max_length=50, blank=True)

    # Payment terms
    default_payment_terms = models.PositiveIntegerField(default=30)  # Days
    default_currency = models.CharField(max_length=3, default='USD')

    # Notes
    notes = models.TextField(blank=True)

    # Status
    is_active = models.BooleanField(default=True)

    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['user', 'email']
        ordering = ['company_name']

    def __str__(self):
        return f"{self.company_name} ({self.user.username})"

    @property
    def full_address(self):
        """Format full address"""
        address_parts = [
            self.address_line_1,
            self.address_line_2,
            f"{self.city}, {self.state} {self.postal_code}".strip(", "),
            self.country
        ]
        return "\n".join([part for part in address_parts if part])

class InvoiceTemplate(models.Model):
    """
    Customizable invoice templates
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='invoice_templates')

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    # Template settings
    logo = models.ImageField(upload_to='invoice_logos/', blank=True, null=True)
    primary_color = models.CharField(max_length=7, default='#2563eb')  # Hex color
    secondary_color = models.CharField(max_length=7, default='#6b7280')

    # Company information
    company_name = models.CharField(max_length=200)
    company_address = models.TextField()
    company_phone = models.CharField(max_length=20, blank=True)
    company_email = models.EmailField()
    company_website = models.URLField(blank=True)
    company_tax_id = models.CharField(max_length=50, blank=True)

    # Invoice settings
    default_notes = models.TextField(blank=True)
    default_terms = models.TextField(blank=True)
    footer_text = models.TextField(blank=True)

    # Status
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_default', 'name']

    def __str__(self):
        return f"{self.name} ({self.user.username})"

    def save(self, *args, **kwargs):
        # Ensure only one default template per user
        if self.is_default:
            InvoiceTemplate.objects.filter(
                user=self.user,
                is_default=True
            ).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)

class Invoice(models.Model):
    """
    Main invoice model
    """
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('viewed', 'Viewed'),
        ('paid', 'Paid'),
        ('partially_paid', 'Partially Paid'),
        ('overdue', 'Overdue'),
        ('cancelled', 'Cancelled'),
    ]

    # Relationships
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='invoices')
    client = models.ForeignKey(BusinessClient, on_delete=models.CASCADE, related_name='invoices')
    template = models.ForeignKey(InvoiceTemplate, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')

    # Invoice details
    invoice_number = models.CharField(max_length=50, unique=True, blank=True)
    reference_number = models.CharField(max_length=50, blank=True)

    # Dates
    issue_date = models.DateField(default=timezone.now)
    due_date = models.DateField()
    payment_terms = models.PositiveIntegerField(default=30)  # Days

    # Financial details
    currency = models.CharField(max_length=3, default='USD')
    subtotal = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0'))  # Percentage
    tax_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    discount_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))

    # Payment tracking
    amount_paid = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    amount_due = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

    # Content
    notes = models.TextField(blank=True)
    terms_and_conditions = models.TextField(blank=True)
    footer = models.TextField(blank=True)

    # File storage
    pdf_file = models.FileField(upload_to='invoices/', blank=True, null=True)

    # Tracking
    sent_at = models.DateTimeField(null=True, blank=True)
    viewed_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    # Recurring invoice settings
    is_recurring = models.BooleanField(default=False)
    recurring_frequency = models.CharField(max_length=20, choices=[
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('yearly', 'Yearly'),
    ], blank=True)
    next_recurring_date = models.DateField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['user', 'invoice_number']

    def __str__(self):
        return f"Invoice {self.invoice_number} - {self.client.company_name}"

    def save(self, *args, **kwargs):
        # Generate invoice number if not provided
        if not self.invoice_number:
            self.invoice_number = self._generate_invoice_number()

        # Calculate totals only if the instance already has a PK
        # (items relation requires a saved instance)
        if self.pk:
            self._calculate_totals()

        # Update status based on payments
        self._update_status()

        super().save(*args, **kwargs)

    def _generate_invoice_number(self):
        """Generate unique invoice number"""
        today = timezone.now().date()
        date_prefix = today.strftime('%Y%m%d')
        full_prefix = f"INV-{date_prefix}"

        # Find the next number for today
        existing_invoices = Invoice.objects.filter(
            user=self.user,
            invoice_number__startswith=full_prefix
        ).order_by('-invoice_number')

        if existing_invoices.exists():
            last_number = existing_invoices.first().invoice_number
            try:
                next_num = int(last_number.split('-')[-1]) + 1
            except (ValueError, IndexError):
                next_num = 1
        else:
            next_num = 1

        return f"INV-{date_prefix}-{next_num:04d}"

    def _calculate_totals(self):
        """Calculate invoice totals"""
        # Calculate subtotal from items
        items_total = sum(item.total_price for item in self.items.all())
        self.subtotal = items_total

        # Calculate tax
        if self.tax_rate > 0:
            self.tax_amount = (self.subtotal * self.tax_rate) / 100
        else:
            self.tax_amount = Decimal('0')

        # Calculate total
        self.total_amount = self.subtotal + self.tax_amount - self.discount_amount

        # Update amount due
        self.amount_due = self.total_amount - self.amount_paid

    def _update_status(self):
        """Update invoice status based on payments and dates"""
        if self.status == 'cancelled':
            return

        if self.total_amount > 0 and self.amount_paid >= self.total_amount:
            self.status = 'paid'
            if not self.paid_at:
                self.paid_at = timezone.now()
        elif self.amount_paid > 0:
            self.status = 'partially_paid'
        elif timezone.now().date() > self.due_date:
            self.status = 'overdue'
        elif self.status == 'draft':
            pass  # Keep as draft
        elif self.sent_at:
            self.status = 'sent'

    @property
    def is_overdue(self):
        """Check if invoice is overdue"""
        return self.status == 'overdue' or (
            timezone.now().date() > self.due_date and
            self.amount_due > 0
        )

    @property
    def days_overdue(self):
        """Calculate days overdue"""
        if not self.is_overdue:
            return 0
        return (timezone.now().date() - self.due_date).days

    @property
    def payment_percentage(self):
        """Calculate payment percentage"""
        if self.total_amount <= 0:
            return 100
        return min((self.amount_paid / self.total_amount) * 100, 100)

    def mark_as_sent(self):
        """Mark invoice as sent"""
        if not self.sent_at:
            self.sent_at = timezone.now()
            if self.status == 'draft':
                self.status = 'sent'
            self.save()

    def record_payment(self, amount, payment_method=None, transaction=None, notes=''):
        """Record a payment against this invoice"""
        payment = InvoicePayment.objects.create(
            invoice=self,
            amount=amount,
            payment_method=payment_method,
            transaction=transaction,
            notes=notes
        )

        # Update invoice amounts
        self.amount_paid += amount
        self.save()

        return payment

class InvoiceItem(models.Model):
    """
    Individual line items on an invoice
    """
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')

    # Item details
    description = models.TextField()
    quantity = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    unit_price = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(Decimal('0'))])

    # Calculated fields
    total_price = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))

    # Additional details
    sku = models.CharField(max_length=100, blank=True)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0'))

    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.description} - {self.invoice.invoice_number}"

    def save(self, *args, **kwargs):
        # Calculate total price
        self.total_price = self.quantity * self.unit_price
        super().save(*args, **kwargs)

class InvoicePayment(models.Model):
    """
    Payments made against invoices
    """
    PAYMENT_METHOD_CHOICES = [
        ('bank_transfer', 'Bank Transfer'),
        ('credit_card', 'Credit Card'),
        ('debit_card', 'Debit Card'),
        ('cash', 'Cash'),
        ('check', 'Check'),
        ('wallet', 'Digital Wallet'),
        ('other', 'Other'),
    ]

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])

    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='bank_transfer')
    transaction_reference = models.CharField(max_length=100, blank=True)

    # Link to actual transaction if processed through SikaRemit
    transaction = models.ForeignKey(
        'accounts.Transaction',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoice_payments'
    )

    # Payment details
    payment_date = models.DateField(default=timezone.now)
    notes = models.TextField(blank=True)

    # Recorded by
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='recorded_payments')

    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-payment_date', '-created_at']

    def __str__(self):
        return f"Payment of {self.amount} for {self.invoice.invoice_number}"

class InvoiceReminder(models.Model):
    """
    Automatic reminders for overdue invoices
    """
    REMINDER_TYPE_CHOICES = [
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('push', 'Push Notification'),
    ]

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='reminders')

    reminder_type = models.CharField(max_length=20, choices=REMINDER_TYPE_CHOICES, default='email')
    subject = models.CharField(max_length=200)
    message = models.TextField()

    # Timing
    sent_at = models.DateTimeField(null=True, blank=True)
    scheduled_for = models.DateTimeField()

    # Status
    is_sent = models.BooleanField(default=False)
    is_successful = models.BooleanField(default=False)

    # Error tracking
    error_message = models.TextField(blank=True)

    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['scheduled_for']

    def __str__(self):
        return f"Reminder for {self.invoice.invoice_number} ({self.reminder_type})"
