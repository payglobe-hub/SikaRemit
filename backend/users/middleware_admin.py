from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.http import JsonResponse

from .services_admin import AdminSessionService, AdminPermissionService
from shared.constants import ADMIN_HIERARCHY_LEVELS, ADMIN_ACTIVITY_LOGIN, ADMIN_ACTIVITY_LOGOUT

User = get_user_model()

class AdminAuditMiddleware(MiddlewareMixin):
    """
    Middleware to automatically log admin actions and manage sessions
    """
    
    def process_request(self, request):
        """Process incoming request for admin users"""
        if not request.user.is_authenticated:
            return None
        
        # Only process for admin users
        if request.user.user_type not in ADMIN_HIERARCHY_LEVELS:
            return None
        
        # Check if admin session is valid
        if hasattr(request, 'session') and request.session.session_key:
            try:
                from .models_admin import AdminSession
                admin_session = AdminSession.objects.get(
                    session_key=request.session.session_key,
                    admin_user=request.user,
                    is_active=True
                )
                
                # Check if session is expired
                if admin_session.is_expired():
                    AdminSessionService.end_session(
                        admin_session.session_key, 
                        'timeout'
                    )
                    return JsonResponse({
                        'error': 'Session expired',
                        'code': 'session_expired'
                    }, status=401)
                
                # Update last activity
                admin_session.last_activity = timezone.now()
                admin_session.save(update_fields=['last_activity'])
                
            except AdminSession.DoesNotExist:
                # Create new session for admin
                AdminSessionService.create_session(
                    user=request.user,
                    session_key=request.session.session_key,
                    ip_address=self.get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')
                )
        
        return None
    
    def process_response(self, request, response):
        """Process response for additional logging"""
        if not request.user.is_authenticated:
            return response
        
        # Only process for admin users
        if request.user.user_type not in ADMIN_HIERARCHY_LEVELS:
            return response
        
        # Log API calls that modify data
        if request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            self.log_api_call(request, response)
        
        return response
    
    def get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def log_api_call(self, request, response):
        """Log admin API calls"""
        try:
            # Determine action type based on endpoint and method
            action = self.determine_action(request)
            if not action:
                return
            
            # Get resource information
            resource_type = self.get_resource_type(request)
            resource_id = self.get_resource_id(request)
            
            # Log the action
            AdminPermissionService.log_admin_action(
                user=request.user,
                action=action,
                description=f"{request.method} {request.path}",
                resource_type=resource_type,
                resource_id=resource_id,
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                success=response.status_code < 400,
                error_message=None if response.status_code < 400 else f"HTTP {response.status_code}",
                session_id=getattr(request.session, 'session_key', '')
            )
            
        except Exception:
            # Don't let logging errors break the request
            pass
    
    def determine_action(self, request):
        """Determine action type based on request"""
        path = request.path
        method = request.method
        
        # Map common endpoints to actions
        if '/users/' in path:
            if method == 'POST':
                return 'user_created'
            elif method in ['PUT', 'PATCH']:
                return 'user_modified'
            elif method == 'DELETE':
                return 'user_suspended'
        
        elif '/merchants/' in path:
            if 'applications' in path and method == 'POST':
                return 'merchant_application_submitted'
            elif 'applications' in path and 'approve' in path:
                return 'merchant_approved'
            elif 'applications' in path and 'reject' in path:
                return 'merchant_rejected'
        
        elif '/kyc/' in path or '/verification/' in path:
            if method == 'POST':
                return 'kyc_review'
        
        elif '/admin/' in path:
            if 'roles' in path:
                return 'admin_management'
            elif 'settings' in path:
                return 'system_setting_changed'
        
        return None
    
    def get_resource_type(self, request):
        """Extract resource type from request path"""
        path_parts = request.path.strip('/').split('/')
        if len(path_parts) >= 2:
            return path_parts[1]  # Usually the app name
        return 'unknown'
    
    def get_resource_id(self, request):
        """Extract resource ID from request"""
        path_parts = request.path.strip('/').split('/')
        if len(path_parts) >= 3 and path_parts[2].isdigit():
            return path_parts[2]
        
        # Try to get ID from request data
        if hasattr(request, 'data') and request.data:
            if 'id' in request.data:
                return str(request.data['id'])
        
        return ''

class AdminSecurityMiddleware(MiddlewareMixin):
    """
    Security middleware for admin users
    """
    
    def process_request(self, request):
        """Process request for security checks"""
        if not request.user.is_authenticated:
            return None
        
        # Only process for admin users
        if request.user.user_type not in ADMIN_HIERARCHY_LEVELS:
            return None
        
        # Check for suspicious activity
        if self.is_suspicious_request(request):
            self.log_suspicious_activity(request)
        
        # Enforce MFA for sensitive operations
        if self.requires_mfa(request):
            if not self.is_mfa_verified(request):
                return JsonResponse({
                    'error': 'MFA required for this operation',
                    'code': 'mfa_required'
                }, status=403)
        
        return None
    
    def is_suspicious_request(self, request):
        """Check for suspicious activity patterns"""
        # Check for rapid successive requests
        if hasattr(request, 'admin_last_request_time'):
            time_diff = (timezone.now() - request.admin_last_request_time).total_seconds()
            if time_diff < 1:  # Less than 1 second between requests
                return True
        
        # Check for unusual IP addresses
        current_ip = self.get_client_ip(request)
        if hasattr(request.user, 'admin_profile'):
            if (request.user.admin_profile.last_login_ip and 
                current_ip != request.user.admin_profile.last_login_ip):
                # Different IP from last login - could be suspicious
                pass
        
        return False
    
    def requires_mfa(self, request):
        """Check if request requires MFA verification"""
        # Sensitive operations require MFA
        sensitive_paths = [
            '/admin/users/',
            '/admin/roles/',
            '/admin/settings/',
            '/admin/permissions/'
        ]
        
        return any(path in request.path for path in sensitive_paths)
    
    def is_mfa_verified(self, request):
        """Check if MFA has been verified for this session"""
        if hasattr(request, 'session'):
            return request.session.get('mfa_verified', False)
        return False
    
    def log_suspicious_activity(self, request):
        """Log suspicious activity"""
        try:
            AdminPermissionService.log_admin_action(
                user=request.user,
                action='suspicious_activity',
                description=f"Suspicious activity detected: {request.method} {request.path}",
                resource_type='security',
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                risk_level='high',
                requires_review=True
            )
        except Exception:
            pass
    
    def get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

class AdminActivityLoggingMixin:
    """
    Mixin for views to automatically log admin activities
    """
    
    def perform_create(self, serializer):
        """Override to log creation activities"""
        instance = super().perform_create(serializer)
        
        if self.request.user.user_type in ADMIN_HIERARCHY_LEVELS:
            AdminPermissionService.log_admin_action(
                user=self.request.user,
                action=f'{self.get_queryset().model._meta.model_name}_created',
                description=f"Created {self.get_queryset().model._meta.verbose_name}",
                resource_type=self.get_queryset().model._meta.model_name,
                resource_id=str(instance.id),
                new_values=serializer.data,
                ip_address=self.get_client_ip(self.request),
                user_agent=self.request.META.get('HTTP_USER_AGENT', '')
            )
        
        return instance
    
    def perform_update(self, serializer):
        """Override to log update activities"""
        instance = super().perform_update(serializer)
        
        if self.request.user.user_type in ADMIN_HIERARCHY_LEVELS:
            AdminPermissionService.log_admin_action(
                user=self.request.user,
                action=f'{self.get_queryset().model._meta.model_name}_modified',
                description=f"Modified {self.get_queryset().model._meta.verbose_name}",
                resource_type=self.get_queryset().model._meta.model_name,
                resource_id=str(instance.id),
                old_values=getattr(self, '_original_data', {}),
                new_values=serializer.data,
                ip_address=self.get_client_ip(self.request),
                user_agent=self.request.META.get('HTTP_USER_AGENT', '')
            )
        
        return instance
    
    def perform_destroy(self, instance):
        """Override to log deletion activities"""
        if self.request.user.user_type in ADMIN_HIERARCHY_LEVELS:
            AdminPermissionService.log_admin_action(
                user=self.request.user,
                action=f'{self.get_queryset().model._meta.model_name}_deleted',
                description=f"Deleted {self.get_queryset().model._meta.verbose_name}",
                resource_type=self.get_queryset().model._meta.model_name,
                resource_id=str(instance.id),
                old_values={'id': instance.id, 'str': str(instance)},
                ip_address=self.get_client_ip(self.request),
                user_agent=self.request.META.get('HTTP_USER_AGENT', '')
            )
        
        return super().perform_destroy(instance)
    
    def get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
