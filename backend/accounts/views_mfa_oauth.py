"""
MFA and OAuth views: MFA setup/login/backup codes, Google OAuth.
Split from accounts/views.py for maintainability.
"""
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django.conf import settings
from django.http import HttpResponseRedirect
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
import logging

from shared.constants import (
    USER_TYPE_SUPER_ADMIN, USER_TYPE_BUSINESS_ADMIN, USER_TYPE_OPERATIONS_ADMIN,
    USER_TYPE_VERIFICATION_ADMIN, USER_TYPE_MERCHANT, USER_TYPE_CUSTOMER,
)
from .services import AuthService

logger = logging.getLogger(__name__)

ROLE_MAPPING = {
    USER_TYPE_SUPER_ADMIN: 'super_admin',
    USER_TYPE_BUSINESS_ADMIN: 'business_admin',
    USER_TYPE_OPERATIONS_ADMIN: 'operations_admin',
    USER_TYPE_VERIFICATION_ADMIN: 'verification_admin',
    USER_TYPE_MERCHANT: 'merchant',
    USER_TYPE_CUSTOMER: 'customer',
}

class MFASetupView(APIView):
    """
    MFA setup endpoint
    """
    from rest_framework.permissions import IsAuthenticated
    permission_classes = [IsAuthenticated]  # Use DRF authentication
    
    def post(self, request):
        try:
            # DRF handles authentication, so request.user should be available
            user = request.user
            
            # Double-check authentication
            if not user or not user.is_authenticated:
                return Response(
                    {'error': 'Authentication required'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
                
            # Generate MFA secret and QR code
            mfa_data = AuthService.setup_mfa(user)
            return Response(mfa_data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class MFAVerifyView(APIView):
    """
    MFA verification endpoint for setup verification
    """
    from rest_framework.permissions import IsAuthenticated
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            # Handle both Django and DRF requests
            user = getattr(request, 'user', None)
            if not user and hasattr(request, '_request'):
                user = getattr(request._request, 'user', None)
            
            # Double-check authentication
            if not user or not user.is_authenticated:
                return Response(
                    {'error': 'Authentication required'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            mfa_code = request.data.get('code')
            if not mfa_code:
                return Response(
                    {'error': 'MFA code is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Verify the MFA code
            from .mfa import MFAService
            is_valid = MFAService.verify_code(user, mfa_code)
            
            if not is_valid:
                return Response(
                    {'error': 'Invalid MFA code'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get the secret from cache and save it to the user's profile
            from django.core.cache import cache
            secret = cache.get(f'mfa_secret_{user.id}')
            if secret:
                user.mfa_secret = secret
                user.mfa_enabled = True
                user.save()
                # Clear the cache since it's now stored in the database
                cache.delete(f'mfa_secret_{user.id}')
            else:
                # If no secret in cache, just enable MFA
                user.mfa_enabled = True
                user.save()
            
            return Response({
                'message': 'MFA verification successful',
                'mfa_enabled': True
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class MFALoginView(APIView):
    """
    MFA verification endpoint for logins
    """
    
    def post(self, request):
        try:
            # Requires temporary auth token from initial login
            temp_token = request.data.get('temp_token')
            mfa_code = request.data.get('code')
            
            if not all([temp_token, mfa_code]):
                raise ValueError('Both temporary token and MFA code are required')
                
            # Verify MFA code and complete authentication
            tokens = AuthService.verify_mfa_login(temp_token, mfa_code)
            return Response(tokens, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_401_UNAUTHORIZED
            )

class MFABackupCodesView(APIView):
    """
    MFA backup codes endpoint
    """
    
    def get(self, request):
        try:
            # Requires authenticated user
            if not request.user.is_authenticated:
                raise Exception('Authentication required')
                
            # Get existing backup codes
            codes = AuthService.get_backup_codes(request.user)
            return Response({'codes': codes}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
            
    def post(self, request):
        try:
            # Requires authenticated user
            if not request.user.is_authenticated:
                raise Exception('Authentication required')
                
            # Generate new backup codes
            new_codes = AuthService.generate_backup_codes(request.user)
            return Response({'codes': new_codes}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

@csrf_exempt
def google_oauth_view(request):
    """
    Simple function-based view for Google OAuth initiation to bypass DRF authentication
    """
    try:
        if not hasattr(settings, 'GOOGLE_OAUTH_CLIENT_ID') or not settings.GOOGLE_OAUTH_CLIENT_ID:
            from django.http import JsonResponse
            return JsonResponse({
                'error': 'Google OAuth is not configured. Please set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in your environment.'
            }, status=503)

        from .oauth import GoogleOAuth

        # Get the frontend callback URL
        frontend_url = request.GET.get('callback_url', 'http://localhost:3000')
        redirect_uri = f"{frontend_url}/auth/callback/google"

        google_oauth = GoogleOAuth()
        oauth_session = google_oauth.get_oauth_session(redirect_uri)

        authorization_url, state = oauth_session.authorization_url(
            GoogleOAuth.AUTHORIZATION_BASE_URL,
            access_type="offline",
            prompt="consent"
        )

        # Store state and redirect_uri in session for security
        request.session['oauth_state'] = state
        request.session['oauth_redirect_uri'] = redirect_uri

        return HttpResponseRedirect(authorization_url)

    except Exception as e:
        logger.error(f"Google OAuth initiation failed: {str(e)}")
        from django.http import JsonResponse
        return JsonResponse({'error': 'Failed to initiate Google OAuth'}, status=500)

class GoogleAuthView(APIView):
    """
    Google OAuth initiation endpoint - redirects to Google for authorization
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def get(self, request):
        try:
            # Check if Google OAuth is configured
            if not hasattr(settings, 'GOOGLE_OAUTH_CLIENT_ID') or not settings.GOOGLE_OAUTH_CLIENT_ID:
                return Response(
                    {'error': 'Google OAuth is not configured. Please set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in your environment.'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )

            from .oauth import GoogleOAuth

            # Get the frontend callback URL
            frontend_url = request.GET.get('callback_url', 'http://localhost:3000')
            redirect_uri = f"{frontend_url}/auth/callback/google"

            google_oauth = GoogleOAuth()
            oauth_session = google_oauth.get_oauth_session(redirect_uri)

            authorization_url, state = oauth_session.authorization_url(
                GoogleOAuth.AUTHORIZATION_BASE_URL,
                access_type="offline",
                prompt="consent"
            )

            # Store state and redirect_uri in session for security
            request.session['oauth_state'] = state
            request.session['oauth_redirect_uri'] = redirect_uri

            return HttpResponseRedirect(authorization_url)

        except Exception as e:
            logger.error(f"Google OAuth initiation failed: {str(e)}")
            return Response(
                {'error': 'Failed to initiate Google OAuth'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class GoogleOAuthCallbackView(APIView):
    """
    Google OAuth callback endpoint to exchange authorization code for tokens
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def post(self, request):
        try:
            # Check if Google OAuth is configured
            if not hasattr(settings, 'GOOGLE_OAUTH_CLIENT_ID') or not settings.GOOGLE_OAUTH_CLIENT_ID:
                return Response(
                    {'error': 'Google OAuth is not configured. Please set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in your environment.'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )

            code = request.data.get('code')
            if not code:
                raise ValueError('Authorization code is required')

            # Get redirect_uri from request or use default
            # This must match the redirect_uri used in the frontend OAuth initiation
            redirect_uri = request.data.get('redirect_uri', 'http://localhost:3000/auth/callback/google')

            # Exchange code for tokens using direct HTTP request (more reliable)
            import requests as http_requests
            token_url = 'https://oauth2.googleapis.com/token'
            
            token_data = {
                'code': code,
                'client_id': settings.GOOGLE_OAUTH_CLIENT_ID,
                'client_secret': settings.GOOGLE_OAUTH_CLIENT_SECRET,
                'redirect_uri': redirect_uri,
                'grant_type': 'authorization_code'
            }
            
            token_response = http_requests.post(token_url, data=token_data)
            
            if token_response.status_code != 200:
                error_data = token_response.json()
                raise ValueError(f"Token exchange failed: {error_data.get('error_description', error_data.get('error', 'Unknown error'))}")
            
            google_tokens = token_response.json()
            access_token = google_tokens.get('access_token')
            
            # Get user info from Google
            userinfo_url = 'https://www.googleapis.com/oauth2/v3/userinfo'
            userinfo_response = http_requests.get(
                userinfo_url,
                headers={'Authorization': f'Bearer {access_token}'}
            )
            
            if userinfo_response.status_code != 200:
                raise ValueError('Failed to get user info from Google')
            
            google_user = userinfo_response.json()
            
            user_info = {
                'email': google_user['email'],
                'first_name': google_user.get('given_name', ''),
                'last_name': google_user.get('family_name', '')
            }
            
            if not google_user.get('email_verified'):
                raise ValueError('Google email not verified')
            
            # Authenticate or create user
            from .oauth import OAuthService

            # Authenticate or create user
            user = OAuthService.authenticate_or_create(user_info, 'google')

            # Generate JWT tokens
            tokens = AuthService.generate_tokens(user)

            return Response({
                'access': str(tokens['access']),
                'refresh': str(tokens['refresh']),
                'user': {
                    'id': str(user.id),
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'role': ROLE_MAPPING.get(user.user_type, 'customer'),
                    'is_verified': user.is_verified,
                }
            }, status=status.HTTP_200_OK)

        except Exception as e:
            import traceback
            logger.error(f"Google OAuth callback failed: {str(e)}")
            logger.error(f"Full traceback: {traceback.format_exc()}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
