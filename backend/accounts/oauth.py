from django.conf import settings
from requests_oauthlib import OAuth2Session
from django.core.exceptions import PermissionDenied
from shared.constants import USER_TYPE_CUSTOMER
from .models import User
import logging

logger = logging.getLogger(__name__)

class GoogleOAuth:
    AUTHORIZATION_BASE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
    TOKEN_URL = 'https://oauth2.googleapis.com/token'
    USER_INFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'
    
    @staticmethod
    def get_oauth_session(redirect_uri=None):
        return OAuth2Session(
            settings.GOOGLE_OAUTH_CLIENT_ID,
            redirect_uri=redirect_uri,
            scope=['openid', 'email', 'profile']
        )
    
    @staticmethod
    def get_user_info(token):
        try:
            google = OAuth2Session(token=token)
            user_info = google.get(GoogleOAuth.USER_INFO_URL).json()
            
            if not user_info.get('email_verified'):
                raise PermissionDenied('Google email not verified')
                
            return {
                'email': user_info['email'],
                'first_name': user_info.get('given_name', ''),
                'last_name': user_info.get('family_name', '')
            }
        except Exception as e:
            logger.error(f"Google OAuth failed: {str(e)}")
            raise

class OAuthService:
    @staticmethod
    def authenticate_or_create(user_info, provider='google'):
        """Find or create user from OAuth data"""
        try:
            user = User.objects.filter(email=user_info['email']).first()
            
            if not user:
                user = User.objects.create_user(
                    email=user_info['email'],
                    password=None,
                    user_type=USER_TYPE_CUSTOMER,
                    first_name=user_info.get('first_name', ''),
                    last_name=user_info.get('last_name', ''),
                    is_verified=True
                )
                
            return user
        except Exception as e:
            logger.error(f"OAuth user creation failed: {str(e)}")
            raise
