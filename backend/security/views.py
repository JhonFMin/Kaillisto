from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.db import transaction
from django.http import HttpResponse
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

from .models import Role, UserRole, SecurityAuditEvent, get_effective_permissions
from .audit import audit_security_change
from .serializers import (
    RoleSerializer, UserRoleSerializer,
    PermissionSerializer, UsuarioResumenSerializer
)
from .permissions import HasUserViewPermission, IsAdminRole
from .defaults import default_permissions

Usuario = get_user_model()


class RoleViewSet(viewsets.ModelViewSet):
    """CRUD de Roles. Solo Administradores."""
    queryset = Role.objects.prefetch_related('permissions__content_type').all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]

    @staticmethod
    def _snapshot(role):
        return {
            'name': role.name,
            'description': role.description,
            'is_active': role.is_active,
            'permissions': sorted(role.permissions.values_list('codename', flat=True)),
        }

    @transaction.atomic
    def perform_create(self, serializer):
        role = serializer.save()
        audit_security_change(
            self.request, 'role.created', 'role', role.pk, role.name,
            {'after': self._snapshot(role)},
        )

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        role = self.get_object()
        before = self._snapshot(role)
        response = super().update(request, *args, **kwargs)
        role.refresh_from_db()
        after = self._snapshot(role)
        if before != after:
            audit_security_change(
                request, 'role.updated', 'role', role.pk, role.name,
                {'before': before, 'after': after},
            )
        return response

    @action(detail=True, methods=['post'], url_path='restore-defaults')
    @transaction.atomic
    def restore_defaults(self, request, pk=None):
        role = self.get_object()
        permissions = default_permissions(role.name)
        if permissions is None:
            raise ValidationError({"detail": "Este rol personalizado no tiene permisos predeterminados."})
        before = self._snapshot(role)
        role.permissions.set(permissions)
        audit_security_change(
            request, 'role.defaults_restored', 'role', role.pk, role.name,
            {'before': before, 'after': self._snapshot(role)},
        )
        return Response(self.get_serializer(role).data)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        """Borrado lógico: inactiva el rol, no lo elimina físicamente."""
        instance = self.get_object()
        if not instance.is_active:
            return Response(
                {"detail": "El rol ya está inactivo."},
                status=status.HTTP_400_BAD_REQUEST
            )
        before = self._snapshot(instance)
        instance.is_active = False
        instance.save()
        audit_security_change(
            request, 'role.deactivated', 'role', instance.pk, instance.name,
            {'before': before, 'after': self._snapshot(instance)},
        )
        return Response(
            {"detail": "Rol inactivado correctamente."},
            status=status.HTTP_200_OK
        )

class UserRoleViewSet(viewsets.ModelViewSet):
    """Gestión de asignación de roles a usuarios. Solo Administradores."""
    queryset = UserRole.objects.select_related('usuario', 'rol', 'asignado_por').all()
    serializer_class = UserRoleSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]
    @transaction.atomic
    def perform_destroy(self, instance):
        if not self.request.user.is_superuser and 'revoke_userrole' not in get_effective_permissions(self.request.user):
            raise PermissionDenied('Tu rol no puede retirar roles.')
        if instance.rol.name == "Administrador":
            otros_admins = UserRole.objects.filter(
                rol__name="Administrador", rol__is_active=True
            ).exclude(pk=instance.pk).exists()
            if not otros_admins:
                raise ValidationError({"detail": "No puedes quitar al último Administrador del sistema."})
        audit_security_change(
            self.request, 'user_role.revoked', 'user', instance.usuario_id,
            instance.usuario.username,
            {'role_id': instance.rol_id, 'role': instance.rol.name},
        )
        instance.delete()
    @transaction.atomic
    def perform_create(self, serializer):
        usuario_destino = serializer.validated_data['usuario']
        if self.request.user.pk == usuario_destino.pk:
            raise ValidationError({"detail": "No puedes asignarte roles a ti mismo."})
        if not self.request.user.is_superuser and 'assign_userrole' not in get_effective_permissions(self.request.user):
            raise PermissionDenied('Tu rol no puede asignar roles.')
        assignment = serializer.save(asignado_por=self.request.user)
        audit_security_change(
            self.request, 'user_role.assigned', 'user', assignment.usuario_id,
            assignment.usuario.username,
            {'role_id': assignment.rol_id, 'role': assignment.rol.name},
        )

    def get_queryset(self):
        qs = super().get_queryset()
        usuario_id = self.request.query_params.get('usuario')
        if usuario_id:
            qs = qs.filter(usuario_id=usuario_id)
        return qs


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def security_audit(request):
    """Latest security changes, restricted to administrators and superadmins."""
    if not (request.user.is_superuser or 'view_securityauditevent' in get_effective_permissions(request.user)):
        raise PermissionDenied('Tu rol no tiene permiso para consultar la auditoría de seguridad.')
    events = SecurityAuditEvent.objects.select_related('actor').all()[:200]
    return Response([
        {
            'id': event.pk,
            'actor': event.actor.username if event.actor_id else 'Cuenta eliminada',
            'action': event.action,
            'target_type': event.target_type,
            'target_id': event.target_id,
            'target_label': event.target_label,
            'changes': event.changes,
            'reason': event.reason,
            'created_at': event.created_at,
        }
        for event in events
    ])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def security_audit_export(request):
    if not (request.user.is_superuser or 'view_securityauditevent' in get_effective_permissions(request.user)):
        raise PermissionDenied('Tu rol no tiene permiso para exportar la auditoría de seguridad.')
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = 'Auditoría'
    sheet.append(['Fecha (UTC)', 'Actor', 'Acción', 'Tipo de objetivo', 'ID objetivo', 'Objetivo', 'Detalle', 'Motivo'])
    header_fill = PatternFill('solid', fgColor='241638')
    for cell in sheet[1]:
        cell.font = Font(bold=True, color='FFFFFF')
        cell.fill = header_fill
        cell.alignment = Alignment(vertical='center')
    events = SecurityAuditEvent.objects.select_related('actor').order_by('-created_at').iterator(chunk_size=500)
    def safe_cell(value):
        value = str(value or "")
        return "'" + value if value.startswith(("=", "+", "-", "@")) else value
    for event in events:
        detail = safe_cell(str(event.changes or {})[:32000])
        sheet.append([
            safe_cell(event.created_at.isoformat() if event.created_at else ''),
            safe_cell(event.actor.username if event.actor_id else 'Cuenta eliminada'),
            safe_cell(event.action), safe_cell(event.target_type), safe_cell(event.target_id), safe_cell(event.target_label),
            detail, safe_cell(event.reason),
        ])
    widths = [25, 22, 34, 22, 14, 32, 70, 38]
    for index, width in enumerate(widths, 1):
        sheet.column_dimensions[get_column_letter(index)].width = width
    sheet.freeze_panes = 'A2'
    sheet.auto_filter.ref = sheet.dimensions
    sheet.sheet_view.showGridLines = False
    for row in sheet.iter_rows(min_row=2):
        for cell in row:
            cell.alignment = Alignment(vertical='top', wrap_text=True)
    response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = 'attachment; filename="kaillisto-auditoria.xlsx"'
    workbook.save(response)
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_permissions(request):
    """Permisos y roles efectivos del usuario autenticado."""
    roles = list(
        request.user.roles_asignados
        .filter(rol__is_active=True)
        .values_list('rol__name', flat=True)
    )
    permisos = get_effective_permissions(request.user)
    return Response({
        "usuario": request.user.username,
        "es_superuser": request.user.is_superuser,
        "roles": roles,
        "permisos": permisos
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminRole])
def lista_permisos(request):
    """Lista todos los permisos de Django disponibles para asignar a roles."""
    permisos = Permission.objects.select_related('content_type').order_by(
        'content_type__app_label', 'codename'
    )
    serializer = PermissionSerializer(permisos, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasUserViewPermission])
def lista_usuarios(request):
    """Lista usuarios del sistema para la asignación de roles."""
    usuarios = Usuario.objects.prefetch_related(
        'roles_asignados__rol'
    ).order_by('username')
    serializer = UsuarioResumenSerializer(usuarios, many=True)
    return Response(serializer.data)
