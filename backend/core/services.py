from .models import AuditLog
from django.contrib.auth import get_user_model

User = get_user_model()

def log_audit_action(
    action: str,
    request_user: User,
    affected_user: User = None,
    ip_address: str = None,
    metadata: dict = None
) -> AuditLog:
    """
    Log an admin action to the audit log
    """
    return AuditLog.objects.create(
        user=affected_user,
        admin=request_user,
        action=action,
        ip_address=ip_address,
        metadata=metadata or {}
    )
