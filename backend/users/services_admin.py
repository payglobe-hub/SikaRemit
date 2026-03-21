from django.db.models.signals import post_save, pre_save, post_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError

from .models_admin import AdminProfile, AdminActivityLog, AdminSession, AdminRole
from shared.constants import (
    ADMIN_HIERARCHY_LEVELS, ADMIN_PERMISSIONS,
    ADMIN_ACTIVITY_USER_CREATED, ADMIN_ACTIVITY_USER_MODIFIED,
    ADMIN_ACTIVITY_LOGIN, ADMIN_ACTIVITY_LOGOUT
)

User = get_user_model()

@receiver(post_save, sender=User)
def create_or_update_admin_profile(sender, instance, created, **kwargs):
    """
    Automatically create AdminProfile for admin users and sync permissions
    """
    if instance.user_type in ADMIN_HIERARCHY_LEVELS:
        try:
            admin_profile = instance.admin_profile
            
            # Create profile if it doesn't exist
            if created:
                # Determine role based on user_type
                role_mapping = {
                    1: 'Super Admin',  # SUPER_ADMIN
                    2: 'Business Admin',  # BUSINESS_ADMIN  
                    3: 'Operations Admin',  # OPERATIONS_ADMIN
                    4: 'Verification Admin',  # VERIFICATION_ADMIN
                }
                
                try:
                    role = AdminRole.objects.get(level=instance.user_type)
                    AdminProfile.objects.create(
                        user=instance,
                        role=role,
                        employee_id=f"EMP{instance.id:06d}"
                    )
                    
                    # Log admin creation
                    AdminActivityLog.log_action(
                        admin_user=instance,
                        action=ADMIN_ACTIVITY_USER_CREATED,
                        description=f"Admin account created for {instance.email} with role {role.display_name}",
                        resource_type='user',
                        resource_id=str(instance.id),
                        ip_address='127.0.0.1',  # Will be updated on first login
                        user_agent='System Creation'
                    )
                except AdminRole.DoesNotExist:
                    # Create default role if it doesn't exist
                    role = AdminRole.objects.create(
                        name=role_mapping.get(instance.user_type, f'Level_{instance.user_type}'),
                        display_name=role_mapping.get(instance.user_type, f'Level {instance.user_type} Admin'),
                        description=f'Default role for level {instance.user_type}',
                        level=instance.user_type,
                        permissions=list(ADMIN_PERMISSIONS.keys())
                    )
                    
                    AdminProfile.objects.create(
                        user=instance,
                        role=role,
                        employee_id=f"EMP{instance.id:06d}"
                    )
            
            # Update existing profile if user type changed
            elif not created and admin_profile:
                if instance.user_type != admin_profile.role.level:
                    try:
                        new_role = AdminRole.objects.get(level=instance.user_type)
                        old_role = admin_profile.role.display_name
                        
                        admin_profile.role = new_role
                        admin_profile.save()
                        
                        # Log role change
                        AdminActivityLog.log_action(
                            admin_user=instance,
                            action=ADMIN_ACTIVITY_USER_MODIFIED,
                            description=f"Admin role changed from {old_role} to {new_role.display_name}",
                            resource_type='admin_profile',
                            resource_id=str(admin_profile.id),
                            old_values={'role': old_role},
                            new_values={'role': new_role.display_name},
                            ip_address='127.0.0.1',
                            user_agent='System Update'
                        )
                    except AdminRole.DoesNotExist:
                        pass  # Handle in create case
                        
        except AdminProfile.DoesNotExist:
            # Profile was deleted, recreate it
            try:
                role = AdminRole.objects.get(level=instance.user_type)
                AdminProfile.objects.create(
                    user=instance,
                    role=role,
                    employee_id=f"EMP{instance.id:06d}"
                )
            except AdminRole.DoesNotExist:
                pass  # Will be handled by admin setup

@receiver(pre_save, sender=AdminProfile)
def validate_admin_hierarchy(sender, instance, **kwargs):
    """
    Validate admin hierarchy constraints before saving
    """
    # Validate that managed_by is a higher-level admin
    if instance.managed_by:
        try:
            manager_profile = instance.managed_by.admin_profile
            if manager_profile.role.level >= instance.role.level:
                raise ValidationError(
                    f"Cannot assign {instance.role.display_name} to be managed by {manager_profile.role.display_name}. "
                    f"Manager must be higher level."
                )
        except AdminProfile.DoesNotExist:
            raise ValidationError("Manager must have an admin profile")

@receiver(post_save, sender=AdminProfile)
def log_admin_profile_changes(sender, instance, created, **kwargs):
    """
    Log changes to admin profiles
    """
    if not created:
        # Log profile modifications
        AdminActivityLog.log_action(
            admin_user=instance.user,
            action=ADMIN_ACTIVITY_USER_MODIFIED,
            description=f"Admin profile updated for {instance.user.email}",
            resource_type='admin_profile',
            resource_id=str(instance.id),
            ip_address='127.0.0.1',
            user_agent='System Update'
        )

@receiver(post_delete, sender=AdminProfile)
def log_admin_profile_deletion(sender, instance, **kwargs):
    """
    Log admin profile deletions
    """
    AdminActivityLog.log_action(
        admin_user=instance.user,
        action=ADMIN_ACTIVITY_USER_MODIFIED,
        description=f"Admin profile deleted for {instance.user.email}",
        resource_type='admin_profile',
        resource_id=str(instance.id),
        old_values={
            'role': instance.role.display_name,
            'employee_id': instance.employee_id
        },
        ip_address='127.0.0.1',
        user_agent='System Deletion'
    )

class AdminPermissionService:
    """
    Service class for managing admin permissions and access control
    """
    
    @staticmethod
    def get_user_permissions(user):
        """Get all effective permissions for a user"""
        if user.user_type not in ADMIN_HIERARCHY_LEVELS:
            return []
        
        try:
            admin_profile = user.admin_profile
            return admin_profile.get_effective_permissions()
        except AdminProfile.DoesNotExist:
            # Return default permissions for user type
            default_perms = []
            for perm_key, perm_config in ADMIN_PERMISSIONS.items():
                if user.user_type in perm_config['roles']:
                    default_perms.append(perm_key)
            return default_perms
    
    @staticmethod
    def has_permission(user, permission_key):
        """Check if user has a specific permission"""
        if user.user_type not in ADMIN_HIERARCHY_LEVELS:
            return False
        
        try:
            admin_profile = user.admin_profile
            return admin_profile.has_permission(permission_key)
        except AdminProfile.DoesNotExist:
            # Check default permissions for user type
            if permission_key in ADMIN_PERMISSIONS:
                return user.user_type in ADMIN_PERMISSIONS[permission_key]['roles']
            return False
    
    @staticmethod
    def can_manage_admin(manager_user, target_admin_user):
        """Check if manager can manage target admin"""
        if manager_user.user_type not in ADMIN_HIERARCHY_LEVELS:
            return False
        
        if target_admin_user.user_type not in ADMIN_HIERARCHY_LEVELS:
            return False
        
        # Can't manage yourself
        if manager_user == target_admin_user:
            return False
        
        try:
            manager_profile = manager_user.admin_profile
            target_profile = target_admin_user.admin_profile
            
            return manager_profile.can_manage_admin(target_profile)
        except AdminProfile.DoesNotExist:
            return False
    
    @staticmethod
    def get_accessible_admins(user):
        """Get list of admins that this user can manage"""
        if user.user_type not in ADMIN_HIERARCHY_LEVELS:
            return User.objects.none()
        
        try:
            admin_profile = user.admin_profile
            
            if not admin_profile.has_permission('admin_management'):
                return User.objects.none()
            
            # Can manage admins of lower levels
            accessible_levels = [level for level in ADMIN_HIERARCHY_LEVELS.keys() 
                               if level > admin_profile.role.level]
            
            return User.objects.filter(
                user_type__in=accessible_levels
            ).select_related('admin_profile__role')
            
        except AdminProfile.DoesNotExist:
            return User.objects.none()
    
    @staticmethod
    def log_admin_action(user, action, description, **kwargs):
        """Log an admin action with full context"""
        if user.user_type not in ADMIN_HIERARCHY_LEVELS:
            return None
        
        return AdminActivityLog.log_action(
            admin_user=user,
            action=action,
            description=description,
            **kwargs
        )

class AdminSessionService:
    """
    Service class for managing admin sessions
    """
    
    @staticmethod
    def create_session(user, session_key, ip_address, user_agent=''):
        """Create a new admin session"""
        if user.user_type not in ADMIN_HIERARCHY_LEVELS:
            return None
        
        try:
            admin_profile = user.admin_profile
            expires_at = timezone.now() + timezone.timedelta(minutes=admin_profile.session_timeout_minutes)
            
            session = AdminSession.objects.create(
                admin_user=user,
                session_key=session_key,
                ip_address=ip_address,
                user_agent=user_agent,
                expires_at=expires_at
            )
            
            # Update admin profile with login info
            admin_profile.last_login_ip = ip_address
            admin_profile.last_login_time = timezone.now()
            admin_profile.save()
            
            # Log login
            AdminPermissionService.log_admin_action(
                user=user,
                action=ADMIN_ACTIVITY_LOGIN,
                description=f"Admin {user.email} logged in from {ip_address}",
                resource_type='session',
                resource_id=session_key,
                ip_address=ip_address,
                user_agent=user_agent
            )
            
            return session
            
        except AdminProfile.DoesNotExist:
            return None
    
    @staticmethod
    def end_session(session_key, reason='logout'):
        """End an admin session"""
        try:
            session = AdminSession.objects.get(session_key=session_key, is_active=True)
            session.end_session(reason)
            
            # Log logout
            AdminPermissionService.log_admin_action(
                user=session.admin_user,
                action=ADMIN_ACTIVITY_LOGOUT,
                description=f"Admin {session.admin_user.email} logged out ({reason})",
                resource_type='session',
                resource_id=session_key,
                ip_address=session.ip_address,
                user_agent=session.user_agent
            )
            
            return session
            
        except AdminSession.DoesNotExist:
            return None
    
    @staticmethod
    def cleanup_expired_sessions():
        """Clean up expired sessions"""
        expired_sessions = AdminSession.objects.filter(
            is_active=True,
            expires_at__lt=timezone.now()
        )
        
        count = expired_sessions.count()
        expired_sessions.update(is_active=False, ended_at=timezone.now(), end_reason='timeout')
        
        return count
