# Generated migration for enhanced admin hierarchy system

from django.db import migrations, models
import django.db.models.deletion
import uuid
from django.conf import settings


def create_default_admin_roles(apps, schema_editor):
    """Create default admin roles with appropriate permissions"""
    AdminRole = apps.get_model('users', 'AdminRole')
    
    # Define permissions for each role
    role_permissions = {
        1: [  # Super Admin
            'user_management', 'admin_management', 'kyc_review', 'compliance_monitoring',
            'transaction_override', 'merchant_approval', 'support_management', 'reporting',
            'system_settings', 'verification_only', 'audit_logs', 'emergency_override'
        ],
        2: [  # Business Admin
            'kyc_review', 'compliance_monitoring', 'transaction_override',
            'merchant_approval', 'reporting', 'audit_logs'
        ],
        3: [  # Operations Admin
            'support_management', 'reporting'
        ],
        4: [  # Verification Admin
            'verification_only'
        ]
    }
    
    role_data = {
        1: ('super_admin', 'Super Admin', 'Full system access and oversight', True),
        2: ('business_admin', 'Business Admin', 'KYC, compliance, risk, merchant approval', False),
        3: ('operations_admin', 'Operations Admin', 'Customer support and basic operations', False),
        4: ('verification_admin', 'Verification Admin', 'Document verification only', False)
    }
    
    for level, (name, display_name, description, can_manage) in role_data.items():
        AdminRole.objects.create(
            name=name,
            display_name=display_name,
            description=description,
            level=level,
            permissions=role_permissions.get(level, []),
            can_manage_lower_levels=can_manage
        )


def create_admin_profiles_for_existing_users(apps, schema_editor):
    """Create admin profiles for existing admin users"""
    User = apps.get_model('users', 'User')
    AdminProfile = apps.get_model('users', 'AdminProfile')
    AdminRole = apps.get_model('users', 'AdminRole')
    
    # Get all admin users (user_type 1, which is now Super Admin)
    admin_users = User.objects.filter(user_type=1)
    
    # Get the Super Admin role
    super_admin_role = AdminRole.objects.get(level=1)
    
    for user in admin_users:
        if not hasattr(user, 'admin_profile'):
            AdminProfile.objects.create(
                user=user,
                role=super_admin_role,
                employee_id=f"EMP{user.id:06d}"
            )


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('users', '0003_alter_user_managers'),
    ]

    operations = [
        # First, update existing user types to new hierarchy
        migrations.RunSQL(
            "UPDATE users_user SET user_type = CASE user_type "
            "WHEN 1 THEN 1 "  # Admin -> Super Admin
            "WHEN 2 THEN 5 "  # Merchant -> Level 5
            "WHEN 3 THEN 6 "  # Customer -> Level 6
            "ELSE user_type END",
            reverse_sql="UPDATE users_user SET user_type = CASE user_type "
            "WHEN 1 THEN 1 "  # Super Admin -> Admin
            "WHEN 5 THEN 2 "  # Level 5 -> Merchant
            "WHEN 6 THEN 3 "  # Level 6 -> Customer
            "ELSE user_type END"
        ),

        # Create AdminRole model
        migrations.CreateModel(
            name='AdminRole',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=50, unique=True)),
                ('display_name', models.CharField(max_length=100)),
                ('description', models.TextField()),
                ('level', models.PositiveSmallIntegerField(choices=[(1, 'Level 1'), (2, 'Level 2'), (3, 'Level 3'), (4, 'Level 4')])),
                ('permissions', models.JSONField(default=list)),
                ('is_active', models.BooleanField(default=True)),
                ('can_manage_lower_levels', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Admin Role',
                'verbose_name_plural': 'Admin Roles',
                'ordering': ['level'],
            },
        ),

        # Create AdminProfile model
        migrations.CreateModel(
            name='AdminProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('employee_id', models.CharField(blank=True, max_length=20, null=True, unique=True)),
                ('department', models.CharField(blank=True, max_length=100)),
                ('permissions_override', models.JSONField(blank=True, default=list)),
                ('restricted_permissions', models.JSONField(blank=True, default=list)),
                ('is_active', models.BooleanField(default=True)),
                ('last_login_ip', models.GenericIPAddressField(blank=True, null=True)),
                ('last_login_time', models.DateTimeField(blank=True, null=True)),
                ('session_timeout_minutes', models.PositiveIntegerField(default=120)),
                ('require_mfa', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('suspended_at', models.DateTimeField(blank=True, null=True)),
                ('suspension_reason', models.TextField(blank=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='admin_profile', to=settings.AUTH_USER_MODEL)),
                ('role', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='admin_profiles', to='users.adminrole')),
                ('managed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='managed_admins', to='users.adminprofile')),
                ('suspended_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='suspended_admins', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Admin Profile',
                'verbose_name_plural': 'Admin Profiles',
            },
        ),

        # Create AdminActivityLog model
        migrations.CreateModel(
            name='AdminActivityLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(choices=[
                    ('user_created', 'User Account Created'),
                    ('user_modified', 'User Account Modified'),
                    ('user_suspended', 'User Account Suspended'),
                    ('user_activated', 'User Account Activated'),
                    ('admin_created', 'Admin Account Created'),
                    ('admin_modified', 'Admin Account Modified'),
                    ('admin_suspended', 'Admin Account Suspended'),
                    ('permission_granted', 'Permission Granted'),
                    ('permission_revoked', 'Permission Revoked'),
                    ('kyc_approved', 'KYC Approved'),
                    ('kyc_reJECTED', 'KYC Rejected'),
                    ('merchant_approved', 'Merchant Approved'),
                    ('merchant_rejected', 'Merchant Rejected'),
                    ('transaction_override', 'Transaction Override'),
                    ('system_setting_changed', 'System Setting Changed'),
                    ('emergency_action', 'Emergency Action Taken'),
                    ('admin_login', 'Admin Login'),
                    ('admin_logout', 'Admin Logout'),
                    ('password_changed', 'Password Changed'),
                    ('profile_updated', 'Profile Updated'),
                ], max_length=100)),
                ('resource_type', models.CharField(blank=True, help_text='Type of resource affected', max_length=50)),
                ('resource_id', models.CharField(blank=True, help_text='ID of affected resource', max_length=100)),
                ('description', models.TextField(help_text='Human-readable description of the action')),
                ('old_values', models.JSONField(blank=True, help_text='Previous state of modified data', null=True)),
                ('new_values', models.JSONField(blank=True, help_text='New state of modified data', null=True)),
                ('ip_address', models.GenericIPAddressField(help_text='IP address from which action was performed')),
                ('user_agent', models.TextField(blank=True, help_text='Browser/client user agent')),
                ('session_id', models.CharField(blank=True, max_length=100)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('success', models.BooleanField(default=True, help_text='Was the action successful?')),
                ('error_message', models.TextField(blank=True, help_text='Error details if action failed')),
                ('risk_level', models.CharField(choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High'), ('urgent', 'Urgent')], default='low', help_text='Risk level of this action', max_length=20)),
                ('requires_review', models.BooleanField(default=False, help_text='Does this action require review?')),
                ('reviewed_at', models.DateTimeField(blank=True, null=True)),
                ('review_notes', models.TextField(blank=True)),
                ('admin_user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='admin_activities', to=settings.AUTH_USER_MODEL)),
                ('reviewed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reviewed_admin_activities', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Admin Activity Log',
                'verbose_name_plural': 'Admin Activity Logs',
                'ordering': ['-timestamp'],
            },
        ),

        # Create AdminSession model
        migrations.CreateModel(
            name='AdminSession',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('session_key', models.CharField(max_length=40, unique=True)),
                ('ip_address', models.GenericIPAddressField()),
                ('user_agent', models.TextField(blank=True)),
                ('started_at', models.DateTimeField(auto_now_add=True)),
                ('last_activity', models.DateTimeField(auto_now=True)),
                ('expires_at', models.DateTimeField()),
                ('is_active', models.BooleanField(default=True)),
                ('ended_at', models.DateTimeField(blank=True, null=True)),
                ('end_reason', models.CharField(blank=True, help_text='Reason for session end: logout, timeout, forced', max_length=50)),
                ('admin_user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='admin_sessions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Admin Session',
                'verbose_name_plural': 'Admin Sessions',
                'ordering': ['-started_at'],
            },
        ),

        # Create AdminPermissionOverride model
        migrations.CreateModel(
            name='AdminPermissionOverride',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('permission_key', models.CharField(help_text='Permission being overridden', max_length=100)),
                ('granted_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField(help_text='When this override expires')),
                ('reason', models.TextField(help_text='Reason for granting this override')),
                ('is_active', models.BooleanField(default=True)),
                ('revoked_at', models.DateTimeField(blank=True, null=True)),
                ('revoke_reason', models.TextField(blank=True)),
                ('admin_profile', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='permission_overrides', to='users.adminprofile')),
                ('granted_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='granted_overrides', to=settings.AUTH_USER_MODEL)),
                ('revoked_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='revoked_overrides', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Admin Permission Override',
                'verbose_name_plural': 'Admin Permission Overrides',
                'ordering': ['-granted_at'],
            },
        ),

        # Create default admin roles
        migrations.RunPython(
            create_default_admin_roles,
            reverse_code=migrations.RunPython.noop
        ),

        # Create admin profiles for existing admin users
        migrations.RunPython(
            create_admin_profiles_for_existing_users,
            reverse_code=migrations.RunPython.noop
        ),

        # Add indexes for performance
        migrations.AddIndex(
            model_name='adminprofile',
            index=models.Index(fields=['user', 'is_active'], name='users_admin_user_active_idx'),
        ),
        migrations.AddIndex(
            model_name='adminprofile',
            index=models.Index(fields=['role', 'is_active'], name='users_admin_role_active_idx'),
        ),
        migrations.AddIndex(
            model_name='adminprofile',
            index=models.Index(fields=['managed_by'], name='users_admin_managed_by_idx'),
        ),
        migrations.AddIndex(
            model_name='adminactivitylog',
            index=models.Index(fields=['admin_user', '-timestamp'], name='users_admin_log_user_time_idx'),
        ),
        migrations.AddIndex(
            model_name='adminactivitylog',
            index=models.Index(fields=['action', '-timestamp'], name='users_admin_log_action_time_idx'),
        ),
        migrations.AddIndex(
            model_name='adminsession',
            index=models.Index(fields=['admin_user', '-started_at'], name='users_admin_session_user_time_idx'),
        ),
        migrations.AddIndex(
            model_name='adminpermissionoverride',
            index=models.Index(fields=['admin_profile', 'is_active'], name='users_admin_override_profile_active_idx'),
        ),
    ]
