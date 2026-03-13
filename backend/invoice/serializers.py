from rest_framework import serializers
from .models import Invoice, InvoiceItem
from django.contrib.auth import get_user_model
from shared.constants import USER_TYPE_MERCHANT

User = get_user_model()

class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = ['id', 'description', 'quantity', 'unit_price', 'total']
        read_only_fields = ['id', 'total']

class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    merchant_name = serializers.CharField(source='merchant.get_full_name', read_only=True)
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'invoice_type', 'created_by', 'created_by_name',
            'customer_name', 'customer_email', 'customer_phone', 'customer_address',
            'amount', 'currency', 'status', 'due_date', 'payment_terms', 'tax_rate',
            'notes', 'merchant', 'merchant_name', 'created_at', 'updated_at',
            'sent_at', 'paid_at', 'items'
        ]
        read_only_fields = ['id', 'invoice_number', 'created_at', 'updated_at', 'sent_at', 'paid_at']
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Handle items serialization separately to avoid RelatedManager issues
        if hasattr(instance, 'items'):
            data['items'] = InvoiceItemSerializer(instance.items.all(), many=True).data
        return data

class CreateInvoiceSerializer(serializers.Serializer):
    customer_name = serializers.CharField()
    customer_email = serializers.EmailField()
    customer_phone = serializers.CharField(required=False, allow_blank=True)
    customer_address = serializers.CharField(required=False, allow_blank=True)
    due_date = serializers.DateField()
    payment_terms = serializers.ChoiceField(choices=Invoice.PAYMENT_TERMS_CHOICES, required=False)
    tax_rate = serializers.DecimalField(max_digits=5, decimal_places=2, default=0)
    notes = serializers.CharField(required=False, allow_blank=True)
    items = serializers.ListField(
        child=serializers.DictField(
            child=serializers.CharField(),
            allow_empty=False
        ),
        allow_empty=False,
        write_only=True  # Only for input, not for output
    )

    def to_representation(self, instance):
        # Use the InvoiceSerializer for output representation
        return InvoiceSerializer(instance).data

    def create(self, validated_data):
        request = self.context.get('request')
        if not request or not request.user:
            raise serializers.ValidationError("User authentication required")
        
        invoice_type = 'customer'  # Default to customer invoice
        if hasattr(request.user, 'user_type') and request.user.user_type == USER_TYPE_MERCHANT:  # merchant
            invoice_type = 'merchant'
        
        invoice_data = {
            'invoice_type': invoice_type,
            'created_by': request.user,
            'customer_name': validated_data['customer_name'],
            'customer_email': validated_data['customer_email'],
            'customer_phone': validated_data.get('customer_phone'),
            'customer_address': validated_data.get('customer_address'),
            'due_date': validated_data['due_date'],
            'payment_terms': validated_data.get('payment_terms'),
            'tax_rate': validated_data.get('tax_rate', 0),
            'notes': validated_data.get('notes'),
        }
        
        # Calculate total amount
        total_amount = 0
        items_data = validated_data['items']
        for item_data in items_data:
            quantity = float(item_data['quantity'])
            unit_price = float(item_data['unit_price'])
            total_amount += quantity * unit_price
        
        # Apply tax
        tax_rate = float(invoice_data['tax_rate'])
        if tax_rate > 0:
            total_amount += total_amount * (tax_rate / 100)
        
        invoice_data['amount'] = total_amount
        invoice_data['currency'] = 'USD'  # Default currency
        
        invoice = Invoice.objects.create(**invoice_data)
        
        # Create invoice items
        for item_data in items_data:
            InvoiceItem.objects.create(
                invoice=invoice,
                description=item_data['description'],
                quantity=item_data['quantity'],
                unit_price=item_data['unit_price']
            )
        
        return invoice
