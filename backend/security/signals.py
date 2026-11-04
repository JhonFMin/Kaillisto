"""Field-level audit trail for domain records changed by API or Django admin."""
import json
from datetime import date, datetime
from decimal import Decimal

from django.apps import apps as global_apps
from django.contrib.auth import get_user_model
from django.db import DatabaseError
from django.db.models.signals import post_delete, post_save, pre_delete, pre_save
from django.dispatch import receiver

from .audit_context import current_audit_request
from .models import SecurityAuditEvent


EXCLUDED_FIELDS = {'password', 'last_login', 'api_key_hash', 'token', 'secret'}
AUDITED_APPS = {'core', 'devices', 'maintenance', 'catalogs'}
SENSITIVE_FIELDS = {'email', 'documento', 'first_name', 'last_name', 'telefono'}
NON_AUDITED_MODELS = {'medicion'}  # High-volume ESP32 telemetry is already stored as measurements.
NON_AUDITED_FIELDS = {'ultima_comunicacion'}  # Heartbeats update this on every sensor request.


def _serialize(value):
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    try:
        json.dumps(value)
        return value
    except (TypeError, ValueError):
        return str(value)[:300]


def _request_metadata():
    request = current_audit_request.get()
    if request is None:
        return None, {}
    actor = getattr(request, 'user', None)
    actor = actor if getattr(actor, 'is_authenticated', False) else None
    if actor is not None and actor._meta.label_lower != get_user_model()._meta.label_lower:
        actor = None
    return actor, {'ruta': request.path_info[:200], 'metodo': request.method}


def _field_values(instance):
    return {
        field.name: getattr(instance, field.attname)
        for field in instance._meta.concrete_fields
        if field.name not in EXCLUDED_FIELDS | NON_AUDITED_FIELDS
        and field.attname not in EXCLUDED_FIELDS | NON_AUDITED_FIELDS
    }


def _record(instance, action, changes=None):
    actor, request_details = _request_metadata()
    details = dict(changes or {})
    if request_details:
        details['solicitud'] = request_details
    label = next((
        str(value)[:160]
        for field in ('nombre', 'username', 'codigo', 'mensaje', 'descripcion', 'name')
        if (value := getattr(instance, field, None)) not in (None, '')
    ), f'{instance._meta.verbose_name} #{instance.pk}')
    try:
        SecurityAuditEvent.objects.create(
            actor=actor,
            action=action,
            target_type=f'{instance._meta.app_label}.{instance._meta.model_name}'[:60],
            target_id=str(instance.pk)[:80],
            target_label=label,
            changes=details,
            reason='Cambio de datos del sistema',
        )
    except DatabaseError:
        # Startup, migrations, or a temporary audit-table outage must not break writes.
        return


def _should_audit(instance):
    return (
        instance._meta.apps is global_apps
        and instance._meta.app_label in AUDITED_APPS
        and instance._meta.model_name != 'usuario'
        and instance._meta.model_name not in NON_AUDITED_MODELS
        and not isinstance(instance, SecurityAuditEvent)
    )


@receiver(pre_save, dispatch_uid='kaillisto_audit_capture_before')
def capture_before(sender, instance, raw=False, **kwargs):
    if raw or not _should_audit(instance):
        return
    if instance.pk and sender._base_manager.filter(pk=instance.pk).exists():
        previous = sender._base_manager.get(pk=instance.pk)
        instance._kaillisto_audit_before = _field_values(previous)
    else:
        instance._kaillisto_audit_before = None


@receiver(post_save, dispatch_uid='kaillisto_audit_record_save')
def record_save(sender, instance, created, raw=False, **kwargs):
    if raw or not _should_audit(instance):
        return
    previous = getattr(instance, '_kaillisto_audit_before', None)
    current = _field_values(instance)
    if created or previous is None:
        fields = {
            name: {'antes': None, 'despues': '[dato protegido]' if name in SENSITIVE_FIELDS else _serialize(value)}
            for name, value in current.items()
            if name != 'id' and value not in (None, '', False)
        }
        _record(instance, 'record.created', {'campos': fields})
        return
    changed = {}
    for name, value in current.items():
        old_value = previous.get(name)
        if old_value != value:
            if name in SENSITIVE_FIELDS:
                changed[name] = {'antes': '[dato protegido]', 'despues': '[dato protegido]'}
            else:
                changed[name] = {'antes': _serialize(old_value), 'despues': _serialize(value)}
    if changed:
        _record(instance, 'record.updated', {'campos': changed})


@receiver(pre_delete, dispatch_uid='kaillisto_audit_capture_delete')
def capture_delete(sender, instance, **kwargs):
    if _should_audit(instance):
        instance._kaillisto_audit_delete_values = {
            name: '[dato protegido]' if name in SENSITIVE_FIELDS else _serialize(value)
            for name, value in _field_values(instance).items()
            if name != 'id' and value not in (None, '', False)
        }


@receiver(post_delete, dispatch_uid='kaillisto_audit_record_delete')
def record_delete(sender, instance, **kwargs):
    if _should_audit(instance):
        _record(instance, 'record.deleted', {'campos': getattr(instance, '_kaillisto_audit_delete_values', {})})
