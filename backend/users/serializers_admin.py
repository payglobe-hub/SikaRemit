from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models_admin import AdminRole, AdminProfile, AdminActivityLog, AdminSession, AdminPermissionOverride
from shared.constants import ADMIN_PERMISSIONS

User = get_user_model()


class AdminRoleSerializer(serializers.ModelSerializer):
    """Serializer for AdminRole model"""
    permission_details = serializers.SerializerMethodField()
    
    class Meta:
        model = AdminRole
        fields = [
            'id', 'name', 'display_name', 'description', 'level', 'permissions',
            'is_active', 'can_manage_lower_levels', 'created_at', 'updated_at',
            'permission_details'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_permission_details(self, obj):
        """Get detailed information about permissions"""
        return obj.get_permission_details()
    
    def validate_permissions(self, value):
        """Validate that all permissions are valid"""
        invalid_permissions = []
        for perm in value:
            if perm not in ADMIN_PERMISSIONS:
                invalid_permissions.append(perm)
        
        if invalid_permissions:
            raise serializers.ValidationError({
                'permissions': f'Invalid permissions: {", ".join(invalid_permissions)}'
            })
        
        return value


class AdminProfileSerializer(serializers.ModelSerializer):
    """Serializer for AdminProfile model"""
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    role_name = serializers.CharField(source='role.display_name', read_only=True)
    role_level = serializers.IntegerField(source='role.level', read_only=True)
    manager_name = serializers.CharField(source='managed_by.user.get_full_name', read_only=True)
    effective_permissions = serializers.SerializerMethodField()
    is_suspended = serializers.SerializerMethodField()
    
    class Meta:
        model = AdminProfile
        fields = [
            'id', 'user', 'user_email', 'user_name', 'role', 'role_name', 'role_level',
            'employee_id', 'department', 'managed_by', 'manager_name',
            'permissions_override', 'restricted_permissions', 'effective_permissions',
            'is_active', 'is_suspended', 'last_login_ip', 'last_login_time',
            'session_timeout_minutes', 'require_mfa', 'created_at', 'updated_at',
            'suspended_at', 'suspension_reason'
        ]
        read_only_fields = [
            'id', 'user_email', 'user_name', 'role_name', 'role_level', 'manager_name',
            'effective_permissions', 'is_suspended', 'last_login_ip', 'last_login_time',
            'suspended_at', 'suspension_reason', 'created_at', 'updated_at'
        ]
    
    def get_effective_permissions(self, obj):
        """Get all effective permissions for this admin"""
        return obj.get_effective_permissions()
    
    def get_is_suspended(self, obj):
        """Check if admin is suspended"""
        return obj.is_suspended()
    
    def validate_managed_by(self, value):
        """Validate that manager is higher level"""
        if value and self.instance:
            if value.role.level >= self.instance.role.level:
                raise serializers.ValidationError(
                    'Manager must be higher level than this admin'
                )
        return value
    
    def validate_permissions_override(self, value):
        """Validate permission overrides"""
        invalid_permissions = []
        for perm in value:
            if perm not in ADMIN_PERMISSIONS:
                invalid_permissions.append(perm)
        
        if invalid_permissions:
            raise serializers.ValidationError({
                'permissions_override': f'Invalid permissions: {", ".join(invalid_permissions)}'
            })
        
        return value
    
    def validate_restricted_permissions(self, value):
        """Validate restricted permissions"""
        invalid_permissions = []
        for perm in value:
            if perm not in ADMIN_PERMISSIONS:
                invalid_permissions.append(perm)
        
        if invalid_permissions:
            raise serializers.ValidationError({
                'restricted_permissions': f'Invalid permissions: {", ".join(invalid_permissions)}'
            })
        
        return value


class AdminProfileCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new admin profiles"""
    email = serializers.EmailField(write_only=True)
    first_name = serializers.CharField(write_only=True)
    last_name = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True, min_length=8)
    
    class Meta:
        model = AdminProfile
        fields = [
            'email', 'first_name', 'last_name', 'password', 'role', 'employee_id',
            'department', 'managed_by', 'permissions_override', 'restricted_permissions',
            'session_timeout_minutes', 'require_mfa'
        ]
    
    def create(self, validated_data):
        """Create user and admin profile"""
        user_data = {
            'email': validated_data.pop('email'),
            'first_name': validated_data.pop('first_name'),
            'last_name': validated_data.pop('last_name'),
            'password': validated_data.pop('password'),
            'user_type': validated_data['role'].level,  # Set user_type based on role level
            'is_staff': True,
            'is_verified': True
        }
        
        # Create user
        user = User.objects.create_user(**user_data)
        
        # Create admin profile
        admin_profile = AdminProfile.objects.create(
            user=user,
            **validated_data
        )
        
        return admin_profile


class AdminActivityLogSerializer(serializers.ModelSerializer):
    """Serializer for AdminActivityLog model"""
    admin_user_email = serializers.CharField(source='admin_user.email', read_only=True)
    admin_user_name = serializers.CharField(source='admin_user.get_full_name', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True)
    
    class Meta:
        model = AdminActivityLog
        fields = [
            'id', 'admin_user', 'admin_user_email', 'admin_user_name', 'action',
            'action_display', 'resource_type', 'resource_id', 'description',
            'old_values', 'new_values', 'ip_address', 'user_agent', 'session_id',
            'timestamp', 'success', 'error_message', 'risk_level', 'requires_review',
            'reviewed_by', 'reviewed_by_name', 'reviewed_at', 'review_notes'
        ]
        read_only_fields = [
            'id', 'admin_user_email', 'admin_user_name', 'action_display',
            'reviewed_by_name', 'timestamp'
        ]


class AdminSessionSerializer(serializers.ModelSerializer):
    """Serializer for AdminSession model"""
    admin_user_email = serializers.CharField(source='admin_user.email', read_only=True)
    admin_user_name = serializers.CharField(source='admin_user.get_full_name', read_only=True)
    duration_minutes = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    
    class Meta:
        model = AdminSession
        fields = [
            'id', 'admin_user', 'admin_user_email', 'admin_user_name', 'session_key',
            'ip_address', 'user_agent', 'started_at', 'last_activity', 'expires_at',
            'is_active', 'ended_at', 'end_reason', 'duration_minutes', 'is_expired'
        ]
        read_only_fields = [
            'id', 'admin_user_email', 'admin_user_name', 'duration_minutes', 'is_expired'
        ]
    
    def get_duration_minutes(self, obj):
        """Get session duration in minutes"""
        if obj.ended_at:
            return int((obj.ended_at - obj.started_at).total_seconds() / 60)
        return int((timezone.now() - obj.started_at).total_seconds() / 60)
    
    def get_is_expired(self, obj):
        """Check if session is expired"""
        return obj.is_expired()


class AdminPermissionOverrideSerializer(serializers.ModelSerializer):
    """Serializer for AdminPermissionOverride model"""
    admin_user_email = serializers.CharField(source='admin_profile.user.email', read_only=True)
    granted_by_name = serializers.CharField(source='granted_by.get_full_name', read_only=True)
    revoked_by_name = serializers.CharField(source='revoked_by.get_full_name', read_only=True)
    permission_description = serializers.SerializerMethodField()
    is_valid = serializers.SerializerMethodField()
    
    class Meta:
        model = AdminPermissionOverride
        fields = [
            'id', 'admin_profile', 'admin_user_email', 'permission_key',
            'permission_description', 'granted_by', 'granted_by_name', 'granted_at',
            'expires_at', 'reason', 'is_active', 'revoked_at', 'revoked_by',
            'revoked_by_name', 'revoke_reason', 'is_valid'
        ]
        read_only_fields = [
            'id', 'admin_user_email', 'granted_by_name', 'revoked_by_name',
            'permission_description', 'is_valid', 'granted_at', 'revoked_at'
        ]
    
    def get_permission_description(self, obj):
        """Get permission description"""
        if obj.permission_key in ADMIN_PERMISSIONS:
            return ADMIN_PERMISSIONS[obj.permission_key]['description']
        return 'Unknown permission'
    
    def get_is_valid(self, obj):
        """Check if override is still valid"""
        return obj.is_valid()


class UserAdminSerializer(serializers.ModelSerializer):
    """Serializer for User model with admin-specific fields"""
    admin_profile = AdminProfileSerializer(read_only=True)
    is_admin = serializers.SerializerMethodField()
    admin_level = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'user_type',
            'is_staff', 'is_superuser', 'is_active', 'is_verified', 'phone',
            'date_joined', 'last_login', 'admin_profile', 'is_admin', 'admin_level'
        ]
        read_only_fields = [
            'id', 'date_joined', 'last_login', 'admin_profile', 'is_admin', 'admin_level'
        ]
    
    def get_is_admin(self, obj):
        """Check if user is an admin"""
        return obj.user_type in [1, 2, 3, 4]
    
    def get_admin_level(self, obj):
        """Get admin hierarchy level"""
        if obj.user_type in [1, 2, 3, 4]:
            return obj.user_type
        return None


class AdminUserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new admin users"""
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = [
            'email', 'username', 'first_name', 'last_name', 'password',
            'confirm_password', 'phone', 'user_type'
        ]
    
    def validate_email(self, value):
        """Validate email uniqueness"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('User with this email already exists.')
        return value
    
    def validate(self, attrs):
        """Validate password confirmation"""
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError("Passwords don't match")
        
        # Validate user_type is admin type
        if attrs['user_type'] not in [1, 2, 3, 4]:
            raise serializers.ValidationError("user_type must be an admin type (1-4)")
        
        return attrs
    
    def create(self, validated_data):
        """Create new admin user"""
        validated_data.pop('confirm_password')
        validated_data['is_staff'] = True
        validated_data['is_verified'] = True
        
        user = User.objects.create_user(**validated_data)
        return user


class PermissionOverviewSerializer(serializers.Serializer):
    """Serializer for permission overview response"""
    user_permissions = serializers.ListField(child=serializers.CharField())
    all_permissions = serializers.ListField(child=serializers.DictField())
    user_role = serializers.CharField()
    user_level = serializers.IntegerField()


class AccessibleAdminSerializer(serializers.Serializer):
    """Serializer for accessible admins response"""
    accessible_admins = serializers.ListField(child=serializers.DictField())
    count = serializers.IntegerField()
