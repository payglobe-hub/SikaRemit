from django.conf import settings
from django.utils.deprecation import MiddlewareMixin
from .models import AdminActivity, BlacklistedToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework import status
from rest_framework.response import Response
import json
import logging

logger = logging.getLogger(__name__)

class SecurityHeadersMiddleware(MiddlewareMixin):
    def process_response(self, request, response):
        # CSP Headers
        response['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
        
        # Other security headers
        response['X-Frame-Options'] = 'DENY'
        response['X-Content-Type-Options'] = 'nosniff'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        
        # HSTS for HTTPS
        if not settings.DEBUG:
            response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
            
        return response

class AdminActivityMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        if request.user.is_authenticated and request.user.is_staff:
            if request.method in ('POST', 'PUT', 'DELETE', 'PATCH'):
                AdminActivity.objects.create(
                    admin=request.user,
                    action_type='SYSTEM_ACTION',
                    details={
                        'path': request.path,
                        'method': request.method,
                        'params': dict(request.GET),
                        'data': request.POST.dict() if request.method == 'POST' else {}
                    },
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT')
                )
        
        return response

class BlacklistJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that checks token blacklist
    """
    
    def get_validated_token(self, raw_token):
        """
        Validate token and check if it's blacklisted
        """
        # First, get the validated token from parent class
        validated_token = super().get_validated_token(raw_token)
        
        # Check if the token (refresh token) is blacklisted
        token_str = str(raw_token)
        if BlacklistedToken.is_blacklisted(token_str):
            logger.warning(f"Blacklisted token used: {token_str[:20]}...")
            raise InvalidToken('Token has been blacklisted')
        
        return validated_token

class TokenBlacklistMiddleware:
    """
    Middleware to check token blacklist for all authenticated requests
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Check if Authorization header exists
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            
            # Check if token is blacklisted
            if BlacklistedToken.is_blacklisted(token):
                logger.warning(f"Blacklisted token access attempt: {token[:20]}...")
                return Response(
                    {'error': 'Token has been blacklisted'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        
        response = self.get_response(request)
        return response
