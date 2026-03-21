from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from users.models import KYCDocument  # KYCDocument moved to users app
from .models import KYCStatus, BiometricRecord
from .serializers import (
    KYCDocumentSerializer, KYCStatusSerializer, BiometricRecordSerializer,
    KYCUploadSerializer, BiometricFaceMatchSerializer, BiometricLivenessSerializer
)

class KYCDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = KYCDocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return KYCDocument.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action == 'create':
            return KYCUploadSerializer
        return KYCDocumentSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class KYCStatusViewSet(viewsets.ModelViewSet):
    serializer_class = KYCStatusSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return KYCStatus.objects.filter(user=self.request.user)

    def get_object(self):
        # Get or create KYC status for the user
        obj, created = KYCStatus.objects.get_or_create(user=self.request.user)
        return obj

class BiometricViewSet(viewsets.ModelViewSet):
    serializer_class = BiometricRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BiometricRecord.objects.filter(user=self.request.user)

    @action(detail=False, methods=['post'], url_path='verify')
    def verify_face(self, request):
        serializer = BiometricFaceMatchSerializer(data=request.data)
        if serializer.is_valid():
            # Simulate biometric verification
            # In real implementation, call biometric service
            success = True  # Mock success
            confidence_score = 0.95
            message = "Face verification successful"

            # Create record
            BiometricRecord.objects.create(
                user=request.user,
                biometric_type='face_match',
                confidence_score=confidence_score,
                success=success,
                message=message
            )

            # Update KYC status if needed
            kyc_status, created = KYCStatus.objects.get_or_create(user=request.user)
            if success and kyc_status.verification_level < 2:
                kyc_status.verification_level = 2
                kyc_status.save()

            return Response({
                'success': success,
                'confidence_score': confidence_score,
                'message': message
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='liveness')
    def check_liveness(self, request):
        serializer = BiometricLivenessSerializer(data=request.data)
        if serializer.is_valid():
            # Simulate liveness check
            # In real implementation, call liveness detection service
            success = True  # Mock success
            confidence_score = 0.92
            message = "Liveness check successful"

            # Create record
            BiometricRecord.objects.create(
                user=request.user,
                biometric_type='liveness',
                confidence_score=confidence_score,
                success=success,
                message=message
            )

            # Update KYC status if needed
            kyc_status, created = KYCStatus.objects.get_or_create(user=request.user)
            if success and kyc_status.verification_level < 1:
                kyc_status.verification_level = 1
                kyc_status.save()

            return Response({
                'success': success,
                'confidence_score': confidence_score,
                'message': message
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
