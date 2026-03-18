"""
DEPRECATED: This module is deprecated. Use users.models instead.

The KYCDocument model has been consolidated into users.KYCDocument.
The KYCStatus model has been replaced by users.Customer.kyc_status field.
The BiometricRecord model remains here for backwards compatibility.

For new code, import from users.models:
    from users.models import KYCDocument, Customer
"""
import warnings
from django.db import models
from django.contrib.auth import get_user_model
from django.core.files.storage import default_storage
from shared.constants import KYC_DOCUMENT_TYPES, KYC_DOCUMENT_STATUS_CHOICES, STATUS_PENDING

User = get_user_model()

class KYCDocumentLegacy(models.Model):
    """
    DEPRECATED: Use users.KYCDocument instead.
    This model is kept for migration compatibility only.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='kyc_app_documents')
    document_type = models.CharField(max_length=50, choices=KYC_DOCUMENT_TYPES)
    document_number = models.CharField(max_length=100, blank=True, null=True)
    file = models.FileField(upload_to='kyc/documents/')
    expiry_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=KYC_DOCUMENT_STATUS_CHOICES, default=STATUS_PENDING)
    rejection_reason = models.TextField(blank=True, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-uploaded_at']
        db_table = 'kyc_kycdocument'  # Keep original table name

    def __str__(self):
        return f"{self.user.email} - {self.get_document_type_display()}"

    def save(self, *args, **kwargs):
        warnings.warn(
            "KYCDocumentLegacy is deprecated. Use users.KYCDocument instead.",
            DeprecationWarning,
            stacklevel=2
        )
        super().save(*args, **kwargs)

class KYCStatus(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='kyc_status')
    verification_level = models.IntegerField(default=0)  # 0-3
    is_verified = models.BooleanField(default=False)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email} - Level {self.verification_level}"

class BiometricRecord(models.Model):
    BIOMETRIC_TYPES = [
        ('face_match', 'Face Match'),
        ('liveness', 'Liveness Check'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='biometric_records')
    biometric_type = models.CharField(max_length=20, choices=BIOMETRIC_TYPES)
    confidence_score = models.FloatField(blank=True, null=True)
    success = models.BooleanField(default=False)
    message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.get_biometric_type_display()}"
