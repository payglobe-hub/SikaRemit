from django.db.models import Q
from rest_framework import serializers
from .models import Store, Product, MerchantOnboarding, MerchantApplication, MerchantInvitation, ReportTemplate, Report, ScheduledReport, MerchantSettings, MerchantNotificationSettings, MerchantPayoutSettings
from users.models import MerchantCustomer  # MerchantCustomer moved to users app
from users.serializers import MerchantSerializer

class StoreSerializer(serializers.ModelSerializer):
    merchant = MerchantSerializer(read_only=True)
    
    class Meta:
        model = Store
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'merchant')
        
    def validate_name(self, value):
        """Ensure store name is unique per merchant"""
        if Store.objects.filter(
            merchant=self.context['request'].user.merchant_profile,
            name=value
        ).exists():
            raise serializers.ValidationError("You already have a store with this name")
        return value

class ProductSerializer(serializers.ModelSerializer):
    store = serializers.PrimaryKeyRelatedField(queryset=Store.objects.all())
    is_low_stock = serializers.BooleanField(read_only=True)
    image_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'is_low_stock', 'thumbnail')
        
    def get_image_url(self, obj):
        """Get full URL for product image"""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None
        
    def get_thumbnail_url(self, obj):
        """Get full URL for product thumbnail"""
        if obj.thumbnail:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.thumbnail.url)
            return obj.thumbnail.url
        return None
        
    def validate_price(self, value):
        """Ensure price is positive"""
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than zero")
        return value
        
    def validate_store(self, value):
        """Ensure product is being added to merchant's own store"""
        if value.merchant.user != self.context['request'].user:
            raise serializers.ValidationError("You can only add products to your own stores")
        return value

class MerchantApplicationSerializer(serializers.ModelSerializer):
    """Serializer for merchant applications"""

    class Meta:
        model = MerchantApplication
        fields = [
            'id', 'business_name', 'business_type', 'business_description',
            'business_address', 'business_phone', 'business_email',
            'website', 'tax_id', 'registration_number',
            'contact_first_name', 'contact_last_name', 'contact_email', 'contact_phone', 'contact_position',
            'industry', 'employee_count', 'monthly_revenue',
            'payment_methods', 'hear_about_us', 'special_requirements',
            'status', 'submitted_at', 'reviewed_at', 'reviewed_by', 'review_notes'
        ]
        read_only_fields = ['id', 'status', 'submitted_at', 'reviewed_at', 'reviewed_by', 'review_notes']

    def validate_business_email(self, value):
        """Ensure business email is unique among applications"""
        if MerchantApplication.objects.filter(business_email=value).exists():
            raise serializers.ValidationError("An application with this business email already exists")
        return value

    def validate_contact_email(self, value):
        """Ensure contact email is unique among applications"""
        if MerchantApplication.objects.filter(contact_email=value).exists():
            raise serializers.ValidationError("An application with this contact email already exists")
        return value

class MerchantInvitationSerializer(serializers.ModelSerializer):
    """Serializer for merchant invitations"""

    class Meta:
        model = MerchantInvitation
        fields = [
            'id', 'email', 'business_name', 'business_type', 'phone_number', 'notes',
            'status', 'invitation_token', 'invited_at', 'expires_at', 'invited_by',
            'accepted_at', 'merchant_profile', 'is_expired'
        ]
        read_only_fields = ['id', 'invitation_token', 'invited_at', 'invited_by', 'accepted_at', 'merchant_profile', 'is_expired']

    def validate_email(self, value):
        """Ensure email is unique among pending invitations"""
        if MerchantInvitation.objects.filter(email=value, status='pending').exists():
            raise serializers.ValidationError("A pending invitation for this email already exists")
        return value

    def validate_expires_at(self, value):
        """Ensure expiration date is in the future"""
        from django.utils import timezone
        if value <= timezone.now():
            raise serializers.ValidationError("Expiration date must be in the future")
        return value

class OnboardingSerializer(serializers.ModelSerializer):
    """Handles merchant onboarding data"""
    class Meta:
        model = MerchantOnboarding
        fields = ['status', 'current_step', 'total_steps', 'data']
        read_only_fields = ['status', 'current_step', 'total_steps']
    
    def validate(self, data):
        """Validate onboarding data based on current step"""
        instance = self.instance
        
        # Business info step validation
        if instance.current_step == 1:
            required_fields = ['business_name', 'business_type', 'tax_id']
            for field in required_fields:
                if field not in data.get('data', {}):
                    raise serializers.ValidationError(f"{field} is required")
        
        # Bank details step validation
        elif instance.current_step == 2:
            required_fields = ['account_number', 'bank_name', 'account_name']
            for field in required_fields:
                if field not in data.get('data', {}):
                    raise serializers.ValidationError(f"{field} is required")
        
        return data

class VerificationSerializer(serializers.Serializer):
    """Handles merchant verification documents"""
    document_type = serializers.CharField()
    document_file = serializers.FileField()
    
    def validate_document_type(self, value):
        valid_types = ['id_card', 'business_license', 'tax_certificate']
        if value not in valid_types:
            raise serializers.ValidationError("Invalid document type")
        return value

class ReportTemplateSerializer(serializers.ModelSerializer):
    """Serializer for report templates"""

    class Meta:
        model = ReportTemplate
        fields = ['id', 'name', 'description', 'report_type', 'is_default', 'is_active', 'created_at']

class ReportSerializer(serializers.ModelSerializer):
    """Serializer for generated reports"""
    template_name = serializers.CharField(source='template.name', read_only=True)
    merchant_name = serializers.CharField(source='merchant.business_name', read_only=True)
    duration_days = serializers.IntegerField(read_only=True)

    class Meta:
        model = Report
        fields = [
            'id', 'template', 'template_name', 'name', 'description', 'status', 'format',
            'start_date', 'end_date', 'filters', 'file_url', 'file_size',
            'record_count', 'processing_time', 'error_message', 'is_scheduled',
            'created_at', 'updated_at', 'completed_at', 'duration_days', 'merchant_name'
        ]
        read_only_fields = ['file_url', 'file_size', 'record_count', 'processing_time', 'error_message', 'completed_at', 'duration_days']

    def validate(self, data):
        """Validate date range"""
        if data['start_date'] > data['end_date']:
            raise serializers.ValidationError("Start date cannot be after end date")

        # Ensure date range is not too large (max 365 days)
        if (data['end_date'] - data['start_date']).days > 365:
            raise serializers.ValidationError("Date range cannot exceed 365 days")

        return data

class ScheduledReportSerializer(serializers.ModelSerializer):
    """Serializer for scheduled reports"""
    template_name = serializers.CharField(source='template.name', read_only=True)
    merchant_name = serializers.CharField(source='merchant.business_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = ScheduledReport
        fields = [
            'id', 'template', 'template_name', 'name', 'description',
            'frequency', 'next_run', 'last_run', 'format', 'filters',
            'email_recipients', 'status', 'is_active', 'created_by',
            'created_by_name', 'created_at', 'updated_at', 'merchant_name'
        ]
        read_only_fields = ['next_run', 'last_run', 'created_by_name']

    def validate_email_recipients(self, value):
        """Validate email recipients"""
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

        for email in value:
            if not re.match(email_pattern, email):
                raise serializers.ValidationError(f"Invalid email address: {email}")

        return value

    def validate(self, data):
        """Validate scheduling configuration"""
        if data.get('status') == 'active' and not data.get('is_active'):
            raise serializers.ValidationError("Cannot set status to active when is_active is False")

        return data

class MerchantInvitationSerializer(serializers.ModelSerializer):
    """Serializer for merchant invitations"""
    invitation_link = serializers.SerializerMethodField()
    invited_by_name = serializers.SerializerMethodField()
    # Accept camelCase from frontend (map to snake_case model fields)
    businessName = serializers.CharField(source='business_name', required=False, allow_blank=True)
    businessType = serializers.CharField(source='business_type', required=False, allow_blank=True)
    phoneNumber = serializers.CharField(source='phone_number', required=False, allow_blank=True)

    class Meta:
        model = MerchantInvitation
        fields = [
            'id', 'email', 'business_name', 'business_type', 'phone_number',
            'notes', 'status', 'invitation_token', 'invited_at', 'expires_at',
            'accepted_at', 'invitation_link', 'invited_by', 'invited_by_name',
            'businessName', 'businessType', 'phoneNumber'
        ]
        read_only_fields = ['invitation_token', 'invited_at', 'accepted_at', 'invited_by', 'status', 'expires_at']
        extra_kwargs = {
            'business_name': {'required': False},
            'business_type': {'required': False},
            'phone_number': {'required': False},
        }

    def validate(self, data):
        """Ensure business_name is provided via either field"""
        if not data.get('business_name'):
            raise serializers.ValidationError({'business_name': 'Business name is required'})
        return data

    def get_invitation_link(self, obj):
        """Generate invitation link"""
        request = self.context.get('request')
        if request:
            base_url = f"{request.scheme}://{request.get_host()}"
            return f"{base_url}/auth/merchant/invite/{obj.invitation_token}/"
        return None

    def get_invited_by_name(self, obj):
        """Get the name of the user who created the invitation"""
        if obj.invited_by:
            return f"{obj.invited_by.first_name} {obj.invited_by.last_name}".strip()
        return None

class MerchantApplicationSerializer(serializers.ModelSerializer):
    """Serializer for merchant applications"""
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = MerchantApplication
        fields = [
            'id', 'business_name', 'business_type', 'business_description',
            'business_address', 'business_phone', 'business_email', 'website',
            'tax_id', 'registration_number', 'contact_first_name', 'contact_last_name',
            'contact_email', 'contact_phone', 'contact_position', 'industry',
            'employee_count', 'monthly_revenue', 'payment_methods', 'hear_about_us',
            'special_requirements', 'status', 'submitted_at', 'reviewed_at',
            'reviewed_by', 'reviewed_by_name', 'review_notes'
        ]
        read_only_fields = ['submitted_at', 'reviewed_at', 'reviewed_by']

    def get_reviewed_by_name(self, obj):
        """Get the name of the user who reviewed the application"""
        if obj.reviewed_by:
            return f"{obj.reviewed_by.first_name} {obj.reviewed_by.last_name}".strip()
        return None

class MerchantCustomerSerializer(serializers.ModelSerializer):
    merchant = MerchantSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    kyc_status_display = serializers.CharField(source='get_kyc_status_display', read_only=True)
    customer_email = serializers.EmailField(source='customer.user.email', read_only=True)
    customer_name = serializers.CharField(source='customer.user.get_full_name', read_only=True)
    customer_phone = serializers.CharField(source='customer.user.phone', read_only=True)

    class Meta:
        model = MerchantCustomer
        fields = [
            'id', 'merchant', 'customer', 'customer_email', 'customer_name', 'customer_phone',
            'status', 'status_display', 'kyc_status', 'kyc_status_display',
            'kyc_required', 'notes', 'onboarded_at'
        ]
        read_only_fields = ['id', 'onboarded_at', 'merchant']

class CreateMerchantCustomerSerializer(serializers.Serializer):
    customer_email = serializers.EmailField()
    customer_name = serializers.CharField(required=False, allow_blank=True)
    customer_phone = serializers.CharField(required=False, allow_blank=True)
    kyc_required = serializers.BooleanField(default=False)
    notes = serializers.CharField(required=False, allow_blank=True)

    def create(self, validated_data):
        merchant = self.context['request'].user.merchant_profile
        return MerchantCustomer.objects.create(merchant=merchant, **validated_data)

class OnboardMerchantCustomerSerializer(serializers.Serializer):
    kyc_required = serializers.BooleanField()
    notes = serializers.CharField(required=False, allow_blank=True)

class MerchantCustomerStatsSerializer(serializers.Serializer):
    total_customers = serializers.IntegerField()
    active_customers = serializers.IntegerField()
    suspended_customers = serializers.IntegerField()
    pending_kyc = serializers.IntegerField()

class MerchantSettingsSerializer(serializers.ModelSerializer):
    """Serializer for merchant business settings"""

    class Meta:
        model = MerchantSettings
        fields = [
            'id', 'business_name', 'tax_id', 'email', 'phone',
            'address_street', 'address_city', 'address_country', 'address_postal_code',
            'default_currency', 'timezone', 'language',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class MerchantNotificationSettingsSerializer(serializers.ModelSerializer):
    """Serializer for merchant notification settings"""

    class Meta:
        model = MerchantNotificationSettings
        fields = [
            'id', 'email_enabled', 'sms_enabled', 'sms_number',
            'push_enabled', 'transaction_alerts', 'payout_alerts', 'security_alerts',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class MerchantPayoutSettingsSerializer(serializers.ModelSerializer):
    """Serializer for merchant payout settings"""

    class Meta:
        model = MerchantPayoutSettings
        fields = [
            'id', 'default_method', 'auto_payout', 'minimum_payout',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
