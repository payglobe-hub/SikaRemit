from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone

from .invoices import (
    BusinessClient, Invoice, InvoiceItem, InvoicePayment,
    InvoiceTemplate, InvoiceReminder
)

User = get_user_model()

class BusinessClientSerializer(serializers.ModelSerializer):
    """Serializer for business clients"""
    class Meta:
        model = BusinessClient
        fields = [
            'id', 'company_name', 'contact_person', 'email', 'phone',
            'address_line_1', 'address_line_2', 'city', 'state',
            'postal_code', 'country', 'tax_id', 'registration_number',
            'default_payment_terms', 'default_currency', 'notes',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class BusinessClientCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating business clients"""
    class Meta:
        model = BusinessClient
        fields = [
            'company_name', 'contact_person', 'email', 'phone',
            'address_line_1', 'address_line_2', 'city', 'state',
            'postal_code', 'country', 'tax_id', 'registration_number',
            'default_payment_terms', 'default_currency', 'notes'
        ]

class InvoiceTemplateSerializer(serializers.ModelSerializer):
    """Serializer for invoice templates"""
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = InvoiceTemplate
        fields = [
            'id', 'name', 'description', 'logo', 'logo_url', 'primary_color',
            'secondary_color', 'company_name', 'company_address', 'company_phone',
            'company_email', 'company_website', 'company_tax_id', 'default_notes',
            'default_terms', 'footer_text', 'is_default', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_logo_url(self, obj):
        if obj.logo:
            return obj.logo.url
        return None

class InvoiceItemSerializer(serializers.ModelSerializer):
    """Serializer for invoice items"""
    class Meta:
        model = InvoiceItem
        fields = [
            'id', 'invoice', 'description', 'quantity', 'unit_price',
            'total_price', 'sku', 'tax_rate', 'created_at'
        ]
        read_only_fields = ['id', 'total_price', 'created_at']

class InvoicePaymentSerializer(serializers.ModelSerializer):
    """Serializer for invoice payments"""
    recorded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = InvoicePayment
        fields = [
            'id', 'invoice', 'amount', 'payment_method', 'transaction_reference',
            'transaction', 'payment_date', 'notes', 'recorded_by',
            'recorded_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'recorded_by', 'created_at']

    def get_recorded_by_name(self, obj):
        if obj.recorded_by:
            return obj.recorded_by.get_full_name() or obj.recorded_by.username
        return None

class InvoiceSerializer(serializers.ModelSerializer):
    """Detailed serializer for invoices"""
    client = BusinessClientSerializer(read_only=True)
    client_id = serializers.IntegerField(write_only=True)
    template = InvoiceTemplateSerializer(read_only=True)
    items = InvoiceItemSerializer(many=True, read_only=True)
    payments = InvoicePaymentSerializer(many=True, read_only=True)

    # Computed fields
    is_overdue = serializers.ReadOnlyField()
    days_overdue = serializers.ReadOnlyField()
    payment_percentage = serializers.ReadOnlyField()

    class Meta:
        model = Invoice
        fields = [
            'id', 'client', 'client_id', 'template', 'invoice_number',
            'reference_number', 'issue_date', 'due_date', 'payment_terms',
            'currency', 'subtotal', 'tax_rate', 'tax_amount', 'discount_amount',
            'total_amount', 'amount_paid', 'amount_due', 'status', 'notes',
            'terms_and_conditions', 'footer', 'pdf_file', 'sent_at', 'viewed_at',
            'paid_at', 'is_recurring', 'recurring_frequency', 'next_recurring_date',
            'items', 'payments', 'is_overdue', 'days_overdue', 'payment_percentage',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'invoice_number', 'amount_paid', 'amount_due', 'sent_at',
            'viewed_at', 'paid_at', 'is_overdue', 'days_overdue',
            'payment_percentage', 'created_at', 'updated_at'
        ]

class InvoiceListSerializer(serializers.ModelSerializer):
    """Simplified serializer for invoice lists"""
    client_name = serializers.CharField(source='client.company_name', read_only=True)
    is_overdue = serializers.ReadOnlyField()
    payment_percentage = serializers.ReadOnlyField()

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'client_name', 'issue_date', 'due_date',
            'total_amount', 'amount_paid', 'amount_due', 'status',
            'is_overdue', 'payment_percentage', 'created_at'
        ]

class InvoiceCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating invoices"""
    client_id = serializers.IntegerField()
    items = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        help_text="List of invoice items"
    )

    class Meta:
        model = Invoice
        fields = [
            'client_id', 'template', 'reference_number', 'issue_date', 'due_date',
            'payment_terms', 'currency', 'tax_rate', 'discount_amount',
            'notes', 'terms_and_conditions', 'footer', 'is_recurring',
            'recurring_frequency', 'items'
        ]

    def validate_client_id(self, value):
        """Ensure client belongs to user"""
        try:
            client = BusinessClient.objects.get(
                id=value,
                user=self.context['request'].user
            )
            return value
        except BusinessClient.DoesNotExist:
            raise serializers.ValidationError("Client not found")

    def validate_due_date(self, value):
        """Ensure due date is after issue date"""
        issue_date = self.initial_data.get('issue_date', timezone.now().date())
        if isinstance(issue_date, str):
            issue_date = datetime.fromisoformat(issue_date).date()

        if value <= issue_date:
            raise serializers.ValidationError("Due date must be after issue date")
        return value

    def validate_items(self, value):
        """Validate invoice items"""
        if not value:
            raise serializers.ValidationError("At least one item is required")

        for item in value:
            required_fields = ['description', 'quantity', 'unit_price']
            for field in required_fields:
                if field not in item:
                    raise serializers.ValidationError(f"Item missing required field: {field}")

            if float(item['quantity']) <= 0:
                raise serializers.ValidationError("Item quantity must be greater than 0")

            if float(item['unit_price']) < 0:
                raise serializers.ValidationError("Item unit price cannot be negative")

        return value

class InvoiceReminderSerializer(serializers.ModelSerializer):
    """Serializer for invoice reminders"""
    class Meta:
        model = InvoiceReminder
        fields = [
            'id', 'invoice', 'reminder_type', 'subject', 'message',
            'sent_at', 'scheduled_for', 'is_sent', 'is_successful',
            'error_message', 'created_at'
        ]
        read_only_fields = ['id', 'sent_at', 'is_sent', 'is_successful', 'created_at']

class InvoiceAnalyticsSerializer(serializers.Serializer):
    """Serializer for invoice analytics"""
    period = serializers.DictField()
    summary = serializers.DictField()
    status_breakdown = serializers.ListField()

class OverdueInvoicesSerializer(serializers.Serializer):
    """Serializer for overdue invoices"""
    overdue_invoices = InvoiceListSerializer(many=True)
    total_overdue = serializers.IntegerField()
    total_amount_overdue = serializers.DecimalField(max_digits=15, decimal_places=2)
