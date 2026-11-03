from .models import SecurityAuditEvent


def audit_security_change(request, action, target_type, target_id, target_label='', changes=None):
    """Write a compact audit entry; never include credentials or request bodies wholesale."""
    actor = getattr(request, 'user', None)
    if not getattr(actor, 'is_authenticated', False):
        actor = None
    reason = request.data.get('reason', '') if hasattr(request, 'data') else ''
    return SecurityAuditEvent.objects.create(
        actor=actor,
        action=action,
        target_type=target_type,
        target_id=str(target_id),
        target_label=str(target_label or '')[:160],
        changes=changes or {},
        reason=str(reason or '')[:255],
    )
