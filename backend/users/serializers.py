from rest_framework import serializers
from .models import KYCDocument, User, Merchant, Customer, MerchantCustomer, MerchantKYCSubmission

class KYCDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = KYCDocument
        fields = '__all__'
        read_only_fields = ('status', 'reviewed_by', 'reviewed_at', 'rejection_reason')
        extra_kwargs = {
            'front_image': {'write_only': True},
            'back_image': {'write_only': True},
        }

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not self.context.get('include_images', False):
            data.pop('front_image_url', None)
            data.pop('back_image_url', None)
        return data

class UserSerializer(serializers.ModelSerializer):
    verification_level = serializers.IntegerField(read_only=True)
    last_biometric_verify = serializers.DateTimeField(read_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'user_type', 'is_verified', 'verification_level', 'last_biometric_verify')
        read_only_fields = ('id', 'is_verified')
        component_name = 'UsersUser'

class MerchantSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Merchant
        fields = '__all__'

class CustomerSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Customer
        fields = '__all__'

class MerchantCustomerSerializer(serializers.ModelSerializer):
    merchant = MerchantSerializer(read_only=True)
    customer = CustomerSerializer(read_only=True)
    merchant_id = serializers.IntegerField(write_only=True)
    customer_id = serializers.IntegerField(write_only=True)
    kyc_status_display = serializers.CharField(source='get_kyc_status_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    days_since_onboarded = serializers.SerializerMethodField()
    latest_kyc_submission = serializers.SerializerMethodField()
    
    class Meta:
        model = MerchantCustomer
        fields = '__all__'
        read_only_fields = ('onboarded_at', 'kyc_completed_at', 'suspended_at', 'last_kyc_check')
    
    def get_days_since_onboarded(self, obj):
        from django.utils import timezone
        return (timezone.now().date() - obj.onboarded_at.date()).days
    
    def get_latest_kyc_submission(self, obj):
        latest = obj.kyc_submissions.first()
        if latest:
            return MerchantKYCSubmissionSerializer(latest).data
        return None

class MerchantKYCSubmissionSerializer(serializers.ModelSerializer):
    merchant_customer = MerchantCustomerSerializer(read_only=True)
    kyc_document = KYCDocumentSerializer(read_only=True)
    reviewed_by = UserSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    review_priority_display = serializers.CharField(source='get_review_priority_display', read_only=True)
    days_pending = serializers.ReadOnlyField()
    
    class Meta:
        model = MerchantKYCSubmission
        fields = '__all__'
        read_only_fields = ('submitted_at', 'reviewed_at', 'escalated_at')
