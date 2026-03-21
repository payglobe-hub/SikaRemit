from rest_framework import serializers
from users.models import KYCDocument  # KYCDocument moved to users app
from .models import KYCStatus, BiometricRecord
from shared.constants import KYC_DOCUMENT_TYPES
from django.contrib.auth import get_user_model

User = get_user_model()

class KYCDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = KYCDocument
        fields = [
            'id', 'document_type', 'front_image', 'back_image', 'expiry_date',
            'status', 'rejection_reason', 'created_at', 'reviewed_at'
        ]
        read_only_fields = ['id', 'created_at', 'reviewed_at']

class KYCStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = KYCStatus
        fields = ['verification_level', 'is_verified', 'last_updated']
        read_only_fields = ['last_updated']

class BiometricRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = BiometricRecord
        fields = ['id', 'biometric_type', 'confidence_score', 'success', 'message', 'created_at']
        read_only_fields = ['id', 'created_at']

class KYCUploadSerializer(serializers.Serializer):
    document_type = serializers.ChoiceField(choices=KYC_DOCUMENT_TYPES)
    document_number = serializers.CharField(required=False, allow_blank=True)
    expiry_date = serializers.DateField(required=False)
    file = serializers.FileField()

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return KYCDocument.objects.create(**validated_data)

class BiometricFaceMatchSerializer(serializers.Serializer):
    selfie = serializers.FileField()
    document_photo = serializers.FileField()

class BiometricLivenessSerializer(serializers.Serializer):
    video = serializers.FileField()
