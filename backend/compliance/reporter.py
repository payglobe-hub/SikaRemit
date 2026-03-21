import requests
from django.conf import settings
import json
from datetime import datetime
from users.models import User, KYCDocument
import logging

logger = logging.getLogger(__name__)

class ComplianceReporter:
    @staticmethod
    def generate_report(user_id):
        """Create regulatory report bundle"""
        user = User.objects.get(pk=user_id)
        documents = KYCDocument.objects.filter(user=user)
        
        report = {
            'user_id': str(user.id),
            'email': user.email,
            'verification_level': user.verification_level,
            'kyc_status': user.customer_profile.kyc_verified if hasattr(user, 'customer_profile') else False,
            'documents': [{
                'type': doc.document_type,
                'status': doc.status,
                'verified_at': doc.reviewed_at.isoformat() if doc.reviewed_at else None
            } for doc in documents],
            'biometric_checks': user.biometric_data,
            'generated_at': datetime.now().isoformat()
        }
        
        return report
    
    @staticmethod
    def submit_to_regulator(user_id):
        """Send report to financial authority"""
        if not settings.COMPLIANCE_REPORTING_ENABLED:
            return False
            
        report = ComplianceReporter.generate_report(user_id)
        
        try:
            response = requests.post(
                settings.REGULATOR_API_ENDPOINT,
                headers={
                    'Authorization': f'Bearer {settings.REGULATOR_API_KEY}',
                    'Content-Type': 'application/json'
                },
                data=json.dumps(report),
                timeout=30
            )
            response.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"Regulatory submission failed: {str(e)}")
            return False
