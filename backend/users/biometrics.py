import requests
from django.conf import settings
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class BiometricVerifier:
    @staticmethod
    def verify_face(document_image_url, selfie_image_url):
        """Compare document photo vs selfie"""
        if settings.DEBUG:
            return {
                'match_score': 0.95,
                'is_match': True,
                'liveness': 0.98,
                'timestamp': datetime.now().isoformat()
            }
            
        try:
            response = requests.post(
                'https://api.biometric-verification.com/v1/face-match',
                headers={'Authorization': f'Bearer {settings.BIOMETRIC_API_KEY}'},
                json={
                    'document_image': document_image_url,
                    'selfie_image': selfie_image_url
                },
                timeout=20
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Biometric verification failed: {str(e)}")
            return {'error': str(e)}

    @staticmethod
    def check_liveness(video_url):
        """Ensure selfie video is live capture"""
        if settings.DEBUG:
            return {'liveness_score': 0.99, 'is_live': True}
            
        try:
            response = requests.post(
                'https://api.biometric-verification.com/v1/liveness',
                headers={'Authorization': f'Bearer {settings.BIOMETRIC_API_KEY}'},
                json={'video_url': video_url},
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Liveness check failed: {str(e)}")
            return {'error': str(e)}
