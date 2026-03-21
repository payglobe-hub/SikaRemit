"""
Enhanced audit logging system for permission changes and admin actions
Provides comprehensive context and detailed tracking for security compliance
"""
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from django.db import models, transaction
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.cache import cache
from django.conf import settings
from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver

from users.models_admin import AdminProfile, AdminActivityLog, AdminPermissionOverride
from users.services_admin import AdminPermissionService
from shared.constants import ADMIN_HIERARCHY_LEVELS, ADMIN_PERMISSIONS

logger = logging.getLogger(__name__)
User = get_user_model()

class EnhancedAuditLog(models.Model):
    """
    Enhanced audit logging with full context for permission changes
    """
    EVENT_TYPES = [
        ('PERMISSION_GRANTED', 'Permission Granted'),
        ('PERMISSION_REVOKED', 'Permission Revoked'),
        ('ROLE_CHANGED', 'Role Changed'),
        ('ADMIN_CREATED', 'Admin Created'),
        ('ADMIN_SUSPENDED', 'Admin Suspended'),
        ('ADMIN_REACTIVATED', 'Admin Reactivated'),
        ('PERMISSION_OVERRIDE_GRANTED', 'Permission Override Granted'),
        ('PERMISSION_OVERRIDE_REVOKED', 'Permission Override Revoked'),
        ('HIERARCHY_CHANGED', 'Hierarchy Changed'),
        ('SESSION_STARTED', 'Session Started'),
        ('SESSION_ENDED', 'Session Ended'),
        ('SECURITY_BREACH_ATTEMPT', 'Security Breach Attempt'),
        ('PRIVILEGE_ESCALATION', 'Privilege Escalation'),
        ('BULK_PERMISSION_CHANGE', 'Bulk Permission Change'),
    ]
    
    SEVERITY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    # Core event information
    event_id = models.CharField(max_length=100, unique=True, db_index=True)
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES, db_index=True)
    severity = models.CharField(max_length=20, choices=SEVERITY_LEVELS, default='medium', db_index=True)
    
    # Actor information
    actor_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, 
                                   related_name='audit_actions', help_text="User who performed the action")
    actor_role = models.CharField(max_length=100, blank=True, help_text="Role of actor at time of action")
    actor_permissions = models.JSONField(default=list, help_text="Permissions of actor at time of action")
    
    # Target information
    target_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='audit_targets', help_text="User affected by the action")
    target_resource_type = models.CharField(max_length=50, help_text="Type of resource affected")
    target_resource_id = models.CharField(max_length=100, blank=True, help_text="ID of affected resource")
    
    # Action details
    action_description = models.TextField(help_text="Detailed description of the action")
    action_reason = models.TextField(blank=True, help_text="Reason for the action")
    
    # State changes
    old_state = models.JSONField(null=True, blank=True, help_text="Previous state before action")
    new_state = models.JSONField(null=True, blank=True, help_text="New state after action")
    changed_fields = models.JSONField(default=list, help_text="List of fields that were changed")
    
    # Permission-specific context
    permission_changes = models.JSONField(default=list, help_text="Detailed permission changes")
    permission_justification = models.TextField(blank=True, help_text="Justification for permission changes")
    approval_chain = models.JSONField(default=list, help_text="Chain of approvals for this action")
    
    # Security context
    ip_address = models.GenericIPAddressField(help_text="IP address from which action was performed")
    user_agent = models.TextField(blank=True, help_text="Browser/client user agent")
    session_id = models.CharField(max_length=100, blank=True)
    device_fingerprint = models.CharField(max_length=200, blank=True)
    
    # Risk assessment
    risk_score = models.FloatField(default=0.0, help_text="Risk score 0.0-1.0")
    risk_factors = models.JSONField(default=list, help_text="Factors contributing to risk score")
    compliance_flags = models.JSONField(default=list, help_text="Compliance-related flags")
    
    # Temporal information
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    duration_ms = models.PositiveIntegerField(null=True, blank=True, help_text="Duration of the action in milliseconds")
    
    # Review and escalation
    requires_review = models.BooleanField(default=False, help_text="Whether this action requires review")
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='reviewed_audit_logs')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_decision = models.CharField(max_length=20, blank=True, 
                                      choices=[('approved', 'Approved'), ('rejected', 'Rejected'), ('escalated', 'Escalated')])
    review_notes = models.TextField(blank=True)
    
    # Automated analysis
    anomaly_detected = models.BooleanField(default=False, help_text="Whether anomaly detection flagged this")
    anomaly_score = models.FloatField(default=0.0, help_text="Anomaly detection score")
    anomaly_reasons = models.JSONField(default=list, help_text="Reasons for anomaly detection")

    class Meta:
        ordering = ['-timestamp']
        verbose_name = "Enhanced Audit Log"
        verbose_name_plural = "Enhanced Audit Logs"
        indexes = [
            models.Index(fields=['event_type', '-timestamp']),
            models.Index(fields=['severity', '-timestamp']),
            models.Index(fields=['actor_user', '-timestamp']),
            models.Index(fields=['target_user', '-timestamp']),
            models.Index(fields=['requires_review', '-timestamp']),
            models.Index(fields=['risk_score', '-timestamp']),
            models.Index(fields=['anomaly_detected', '-timestamp']),
            models.Index(fields=['timestamp']),
        ]

    def __str__(self):
        return f"{self.event_id} - {self.event_type} - {self.timestamp}"

    @classmethod
    def log_permission_change(cls, actor_user, target_user, permission_changes, 
                           action_reason='', ip_address='', user_agent='', **kwargs):
        """Log permission changes with full context"""
        event_id = f"perm_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{target_user.id}"
        
        # Get current state
        try:
            target_profile = target_user.admin_profile
            old_permissions = target_profile.get_effective_permissions()
        except AdminProfile.DoesNotExist:
            old_permissions = []
        
        # Calculate new permissions
        new_permissions = old_permissions.copy()
        for change in permission_changes:
            if change['action'] == 'grant':
                if change['permission'] not in new_permissions:
                    new_permissions.append(change['permission'])
            elif change['action'] == 'revoke':
                if change['permission'] in new_permissions:
                    new_permissions.remove(change['permission'])
        
        # Calculate risk score
        risk_score = cls._calculate_permission_risk_score(
            old_permissions, new_permissions, permission_changes
        )
        
        # Determine severity
        severity = cls._determine_permission_severity(permission_changes, risk_score)
        
        # Get actor context
        try:
            actor_profile = actor_user.admin_profile
            actor_role = actor_profile.role.display_name
            actor_permissions = actor_profile.get_effective_permissions()
        except AdminProfile.DoesNotExist:
            actor_role = actor_user.role
            actor_permissions = []
        
        return cls.objects.create(
            event_id=event_id,
            event_type='PERMISSION_GRANTED' if any(c['action'] == 'grant' for c in permission_changes) else 'PERMISSION_REVOKED',
            severity=severity,
            actor_user=actor_user,
            actor_role=actor_role,
            actor_permissions=actor_permissions,
            target_user=target_user,
            target_resource_type='admin_profile',
            target_resource_id=str(target_user.id),
            action_description=f"Permission changes for {target_user.email}: {', '.join([c['action'] + ' ' + c['permission'] for c in permission_changes])}",
            action_reason=action_reason,
            old_state={'permissions': old_permissions},
            new_state={'permissions': new_permissions},
            changed_fields=['permissions'],
            permission_changes=permission_changes,
            permission_justification=action_reason,
            ip_address=ip_address,
            user_agent=user_agent,
            risk_score=risk_score,
            risk_factors=cls._identify_permission_risk_factors(permission_changes),
            requires_review=risk_score > 0.7
        )

    @classmethod
    def log_role_change(cls, actor_user, target_user, old_role, new_role, 
                       action_reason='', ip_address='', user_agent='', **kwargs):
        """Log role changes with full context"""
        event_id = f"role_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{target_user.id}"
        
        # Get role details
        try:
            from users.models_admin import AdminRole
            old_role_obj = AdminRole.objects.get(display_name=old_role) if old_role else None
            new_role_obj = AdminRole.objects.get(display_name=new_role) if new_role else None
            
            old_permissions = old_role_obj.permissions if old_role_obj else []
            new_permissions = new_role_obj.permissions if new_role_obj else []
        except AdminRole.DoesNotExist:
            old_permissions = []
            new_permissions = []
        
        # Calculate risk score
        risk_score = cls._calculate_role_risk_score(old_role, new_role, old_permissions, new_permissions)
        
        # Determine severity
        severity = 'high' if risk_score > 0.6 else 'medium'
        
        # Get actor context
        try:
            actor_profile = actor_user.admin_profile
            actor_role = actor_profile.role.display_name
            actor_permissions = actor_profile.get_effective_permissions()
        except AdminProfile.DoesNotExist:
            actor_role = actor_user.role
            actor_permissions = []
        
        return cls.objects.create(
            event_id=event_id,
            event_type='ROLE_CHANGED',
            severity=severity,
            actor_user=actor_user,
            actor_role=actor_role,
            actor_permissions=actor_permissions,
            target_user=target_user,
            target_resource_type='admin_profile',
            target_resource_id=str(target_user.id),
            action_description=f"Role changed from {old_role} to {new_role} for {target_user.email}",
            action_reason=action_reason,
            old_state={'role': old_role, 'permissions': old_permissions},
            new_state={'role': new_role, 'permissions': new_permissions},
            changed_fields=['role', 'permissions'],
            permission_changes=[{
                'action': 'role_change',
                'old_role': old_role,
                'new_role': new_role,
                'permission_diff': {
                    'added': list(set(new_permissions) - set(old_permissions)),
                    'removed': list(set(old_permissions) - set(new_permissions))
                }
            }],
            permission_justification=action_reason,
            ip_address=ip_address,
            user_agent=user_agent,
            risk_score=risk_score,
            risk_factors=cls._identify_role_risk_factors(old_role, new_role),
            requires_review=risk_score > 0.5
        )

    @classmethod
    def log_admin_action(cls, actor_user, action_type, target_user=None, 
                        description='', old_state=None, new_state=None,
                        ip_address='', user_agent='', **kwargs):
        """Log general admin actions with enhanced context"""
        event_id = f"action_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{actor_user.id}"
        
        # Determine severity based on action type
        severity_mapping = {
            'ADMIN_SUSPENDED': 'high',
            'ADMIN_REACTIVATED': 'medium',
            'SECURITY_BREACH_ATTEMPT': 'critical',
            'PRIVILEGE_ESCALATION': 'high',
            'BULK_PERMISSION_CHANGE': 'high',
        }
        severity = severity_mapping.get(action_type, 'medium')
        
        # Get actor context
        try:
            actor_profile = actor_user.admin_profile
            actor_role = actor_profile.role.display_name
            actor_permissions = actor_profile.get_effective_permissions()
        except AdminProfile.DoesNotExist:
            actor_role = actor_user.role
            actor_permissions = []
        
        return cls.objects.create(
            event_id=event_id,
            event_type=action_type,
            severity=severity,
            actor_user=actor_user,
            actor_role=actor_role,
            actor_permissions=actor_permissions,
            target_user=target_user,
            target_resource_type='user' if target_user else 'system',
            target_resource_id=str(target_user.id) if target_user else 'system',
            action_description=description,
            old_state=old_state,
            new_state=new_state,
            ip_address=ip_address,
            user_agent=user_agent,
            risk_score=cls._calculate_action_risk_score(action_type),
            requires_review=severity in ['high', 'critical']
        )

    @classmethod
    def _calculate_permission_risk_score(cls, old_permissions, new_permissions, changes):
        """Calculate risk score for permission changes"""
        score = 0.0
        
        # High-risk permissions
        high_risk_permissions = {
            'admin_management', 'system_settings', 'audit_logs_override',
            'user_management', 'transaction_override', 'security_settings'
        }
        
        # Medium-risk permissions
        medium_risk_permissions = {
            'reporting', 'kyc_review', 'merchant_approval', 'support_management'
        }
        
        for change in changes:
            permission = change['permission']
            if change['action'] == 'grant':
                if permission in high_risk_permissions:
                    score += 0.3
                elif permission in medium_risk_permissions:
                    score += 0.2
                else:
                    score += 0.1
            elif change['action'] == 'revoke':
                # Revoking permissions is generally lower risk
                if permission in high_risk_permissions:
                    score += 0.1
                else:
                    score += 0.05
        
        # Additional risk factors
        if len(changes) > 5:
            score += 0.2  # Bulk changes
        
        return min(score, 1.0)

    @classmethod
    def _calculate_role_risk_score(cls, old_role, new_role, old_perms, new_perms):
        """Calculate risk score for role changes"""
        score = 0.0
        
        if not old_role or not new_role:
            return 0.5  # Default medium risk for undefined roles
        
        # Check for privilege escalation
        try:
            from users.models_admin import AdminRole
            old_level = AdminRole.objects.get(display_name=old_role).level
            new_level = AdminRole.objects.get(display_name=new_role).level
            
            if new_level < old_level:  # Higher privilege level (lower number = higher level)
                score += 0.4
        except AdminRole.DoesNotExist:
            score += 0.2
        
        # Check permission differences
        added_high_risk = len(set(new_perms) & {'admin_management', 'system_settings', 'audit_logs_override'})
        score += added_high_risk * 0.2
        
        return min(score, 1.0)

    @classmethod
    def _calculate_action_risk_score(cls, action_type):
        """Calculate risk score for general admin actions"""
        risk_mapping = {
            'ADMIN_SUSPENDED': 0.6,
            'ADMIN_REACTIVATED': 0.4,
            'SECURITY_BREACH_ATTEMPT': 0.9,
            'PRIVILEGE_ESCALATION': 0.8,
            'BULK_PERMISSION_CHANGE': 0.7,
            'PERMISSION_OVERRIDE_GRANTED': 0.6,
            'PERMISSION_OVERRIDE_REVOKED': 0.3,
        }
        return risk_mapping.get(action_type, 0.3)

    @classmethod
    def _determine_permission_severity(cls, changes, risk_score):
        """Determine severity level for permission changes"""
        if risk_score > 0.7:
            return 'critical'
        elif risk_score > 0.5:
            return 'high'
        elif risk_score > 0.3:
            return 'medium'
        else:
            return 'low'

    @classmethod
    def _identify_permission_risk_factors(cls, changes):
        """Identify risk factors for permission changes"""
        factors = []
        
        high_risk_permissions = {
            'admin_management', 'system_settings', 'audit_logs_override',
            'user_management', 'transaction_override', 'security_settings'
        }
        
        for change in changes:
            if change['action'] == 'grant' and change['permission'] in high_risk_permissions:
                factors.append(f"granted_high_risk_permission_{change['permission']}")
        
        if len(changes) > 5:
            factors.append('bulk_permission_change')
        
        return factors

    @classmethod
    def _identify_role_risk_factors(cls, old_role, new_role):
        """Identify risk factors for role changes"""
        factors = []
        
        if old_role and new_role:
            try:
                from users.models_admin import AdminRole
                old_level = AdminRole.objects.get(display_name=old_role).level
                new_level = AdminRole.objects.get(display_name=new_role).level
                
                if new_level < old_level:
                    factors.append('privilege_escalation')
            except AdminRole.DoesNotExist:
                factors.append('undefined_role_change')
        
        return factors

    def mark_reviewed(self, reviewed_by, decision, notes=''):
        """Mark this audit log as reviewed"""
        self.reviewed_by = reviewed_by
        self.reviewed_at = timezone.now()
        self.review_decision = decision
        self.review_notes = notes
        self.requires_review = False
        self.save()

    def escalate(self, reason=''):
        """Escalate this audit log for higher-level review"""
        self.requires_review = True
        self.severity = 'critical' if self.severity != 'critical' else self.severity
        self.compliance_flags.append(f"escalated_{datetime.now().isoformat()}: {reason}")
        self.save()

class EnhancedAuditService:
    """
    Service class for enhanced audit logging operations
    """
    
    @staticmethod
    def get_permission_change_timeline(user, days=30):
        """Get timeline of permission changes for a user"""
        start_date = timezone.now() - timedelta(days=days)
        
        events = EnhancedAuditLog.objects.filter(
            target_user=user,
            event_type__in=['PERMISSION_GRANTED', 'PERMISSION_REVOKED', 'ROLE_CHANGED'],
            timestamp__gte=start_date
        ).order_by('-timestamp')
        
        return [{
            'event_id': event.event_id,
            'event_type': event.event_type,
            'timestamp': event.timestamp.isoformat(),
            'actor': event.actor_user.email if event.actor_user else 'System',
            'actor_role': event.actor_role,
            'description': event.action_description,
            'old_state': event.old_state,
            'new_state': event.new_state,
            'risk_score': event.risk_score,
            'requires_review': event.requires_review,
        } for event in events]
    
    @staticmethod
    def get_high_risk_activities(days=7, min_risk_score=0.7):
        """Get high-risk activities that need attention"""
        start_date = timezone.now() - timedelta(days=days)
        
        events = EnhancedAuditLog.objects.filter(
            timestamp__gte=start_date,
            risk_score__gte=min_risk_score,
            requires_review=True
        ).order_by('-risk_score', '-timestamp')
        
        return [{
            'event_id': event.event_id,
            'event_type': event.event_type,
            'severity': event.severity,
            'timestamp': event.timestamp.isoformat(),
            'actor': event.actor_user.email if event.actor_user else 'System',
            'target': event.target_user.email if event.target_user else 'System',
            'description': event.action_description,
            'risk_score': event.risk_score,
            'risk_factors': event.risk_factors,
            'ip_address': event.ip_address,
        } for event in events]
    
    @staticmethod
    def get_permission_analytics(days=30):
        """Get analytics about permission changes"""
        start_date = timezone.now() - timedelta(days=days)
        
        # Permission change statistics
        permission_events = EnhancedAuditLog.objects.filter(
            timestamp__gte=start_date,
            event_type__in=['PERMISSION_GRANTED', 'PERMISSION_REVOKED']
        )
        
        # Role change statistics
        role_events = EnhancedAuditLog.objects.filter(
            timestamp__gte=start_date,
            event_type='ROLE_CHANGED'
        )
        
        # Risk distribution
        risk_distribution = EnhancedAuditLog.objects.filter(
            timestamp__gte=start_date
        ).values('severity').annotate(
            count=models.Count('id'),
            avg_risk_score=models.Avg('risk_score')
        )
        
        return {
            'permission_changes': {
                'total': permission_events.count(),
                'granted': permission_events.filter(event_type='PERMISSION_GRANTED').count(),
                'revoked': permission_events.filter(event_type='PERMISSION_REVOKED').count(),
            },
            'role_changes': {
                'total': role_events.count(),
            },
            'risk_distribution': list(risk_distribution),
            'high_risk_events': EnhancedAuditLog.objects.filter(
                timestamp__gte=start_date,
                risk_score__gt=0.7
            ).count(),
            'events_requiring_review': EnhancedAuditLog.objects.filter(
                timestamp__gte=start_date,
                requires_review=True
            ).count(),
        }

# Signal handlers for automatic audit logging
@receiver(pre_save, sender=AdminProfile)
def log_admin_profile_pre_save(sender, instance, **kwargs):
    """Log admin profile changes before saving"""
    if instance.pk:  # Only for existing instances
        try:
            old_instance = AdminProfile.objects.get(pk=instance.pk)
            
            # Check for permission changes
            old_permissions = set(old_instance.get_effective_permissions())
            new_permissions = set(instance.get_effective_permissions())
            
            if old_permissions != new_permissions:
                # Determine what changed
                granted = new_permissions - old_permissions
                revoked = old_permissions - new_permissions
                
                permission_changes = []
                for perm in granted:
                    permission_changes.append({'action': 'grant', 'permission': perm})
                for perm in revoked:
                    permission_changes.append({'action': 'revoke', 'permission': perm})
                
                # Store changes for post_save processing
                instance._audit_permission_changes = permission_changes
                instance._audit_old_permissions = list(old_permissions)
                instance._audit_new_permissions = list(new_permissions)
                
        except AdminProfile.DoesNotExist:
            pass

@receiver(post_save, sender=AdminProfile)
def log_admin_profile_post_save(sender, instance, created, **kwargs):
    """Log admin profile changes after saving"""
    if created:
        # Log admin creation
        EnhancedAuditLog.log_admin_action(
            actor_user=instance.user,  # Self-creation for now
            action_type='ADMIN_CREATED',
            target_user=instance.user,
            description=f"Admin profile created for {instance.user.email} with role {instance.role.display_name}",
            old_state={},
            new_state={
                'role': instance.role.display_name,
                'permissions': instance.get_effective_permissions()
            },
            ip_address='127.0.0.1',  # Should be set from request
            user_agent='System Creation'
        )
    else:
        # Check for permission changes
        if hasattr(instance, '_audit_permission_changes'):
            # Get current user from thread local or request (implementation needed)
            # For now, using the target user as actor (this should be improved)
            actor_user = instance.user
            
            EnhancedAuditLog.log_permission_change(
                actor_user=actor_user,
                target_user=instance.user,
                permission_changes=instance._audit_permission_changes,
                action_reason='Profile update',
                ip_address='127.0.0.1',  # Should be set from request
                user_agent='System Update'
            )

@receiver(post_save, sender=AdminPermissionOverride)
def log_permission_override_post_save(sender, instance, created, **kwargs):
    """Log permission override changes"""
    action_type = 'PERMISSION_OVERRIDE_GRANTED' if created else 'PERMISSION_OVERRIDE_REVOKED'
    
    EnhancedAuditLog.log_admin_action(
        actor_user=instance.granted_by,
        action_type=action_type,
        target_user=instance.admin_profile.user,
        description=f"Permission override {instance.permission_key} {'granted' if created else 'revoked'} for {instance.admin_profile.user.email}",
        old_state={},
        new_state={
            'permission': instance.permission_key,
            'expires_at': instance.expires_at.isoformat() if instance.expires_at else None,
            'reason': instance.reason
        },
        ip_address='127.0.0.1',  # Should be set from request
        user_agent='System Update'
    )
