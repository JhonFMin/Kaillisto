from django.contrib.auth import get_user_model
from django.db import DatabaseError

from .audit_context import current_audit_request


class ActivityAuditMiddleware:
    """Attach request context to field-level logs and record auth/audit access."""

    LOGIN_PATHS = {'/api/iniciar_sesion/', '/api/security/login/'}
    LOGOUT_PATHS = {'/api/cerrar_sesion/'}
    AUDIT_PATHS = {'/api/security/audit/', '/api/security/audit/export/'}

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        actor_before_request = getattr(request, 'user', None)
        token = current_audit_request.set(request)
        try:
            response = self.get_response(request)
        finally:
            current_audit_request.reset(token)

        path = request.path_info
        action = None
        target_type = 'endpoint'
        target_id = path[:80]
        target_label = path[:160]
        changes = {'metodo': request.method, 'estado_http': response.status_code}
        actor = getattr(request, 'user', None)
        if path in self.LOGOUT_PATHS and getattr(actor_before_request, 'is_authenticated', False):
            actor = actor_before_request
        if path in self.LOGIN_PATHS:
            action = 'auth.login' if response.status_code < 400 else 'auth.login_failed'
            if not getattr(actor, 'is_authenticated', False) and response.status_code < 400:
                user_id = request.session.get('_auth_user_id')
                if user_id:
                    actor = get_user_model().objects.filter(pk=user_id).first()
            if action == 'auth.login_failed':
                target_type = 'account.attempt'
                target_id = 'rejected'
                target_label = 'Credenciales rechazadas; no se guarda la contraseña ni el nombre enviado'
        elif path in self.LOGOUT_PATHS:
            action = 'auth.logout'
        elif path in self.AUDIT_PATHS and request.method == 'GET':
            action = 'security.audit_export' if path.endswith('/export/') else 'security.audit_view'

        if action:
            try:
                from .models import SecurityAuditEvent
                SecurityAuditEvent.objects.create(
                    actor=actor if getattr(actor, 'is_authenticated', False) else None,
                    action=action,
                    target_type=target_type,
                    target_id=target_id,
                    target_label=target_label,
                    changes=changes,
                    reason='Acceso satisfactorio' if response.status_code < 400 else 'Intento rechazado',
                )
            except (DatabaseError, AttributeError, TypeError, ValueError):
                # Auditing must not interrupt an otherwise valid request.
                pass
        return response
