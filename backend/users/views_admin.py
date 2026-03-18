from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count
from django.utils import timezone
from django.contrib.auth import get_user_model

from .models_admin import AdminRole, AdminProfile, AdminActivityLog, AdminSession, AdminPermissionOverride
from .permissions import (
    IsAdminUser, IsSuperAdmin, CanManageAdmins, CanManageUsers,
    CanAccessAuditLogs, IsHigherLevelAdmin, require_permission
)
from .services_admin import AdminPermissionService, AdminSessionService
from .serializers_admin import (
    AdminProfileSerializer, AdminProfileCreateSerializer, AdminRoleSerializer,
    AdminActivityLogSerializer, AdminSessionSerializer
)
from shared.constants import ADMIN_PERMISSIONS, ADMIN_ACTIVITY_USER_CREATED, ADMIN_ACTIVITY_ADMIN_CREATED, USER_TYPE_SUPER_ADMIN

User = get_user_model()

class AdminRoleViewSet(viewsets.ModelViewSet):
    """
    API for managing admin roles
    """
    queryset = AdminRole.objects.all()
    serializer_class = AdminRoleSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def get_queryset(self):
        return AdminRole.objects.filter(is_active=True).order_by('level')
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a role"""
        role = self.get_object()
        role.is_active = True
        role.save()
        
        AdminPermissionService.log_admin_action(
            user=request.user,
            action='role_activated',
            description=f"Activated role: {role.display_name}",
            resource_type='admin_role',
            resource_id=str(role.id),
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response({'message': 'Role activated successfully'})
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate a role"""
        role = self.get_object()
        role.is_active = False
        role.save()
        
        AdminPermissionService.log_admin_action(
            user=request.user,
            action='role_deactivated',
            description=f"Deactivated role: {role.display_name}",
            resource_type='admin_role',
            resource_id=str(role.id),
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response({'message': 'Role deactivated successfully'})
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')

class AdminProfileViewSet(viewsets.ModelViewSet):
    """
    API for managing admin profiles
    """
    queryset = AdminProfile.objects.all()
    serializer_class = AdminProfileSerializer
    permission_classes = [IsAuthenticated, CanManageAdmins]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return AdminProfileCreateSerializer
        return AdminProfileSerializer
    
    def get_queryset(self):
        # Filter based on user's admin level
        if self.request.user.user_type == USER_TYPE_SUPER_ADMIN:  # Super Admin
            return AdminProfile.objects.select_related('user', 'role', 'managed_by__user')
        else:
            # Other admins can only see lower level admins
            user_level = self.request.user.user_type
            accessible_levels = [level for level in range(user_level + 1, 5)]
            return AdminProfile.objects.filter(
                role__level__in=accessible_levels
            ).select_related('user', 'role', 'managed_by__user')
    
    def perform_create(self, serializer):
        """Create admin profile with logging"""
        admin_profile = serializer.save()
        
        AdminPermissionService.log_admin_action(
            user=self.request.user,
            action=ADMIN_ACTIVITY_ADMIN_CREATED,
            description=f"Created admin profile for {admin_profile.user.email}",
            resource_type='admin_profile',
            resource_id=str(admin_profile.id),
            new_values=serializer.data,
            ip_address=self.get_client_ip(self.request),
            user_agent=self.request.META.get('HTTP_USER_AGENT', '')
        )
        
        return admin_profile
    
    @action(detail=True, methods=['post'])
    def suspend(self, request, pk=None):
        """Suspend an admin"""
        admin_profile = self.get_object()
        
        # Check if can manage this admin
        if not AdminPermissionService.can_manage_admin(request.user, admin_profile.user):
            return Response(
                {'error': 'Cannot suspend admin of equal or higher level'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        reason = request.data.get('reason', 'No reason provided')
        admin_profile.suspend(request.user, reason)
        
        AdminPermissionService.log_admin_action(
            user=request.user,
            action='admin_suspended',
            description=f"Suspended admin: {admin_profile.user.email}",
            resource_type='admin_profile',
            resource_id=str(admin_profile.id),
            old_values={'is_active': True},
            new_values={'is_active': False, 'suspension_reason': reason},
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response({'message': 'Admin suspended successfully'})
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a suspended admin"""
        admin_profile = self.get_object()
        
        # Check if can manage this admin
        if not AdminPermissionService.can_manage_admin(request.user, admin_profile.user):
            return Response(
                {'error': 'Cannot activate admin of equal or higher level'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        admin_profile.activate()
        
        AdminPermissionService.log_admin_action(
            user=request.user,
            action='admin_activated',
            description=f"Activated admin: {admin_profile.user.email}",
            resource_type='admin_profile',
            resource_id=str(admin_profile.id),
            old_values={'is_active': False},
            new_values={'is_active': True},
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response({'message': 'Admin activated successfully'})
    
    @action(detail=True, methods=['get'])
    def permissions(self, request, pk=None):
        """Get admin's effective permissions"""
        admin_profile = self.get_object()
        permissions = admin_profile.get_effective_permissions()
        
        # Get detailed permission information
        permission_details = []
        for perm_key in permissions:
            if perm_key in ADMIN_PERMISSIONS:
                permission_details.append({
                    'key': perm_key,
                    'description': ADMIN_PERMISSIONS[perm_key]['description'],
                    'category': ADMIN_PERMISSIONS[perm_key]['category']
                })
        
        return Response({
            'permissions': permission_details,
            'role': admin_profile.role.display_name,
            'level': admin_profile.role.level
        })
    
    @action(detail=True, methods=['post'])
    def grant_permission_override(self, request, pk=None):
        """Grant temporary permission override"""
        admin_profile = self.get_object()
        
        # Check if can manage this admin
        if not AdminPermissionService.can_manage_admin(request.user, admin_profile.user):
            return Response(
                {'error': 'Cannot grant permissions to admin of equal or higher level'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        permission_key = request.data.get('permission')
        expires_hours = request.data.get('expires_hours', 24)
        reason = request.data.get('reason', 'Temporary access granted')
        
        if permission_key not in ADMIN_PERMISSIONS:
            return Response(
                {'error': 'Invalid permission key'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        expires_at = timezone.now() + timezone.timedelta(hours=expires_hours)
        
        override = AdminPermissionOverride.objects.create(
            admin_profile=admin_profile,
            permission_key=permission_key,
            granted_by=request.user,
            expires_at=expires_at,
            reason=reason
        )
        
        AdminPermissionService.log_admin_action(
            user=request.user,
            action='permission_override_granted',
            description=f"Granted permission override '{permission_key}' to {admin_profile.user.email}",
            resource_type='admin_permission_override',
            resource_id=str(override.id),
            new_values={
                'permission': permission_key,
                'expires_at': expires_at.isoformat(),
                'reason': reason
            },
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response({'message': 'Permission override granted successfully'})
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')

class AdminActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API for viewing admin activity logs
    """
    queryset = AdminActivityLog.objects.all()
    serializer_class = AdminActivityLogSerializer
    permission_classes = [IsAuthenticated, CanAccessAuditLogs]
    
    def get_queryset(self):
        queryset = AdminActivityLog.objects.select_related('admin_user', 'reviewed_by')
        
        # Filter by admin if not super admin
        if self.request.user.user_type != 1:  # Not Super Admin
            # Can only see logs of admins they manage
            accessible_admins = AdminPermissionService.get_accessible_admins(self.request.user)
            queryset = queryset.filter(admin_user__in=accessible_admins)
        
        # Apply filters
        admin_id = self.request.query_params.get('admin_id')
        if admin_id:
            queryset = queryset.filter(admin_user_id=admin_id)
        
        action = self.request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)
        
        resource_type = self.request.query_params.get('resource_type')
        if resource_type:
            queryset = queryset.filter(resource_type=resource_type)
        
        date_from = self.request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(timestamp__gte=date_from)
        
        date_to = self.request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(timestamp__lte=date_to)
        
        return queryset.order_by('-timestamp')
    
    @action(detail=True, methods=['post'])
    def mark_reviewed(self, request, pk=None):
        """Mark activity log as reviewed"""
        log_entry = self.get_object()
        notes = request.data.get('notes', '')
        
        log_entry.mark_reviewed(request.user, notes)
        
        AdminPermissionService.log_admin_action(
            user=request.user,
            action='activity_log_reviewed',
            description=f"Reviewed activity log entry: {log_entry.id}",
            resource_type='admin_activity_log',
            resource_id=str(log_entry.id),
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response({'message': 'Log entry marked as reviewed'})
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get activity log statistics"""
        queryset = self.get_queryset()
        
        stats = {
            'total_activities': queryset.count(),
            'activities_by_action': {},
            'activities_by_admin': {},
            'recent_activities': queryset.count() if request.query_params.get('recent_days') else 0,
            'high_risk_activities': queryset.filter(risk_level='high').count(),
            'pending_review': queryset.filter(requires_review=True).count()
        }
        
        # Group by action
        for log in queryset.values('action').annotate(count=Count('id')):
            stats['activities_by_action'][log['action']] = log['count']
        
        # Group by admin
        for log in queryset.values('admin_user__email').annotate(count=Count('id')):
            stats['activities_by_admin'][log['admin_user__email']] = log['count']
        
        return Response(stats)
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')

class AdminSessionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API for viewing admin sessions
    """
    queryset = AdminSession.objects.all()
    serializer_class = AdminSessionSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    def get_queryset(self):
        queryset = AdminSession.objects.select_related('admin_user')
        
        # Apply filters
        admin_id = self.request.query_params.get('admin_id')
        if admin_id:
            queryset = queryset.filter(admin_user_id=admin_id)
        
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset.order_by('-started_at')
    
    @action(detail=True, methods=['post'])
    def terminate(self, request, pk=None):
        """Terminate an admin session"""
        session = self.get_object()
        AdminSessionService.end_session(session.session_key, 'forced_by_admin')
        
        AdminPermissionService.log_admin_action(
            user=request.user,
            action='session_terminated',
            description=f"Terminated session for {session.admin_user.email}",
            resource_type='admin_session',
            resource_id=str(session.id),
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response({'message': 'Session terminated successfully'})
    
    @action(detail=False, methods=['post'])
    def cleanup_expired(self, request):
        """Clean up expired sessions"""
        count = AdminSessionService.cleanup_expired_sessions()
        
        AdminPermissionService.log_admin_action(
            user=request.user,
            action='session_cleanup',
            description=f"Cleaned up {count} expired sessions",
            resource_type='admin_session',
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response({'message': f'Cleaned up {count} expired sessions'})

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_permissions_overview(request):
    """Get overview of all permissions and current user permissions"""
    user_permissions = AdminPermissionService.get_user_permissions(request.user)
    
    # Get all available permissions
    all_permissions = []
    for perm_key, perm_config in ADMIN_PERMISSIONS.items():
        all_permissions.append({
            'key': perm_key,
            'description': perm_config['description'],
            'category': perm_config['category'],
            'has_permission': perm_key in user_permissions
        })
    
    return Response({
        'user_permissions': user_permissions,
        'all_permissions': all_permissions,
        'user_role': request.user.admin_profile.role.display_name if hasattr(request.user, 'admin_profile') else 'Unknown',
        'user_level': request.user.admin_profile.role.level if hasattr(request.user, 'admin_profile') else 0
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated, CanManageAdmins])
def accessible_admins(request):
    """Get list of admins that current user can manage"""
    admins = AdminPermissionService.get_accessible_admins(request.user)
    
    admin_data = []
    for user in admins:
        try:
            profile = user.admin_profile
            admin_data.append({
                'id': user.id,
                'email': user.email,
                'name': f"{user.first_name} {user.last_name}".strip(),
                'role': profile.role.display_name,
                'level': profile.role.level,
                'is_active': profile.is_active,
                'last_login': profile.last_login_time,
                'employee_id': profile.employee_id
            })
        except AdminProfile.DoesNotExist:
            continue
    
    return Response({
        'accessible_admins': admin_data,
        'count': len(admin_data)
    })
