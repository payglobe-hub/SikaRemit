from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
import uuid

from shared.constants import (
    USER_TYPE_CHOICES, ADMIN_HIERARCHY_LEVELS, ADMIN_PERMISSIONS,
    ENHANCED_ADMIN_ACTIVITY_TYPES, PRIORITY_CHOICES
)

User = get_user_model()


class AdminRole(models.Model):
    """
    Defines admin roles with specific permissions and hierarchy levels
    """
    name = models.CharField(max_length=50, unique=True)
    display_name = models.CharField(max_length=100)
    description = models.TextField()
    level = models.PositiveSmallIntegerField(choices=ADMIN_HIERARCHY_LEVELS.items())
    permissions = models.JSONField(default=list, help_text="List of permission keys")
    is_active = models.BooleanField(default=True)
    can_manage_lower_levels = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['level']
        verbose_name = "Admin Role"
        verbose_name_plural = "Admin Roles"

    def __str__(self):
        return f"{self.display_name} (Level {self.level})"

    def clean(self):
        # Validate that all permissions are valid
        invalid_permissions = []
        for perm in self.permissions:
            if perm not in ADMIN_PERMISSIONS:
                invalid_permissions.append(perm)
        
        if invalid_permissions:
            raise ValidationError({
                'permissions': f'Invalid permissions: {", ".join(invalid_permissions)}'
            })

    def has_permission(self, permission_key):
        """Check if this role has a specific permission"""
        return permission_key in self.permissions

    def get_permission_details(self):
        """Get detailed information about permissions"""
        details = []
        for perm_key in self.permissions:
            if perm_key in ADMIN_PERMISSIONS:
                details.append({
                    'key': perm_key,
                    'description': ADMIN_PERMISSIONS[perm_key]['description'],
                    'category': ADMIN_PERMISSIONS[perm_key]['category']
                })
        return details


class AdminProfile(models.Model):
    """
    Extended profile for admin users with role assignments and restrictions
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='admin_profile')
    role = models.ForeignKey(AdminRole, on_delete=models.PROTECT, related_name='admin_profiles')
    employee_id = models.CharField(max_length=20, unique=True, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True)
    managed_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, 
                                  related_name='managed_admins', help_text="Higher-level admin who manages this admin")
    permissions_override = models.JSONField(default=list, blank=True, 
                                           help_text="Additional permissions beyond role defaults")
    restricted_permissions = models.JSONField(default=list, blank=True,
                                            help_text="Permissions to restrict from this admin")
    is_active = models.BooleanField(default=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    last_login_time = models.DateTimeField(null=True, blank=True)
    session_timeout_minutes = models.PositiveIntegerField(default=120)
    require_mfa = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    suspended_at = models.DateTimeField(null=True, blank=True)
    suspended_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name='suspended_admins')
    suspension_reason = models.TextField(blank=True)

    class Meta:
        verbose_name = "Admin Profile"
        verbose_name_plural = "Admin Profiles"
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['role', 'is_active']),
            models.Index(fields=['managed_by']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.role.display_name}"

    def clean(self):
        # Validate hierarchy - can only be managed by higher level admin
        if self.managed_by:
            if self.managed_by.role.level >= self.role.level:
                raise ValidationError({
                    'managed_by': 'Can only be managed by a higher-level admin'
                })

        # Validate user type
        if self.user.user_type not in ADMIN_HIERARCHY_LEVELS:
            raise ValidationError({
                'user': 'User must be an admin type to have an admin profile'
            })

    def get_effective_permissions(self):
        """Get all effective permissions for this admin (role + overrides - restrictions)"""
        permissions = set(self.role.permissions)
        
        # Add permission overrides
        permissions.update(self.permissions_override)
        
        # Remove restricted permissions
        permissions -= set(self.restricted_permissions)
        
        return list(permissions)

    def has_permission(self, permission_key):
        """Check if admin has a specific permission"""
        effective_permissions = self.get_effective_permissions()
        return permission_key in effective_permissions

    def can_manage_admin(self, target_admin_profile):
        """Check if this admin can manage another admin"""
        if not self.has_permission('admin_management'):
            return False
        
        # Can only manage lower level admins
        return self.role.level < target_admin_profile.role.level

    def is_suspended(self):
        """Check if admin is suspended"""
        return self.suspended_at is not None and not self.is_active

    def suspend(self, suspended_by, reason):
        """Suspend this admin"""
        self.is_active = False
        self.suspended_at = timezone.now()
        self.suspended_by = suspended_by
        self.suspension_reason = reason
        self.save()

    def activate(self):
        """Activate this admin"""
        self.is_active = True
        self.suspended_at = None
        self.suspended_by = None
        self.suspension_reason = ''
        self.save()


class AdminActivityLog(models.Model):
    """
    Comprehensive audit logging for all admin actions
    """
    admin_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='admin_activities')
    action = models.CharField(max_length=100, choices=ENHANCED_ADMIN_ACTIVITY_TYPES)
    resource_type = models.CharField(max_length=50, blank=True, help_text="Type of resource affected")
    resource_id = models.CharField(max_length=100, blank=True, help_text="ID of affected resource")
    description = models.TextField(help_text="Human-readable description of the action")
    old_values = models.JSONField(null=True, blank=True, help_text="Previous state of modified data")
    new_values = models.JSONField(null=True, blank=True, help_text="New state of modified data")
    ip_address = models.GenericIPAddressField(help_text="IP address from which action was performed")
    user_agent = models.TextField(blank=True, help_text="Browser/client user agent")
    session_id = models.CharField(max_length=100, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    success = models.BooleanField(default=True, help_text="Was the action successful?")
    error_message = models.TextField(blank=True, help_text="Error details if action failed")
    risk_level = models.CharField(max_length=20, default='low', choices=PRIORITY_CHOICES,
                                help_text="Risk level of this action")
    requires_review = models.BooleanField(default=False, help_text="Does this action require review?")
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='reviewed_admin_activities')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = "Admin Activity Log"
        verbose_name_plural = "Admin Activity Logs"
        indexes = [
            models.Index(fields=['admin_user', '-timestamp']),
            models.Index(fields=['action', '-timestamp']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['requires_review', 'success']),
            models.Index(fields=['resource_type', 'resource_id']),
        ]

    def __str__(self):
        return f"{self.admin_user.email} - {self.get_action_display()} - {self.timestamp}"

    @classmethod
    def log_action(cls, admin_user, action, description, **kwargs):
        """Create a new activity log entry"""
        return cls.objects.create(
            admin_user=admin_user,
            action=action,
            description=description,
            **kwargs
        )

    def mark_reviewed(self, reviewed_by, notes=''):
        """Mark this activity as reviewed"""
        self.reviewed_by = reviewed_by
        self.reviewed_at = timezone.now()
        self.review_notes = notes
        self.requires_review = False
        self.save()


class AdminSession(models.Model):
    """
    Track admin sessions for security and auditing
    """
    admin_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='admin_sessions')
    session_key = models.CharField(max_length=40, unique=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    end_reason = models.CharField(max_length=50, blank=True, 
                                 help_text="Reason for session end: logout, timeout, forced")

    class Meta:
        ordering = ['-started_at']
        verbose_name = "Admin Session"
        verbose_name_plural = "Admin Sessions"
        indexes = [
            models.Index(fields=['admin_user', '-started_at']),
            models.Index(fields=['session_key']),
            models.Index(fields=['is_active', 'expires_at']),
        ]

    def __str__(self):
        return f"{self.admin_user.email} - {self.started_at}"

    def is_expired(self):
        """Check if session is expired"""
        return timezone.now() > self.expires_at

    def end_session(self, reason='logout'):
        """End the current session"""
        self.is_active = False
        self.ended_at = timezone.now()
        self.end_reason = reason
        self.save()

    def extend_session(self, minutes=120):
        """Extend session expiration"""
        self.expires_at = timezone.now() + timezone.timedelta(minutes=minutes)
        self.save()


class AdminPermissionOverride(models.Model):
    """
    Temporary permission overrides for specific admins
    """
    admin_profile = models.ForeignKey(AdminProfile, on_delete=models.CASCADE, related_name='permission_overrides')
    permission_key = models.CharField(max_length=100, help_text="Permission being overridden")
    granted_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='granted_overrides')
    granted_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(help_text="When this override expires")
    reason = models.TextField(help_text="Reason for granting this override")
    is_active = models.BooleanField(default=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoked_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='revoked_overrides')
    revoke_reason = models.TextField(blank=True)

    class Meta:
        ordering = ['-granted_at']
        verbose_name = "Admin Permission Override"
        verbose_name_plural = "Admin Permission Overrides"
        unique_together = ['admin_profile', 'permission_key']
        indexes = [
            models.Index(fields=['admin_profile', 'is_active']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"{self.admin_profile.user.email} - {self.permission_key}"

    def is_valid(self):
        """Check if override is still valid and active"""
        if not self.is_active or self.revoked_at:
            return False
        return timezone.now() <= self.expires_at

    def revoke(self, revoked_by, reason=''):
        """Revoke this permission override"""
        self.is_active = False
        self.revoked_at = timezone.now()
        self.revoked_by = revoked_by
        self.revoke_reason = reason
        self.save()
