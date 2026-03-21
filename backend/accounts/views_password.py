"""
Password, email verification, and backup verification views.
Split from accounts/views.py for maintainability.
"""
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
import logging

from .services import AuthService

logger = logging.getLogger(__name__)

class PasswordResetView(APIView):
    """
    Password reset request endpoint
    """
    
    def post(self, request):
        try:
            email = request.data.get('email')
            if not email:
                raise ValueError('Email is required')
                
            # Initiate password reset process
            AuthService.initiate_password_reset(email)
            return Response(
                {'message': 'Password reset link sent if email exists'},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class PasswordResetConfirmView(APIView):
    """
    Password reset confirmation endpoint
    """
    
    def post(self, request):
        try:
            token = request.data.get('token')
            new_password = request.data.get('new_password')
            
            if not all([token, new_password]):
                raise ValueError('Both token and new password are required')
                
            # Complete password reset process
            AuthService.complete_password_reset(token, new_password)
            return Response(
                {'message': 'Password successfully reset'},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class PasswordPolicyView(APIView):
    """
    Password policy configuration and validation endpoint
    """
    
    def get(self, request):
        try:
            # Get current password policy configuration
            policy = AuthService.get_password_policy()
            return Response(policy, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
            
    def post(self, request):
        try:
            # Validate password against policy
            password = request.data.get('password')
            if not password:
                raise ValueError('Password is required')
                
            is_valid, message = AuthService.validate_password_policy(password)
            return Response(
                {'valid': is_valid, 'message': message},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class PasswordChangeView(APIView):
    """
    Password change endpoint for authenticated users
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            current_password = request.data.get('current_password')
            new_password = request.data.get('new_password')
            confirm_password = request.data.get('confirm_password')
            
            if not all([current_password, new_password, confirm_password]):
                raise ValueError('All password fields are required')
                
            if new_password != confirm_password:
                raise ValueError('New passwords do not match')
                
            # Verify current password
            if not request.user.check_password(current_password):
                raise ValueError('Current password is incorrect')
                
            # Change password
            request.user.set_password(new_password)
            request.user.save()
            
            return Response(
                {'message': 'Password changed successfully'},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class EmailVerificationView(APIView):
    """
    Email verification request endpoint
    """

    def post(self, request):
        try:
            email = request.data.get('email')
            if not email:
                raise ValueError('Email is required')

            # Send email verification link
            AuthService.send_email_verification(email)
            return Response(
                {'message': 'Email verification link sent successfully'},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class EmailVerificationConfirmView(APIView):
    """
    Email verification confirmation endpoint
    """

    def post(self, request):
        try:
            token = request.data.get('token')
            if not token:
                raise ValueError('Verification token is required')

            # Verify email with token
            AuthService.verify_email_token(token)
            return Response(
                {'message': 'Email verified successfully'},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class BackupVerificationView(APIView):
    """
    Backup verification endpoint for account recovery
    """
    
    def post(self, request):
        try:
            email = request.data.get('email')
            verification_code = request.data.get('verification_code')
            
            if not all([email, verification_code]):
                raise ValueError('Both email and verification code are required')
                
            # Verify backup code and initiate recovery
            recovery_token = AuthService.verify_backup_code(email, verification_code)
            return Response(
                {'recovery_token': recovery_token},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
