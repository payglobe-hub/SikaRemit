import requests
from django.conf import settings
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class DocumentScanner:
    @staticmethod
    def scan_document(image_url):
        """Enhanced document scanning with OCR and validation"""
        if settings.DEBUG:
            return {
                'valid': True,
                'document_type': 'ID_CARD',
                'expiry_date': '2026-12-31',
                'details': {
                    'name': 'John Doe',
                    'number': 'XYZ123'
                },
                'risk_score': 0.1
            }
        
        try:
            # Phase 1: Document authenticity check
            auth_response = requests.post(
                'https://api.document-scanner.com/v1/authenticate',
                headers={'Authorization': f'Bearer {settings.DOCUMENT_SCANNER_API_KEY}'},
                json={'image_url': image_url},
                timeout=15
            )
            auth_response.raise_for_status()
            
            # Phase 2: OCR extraction
            ocr_response = requests.post(
                'https://api.document-scanner.com/v1/ocr',
                headers={'Authorization': f'Bearer {settings.DOCUMENT_SCANNER_API_KEY}'},
                json={'image_url': image_url},
                timeout=20
            )
            ocr_response.raise_for_status()
            
            result = {
                'valid': auth_response.json().get('authentic', False),
                'document_type': auth_response.json().get('type'),
                'expiry_date': ocr_response.json().get('expiry_date'),
                'details': ocr_response.json().get('extracted_data', {}),
                'risk_score': auth_response.json().get('risk_score', 1.0)
            }
            
            # Validate expiry date format
            if result.get('expiry_date'):
                try:
                    datetime.strptime(result['expiry_date'], '%Y-%m-%d')
                except ValueError:
                    result['expiry_date'] = None
                    
            return result
            
        except requests.RequestException as e:
            logger.error(f"Document scan failed: {str(e)}")
            return {'error': str(e), 'valid': False, 'risk_score': 1.0}
