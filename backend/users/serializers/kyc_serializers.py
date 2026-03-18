from rest_framework import serializers
from users.models import Customer, KYCDocument

class KYCDocumentSerializer(serializers.ModelSerializer):
    """Serializer for KYC document uploads"""

    front_image_url = serializers.SerializerMethodField()
    back_image_url = serializers.SerializerMethodField()

    class Meta:
        model = KYCDocument
        fields = [
            'id', 'document_type', 'front_image', 'back_image',
            'status', 'created_at', 'front_image_url', 'back_image_url',
            'expiry_date', 'is_expired'
        ]
        read_only_fields = ['id', 'status', 'created_at']

    def get_front_image_url(self, obj):
        if obj.front_image:
            return obj.front_image.url
        return None

    def get_back_image_url(self, obj):
        if obj.back_image:
            return obj.back_image.url
        return None

class CustomerKYCSerializer(serializers.ModelSerializer):
    """Serializer for customer KYC status and information"""

    kyc_status_display = serializers.CharField(source='get_kyc_status_display', read_only=True)
    can_make_transactions = serializers.BooleanField(read_only=True)
    needs_kyc_verification = serializers.BooleanField(read_only=True)

    class Meta:
        model = Customer
        fields = [
            'kyc_status', 'kyc_status_display', 'kyc_started_at',
            'kyc_completed_at', 'kyc_last_attempt',
            'first_transaction_attempt', 'transaction_attempts_count',
            'can_make_transactions', 'needs_kyc_verification',
            'date_of_birth', 'address'
        ]
        read_only_fields = [
            'kyc_status', 'kyc_started_at', 'kyc_completed_at',
            'kyc_last_attempt', 'first_transaction_attempt',
            'transaction_attempts_count', 'can_make_transactions',
            'needs_kyc_verification'
        ]

class KYCSubmissionSerializer(serializers.Serializer):
    """Serializer for KYC submission data"""

    document_type = serializers.ChoiceField(choices=KYCDocument.DOCUMENT_TYPES)
    front_image = serializers.ImageField()
    back_image = serializers.ImageField(required=False)
    date_of_birth = serializers.DateField(required=False)
    address = serializers.JSONField(required=False)
    id_number = serializers.CharField(max_length=50, required=False)
    expiry_date = serializers.DateField(required=False)
