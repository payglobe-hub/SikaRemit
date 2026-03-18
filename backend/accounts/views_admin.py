"""
Admin views: user CRUD, activity logs, security audit, sessions, reports.
Split from accounts/views.py for maintainability.
"""
from rest_framework.response import Response
from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.conf import settings
from django.utils import timezone
import json
import os
import logging

from .serializers import AccountsUserSerializer
from .permissions import IsSuperAdmin, IsBusinessAdmin, IsAdminUser
from .services import AuthService

logger = logging.getLogger(__name__)
User = get_user_model()

class AdminSettingsMixin:
    """Mixin to handle admin settings operations"""

    def save_settings_to_cache(self, category, data):
        """Save settings to cache for quick access"""
        cache_key = f'admin_settings_{category}'
        cache.set(cache_key, data, timeout=3600)  # Cache for 1 hour
        return True

    def get_settings_from_cache(self, category, default=None):
        """Get settings from cache"""
        cache_key = f'admin_settings_{category}'
        return cache.get(cache_key, default)

    def save_settings_to_file(self, category, data):
        """Save settings to a JSON file as backup"""
        try:
            settings_dir = os.path.join(settings.BASE_DIR, 'admin_settings')
            os.makedirs(settings_dir, exist_ok=True)
            file_path = os.path.join(settings_dir, f'{category}.json')

            with open(file_path, 'w') as f:
                json.dump(data, f, indent=2, default=str)
            return True
        except Exception as e:
            
            return False

    def log_admin_activity(self, user, action, details=None):
        """Log admin activity"""
        try:
            AdminActivity.objects.create(
                admin=user,
                action_type=action,
                details=details or {},
                ip_address=self.get_client_ip(),
                user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
                timestamp=timezone.now()
            )
        except Exception as e:
            pass

    def get_client_ip(self):
        """Get client IP address"""
        x_forwarded_for = self.request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = self.request.META.get('REMOTE_ADDR')
        return ip

class AdminGeneralSettingsView(AdminSettingsMixin, APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def patch(self, request):
        """Update general system settings"""
        data = request.data

        # Validate required fields
        required_fields = ['system_name', 'default_timezone', 'default_currency', 'default_language']
        for field in required_fields:
            if field not in data:
                return Response(
                    {'error': f'Missing required field: {field}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Save settings
        settings_data = {
            'system_name': data.get('system_name'),
            'default_timezone': data.get('default_timezone'),
            'default_currency': data.get('default_currency'),
            'default_language': data.get('default_language'),
            'maintenance_mode': data.get('maintenance_mode', False),
            'debug_mode': data.get('debug_mode', False),
            'public_registration': data.get('public_registration', True),
            'updated_at': timezone.now().isoformat(),
            'updated_by': request.user.id
        }

        # Save to cache and file
        self.save_settings_to_cache('general', settings_data)
        self.save_settings_to_file('general', settings_data)

        # Log activity
        self.log_admin_activity(
            request.user,
            'settings_updated',
            {'category': 'general', 'settings': list(settings_data.keys())}
        )

        return Response({
            'message': 'General settings updated successfully',
            'settings': settings_data
        })

    def get(self, request):
        """Get current general settings"""
        settings_data = self.get_settings_from_cache('general', {})

        # Return default values if no settings found
        if not settings_data:
            settings_data = {
                'system_name': 'SikaRemit',
                'default_timezone': 'UTC',
                'default_currency': 'GHS',
                'default_language': 'en',
                'maintenance_mode': False,
                'debug_mode': False,
                'public_registration': True
            }

        return Response(settings_data)

class AdminSecuritySettingsView(AdminSettingsMixin, APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def patch(self, request):
        """Update security settings"""
        data = request.data

        settings_data = {
            'session_timeout': data.get('session_timeout', 60),
            'max_login_attempts': data.get('max_login_attempts', 5),
            'min_password_length': data.get('min_password_length', 8),
            'password_policy': data.get('password_policy', 'strong'),
            'two_factor_required': data.get('two_factor_required', False),
            'ip_whitelisting': data.get('ip_whitelisting', False),
            'audit_logging': data.get('audit_logging', True),
            'updated_at': timezone.now().isoformat(),
            'updated_by': request.user.id
        }

        # Save to cache and file
        self.save_settings_to_cache('security', settings_data)
        self.save_settings_to_file('security', settings_data)

        # Log activity
        self.log_admin_activity(
            request.user,
            'settings_updated',
            {'category': 'security', 'settings': list(settings_data.keys())}
        )

        return Response({
            'message': 'Security settings updated successfully',
            'settings': settings_data
        })

    def get(self, request):
        """Get current security settings"""
        settings_data = self.get_settings_from_cache('security', {})

        if not settings_data:
            settings_data = {
                'session_timeout': 60,
                'max_login_attempts': 5,
                'min_password_length': 8,
                'password_policy': 'strong',
                'two_factor_required': False,
                'ip_whitelisting': False,
                'audit_logging': True
            }

        return Response(settings_data)

class AdminAPISettingsView(AdminSettingsMixin, APIView):
    permission_classes = [IsAuthenticated, IsBusinessAdmin]

    def patch(self, request):
        """Update API settings"""
        data = request.data

        settings_data = {
            'api_rate_limit': data.get('api_rate_limit', 1000),
            'api_timeout': data.get('api_timeout', 30),
            'webhook_secret': data.get('webhook_secret', '••••••••'),
            'api_version': data.get('api_version', 'v1'),
            'cors_origins': data.get('cors_origins', []),
            'api_documentation': data.get('api_documentation', True),
            'request_logging': data.get('request_logging', False),
            'updated_at': timezone.now().isoformat(),
            'updated_by': request.user.id
        }

        # Save to cache and file
        self.save_settings_to_cache('api', settings_data)
        self.save_settings_to_file('api', settings_data)

        # Log activity
        self.log_admin_activity(
            request.user,
            'settings_updated',
            {'category': 'api', 'settings': list(settings_data.keys())}
        )

        return Response({
            'message': 'API settings updated successfully',
            'settings': settings_data
        })

    def get(self, request):
        """Get current API settings"""
        settings_data = self.get_settings_from_cache('api', {})

        if not settings_data:
            settings_data = {
                'api_rate_limit': 1000,
                'api_timeout': 30,
                'webhook_secret': '••••••••',
                'api_version': 'v1',
                'cors_origins': [],
                'api_documentation': True,
                'request_logging': False
            }

        return Response(settings_data)

class AdminNotificationSettingsView(AdminSettingsMixin, APIView):
    permission_classes = [IsAuthenticated, IsBusinessAdmin]

    def patch(self, request):
        """Update notification settings"""
        data = request.data

        settings_data = {
            'admin_email_notifications': data.get('admin_email_notifications', True),
            'admin_sms_notifications': data.get('admin_sms_notifications', False),
            'admin_push_notifications': data.get('admin_push_notifications', False),
            'error_alerts': data.get('error_alerts', True),
            'transaction_alerts': data.get('transaction_alerts', True),
            'admin_email': data.get('admin_email', 'admin@sikaremit.com'),
            'transaction_alert_threshold': data.get('transaction_alert_threshold', 10000),
            'updated_at': timezone.now().isoformat(),
            'updated_by': request.user.id
        }

        # Save to cache and file
        self.save_settings_to_cache('notifications', settings_data)
        self.save_settings_to_file('notifications', settings_data)

        # Log activity
        self.log_admin_activity(
            request.user,
            'settings_updated',
            {'category': 'notifications', 'settings': list(settings_data.keys())}
        )

        return Response({
            'message': 'Notification settings updated successfully',
            'settings': settings_data
        })

    def get(self, request):
        """Get current notification settings"""
        settings_data = self.get_settings_from_cache('notifications', {})

        if not settings_data:
            settings_data = {
                'admin_email_notifications': True,
                'admin_sms_notifications': False,
                'admin_push_notifications': False,
                'error_alerts': True,
                'transaction_alerts': True,
                'admin_email': 'admin@sikaremit.com',
                'transaction_alert_threshold': 10000
            }

        return Response(settings_data)

class AdminMaintenanceSettingsView(AdminSettingsMixin, APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def patch(self, request):
        """Update maintenance settings"""
        data = request.data

        settings_data = {
            'scheduled_maintenance': data.get('scheduled_maintenance', False),
            'auto_backups': data.get('auto_backups', True),
            'log_rotation': data.get('log_rotation', True),
            'backup_frequency': data.get('backup_frequency', 'daily'),
            'log_retention_days': data.get('log_retention_days', 30),
            'updated_at': timezone.now().isoformat(),
            'updated_by': request.user.id
        }

        # Save to cache and file
        self.save_settings_to_cache('maintenance', settings_data)
        self.save_settings_to_file('maintenance', settings_data)

        # Log activity
        self.log_admin_activity(
            request.user,
            'settings_updated',
            {'category': 'maintenance', 'settings': list(settings_data.keys())}
        )

        return Response({
            'message': 'Maintenance settings updated successfully',
            'settings': settings_data
        })

    def get(self, request):
        """Get current maintenance settings"""
        settings_data = self.get_settings_from_cache('maintenance', {})

        if not settings_data:
            settings_data = {
                'scheduled_maintenance': False,
                'auto_backups': True,
                'log_rotation': True,
                'backup_frequency': 'daily',
                'log_retention_days': 30
            }

        return Response(settings_data)

class AdminUserCreateView(APIView):
    """
    Admin-only endpoint for creating user accounts (admin, merchant, customer)
    """
    permission_classes = [IsAdminUser]
    
    def post(self, request):
        # Only admins can create users through this endpoint
        if not request.user.is_staff or request.user.user_type != 1:
            return Response(
                {'error': 'Only administrators can create user accounts'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = AccountsUserSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Create user through AuthService
            user = AuthService.create_user(
                email=serializer.validated_data['email'],
                password=serializer.validated_data.get('password'),  # Optional for admin creation
                user_type=serializer.validated_data.get('user_type', 3),  # Default to customer
                username=serializer.validated_data.get('username'),
                first_name=serializer.validated_data.get('first_name'),
                last_name=serializer.validated_data.get('last_name'),
                phone=serializer.validated_data.get('phone', '')
            )
            
            # If no password provided, set unusable password (force reset)
            if not serializer.validated_data.get('password'):
                user.set_unusable_password()
                user.save()
            
            # Log admin action
            logger.info(f"Admin {request.user.email} created user account: {user.email} (type: {user.user_type})")
            
            response_serializer = AccountsUserSerializer(user)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Admin user creation failed: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class AdminUserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = AccountsUserSerializer
    permission_classes = [IsAdminUser]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Add filtering capabilities
        email = self.request.query_params.get('email')
        if email:
            queryset = queryset.filter(email__icontains=email)
        
        # Exclude admin users if requested
        exclude_admins = self.request.query_params.get('exclude_admins')
        if exclude_admins == 'true':
            from shared.constants import (
                USER_TYPE_SUPER_ADMIN, USER_TYPE_BUSINESS_ADMIN,
                USER_TYPE_OPERATIONS_ADMIN, USER_TYPE_VERIFICATION_ADMIN
            )
            queryset = queryset.exclude(
                user_type__in=[
                    USER_TYPE_SUPER_ADMIN, USER_TYPE_BUSINESS_ADMIN,
                    USER_TYPE_OPERATIONS_ADMIN, USER_TYPE_VERIFICATION_ADMIN
                ]
            )
        
        # Filter by user_type if specified
        user_type = self.request.query_params.get('user_type')
        if user_type:
            queryset = queryset.filter(user_type=user_type)
            
        return queryset

    def create(self, request, *args, **kwargs):
        """Create a new user with password handling"""
        try:
            data = request.data.copy()
            password = data.pop('password', None)
            
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            
            user = serializer.save()
            
            # Set password if provided, otherwise generate one
            if password:
                user.set_password(password)
            else:
                # Generate a random password
                import secrets
                temp_password = secrets.token_urlsafe(12)
                user.set_password(temp_password)
            
            user.save()
            
            return Response(
                self.get_serializer(user).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            logger.error(f"Error creating user: {str(e)}")
            return Response(
                {'error': f'Failed to create user: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def perform_update(self, serializer):
        # Prevent admins from changing their own status
        if self.request.user == serializer.instance and \
           'is_active' in serializer.validated_data:
            raise Exception("You cannot change your own status")
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        """Delete user with proper error handling"""
        try:
            instance = self.get_object()
            # Prevent deleting yourself
            if instance == request.user:
                return Response(
                    {'error': 'You cannot delete your own account'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            # Soft delete or hard delete
            instance.is_active = False
            instance.save()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            logger.error(f"Error deleting user: {str(e)}")
            return Response(
                {'error': f'Failed to delete user: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class AdminActivityView(APIView):
    """
    Admin activity logging and retrieval endpoint
    """
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        try:
            # Get filtered admin activities
            activities = AuthService.get_admin_activities(
                user_id=request.query_params.get('user_id'),
                action_type=request.query_params.get('action_type'),
                limit=request.query_params.get('limit', 100)
            )
            return Response(activities, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class SecurityAuditView(APIView):
    """
    Security audit endpoint
    """
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        try:
            # Get security audit logs with optional filters
            audit_logs = AuthService.get_security_audits(
                user_id=request.query_params.get('user_id'),
                action_type=request.query_params.get('action_type'),
                start_date=request.query_params.get('start_date'),
                end_date=request.query_params.get('end_date'),
                limit=request.query_params.get('limit', 100)
            )
            return Response(audit_logs, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class SessionListView(APIView):
    """
    User session listing endpoint
    """
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        try:
            # Get all active sessions for the current user
            sessions = AuthService.get_user_sessions(request.user)
            return Response(sessions, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class AuditReportView(APIView):
    """
    Audit report generation endpoint
    """
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        try:
            # Generate audit report with optional filters
            report = AuthService.generate_audit_report(
                report_type=request.query_params.get('type', 'security'),
                start_date=request.query_params.get('start_date'),
                end_date=request.query_params.get('end_date'),
                user_id=request.query_params.get('user_id')
            )
            return Response(report, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class SessionAnalyticsView(APIView):
    """
    Session analytics endpoint
    """
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        try:
            # Get session analytics data
            analytics = AuthService.get_session_analytics(
                period=request.query_params.get('period', 'daily'),
                user_id=request.query_params.get('user_id'),
                limit=request.query_params.get('limit', 30)
            )
            return Response(analytics, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
