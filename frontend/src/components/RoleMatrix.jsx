import { useEffect, useState } from "react";
import { CheckIcon as Check } from "@phosphor-icons/react/dist/csr/Check";
import { FloppyDiskIcon as Save } from "@phosphor-icons/react/dist/csr/FloppyDisk";
import { PlusIcon as Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { ShieldIcon as Shield } from "@phosphor-icons/react/dist/csr/Shield";
import { XIcon as X } from "@phosphor-icons/react/dist/csr/X";
import { ArrowCounterClockwiseIcon as Reset } from "@phosphor-icons/react/dist/csr/ArrowCounterClockwise";
import api from "../api/axios";

const message = (e) =>
  e.response?.data?.detail ||
  "No se pudieron guardar los cambios. Revisa la conexión.";
const same = (a, b) => a.length === b.length && a.every((id) => b.includes(id));

export default function RoleMatrix({ user }) {
  const [roles, setRoles] = useState([]),
    [matrix, setMatrix] = useState(null),
    [draft, setDraft] = useState({});
  const [mode, setMode] = useState("role"),
    [selectedRole, setSelectedRole] = useState(""),
    [selectedResource, setSelectedResource] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(""),
    [creating, setCreating] = useState(false);
  async function load() {
    const [r, m] = await Promise.all([
      api.get("/security/roles/"),
      api.get("/security/matrix/"),
    ]);
    setRoles(r.data);
    setMatrix(m.data);
    setDraft(
      Object.fromEntries(r.data.map((role) => [role.id, role.permissions])),
    );
    setSelectedRole((current) => current || String(r.data[0]?.id || ""));
    setSelectedResource(
      (current) => current || String(m.data.resources[0]?.id || ""),
    );
  }
  useEffect(() => {
    load().catch((e) => setError(message(e)));
  }, []);
  const role = roles.find((r) => String(r.id) === selectedRole);
  const resource = matrix?.resources.find(
    (r) => String(r.id) === selectedResource,
  );
  const roleDefaultCodes = role ? matrix?.defaults?.[role.name] : null;
  const roleDefaultSet = new Set(roleDefaultCodes || []);
  const defaultResources = (matrix?.resources || [])
    .map((item) => {
      const actions = matrix.actions
        .filter((action) => roleDefaultSet.has(item.permissions?.[action.code]?.code))
        .map((action) => action.label.toLowerCase());
      return actions.length ? `${item.name} (${actions.join(", ")})` : null;
    })
    .filter(Boolean);
  const dirty = roles.filter((r) => !same(r.permissions, draft[r.id] || []));
  const rolePermissionIds = [
    ...new Set(
      (matrix?.resources || []).flatMap((item) =>
        Object.values(item.permissions || {}).map((permission) => permission.id),
      ),
    ),
  ];
  const resourcePermissionIds = Object.values(resource?.permissions || {}).map(
    (permission) => permission.id,
  );
  const bulkPermissionIds =
    mode === "role" ? rolePermissionIds : resourcePermissionIds;
  const bulkTargets =
    mode === "role"
      ? role
        ? [{ id: role.id, permissions: draft[role.id] || [] }]
        : []
      : roles.map((item) => ({
          id: item.id,
          permissions: draft[item.id] || [],
        }));
  const bulkAllChecked =
    bulkPermissionIds.length > 0 &&
    bulkTargets.every((target) =>
      bulkPermissionIds.every((id) => target.permissions.includes(id)),
    );
  const bulkNoneChecked = bulkTargets.every((target) =>
    bulkPermissionIds.every((id) => !target.permissions.includes(id)),
  );
  function toggle(roleId, ids, checked) {
    setSaved("");
    setDraft((current) => ({
      ...current,
      [roleId]: checked
        ? [...new Set([...(current[roleId] || []), ...ids])]
        : (current[roleId] || []).filter((id) => !ids.includes(id)),
    }));
  }
  function setBulkPermissions(checked) {
    setSaved("");
    setDraft((current) => {
      const next = { ...current };
      bulkTargets.forEach(({ id }) => {
        const currentIds = current[id] || [];
        next[id] = checked
          ? [...new Set([...currentIds, ...bulkPermissionIds])]
          : currentIds.filter(
              (permissionId) => !bulkPermissionIds.includes(permissionId),
            );
      });
      return next;
    });
  }
  function notifyPermissionChanges() {
    window.dispatchEvent(new Event("kaillisto:permissions"));
    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel("kaillisto:permissions");
      channel.postMessage("updated");
      channel.close();
    }
    try {
      localStorage.setItem("kaillisto:permissions-updated", String(Date.now()));
    } catch {
      // La pestaña actual y BroadcastChannel siguen sincronizados si el almacenamiento está bloqueado.
    }
  }
  async function restoreDefaults() {
    if (!role || !roleDefaultCodes || busy || dirty.length) return;
    if (
      !window.confirm(
        `Se reemplazarán los permisos de “${role.name}” por los predeterminados. ¿Continuar?`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    setSaved("");
    try {
      await api.post(`/security/roles/${role.id}/restore-defaults/`);
      await load();
      notifyPermissionChanges();
      setSaved(`Permisos predeterminados restaurados para ${role.name}.`);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    setError("");
    setSaved("");
    try {
      await Promise.all(
        dirty.map((r) =>
          api.patch(`/security/roles/${r.id}/`, {
            permissions: draft[r.id],
          }),
        ),
      );
      await load();
      notifyPermissionChanges();
      setSaved(
        "Permisos guardados. El servidor aplica los cambios inmediatamente.",
      );
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  const rows = !matrix
    ? []
    : mode === "role"
      ? matrix.resources.map((r) => ({
          key: r.id,
          label: r.name,
          description: r.code,
          resource: r,
          role,
        }))
      : roles.map((r) => ({
          key: r.id,
          label: r.name,
          description: r.is_active ? "Rol activo" : "Rol inactivo",
          resource,
          role: r,
        }));
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">SEGURIDAD / CONTROL DE ACCESO</span>
          <h1>Roles y permisos</h1>
          <p>Recursos → permisos → roles → usuarios.</p>
        </div>
        <div className="actions">
          {mode === "role" && (
            <button
              disabled={busy || dirty.length > 0 || !roleDefaultCodes}
              title={
                roleDefaultCodes
                  ? "Reemplaza los permisos de este rol por sus valores iniciales"
                  : "Los roles personalizados no tienen permisos predeterminados"
              }
              onClick={restoreDefaults}
            >
              <Reset size={16} />
              Restablecer predeterminados
            </button>
          )}
          <button
            disabled={busy || dirty.length > 0}
            onClick={() => setCreating(true)}
          >
            <Plus size={16} />
            Nuevo rol
          </button>
          <button
            className="primary"
            disabled={busy || !dirty.length}
            onClick={save}
          >
            <Save size={16} />
            {busy ? "Guardando…" : "Guardar permisos"}
            {dirty.length > 0 && ` (${dirty.length})`}
          </button>
        </div>
      </div>
        {mode === "role" && role && (
          <div className="role-defaults" aria-live="polite">
            <strong>
              {roleDefaultCodes ? "Permisos predeterminados:" : "Sin predeterminados:"}
            </strong>
            <span>
              {roleDefaultCodes
                ? defaultResources.join(" · ") || "Sin recursos activos asignados"
                : "Este rol personalizado conserva su configuración propia."}
            </span>
          </div>
        )}
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
      {user?.is_superuser && (
        <p className="notice" role="status">
          Estás conectado como superadministrador. Este usuario conserva acceso total aunque desmarques permisos del rol Administrador; prueba esos cambios con una cuenta Administrador normal.
        </p>
      )}
      {saved && (
        <p role="status" className="notice">
          <Check size={15} /> {saved}
        </p>
      )}
      <section className="data-panel permissions-panel">
        <div className="matrix-toolbar">
          <div className="tabs">
            <button
              className={mode === "role" ? "active" : ""}
              onClick={() => setMode("role")}
            >
              Por rol
            </button>
            <button
              className={mode === "resource" ? "active" : ""}
              onClick={() => setMode("resource")}
            >
              Por recurso
            </button>
          </div>
          <div
            className="matrix-bulk-actions"
            aria-label="Acciones masivas de permisos"
          >
            <button
              disabled={busy || !bulkPermissionIds.length || bulkAllChecked}
              onClick={() => setBulkPermissions(true)}
            >
              Marcar todo
            </button>
            <button
              disabled={busy || !bulkPermissionIds.length || bulkNoneChecked}
              onClick={() => setBulkPermissions(false)}
            >
              Desmarcar todo
            </button>
          </div>
          <label>
            {mode === "role" ? "Selecciona un rol" : "Selecciona un recurso"}
            <select
              value={mode === "role" ? selectedRole : selectedResource}
              onChange={(e) =>
                mode === "role"
                  ? setSelectedRole(e.target.value)
                  : setSelectedResource(e.target.value)
              }
            >
              {(mode === "role" ? roles : matrix?.resources || []).map((r) => (
                <option value={r.id} key={r.id}>
                  {r.name}
                  {r.is_active ? "" : " · Inactivo"}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="matrix-context">
          <Shield size={18} />
          <div>
            <strong>{mode === "role" ? role?.name : resource?.name}</strong>
            <p>
              {mode === "role"
                ? role?.description ||
                  "Configura las acciones permitidas para este rol."
                : resource?.description ||
                  "Configura qué acciones puede realizar cada rol sobre este recurso."}
            </p>
          </div>
          <span className="tag">
            {mode === "role"
              ? `${draft[role?.id]?.length || 0} permisos`
              : `${roles.length} roles`}
          </span>
        </div>
        {!matrix ? (
          <p className="empty">Cargando matriz…</p>
        ) : (
          <div className="table-scroll">
            <table className="permission-matrix">
              <thead>
                <tr>
                  <th>{mode === "role" ? "Recurso" : "Rol"}</th>
                  {matrix.actions.map((a) => (
                    <th key={a.code}>{a.label}</th>
                  ))}
                  <th>Fila completa</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const ids = Object.values(
                    row.resource?.permissions || {},
                  ).map((p) => p.id);
                  const checked =
                    ids.length > 0 &&
                    ids.every((id) => draft[row.role?.id]?.includes(id));
                  return (
                    <tr key={row.key}>
                      <td>
                        <strong>{row.label}</strong>
                        <small>{row.description}</small>
                      </td>
                      {matrix.actions.map((action) => {
                        const permission =
                          row.resource?.permissions[action.code];
                        return (
                          <td key={action.code}>
                            {permission && row.role ? (
                              <input
                                type="checkbox"
                                aria-label={`${row.role.name}: ${action.label} ${row.resource.name}`}
                                checked={
                                  draft[row.role.id]?.includes(permission.id) ||
                                  false
                                }
                                disabled={busy}
                                onChange={(e) =>
                                  toggle(
                                    row.role.id,
                                    [permission.id],
                                    e.target.checked,
                                  )
                                }
                              />
                            ) : (
                              <span aria-label="No disponible">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Todos los permisos: ${row.label}`}
                          checked={checked}
                          disabled={busy || !row.role || !ids.length}
                          onChange={(e) =>
                            toggle(row.role.id, ids, e.target.checked)
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="matrix-note">
          Los checks habilitan acciones. Se conserva el ámbito de cada rol:
          órdenes asignadas para técnicos y comunidad propia para líderes. El
          superadministrador de Django mantiene acceso completo.
        </p>
      </section>
      {dirty.length > 0 && (
        <div className="matrix-unsaved">
          <span>
            Cambios pendientes en {dirty.length}{" "}
            {dirty.length === 1 ? "rol" : "roles"}.
          </span>
          <button
            disabled={busy}
            onClick={() => {
              setDraft(
                Object.fromEntries(roles.map((r) => [r.id, r.permissions])),
              );
              setSaved("");
            }}
          >
            Descartar cambios
          </button>
        </div>
      )}
      {creating && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Crear rol"
          >
            <header>
              <h2>Nuevo rol</h2>
              <button
                aria-label="Cerrar"
                className="icon-button"
                onClick={() => setCreating(false)}
              >
                <X />
              </button>
            </header>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(e.currentTarget));
                setBusy(true);
                try {
                  const result = await api.post("/security/roles/", {
                    ...data,
                    permissions: [],
                    is_active: true,
                  });
                  await load();
                  setSelectedRole(String(result.data.id));
                  setCreating(false);
                } catch (e) {
                  setError(message(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Nombre
                <input name="name" required maxLength={100} />
              </label>
              <label>
                Descripción
                <input name="description" />
              </label>
              <p>
                Asigna el nuevo rol desde Usuarios junto a un rol operativo
                base. Sus permisos se suman y se conserva el ámbito del rol
                operativo.
              </p>
              <button className="primary" disabled={busy}>
                Crear rol
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
