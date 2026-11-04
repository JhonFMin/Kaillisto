from django.contrib.auth import get_user_model
from django.db import DatabaseError


class ActivityAuditMiddleware:
    """Log API mutations and authentication attempts without request payloads."""

    MUTATIONS = {"POST", "PUT", "PATCH", "DELETE"}

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path_info
        is_api = path.startswith("/api/")
        is_login = path in {"/api/iniciar_sesion/", "/api/security/login/"}
        is_logout = path == "/api/cerrar_sesion/"
        is_audit_access = path in {"/api/security/audit/", "/api/security/audit/export/"} and request.method == "GET"
        should_log = is_api and (request.method in self.MUTATIONS or is_login or is_logout or is_audit_access)
        response = self.get_response(request)
        if not should_log or path in {"/api/csrf/"}:
            return response

        try:
            actor = getattr(request, "user", None)
            if (not actor or not actor.is_authenticated) and is_login and response.status_code < 400:
                user_id = request.session.get("_auth_user_id")
                if user_id:
                    actor = get_user_model().objects.filter(pk=user_id).first()
            from .models import SecurityAuditEvent

            action = (
                "auth.login" if is_login else "auth.logout" if is_logout
                else "security.audit_export" if path.endswith("/export/")
                else "security.audit_view" if is_audit_access
                else f"api.{request.method.lower()}"
            )
            SecurityAuditEvent.objects.create(
                actor=actor if actor and actor.is_authenticated else None,
                action=action,
                target_type="endpoint",
                target_id=path[:80],
                target_label=path[:160],
                changes={"method": request.method, "status": response.status_code},
                reason="Solicitud procesada" if response.status_code < 400 else "Solicitud fallida",
            )
        except (DatabaseError, AttributeError, TypeError, ValueError):
            # Auditing should never make an otherwise valid API operation fail.
            pass
        return response
