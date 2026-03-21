# Generated migration for enhanced audit logging system

from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_enhanced_admin_hierarchy'),
        ('core', '0003_webhook_monitoring'),
    ]

    operations = [
        migrations.CreateModel(
            name='EnhancedAuditLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('event_id', models.CharField(db_index=True, max_length=100, unique=True)),
                ('event_type', models.CharField(choices=[('PERMISSION_GRANTED', 'Permission Granted'), ('PERMISSION_REVOKED', 'Permission Revoked'), ('ROLE_CHANGED', 'Role Changed'), ('ADMIN_CREATED', 'Admin Created'), ('ADMIN_SUSPENDED', 'Admin Suspended'), ('ADMIN_REACTIVATED', 'Admin Reactivated'), ('PERMISSION_OVERRIDE_GRANTED', 'Permission Override Granted'), ('PERMISSION_OVERRIDE_REVOKED', 'Permission Override Revoked'), ('HIERARCHY_CHANGED', 'Hierarchy Changed'), ('SESSION_STARTED', 'Session Started'), ('SESSION_ENDED', 'Session Ended'), ('SECURITY_BREACH_ATTEMPT', 'Security Breach Attempt'), ('PRIVILEGE_ESCALATION', 'Privilege Escalation'), ('BULK_PERMISSION_CHANGE', 'Bulk Permission Change')], db_index=True, max_length=50)),
                ('severity', models.CharField(choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High'), ('critical', 'Critical')], default='medium', db_index=True, max_length=20)),
                ('actor_role', models.CharField(blank=True, help_text='Role of actor at time of action', max_length=100)),
                ('actor_permissions', models.JSONField(default=list, help_text='Permissions of actor at time of action')),
                ('target_resource_type', models.CharField(help_text='Type of resource affected', max_length=50)),
                ('target_resource_id', models.CharField(blank=True, help_text='ID of affected resource', max_length=100)),
                ('action_description', models.TextField(help_text='Detailed description of the action')),
                ('action_reason', models.TextField(blank=True, help_text='Reason for the action')),
                ('old_state', models.JSONField(blank=True, help_text='Previous state before action', null=True)),
                ('new_state', models.JSONField(blank=True, help_text='New state after action', null=True)),
                ('changed_fields', models.JSONField(default=list, help_text='List of fields that were changed')),
                ('permission_changes', models.JSONField(default=list, help_text='Detailed permission changes')),
                ('permission_justification', models.TextField(blank=True, help_text='Justification for permission changes')),
                ('approval_chain', models.JSONField(default=list, help_text='Chain of approvals for this action')),
                ('ip_address', models.GenericIPAddressField(help_text='IP address from which action was performed')),
                ('user_agent', models.TextField(blank=True, help_text='Browser/client user agent')),
                ('session_id', models.CharField(blank=True, max_length=100)),
                ('device_fingerprint', models.CharField(blank=True, max_length=200)),
                ('risk_score', models.FloatField(default=0.0, help_text='Risk score 0.0-1.0')),
                ('risk_factors', models.JSONField(default=list, help_text='Factors contributing to risk score')),
                ('compliance_flags', models.JSONField(default=list, help_text='Compliance-related flags')),
                ('timestamp', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('duration_ms', models.PositiveIntegerField(blank=True, help_text='Duration of the action in milliseconds', null=True)),
                ('requires_review', models.BooleanField(default=False, help_text='Whether this action requires review')),
                ('review_decision', models.CharField(blank=True, choices=[('approved', 'Approved'), ('rejected', 'Rejected'), ('escalated', 'Escalated')], max_length=20)),
                ('review_notes', models.TextField(blank=True)),
                ('anomaly_detected', models.BooleanField(default=False, help_text='Whether anomaly detection flagged this')),
                ('anomaly_score', models.FloatField(default=0.0, help_text='Anomaly detection score')),
                ('anomaly_reasons', models.JSONField(default=list, help_text='Reasons for anomaly detection')),
                ('actor_user', models.ForeignKey(help_text='User who performed the action', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='audit_actions', to='users.user')),
                ('reviewed_at', models.DateTimeField(blank=True, null=True)),
                ('reviewed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reviewed_audit_logs', to='users.user')),
                ('target_user', models.ForeignKey(blank=True, help_text='User affected by the action', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='audit_targets', to='users.user')),
            ],
            options={
                'verbose_name': 'Enhanced Audit Log',
                'verbose_name_plural': 'Enhanced Audit Logs',
                'ordering': ['-timestamp'],
                'indexes': [
                    models.Index(fields=['event_type', '-timestamp'], name='core_enh_audit_event_idx'),
                    models.Index(fields=['severity', '-timestamp'], name='core_enh_audit_severity_idx'),
                    models.Index(fields=['actor_user', '-timestamp'], name='core_enh_audit_actor_idx'),
                    models.Index(fields=['target_user', '-timestamp'], name='core_enh_audit_target_idx'),
                    models.Index(fields=['requires_review', '-timestamp'], name='core_enh_audit_review_idx'),
                    models.Index(fields=['risk_score', '-timestamp'], name='core_enh_audit_risk_idx'),
                    models.Index(fields=['anomaly_detected', '-timestamp'], name='core_enh_audit_anomaly_idx'),
                    models.Index(fields=['timestamp'], name='core_enh_audit_timestamp_idx'),
                ],
            },
        ),
    ]
