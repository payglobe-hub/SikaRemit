from django.core.exceptions import ValidationError
from django.utils import timezone
from django.conf import settings
from .models import KYCDocument, Customer
from .document_scanner import DocumentScanner
from .tasks import send_kyc_webhook

class KYCService:
    @staticmethod
    def submit_kyc(user, document_type, front_image, back_image=None):
        """Submit KYC with fraud detection"""
        if not all([user.email, user.phone]):
            raise ValidationError('Complete profile before KYC submission')
            
        document = KYCDocument.objects.create(
            user=user,
            document_type=document_type,
            front_image=front_image,
            back_image=back_image
        )
        
        if settings.DOCUMENT_SCANNER_ENABLED:
            scan_result = DocumentScanner.scan_document(front_image.url)
            document.scan_data = scan_result
            document.risk_score = scan_result.get('risk_score', 1.0)
            
            if scan_result.get('expiry_date'):
                document.expiry_date = scan_result['expiry_date']
                
            if scan_result.get('valid') is False or scan_result.get('risk_score', 1.0) > 0.7:
                document.status = 'REJECTED'
                document.rejection_reason = 'Failed automated verification'
                
            document.save()
            
        return document
    
    @staticmethod
    def approve_kyc(document, reviewer, notes=''):
        """Approve KYC documents"""
        document.status = 'APPROVED'
        document.reviewed_by = reviewer
        document.reviewed_at = timezone.now()
        document.save()
        
        # Mark customer as verified if all docs approved
        if KYCDocument.objects.filter(user=document.user, status='APPROVED').count() >= 2:
            customer = document.user.customer_profile
            customer.kyc_verified = True
            customer.kyc_verified_at = timezone.now()
            customer.save()
        
        send_kyc_webhook.delay(document.id, 'kyc_approved')
        return document
    
    @staticmethod
    def reject_kyc(document, reviewer, reason):
        """Reject KYC documents"""
        document.status = 'REJECTED'
        document.reviewed_by = reviewer
        document.reviewed_at = timezone.now()
        document.rejection_reason = reason
        document.save()
        send_kyc_webhook.delay(document.id, 'kyc_rejected')
        return document
