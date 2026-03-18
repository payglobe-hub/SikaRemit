"""
Authentication views: login, register, logout, refresh, token validation, profile.
Split from accounts/views.py for maintainability.
"""
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.core.cache import cache
from shared.constants import (
    USER_TYPE_SUPER_ADMIN, USER_TYPE_BUSINESS_ADMIN, USER_TYPE_OPERATIONS_ADMIN,
    USER_TYPE_VERIFICATION_ADMIN, USER_TYPE_MERCHANT, USER_TYPE_CUSTOMER,
)
from functools import wraps
import time
import logging

from .api.notifications import NotificationService
from .serializers import (
    UserLoginSerializer, UserRegisterSerializer, AccountsUserSerializer,
    MyTokenObtainPairSerializer,
)
from .services import AuthService

logger = logging.getLogger(__name__)
User = get_user_model()

def validate_token(view_func):
    @wraps(view_func)
    def wrapped_view(request, *args, **kwargs):
        try:
            auth_header = request.headers.get('Authorization', '').split()
            if len(auth_header) == 2 and auth_header[0] == 'Bearer':
                AccessToken(auth_header[1]).verify()
                return view_func(request, *args, **kwargs)
            raise Exception('Invalid token format')
        except Exception as e:
            logger.warning(f'Token validation failed: {str(e)}')
            return Response({'error': 'Invalid or expired token'}, status=401)
    return wrapped_view

from django.http import JsonResponse

class SessionMonitorMiddleware:
    """
    Middleware to monitor and expire inactive sessions
    """
    def __init__(self, get_response):
        self.get_response = get_response
        self.excluded_paths = ['/api/auth/refresh', '/api/auth/validate', '/api/v1/accounts/google/', '/api/v1/accounts/google/callback/']
        
    def __call__(self, request):
        if request.user.is_authenticated and request.path not in self.excluded_paths:
            last_activity = request.session.get('last_activity')
            if last_activity and time.time() - last_activity > 3600:
                AuthService.logout_user(request.user)
                request.session.flush()
                return JsonResponse({'error': 'Session expired'}, status=401)
            request.session['last_activity'] = time.time()
        return self.get_response(request)

class UserRegisterView(APIView):
    """
    User registration endpoint
    """
    permission_classes = []  # Allow unauthenticated access to registration
    throttle_classes = []  # Disable throttling for registration
    
    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        if not serializer.is_valid():
            # Log validation errors for debugging
            logger.error(f"Registration validation failed: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Auto-identify user type if not provided or if we want to override
            email = serializer.validated_data['email']
            provided_user_type = serializer.validated_data.get('user_type')
            
            # Auto-detect user type based on email patterns
            auto_detected_type = AuthService.auto_identify_user_type(email, provided_user_type)
            
            # Log auto-identification if it differs from provided type
            if provided_user_type and auto_detected_type != provided_user_type:
                logger.info(f"Auto-identified user type {auto_detected_type} for {email}, overriding provided type {provided_user_type}")
            elif not provided_user_type:
                logger.info(f"Auto-identified user type {auto_detected_type} for {email}")
            
            user = AuthService.create_user(
                email=email,
                password=serializer.validated_data['password'],
                user_type=auto_detected_type,
                username=serializer.validated_data.get('username'),
                first_name=serializer.validated_data.get('first_name'),
                last_name=serializer.validated_data.get('last_name'),
                phone=serializer.validated_data.get('phone', '')
            )
            
            # Notify admins about new user registration
            user_type_label = {
                USER_TYPE_SUPER_ADMIN: 'Super Admin',
                USER_TYPE_BUSINESS_ADMIN: 'Business Admin',
                USER_TYPE_OPERATIONS_ADMIN: 'Operations Admin',
                USER_TYPE_VERIFICATION_ADMIN: 'Verification Admin',
                USER_TYPE_MERCHANT: 'Merchant',
                USER_TYPE_CUSTOMER: 'Customer',
            }.get(auto_detected_type, 'User')
            NotificationService.notify_admins(
                title=f"New {user_type_label} Registration",
                message=f"A new {user_type_label.lower()} has registered: {user.email}",
                level='info',
                notification_type='account_registered',
                metadata={
                    'user_id': user.id,
                    'email': user.email,
                    'user_type': auto_detected_type,
                    'user_type_label': user_type_label
                }
            )
            
            tokens = AuthService.get_tokens_for_user(user)
            
            # Include user type display info in response
            user_type_info = AuthService.get_user_type_display_info(user.user_type)
            
            response_data = {
                **tokens,
                'user_type_info': user_type_info,
                'auto_identified': provided_user_type is None or auto_detected_type != provided_user_type
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Registration failed: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

@method_decorator(csrf_exempt, name='dispatch')
class UserLoginView(APIView):
    """
    User authentication endpoint with caching optimization
    """
    permission_classes = []  # Allow unauthenticated access to login
    authentication_classes = []  # Disable JWT authentication for login
    throttle_classes = []  # Disable throttling for login
    
    def post(self, request):
        try:
            # Validate input data
            if not request.data or 'email' not in request.data or 'password' not in request.data:
                return Response(
                    {'error': 'Email and password are required'},
                    status=400
                )
            
            serializer = UserLoginSerializer(data=request.data)
            
            is_valid = serializer.is_valid()
            
            if not is_valid:
                error_msg = 'Invalid email or password.'
                
                # Check if this might be an admin login attempt
                email = request.data.get('email', '')
                try:
                    user = User.objects.filter(email=email).first()
                    if user and user.user_type == USER_TYPE_SUPER_ADMIN:  # Admin user
                        error_msg = 'Access denied. Invalid admin credentials.'
                except Exception:
                    pass
                
                return Response(
                    {'error': error_msg},
                    status=400
                )
            
            user = serializer.validated_data['user']
            
            # Generate tokens
            try:
                refresh = RefreshToken.for_user(user)
                access_token = str(refresh.access_token)
                refresh_token = str(refresh)
            except Exception as e:
                logger.error(f"Token generation failed: {str(e)}")
                return Response(
                    {'error': 'Authentication failed. Please try again.'},
                    status=500
                )

            # Updated role mapping for all 6 user types
            role_mapping = {
                USER_TYPE_SUPER_ADMIN: 'super_admin',
                USER_TYPE_BUSINESS_ADMIN: 'business_admin',
                USER_TYPE_OPERATIONS_ADMIN: 'operations_admin',
                USER_TYPE_VERIFICATION_ADMIN: 'verification_admin',
                USER_TYPE_MERCHANT: 'merchant',
                USER_TYPE_CUSTOMER: 'customer',
            }

            # Use role mapping based on user_type, with fallback for edge cases
            resolved_role = role_mapping.get(getattr(user, 'user_type', 6), 'customer')

            # Override for actual Django superusers (rare case)
            if getattr(user, 'is_superuser', False) and not getattr(user, 'user_type', None):
                resolved_role = 'super_admin'
            
            # Get user type display info
            user_type_info = AuthService.get_user_type_display_info(user.user_type)
            
            response_data = {
                'access': access_token,
                'refresh': refresh_token,
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name or '',
                    'last_name': user.last_name or '',
                    'user_type': user.user_type,
                    'role': resolved_role,
                    'is_verified': user.is_verified
                },
                'user_type_info': user_type_info
            }
            
            # Check for new device login and send notification
            try:
                user_agent = request.META.get('HTTP_USER_AGENT', 'Unknown')
                ip_address = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', 'Unknown'))
                if ',' in ip_address:
                    ip_address = ip_address.split(',')[0].strip()
                
                # Check if this is a new device (simplified check using AuthLog if it exists)
                from accounts.models import AuthLog
                import hashlib
                
                # Generate a simple device fingerprint from user agent and IP
                device_fingerprint = hashlib.md5(f"{user_agent}:{ip_address}".encode()).hexdigest()[:32]
                
                recent_logins = AuthLog.objects.filter(
                    user=user,
                    device_id=device_fingerprint,
                    success=True
                ).exists()
                
                if not recent_logins:
                    # This appears to be a new device/location
                    NotificationService.create_notification(
                        user=user,
                        title="New Device Login",
                        message=f"Your account was accessed from a new device or location. IP: {ip_address[:20]}... If this wasn't you, please secure your account immediately.",
                        level='security',
                        notification_type='security_login_from_new_device',
                        metadata={
                            'ip_address': ip_address,
                            'user_agent': user_agent[:100] if user_agent else 'Unknown',
                            'login_time': timezone.now().isoformat()
                        }
                    )
                
                # Log this login attempt
                AuthLog.objects.create(
                    user=user,
                    ip_address=ip_address,
                    device_id=device_fingerprint,
                    success=True
                )
            except Exception as e:
                logger.warning(f"Failed to check/log new device login: {e}")
            
            return Response(response_data, status=200)
            
        except Exception as e:
            logger.error(f"Unexpected error in login: {str(e)}")
            return Response(
                {'error': 'An unexpected error occurred. Please try again.'},
                status=500
            )

class UserRefreshView(APIView):
    """
    Token refresh endpoint
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                raise ValueError('Refresh token is required')
                
            tokens = AuthService.refresh_tokens(refresh_token)
            return Response(tokens, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class UserLogoutView(APIView):
    """
    User logout endpoint with token blacklisting
    """
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                raise ValueError('Refresh token required')
            
            # Get user from request
            user = request.user if request.user.is_authenticated else None
            
            # Blacklist the refresh token
            if user:
                AuthService.blacklist_token(refresh_token, user)
                
                # Invalidate all user sessions (logout from all devices)
                invalidated_sessions = AuthService.invalidate_user_sessions(user)
                
                return Response(
                    {
                        'message': f'Successfully logged out from {invalidated_sessions} device(s)',
                        'sessions_invalidated': invalidated_sessions
                    },
                    status=status.HTTP_200_OK
                )
            else:
                # Just blacklist the token if no authenticated user
                AuthService.blacklist_token(refresh_token)
                
                return Response(
                    {'message': 'Successfully logged out'},
                    status=status.HTTP_200_OK
                )
                
        except Exception as e:
            logger.error(f'Logout failed: {str(e)}')
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class LogoutOtherSessionsView(APIView):
    """
    Logout from all other active sessions (keep current session active)
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            # Get current session key from JWT token or create one
            current_refresh_token = request.data.get('current_refresh_token')
            
            if not current_refresh_token:
                raise ValueError('Current refresh token required')
            
            # Invalidate all other sessions except current one
            # For JWT, we'll use the refresh token as session identifier
            invalidated_sessions = AuthService.invalidate_user_sessions(
                request.user, 
                exclude_session_key=current_refresh_token
            )
            
            return Response(
                {
                    'message': f'Logged out from {invalidated_sessions} other device(s)',
                    'sessions_invalidated': invalidated_sessions,
                    'current_session_active': True
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            logger.error(f'Logout other sessions failed: {str(e)}')
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class ActiveSessionsView(APIView):
    """
    Get all active sessions for the authenticated user
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            sessions = AuthService.get_user_active_sessions(request.user)
            
            # Format session data for response
            session_data = []
            for session in sessions:
                session_info = {
                    'id': session.id,
                    'session_key': session.session_key[:20] + '...',  # Partial key for security
                    'ip_address': session.ip_address,
                    'user_agent': session.user_agent[:100] + '...' if len(session.user_agent) > 100 else session.user_agent,
                    'device_id': session.device_id,
                    'created_at': session.created_at.isoformat(),
                    'last_activity': session.last_activity.isoformat() if hasattr(session, 'last_activity') else session.created_at.isoformat(),
                    'expires_at': session.expiry_date.isoformat(),
                    'is_current': False  # Will be determined by comparing with current token
                }
                session_data.append(session_info)
            
            return Response({
                'sessions': session_data,
                'total_sessions': len(session_data)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f'Get active sessions failed: {str(e)}')
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class TokenValidateView(APIView):
    """
    Token validation endpoint
    """
    permission_classes = []  # Allow unauthenticated access for token validation

    def post(self, request):
        try:
            token = request.data.get('token')
            if not token:
                raise ValueError('Token is required')

            # Validate the token
            AccessToken(token).verify()

            return Response({'valid': True}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'valid': False, 'error': str(e)},
                status=status.HTTP_401_UNAUTHORIZED
            )

class ProfileView(APIView):
    """
    User profile endpoint for authenticated users
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Handle both Django and DRF requests
        user = getattr(request, 'user', None)
        if not user and hasattr(request, '_request'):
            user = getattr(request._request, 'user', None)
        
        if not user:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            serializer = AccountsUserSerializer(user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def patch(self, request):
        # Handle both Django and DRF requests
        user = getattr(request, 'user', None)
        if not user and hasattr(request, '_request'):
            user = getattr(request._request, 'user', None)
        
        if not user:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            serializer = AccountsUserSerializer(user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer
