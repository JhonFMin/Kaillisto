import { useEffect, useState } from "react";
import { CheckIcon as Check } from "@phosphor-icons/react/dist/csr/Check";
import { FloppyDiskIcon as Save } from "@phosphor-icons/react/dist/csr/FloppyDisk";
import { PlusIcon as Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { ShieldIcon as Shield } from "@phosphor-icons/react/dist/csr/Shield";
import { XIcon as X } from "@phosphor-icons/react/dist/csr/X";
import { ArrowCounterClockwiseIcon as Reset } from "@phosphor-icons/react/dist/csr/ArrowCounterClockwise";
import { InfoIcon as Info } from "@phosphor-icons/react/dist/csr/Info";
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
  const [showDefaultInfo, setShowDefaultInfo] = useState(false);
  const [managingResources, setManagingResources] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [newResourceModel, setNewResourceModel] = useState("");
  const [resourceDraft, setResourceDraft] = useState({});
  const canManageRoles =
    user.is_superuser || user.permisos.includes("change_role");
  const canCreateRoles =
    user.is_superuser || user.permisos.includes("add_role");
  async function load() {
    const [r, m] = await Promise.all([
      api.get("/security/roles/"),
      api.get("/security/matrix/"),
    ]);
    setRoles(r.data);
    setMatrix(m.data);
    setResourceDraft(Object.fromEntries((m.data.resources || []).map((item) => [item.id, {
      name: item.name, description: item.description, menu_group: item.menu_group,
      menu_icon: item.menu_icon, menu_order: item.menu_order, menu_visible: item.menu_visible, is_active: item.is_active,
    }])));
    setDraft(
      Object.fromEntries(r.data.map((role) => [role.id, role.permissions])),
    );
    setSelectedRole((current) => current || String(r.data[0]?.id || ""));
    setSelectedResource(
      (current) => current || String(m.data.resources[0]?.id || ""),
    );
  }
  async function openResourceManager() {
    setManagingResources(true);
    try {
      const { data } = await api.get("/security/resources/available-models/");
      setAvailableModels(data);
      setNewResourceModel(String(data[0]?.id || ""));
    } catch (e) { setError(message(e)); }
  }
  async function saveResource(resource) {
    setBusy(true); setError(""); setSaved("");
    try {
      await api.patch(`/security/resources/${resource.id}/`, resourceDraft[resource.id]);
      await load();
      window.dispatchEvent(new Event("kaillisto:permissions"));
      setSaved(`Recurso “${resourceDraft[resource.id].name}” actualizado.`);
    } catch (e) { setError(message(e)); }
    finally { setBusy(false); }
  }
  async function addResource() {
    const model = availableModels.find((item) => String(item.id) === newResourceModel);
    if (!model) return;
    setBusy(true); setError(""); setSaved("");
    try {
      await api.post("/security/resources/", {
        content_type: model.id, name: model.name, description: "",
        menu_group: "Red energética", menu_icon: "layers", menu_order: 100,
        menu_visible: true, is_active: true,
      });
      await load();
      const { data } = await api.get("/security/resources/available-models/");
      setAvailableModels(data); setNewResourceModel(String(data[0]?.id || ""));
      window.dispatchEvent(new Event("kaillisto:permissions"));
      setSaved(`Recurso “${model.name}” agregado. Asigna sus permisos en la matriz.`);
    } catch (e) { setError(message(e)); }
    finally { setBusy(false); }
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
      return actions.length ? { name: item.name, actions } : null;
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
      const result = await api.post(
        `/security/roles/${role.id}/restore-defaults/`,
      );
      const updatedRole = result.data;
      setRoles((current) =>
        current.map((item) => (item.id === updatedRole.id ? updatedRole : item)),
      );
      setDraft((current) => ({
        ...current,
        [updatedRole.id]: updatedRole.permissions,
      }));
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
      const updatedRoles = roles.map((role) => ({
        ...role,
        permissions: draft[role.id] || [],
      }));
      setRoles(updatedRoles);
      setDraft(
        Object.fromEntries(
          updatedRoles.map((role) => [role.id, role.permissions]),
        ),
      );
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
            <>
              <button type="button" disabled={!canManageRoles || busy} onClick={openResourceManager}>Administrar recursos</button>
              <button type="button" onClick={() => setShowDefaultInfo(true)}>
                <Info size={16} /> Valores iniciales
              </button>
              <button
                disabled={busy || dirty.length > 0 || !roleDefaultCodes || !canManageRoles}
                title={roleDefaultCodes ? "Reemplaza los permisos por los valores iniciales" : "Este rol no tiene valores iniciales"}
                onClick={restoreDefaults}
              >
                <Reset size={16} /> Restablecer
              </button>
            </>
          )}
          <button
            disabled={busy || dirty.length > 0 || !canCreateRoles}
            onClick={() => setCreating(true)}
          >
            <Plus size={16} />
            Nuevo rol
          </button>
          <button
            className="primary"
            disabled={busy || !dirty.length || !canManageRoles}
            onClick={save}
          >
            <Save size={16} />
            {busy ? "Guardando…" : "Guardar permisos"}
            {dirty.length > 0 && ` (${dirty.length})`}
          </button>
        </div>
      </div>
      {showDefaultInfo && role && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowDefaultInfo(false)}>
          <section className="modal defaults-modal" role="dialog" aria-modal="true" aria-labelledby="defaults-title">
            <header><div><span className="eyebrow">CONFIGURACIÓN INICIAL</span><h2 id="defaults-title">Permisos de {role.name}</h2></div><button className="icon-button" aria-label="Cerrar" onClick={() => setShowDefaultInfo(false)}><X size={18} /></button></header>
            <p>Estos son los accesos con los que empieza este rol. Puedes modificarlos en la matriz o restaurarlos cuando quieras.</p>
            {roleDefaultCodes ? defaultResources.length ? <ul className="defaults-list">{defaultResources.map((item) => <li key={item.name}><strong>{item.name}</strong><span>{item.actions.join(" · ")}</span></li>)}</ul> : <p>Este rol empieza sin permisos asignados.</p> : <p>Los roles creados por el equipo no tienen una plantilla inicial. Sus permisos actuales se conservan hasta que los edites.</p>}
            <footer><button className="primary" onClick={() => setShowDefaultInfo(false)}>Entendido</button></footer>
          </section>
        </div>
      )}
      {managingResources && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setManagingResources(false)}>
          <section className="modal defaults-modal resource-manager" role="dialog" aria-modal="true" aria-labelledby="resources-title">
            <header><div><span className="eyebrow">CONFIGURACIÓN DEL SISTEMA</span><h2 id="resources-title">Recursos del menú</h2></div><button className="icon-button" aria-label="Cerrar" onClick={() => setManagingResources(false)}><X size={18} /></button></header>
            <p>Los recursos activos con permiso de consulta aparecen en el menú de cada usuario. Al agregar un modelo, sus permisos quedan sin asignar hasta que los marques en la matriz.</p>
            {availableModels.length > 0 && <div className="resource-add-row"><label>Modelo disponible<select value={newResourceModel} onChange={(event) => setNewResourceModel(event.target.value)}>{availableModels.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button className="primary" disabled={busy || !canManageRoles} onClick={addResource}><Plus size={16}/> Agregar recurso</button></div>}
            <div className="resource-config-list">{(matrix?.resources || []).map((item) => {
              const values = resourceDraft[item.id] || {};
              const changed = JSON.stringify(values) !== JSON.stringify({name:item.name,description:item.description,menu_group:item.menu_group,menu_icon:item.menu_icon,menu_order:item.menu_order,menu_visible:item.menu_visible,is_active:item.is_active});
              return <article key={item.id} className="resource-config-row"><strong>{item.code}</strong><div className="resource-config-fields">
                <label>Nombre<input value={values.name || ""} onChange={(event) => setResourceDraft((current) => ({...current,[item.id]:{...current[item.id],name:event.target.value}}))}/></label>
                <label>Grupo del menú<input value={values.menu_group || ""} onChange={(event) => setResourceDraft((current) => ({...current,[item.id]:{...current[item.id],menu_group:event.target.value}}))}/></label>
                <label>Icono<input value={values.menu_icon || ""} onChange={(event) => setResourceDraft((current) => ({...current,[item.id]:{...current[item.id],menu_icon:event.target.value}}))}/></label>
                <label>Orden<input type="number" min="0" max="32767" value={values.menu_order ?? 100} onChange={(event) => setResourceDraft((current) => ({...current,[item.id]:{...current[item.id],menu_order:Number(event.target.value)}}))}/></label>
                <label className="resource-visible"><input type="checkbox" checked={Boolean(values.menu_visible)} onChange={(event) => setResourceDraft((current) => ({...current,[item.id]:{...current[item.id],menu_visible:event.target.checked}}))}/> Mostrar en menú</label>
                <label className="resource-visible"><input type="checkbox" checked={Boolean(values.is_active)} onChange={(event) => setResourceDraft((current) => ({...current,[item.id]:{...current[item.id],is_active:event.target.checked}}))}/> Recurso activo</label>
                <button disabled={busy || !changed || !canManageRoles} onClick={() => saveResource(item)}>Guardar</button>
              </div></article>;
            })}</div>
            <footer><button onClick={() => setManagingResources(false)}>Cerrar</button></footer>
          </section>
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
      {!canManageRoles && (
        <p className="notice" role="status">
          Puedes consultar la matriz, pero necesitas el permiso de edición de roles para guardar cambios.
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
              disabled={
                busy || !canManageRoles || !bulkPermissionIds.length || bulkAllChecked
              }
              onClick={() => setBulkPermissions(true)}
            >
              Marcar todo
            </button>
            <button
              disabled={
                busy || !canManageRoles || !bulkPermissionIds.length || bulkNoneChecked
              }
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
                                disabled={busy || !canManageRoles}
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
                          disabled={
                            busy || !canManageRoles || !row.role || !ids.length
                          }
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
