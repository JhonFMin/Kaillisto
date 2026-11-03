import { useCallback, useEffect, useState } from "react";
import RoleMatrix from "./components/RoleMatrix";
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { SunIcon as Sun } from "@phosphor-icons/react/dist/csr/Sun";
import { SquaresFourIcon as LayoutDashboard } from "@phosphor-icons/react/dist/csr/SquaresFour";
import { UsersThreeIcon as Users } from "@phosphor-icons/react/dist/csr/UsersThree";
import { MapPinIcon as MapPin } from "@phosphor-icons/react/dist/csr/MapPin";
import { StackIcon as Layers } from "@phosphor-icons/react/dist/csr/Stack";
import { BroadcastIcon as Radio } from "@phosphor-icons/react/dist/csr/Broadcast";
import { SlidersHorizontalIcon as SlidersHorizontal } from "@phosphor-icons/react/dist/csr/SlidersHorizontal";
import { BellIcon as Bell } from "@phosphor-icons/react/dist/csr/Bell";
import { WrenchIcon as Wrench } from "@phosphor-icons/react/dist/csr/Wrench";
import { PackageIcon as Package } from "@phosphor-icons/react/dist/csr/Package";
import { ShieldIcon as Shield } from "@phosphor-icons/react/dist/csr/Shield";
import { ArrowUpRightIcon as ArrowUpRight } from "@phosphor-icons/react/dist/csr/ArrowUpRight";
import { SignOutIcon as LogOut } from "@phosphor-icons/react/dist/csr/SignOut";
import { ArrowRightIcon as ArrowRight } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { PlusIcon as Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { XIcon as X } from "@phosphor-icons/react/dist/csr/X";
import { MagnifyingGlassIcon as Search } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { ListIcon as Menu } from "@phosphor-icons/react/dist/csr/List";
import { ClipboardTextIcon as ClipboardText } from "@phosphor-icons/react/dist/csr/ClipboardText";
import { CaretDownIcon as CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import { UserCircleIcon as UserCircle } from "@phosphor-icons/react/dist/csr/UserCircle";
import { ChartLineIcon as ChartLine } from "@phosphor-icons/react/dist/csr/ChartLine";
import api from "./api/axios";

const definitions = {
  usuarios: ["Usuarios", Users],
  roles: ["Roles y permisos", Shield],
  comunidades: ["Comunidades", MapPin],
  instalaciones: ["Instalaciones solares", Layers],
  dispositivos: ["Dispositivos IoT", Radio],
  umbrales: ["Umbrales", SlidersHorizontal],
  alertas: ["Alertas", Bell],
  ordenes: ["Órdenes de trabajo", Wrench],
  repuestos: ["Repuestos", Package],
  "estados-instalacion": ["Estados de instalación", Layers],
  "estados-orden": ["Estados de orden", Wrench],
  "tipos-medicion": ["Tipos de medición", SlidersHorizontal],
  "estados-alerta": ["Estados de alerta", Bell],
  prioridades: ["Prioridades", Bell],
  "tipos-alerta": ["Tipos de alerta", Bell],
  notificaciones: ["Notificaciones", Bell],
  consumos: ["Repuestos utilizados", Package],
};
const catalogs = [
  "estados-instalacion",
  "estados-orden",
  "tipos-medicion",
  "estados-alerta",
  "prioridades",
  "tipos-alerta",
];
const catalogPermissions = {
  "estados-instalacion": "view_estadoinstalacion",
  "estados-orden": "view_estadoordentrabajo",
  "tipos-medicion": "view_tipomedicion",
  "estados-alerta": "view_estadoalerta",
  prioridades: "view_prioridadalerta",
  "tipos-alerta": "view_tipoalerta",
};
const nice = (key) =>
  ({
    id_usuario: "ID",
    username: "Usuario",
    first_name: "Nombre",
    last_name: "Apellido",
    is_active: "Cuenta activa",
    is_staff: "Acceso Django",
    is_superuser: "Superadmin",
    roles_detail: "Roles",
    solucion_aplicada: "Solución aplicada",
    api_key: "Clave del dispositivo (mínimo 32 caracteres)",
    responsable: "Responsable de la vivienda",
    tipo: "Tipo de instalación",
    direccion: "Dirección",
    barrio: "Barrio / sector",
    ubicacion: "Municipio / localidad",
  })[key] || key.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
const errorText = (e) =>
  typeof e.response?.data === "object"
    ? Object.entries(e.response.data)
        .map(
          ([k, v]) =>
            `${k === "detail" ? "" : nice(k) + ": "}${Array.isArray(v) ? v.join(" ") : v}`,
        )
        .join(" · ")
    : "No fue posible conectar con el servidor.";
const endpoint = (kind) =>
  kind === "usuarios"
    ? "/security/accounts/"
    : kind === "roles"
      ? "/security/roles/"
      : `/security/portal/${kind}/`;
const permissionModelByKind = {
  usuarios: "usuario",
  roles: "role",
  comunidades: "comunidad",
  instalaciones: "instalacion",
  dispositivos: "dispositivo",
  umbrales: "umbral",
  alertas: "alerta",
  ordenes: "ordentrabajo",
  repuestos: "repuesto",
  consumos: "repuestoordentrabajo",
  notificaciones: "notificacion",
  "estados-instalacion": "estadoinstalacion",
  "estados-orden": "estadoordentrabajo",
  "tipos-medicion": "tipomedicion",
  "estados-alerta": "estadoalerta",
  prioridades: "prioridadalerta",
  "tipos-alerta": "tipoalerta",
};
const idOf = (row) =>
  row.id ?? Object.entries(row).find(([k]) => k.startsWith("id_"))?.[1];
const labelOf = (row) =>
  row.nombre ||
  row.name ||
  row.codigo ||
  row.username ||
  row.mensaje ||
  row.descripcion ||
  `#${idOf(row)}`;
const relations = {
  comunidad: "comunidades",
  responsable: "usuarios",
  instalacion: "instalaciones",
  tipo_medicion: "tipos-medicion",
  tipo_alerta: "tipos-alerta",
  prioridad: "prioridades",
  estado_instalacion: "estados-instalacion",
  tecnico: "usuarios",
  alerta: "alertas",
  repuesto: "repuestos",
  orden_trabajo: "ordenes",
};
function Brand() {
  return (
    <Link className="brand" to="/">
      <Sun size={25} weight="duotone" />
      <span>
        ka’illisto<span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
function Landing() {
  return (
    <div className="landing">
      <header className="public-nav">
        <Brand />
        <nav>
          <a href="#plataforma">Plataforma</a>
          <a href="#comunidades">Hogares y comunidades</a>
        </nav>
        <Link className="button" to="/login">
          Iniciar sesión <ArrowUpRight size={15} />
        </Link>
      </header>
      <main>
        <section className="hero">
          <span className="tag">
            <span className="signal" /> Sistemas solares para cada escala
          </span>
          <h1>
            Sol que llega a cada techo.
            <br />
            <span>Energía que une territorios.</span>
          </h1>
          <p>
            Gestiona paneles solares en viviendas y proyectos comunitarios.
            <br />
            Reúne operación, alertas y mantenimiento en un solo espacio.
          </p>
          <Link className="button primary" to="/login">
            Entrar a la plataforma <ArrowRight size={16} />
          </Link>
          <a className="text-link" href="#plataforma">
            Conoce cómo funciona ↓
          </a>
        </section>
        <section className="showcase" id="plataforma">
          <div className="section-intro">
            <div>
              <span className="eyebrow">UNA RED, MÁS POSIBILIDADES</span>
              <h2>Visibilidad para actuar a tiempo.</h2>
            </div>
            <p>
              Desde la instalación hasta el trabajo en campo,
              <br />
              cada persona tiene su espacio.
            </p>
          </div>
          <div className="feature-grid">
            <article className="feature">
              <Radio weight="duotone" />
              <h3>Infraestructura conectada</h3>
              <p>
                Cada instalación se vincula a una comunidad o a quien responde por una vivienda.
              </p>
              <img className="feature-image" src="/solar-home.jpg" alt="Vivienda rural con paneles solares al atardecer" loading="lazy" />
              <div className="solar-grid" aria-hidden="true">
                {Array.from({ length: 24 }, (_, i) => (
                  <span key={i} />
                ))}
              </div>
              <div className="preview-foot">
                <span>ESP32 / TELEMETRÍA</span>
                <span>→</span>
              </div>
            </article>
            <article className="feature">
              <Wrench weight="duotone" />
              <h3>Atención con seguimiento</h3>
              <p>
                Órdenes asignadas, diagnóstico y soluciones. Todo el contexto
                que necesita un técnico en campo.
              </p>
              <img className="feature-image" src="/solar-operations.jpg" alt="Técnico revisando un inversor solar" loading="lazy" />
              <div className="steps">
                {[
                  "01 / Asignar una orden",
                  "02 / Registrar el diagnóstico",
                  "03 / Documentar la solución",
                ].map((x) => (
                  <div key={x}>
                    {x}
                    <ArrowUpRight size={15} />
                  </div>
                ))}
              </div>
              <div className="preview-foot">
                <span>MANTENIMIENTO / TRAZABILIDAD</span>
                <span>→</span>
              </div>
            </article>
          </div>
        </section>
        <section id="comunidades" className="community-section">
          <span className="eyebrow">HECHO PARA EL TERRITORIO</span>
          <h2>
            Herramientas para cada
            <br />
            forma de energía solar.
          </h2>
          <div className="three-grid">
            {[
              [
                Shield,
                "Administración",
                "Organiza la infraestructura, los usuarios y sus accesos.",
              ],
              [
                Wrench,
                "Técnicos de campo",
                "Consulta tus casos y documenta cada intervención.",
              ],
              [
                MapPin,
                "Hogares solares",
                "Da seguimiento a los paneles y equipos asociados a cada vivienda.",
              ],
              [
                MapPin,
                "Proyectos comunitarios",
                "Consulta instalaciones, novedades y tareas de mantenimiento por comunidad.",
              ],
            ].map(([Icon, t, d]) => (
              <article key={t}>
                <Icon />
                <h3>{t}</h3>
                <p>{d}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer>
        <Brand />
        <span>Gestión solar para hogares y comunidades · Colombia.</span>
        <Link to="/login">Acceso a la plataforma ↗</Link>
      </footer>
    </div>
  );
}
function Login({ onLogin, user }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [challenge, setChallenge] = useState(() => ({
    left: crypto.getRandomValues(new Uint8Array(1))[0] % 8 + 2,
    right: crypto.getRandomValues(new Uint8Array(1))[0] % 8 + 2,
  }));
  const refreshChallenge = () => setChallenge({
    left: crypto.getRandomValues(new Uint8Array(1))[0] % 8 + 2,
    right: crypto.getRandomValues(new Uint8Array(1))[0] % 8 + 2,
  });
  if (user) return <Navigate to="/dashboard" replace />;
  return (
    <div className="login-layout">
      <div className="login-story">
        <Brand />
        <div>
          <span className="eyebrow">GESTIÓN SOLAR PARA CADA ESPACIO</span>
          <h1>
            Cada techo.
            <br />
            Cada proyecto.
            <br />
            <span>Una red más clara.</span>
          </h1>
          <p>Herramientas para cuidar los sistemas solares de hogares y comunidades.</p>
        </div>
        <span className="muted">Ka’illisto / Plataforma de gestión solar</span>
      </div>
      <main className="login-form">
        <Link className="back" to="/">
          ← Volver al inicio
        </Link>
        <div>
          <span className="tag">ACCESO A LA PLATAFORMA</span>
          <h2>Bienvenido de nuevo.</h2>
          <p>Ingresa con tu cuenta para continuar.</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const f = new FormData(e.currentTarget);
              try {
                await api.post("/security/login/", {
                  ...Object.fromEntries(f),
                  challenge_left: challenge.left,
                  challenge_right: challenge.right,
                });
                await onLogin();
              } catch (e) {
                setError(errorText(e));
                refreshChallenge();
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Usuario
              <input
                name="username"
                autoComplete="username"
                required
                autoFocus
              />
            </label>
            <label>
              Contraseña
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            <label>
              Verificación: ¿cuánto es {challenge.left} + {challenge.right}?
              <input
                name="challenge_answer"
                type="number"
                inputMode="numeric"
                required
                aria-label="Resultado de la suma"
              />
            </label>
            {error && (
              <p role="alert" className="notice">
                {error}
              </p>
            )}
            <button className="primary" disabled={busy}>
              {busy ? "Ingresando…" : "Iniciar sesión"}
              <ArrowRight size={16} />
            </button>
          </form>
          <p className="caption">
            ¿Necesitas una cuenta? Contacta al administrador.
          </p>
        </div>
      </main>
    </div>
  );
}
function Editor({ kind, row, schema, onClose, onSave, user }) {
  const [data, setData] = useState(() => {
    const d = {};
    Object.entries(schema).forEach(([k, f]) => {
      if (row && row[k] !== undefined) d[k] = row[k];
      else if (f.type === "boolean") d[k] = true;
    });
    if (kind === "instalaciones") d.tipo = row?.tipo || "comunitaria";
    if (kind === "usuarios")
      d.roles = row?.roles_detail?.map((r) => r.rol_id) || [];
    return d;
  });
  const [choices, setChoices] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const permissionModel = permissionModelByKind[kind];
  const canEditKind =
    user.is_superuser || user.permisos.includes(`change_${permissionModel}`);
  const canCreateKind =
    user.is_superuser || user.permisos.includes(`add_${permissionModel}`);
  const allFields = Object.entries(schema).filter(
    ([k, f]) =>
      !f.read_only &&
      (!row || k !== "username") &&
      (row ? canEditKind : canCreateKind) &&
      (user.admin ||
        user.full_resource_access ||
        kind !== "ordenes" ||
        ["diagnostico", "solucion_aplicada", "estado"].includes(k)) &&
      (k !== "roles" ||
        user.is_superuser ||
        (user.permisos.includes("view_role") &&
          (row
            ? user.permisos.includes("change_userrole")
            : user.permisos.includes("add_userrole")))),
  );
  const installationType = data.tipo || row?.tipo || "comunitaria";
  const fields = allFields.filter(([key]) =>
    kind !== "instalaciones" || key !== "responsable" || installationType === "residencial",
  );
  useEffect(() => {
    let active = true;
    async function load() {
      const requests = fields.map(([k]) => {
        let rel = relations[k];
        if (k === "estado")
          rel =
            kind === "ordenes"
              ? "estados-orden"
              : kind === "alertas"
                ? "estados-alerta"
                : null;
        const url = rel
          ? endpoint(rel)
          : k === "roles"
            ? "/security/roles/"
            : k === "permissions"
              ? "/security/permissions/"
              : null;
        return url ? api.get(url).then((res) => [k, res.data]) : null;
      }).filter(Boolean);
      const out = Object.fromEntries(await Promise.all(requests));
      if (active) setChoices(out);
    }
    load().catch((e) => setError(errorText(e)));
    return () => {
      active = false;
    };
  }, [kind, installationType]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className={`modal${kind === "instalaciones" ? " installation-editor" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={row ? "Editar registro" : "Nuevo registro"}
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>
            {row ? "Editar" : "Nuevo"} ·{" "}
            {kind === "usuarios"
              ? "usuario"
              : kind === "roles"
                ? "rol"
                : definitions[kind]?.[0]}
          </h2>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar">
            <X />
          </button>
        </header>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const payload = {};
              for (const [k] of allFields) {
                let v = data[k];
                if (k === "password" && !v && row) continue;
                if (v !== undefined)
                  payload[k] =
                    v === "" && schema[k].type === "field" ? null : v;
              }
              await onSave(payload);
            } catch (e) {
              setError(errorText(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {kind === "instalaciones" && <p className="installation-form-intro">Elige si se trata de un sistema de una comunidad o de una vivienda. Para una vivienda pediremos dirección, barrio y responsable; también puedes vincularla a una comunidad si aplica.</p>}
          {fields.map(([k, f]) => (
            <label key={k}>
              {kind === "instalaciones" ? ({
                tipo: "Tipo de sistema",
                nombre: installationType === "residencial" ? "Nombre de la vivienda o sistema" : "Nombre del sistema comunitario",
                comunidad: installationType === "residencial" ? "Comunidad vinculada (opcional)" : "Comunidad",
                responsable: "Persona responsable",
                direccion: "Dirección de la vivienda / sitio",
                barrio: "Barrio o sector",
                ubicacion: installationType === "residencial" ? "Municipio o ciudad" : "Vereda o sector de la comunidad",
                capacidad: "Capacidad solar (kW)",
                fecha_instalacion: "Fecha de instalación",
                estado_instalacion: "Estado del sistema",
              }[k] || nice(k)) : nice(k)}
              {kind === "instalaciones" && (k === "comunidad" ? installationType === "comunitaria" : ["responsable", "direccion", "barrio"].includes(k) ? installationType === "residencial" : false) || (kind !== "instalaciones" && f.required) ? <span aria-hidden="true">*</span> : null}
              {kind === "instalaciones" && k === "comunidad" && installationType === "residencial" && <small className="field-help">Si la vivienda forma parte de una comunidad registrada, selecciónala aquí.</small>}
              {kind === "instalaciones" && k === "barrio" && installationType === "comunitaria" && <small className="field-help">Opcional para identificar un barrio o sector dentro de la comunidad.</small>}
              {f.type === "boolean" ? (
                <input
                  type="checkbox"
                  checked={!!data[k]}
                  onChange={(e) => setData({ ...data, [k]: e.target.checked })}
                />
              ) : choices[k] ? (
                <select
                  multiple={k === "roles" || k === "permissions"}
                  value={
                    data[k] ?? (k === "roles" || k === "permissions" ? [] : "")
                  }
                  required={f.required}
                  onChange={(e) =>
                    setData({
                      ...data,
                      [k]: e.target.multiple
                        ? [...e.target.selectedOptions].map((o) =>
                            Number(o.value),
                          )
                        : e.target.value
                          ? Number(e.target.value)
                          : null,
                    })
                  }
                >
                  {k !== "roles" && k !== "permissions" && (
                    <option value="">Selecciona…</option>
                  )}
                  {choices[k].map((r) => (
                    <option key={idOf(r)} value={idOf(r)}>
                      {k === "permissions"
                        ? `${r.app_label} / ${r.name}`
                        : labelOf(r)}
                    </option>
                  ))}
                </select>
              ) : f.type === "choice" ? (
                <select
                  value={data[k] ?? ""}
                  required={kind === "instalaciones" ? k === "comunidad" ? installationType === "comunitaria" : k === "responsable" ? installationType === "residencial" : f.required : f.required}
                  onChange={(e) => setData({ ...data, [k]: e.target.value, ...(kind === "instalaciones" && k === "tipo" ? { responsable: null } : {}) })}
                >
                  {f.choices.map((c) => (
                    <option value={c.value} key={c.value}>
                      {c.display_name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={
                    k === "password"
                      ? "password"
                      : k === "email"
                        ? "email"
                        : k.includes("fecha")
                          ? "date"
                          : ["decimal", "integer", "float"].includes(f.type)
                            ? "number"
                            : "text"
                  }
                  step="any"
                  maxLength={f.max_length}
                  required={(kind === "instalaciones" && ["direccion", "barrio"].includes(k) ? installationType === "residencial" : f.required) && !(row && k === "password")}
                  value={data[k] ?? ""}
                  onChange={(e) => setData({ ...data, [k]: e.target.value })}
                />
              )}
            </label>
          ))}
          {error && (
            <p className="notice" role="alert">
              {error}
            </p>
          )}
          <div className="actions">
            <button type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="primary" disabled={busy}>
              {busy ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
function Records({ kind, user, title, readonly = false }) {
  const [rows, setRows] = useState([]),
    [schema, setSchema] = useState({}),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [editing, setEditing] = useState(null),
    [compareDevice, setCompareDevice] = useState(null),
    [search, setSearch] = useState("");
  const [schemaLoading, setSchemaLoading] = useState(false);
  const permissionModel = permissionModelByKind[kind];
  const canEditKind =
    user.is_superuser || user.permisos.includes(`change_${permissionModel}`);
  const canCreateKind =
    user.is_superuser || user.permisos.includes(`add_${permissionModel}`);
  async function openEditor(row = {}) {
    setSchemaLoading(true);
    setError("");
    try {
      const response = await api.options(endpoint(kind));
      setSchema(response.data.actions?.POST || {});
      setEditing(row);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSchemaLoading(false);
    }
  }
  async function load() {
    setLoading(true);
    setError("");
    try {
      const r = await api.get(endpoint(kind));
      setRows(r.data);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    setRows([]);
    setEditing(null);
    load();
  }, [kind]);
  const columns = rows.length
    ? Object.keys(rows[0]).filter(
        (k) =>
          !k.endsWith("_display") &&
          ![
            "password",
            "permissions_detail",
            "created_at",
            "updated_at",
            "api_key_hash",
            "fecha_actualizacion",
            "roles",
          ].includes(k),
      )
    : [];
  function display(k, v, row) {
    const relationLabel = row?.[`${k}_display`];
    if (relationLabel != null) return String(relationLabel);
    if (v == null || v === "") return "—";
    if (typeof v === "boolean") return v ? "Sí" : "No";
    if (k === "roles_detail")
      return v.map((r) => r.rol__name).join(", ") || "Sin rol";
    if (Array.isArray(v)) return `${v.length} asignados`;
    return String(v);
  }
  const canEdit = !readonly && canEditKind;
  const canCreate =
    !readonly && canCreateKind;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            ESPACIO DE TRABAJO / {user.admin || user.full_resource_access ? "GESTIÓN" : "CONSULTA"}
          </span>
          <h1>
            {title ||
              { usuarios: "Usuarios", roles: "Roles y permisos" }[kind] ||
              definitions[kind]?.[0]}
          </h1>
          <p>
            {kind === "usuarios"
              ? "Administra las cuentas y el acceso a la plataforma."
              : kind === "ordenes" && !user.admin && !user.full_resource_access
                ? "Tus órdenes asignadas, de principio a fin."
                : "Información de tu red de energía solar."}
          </p>
        </div>
        {canCreate && (
          <button className="primary" disabled={schemaLoading} onClick={() => openEditor()}>
            <Plus size={16} />
            {schemaLoading ? "Cargando…" : "Nuevo registro"}
          </button>
        )}
      </div>
      <section className="data-panel">
        <div className="table-toolbar">
          <span>{rows.length} registros</span>
          <label className="search">
            <Search size={16} />
            <input
              aria-label="Buscar registros"
              placeholder="Buscar en este apartado…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        {error && (
          <p role="alert" className="notice">
            {error}
          </p>
        )}
        {loading ? (
          <p className="empty">Cargando información…</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {columns.map((k) => (
                    <th key={k}>{nice(k)}</th>
                  ))}
                  {(canEdit || kind === "dispositivos") && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {rows
                  .filter((r) =>
                    Object.entries(r).some(([k, v]) =>
                      display(k, v, r)
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                    ),
                  )
                  .map((row) => (
                    <tr key={idOf(row)}>
                      {columns.map((k) => (
                        <td key={k}>{display(k, row[k], row)}</td>
                      ))}
                      {(canEdit || kind === "dispositivos") && (
                        <td className="row-actions">
                          {kind === "dispositivos" && (
                            <button onClick={() => setCompareDevice(row)}>
                              <ChartLine size={15} /> Comparar lecturas
                            </button>
                          )}
                          {canEdit && <button disabled={schemaLoading} onClick={() => openEditor(row)}>Editar</button>}
                          {kind === "usuarios" &&
                            user.is_superuser &&
                            (idOf(row) !== user.id || row.is_superuser) && (
                              <button
                                onClick={async () => {
                                  const isSelf = idOf(row) === user.id;
                                  if (
                                    !window.confirm(
                                      isSelf
                                        ? "¿Dejar de ser superadministrador? Se aplicarán los permisos de tus roles y podrías perder acceso administrativo."
                                        : `${row.is_superuser ? "Revocar" : "Otorgar"} superadmin a ${row.username}?`,
                                    )
                                  )
                                    return;
                                  try {
                                    await api.post(
                                      `${endpoint(kind)}${idOf(row)}/toggle_superadmin/`,
                                    );
                                    await load();
                                    if (isSelf)
                                      window.dispatchEvent(new Event("kaillisto:permissions"));
                                  } catch (e) {
                                    setError(errorText(e));
                                  }
                                }}
                              >
                                {row.is_superuser
                                  ? idOf(row) === user.id
                                    ? "Probar permisos del rol"
                                    : "Quitar superadmin"
                                  : "Hacer superadmin"}
                              </button>
                            )}
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
            {!rows.length && (
              <div className="empty">
                <Layers size={28} />
                <h3>Aún no hay registros</h3>
                <p>
                  {user.admin || user.full_resource_access
                    ? "Crea el primer registro para comenzar."
                    : kind === "consumos" &&
                        user.roles.includes("Técnico de Campo")
                      ? "Aquí aparecen los repuestos de tus órdenes asignadas. Pide que te asignen una orden y registra allí los materiales."
                      : user.roles.includes("Técnico de Campo") && !user.full_resource_access
                        ? "Los permisos abren módulos; los datos de Técnico siguen limitados a sus órdenes e instalaciones asignadas."
                    : "Los registros de tu ámbito aparecerán aquí."}
                </p>
              </div>
            )}
          </div>
        )}
      </section>
      {compareDevice && <DeviceComparison device={compareDevice} onClose={() => setCompareDevice(null)} />}
          {editing && (
        <Editor
          key={`${kind}-${idOf(editing) || "new"}`}
          kind={kind}
          row={idOf(editing) ? editing : null}
          schema={schema}
          user={user}
          onClose={() => setEditing(null)}
          onSave={async (data) => {
            const isSelf = kind === "usuarios" && idOf(editing) === user.id;
            if (idOf(editing))
              await api.patch(`${endpoint(kind)}${idOf(editing)}/`, data);
            else await api.post(endpoint(kind), data);
            setEditing(null);
            if (isSelf && data.is_active === false) {
              window.location.assign("/login");
              return;
            }
            if (isSelf && data.roles !== undefined)
              window.dispatchEvent(new Event("kaillisto:permissions"));
            await load();
          }}
        />
      )}
    </>
  );
}
function DeviceComparison({ device, onClose }) {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api.get(`/security/portal/dispositivos/${idOf(device)}/comparativa/`)
      .then(({ data }) => { if (active) setReport(data); })
      .catch((e) => { if (active) setError(errorText(e)); });
    return () => { active = false; };
  }, [device]);
  const formatted = (value) => value == null ? "—" : new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(Number(value));
  const getRange = (row) => {
    const value = row.valor == null ? null : Number(row.valor);
    const min = row.minimo == null ? null : Number(row.minimo);
    const max = row.maximo == null ? null : Number(row.maximo);
    const span = Math.max((max ?? value ?? 1) - (min ?? value ?? 0), Math.abs(value || 0) * 0.12, 1);
    const low = Math.min(min ?? value - span * 0.25, value ?? min ?? 0) - span * 0.12;
    const high = Math.max(max ?? value + span * 0.25, value ?? max ?? 1) + span * 0.12;
    const pct = (number) => Math.max(0, Math.min(100, ((number - low) / (high - low)) * 100));
    return {
      low, high,
      goodStart: min == null || max == null ? 0 : pct(min),
      goodWidth: min == null || max == null ? 0 : Math.max(0, pct(max) - pct(min)),
      marker: value == null ? null : pct(value),
    };
  };
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="modal device-comparison" role="dialog" aria-modal="true" aria-labelledby="device-comparison-title">
      <header><div><span className="eyebrow">TELEMETRÍA / ESP32</span><h2 id="device-comparison-title">Lecturas frente a umbrales</h2></div><button className="icon-button" aria-label="Cerrar" onClick={onClose}><X size={18} /></button></header>
      {report ? <>
        <div className="device-summary"><strong>{report.dispositivo}</strong><span>{report.modelo}</span><span>{report.instalacion}</span><small>Último contacto: {report.ultima_comunicacion ? new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(report.ultima_comunicacion)) : "sin registro"}</small></div>
        {report.mediciones.length ? <>
          <section className="threshold-chart" aria-label="Gráfico de lecturas comparadas con sus umbrales">
            <div className="threshold-chart-title"><div><span className="eyebrow">LECTURA ACTUAL / RANGO PERMITIDO</span><h3>Comparativa de medidas</h3></div><span className="threshold-legend"><i /> Rango esperado</span></div>
            {report.mediciones.map((row) => {
              const range = getRange(row);
              return <article className="threshold-chart-row" key={row.tipo_medicion}>
                <div className="threshold-chart-heading"><strong>{row.tipo_medicion}<small>{row.unidad}</small></strong><b>{formatted(row.valor)} {row.valor == null ? "" : row.unidad}</b><span className={`reading-state ${row.estado.toLowerCase().replaceAll(" ", "-")}`}>{row.estado}</span></div>
                <div className="threshold-track" role="img" aria-label={`${row.tipo_medicion}: ${formatted(row.valor)} ${row.unidad}, rango de ${formatted(row.minimo)} a ${formatted(row.maximo)}`}>
                  <span className="threshold-zone" style={{ left: `${range.goodStart}%`, width: `${range.goodWidth}%` }} />
                  {range.marker != null && <i className={`threshold-marker ${row.estado === "Normal" ? "in-range" : "out-range"}`} style={{ left: `${range.marker}%` }} />}
                </div>
                <div className="threshold-ticks"><span>{formatted(range.low)}</span><span>Mín. {formatted(row.minimo)}</span><span>Máx. {formatted(row.maximo)}</span><span>{formatted(range.high)}</span></div>
              </article>;
            })}
          </section>
          <div className="table-scroll"><table className="comparison-table"><thead><tr><th>Medida</th><th>Última lectura</th><th>Mínimo</th><th>Máximo</th><th>Evaluación</th><th>Fecha</th></tr></thead><tbody>{report.mediciones.map((row) => <tr key={row.tipo_medicion}><td><strong>{row.tipo_medicion}</strong><small>{row.unidad}</small></td><td>{formatted(row.valor)} {row.valor == null ? "" : row.unidad}</td><td>{formatted(row.minimo)}</td><td>{formatted(row.maximo)}</td><td><span className={`reading-state ${row.estado.toLowerCase().replaceAll(" ", "-")}`}>{row.estado}</span></td><td>{row.fecha_hora ? new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short" }).format(new Date(row.fecha_hora)) : "Sin lecturas"}</td></tr>)}</tbody></table></div>
        </> : <p className="empty">Este dispositivo aún no tiene mediciones ni umbrales configurados.</p>}
      </> : error ? <p role="alert" className="notice">{error}</p> : <p className="empty">Consultando las últimas mediciones…</p>}
      <footer><button onClick={onClose}>Cerrar</button></footer>
    </section>
  </div>;
}
function Dashboard({ user }) {
  const [stats, setStats] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    api.get("/security/portal/resumen/")
      .then((r) => setStats(r.data))
      .catch((e) => setError(errorText(e)));
  }, []);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">TU RED DE ENERGÍA</span>
          <h1>La energía, bajo control.</h1>
          <p>
            Hola, {user.username}. Este es el estado de tu espacio de trabajo.
          </p>
        </div>
        <span className="tag">HOGARES Y COMUNIDADES / COLOMBIA</span>
      </div>
      {error && <p className="notice">{error}</p>}
      <div className="stat-grid">
        {["comunidades", "instalaciones", "dispositivos", "ordenes"].map(
          (k) => {
            const Icon = definitions[k][1];
            return (
              <article key={k}>
                <Icon size={18} />
                <span>{definitions[k][0]}</span>
                <strong>{stats ? stats[k] : "—"}</strong>
                <small>Registros en tu ámbito</small>
              </article>
            );
          },
        )}
      </div>
      <div className="section-intro">
        <h2>El trabajo, en un solo lugar.</h2>
        <span className="muted">Accesos rápidos</span>
      </div>
      <div className="three-grid quick-links">
        {(user.admin || user.full_resource_access
          ? ["instalaciones", "dispositivos", "ordenes"]
          : user.roles.includes("Técnico de Campo")
            ? ["ordenes", "instalaciones", "consumos"]
            : ["instalaciones", "alertas", "notificaciones"]
        ).filter((k) => {
          const permission = {
            instalaciones: "view_instalacion",
            dispositivos: "view_dispositivo",
            ordenes: "view_ordentrabajo",
            alertas: "view_alerta",
            notificaciones: "view_alerta",
            consumos: "view_repuestoordentrabajo",
          }[k];
          return user.is_superuser || !permission || user.permisos.includes(permission);
        }).map((k) => {
          const Icon = definitions[k][1];
          return (
            <Link
              key={k}
              className="feature"
              to={
                user.admin || user.full_resource_access
                  ? `/${k === "ordenes" ? "mantenimiento" : k}`
                  : k === "ordenes"
                    ? "/mis-casos"
                    : k === "instalaciones"
                      ? user.roles.includes("Técnico de Campo")
                        ? "/ficha-tecnica"
                        : "/mi-comunidad"
                      : k === "alertas"
                        ? user.roles.includes("Líder Comunitario")
                          ? "/mi-alertas"
                          : "/alertas"
                        : `/${k}`
              }
            >
              <Icon weight="duotone" />
              <h3>{definitions[k][0]}</h3>
              <p>Consulta la información y continúa con tu trabajo.</p>
              <ArrowUpRight size={18} />
            </Link>
          );
        })}
      </div>
      <section className="territory">
        <Sun size={36} weight="duotone" />
        <div>
          <span className="eyebrow">UNA PLATAFORMA, UN PROPÓSITO</span>
          <h2>Energía para seguir adelante.</h2>
          <p>
            Infraestructura solar y mantenimiento para las comunidades rurales
            de La Guajira.
          </p>
        </div>
      </section>
    </>
  );
}
function Workspace({ user, onLogout, onProfileUpdated }) {
  const [open, setOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState(() => new Set(["home", "security", "energy", "operations"]));
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);
  const tech = user.roles.includes("Técnico de Campo");
  const routePermissions = {
    "/comunidades": "view_comunidad",
    "/instalaciones": "view_instalacion",
    "/dispositivos": "view_dispositivo",
    "/umbrales": "view_umbral",
    "/alertas": "view_alerta",
    "/mantenimiento": "view_ordentrabajo",
    "/repuestos": "view_repuesto",
    "/notificaciones": "view_notificacion",
    "/estados-instalacion": "view_estadoinstalacion",
    "/estados-orden": "view_estadoordentrabajo",
    "/tipos-medicion": "view_tipomedicion",
    "/estados-alerta": "view_estadoalerta",
    "/prioridades": "view_prioridadalerta",
    "/tipos-alerta": "view_tipoalerta",
    "/usuarios": "view_usuario",
    "/roles": "view_role",
    "/mis-casos": "view_ordentrabajo",
    "/ficha-tecnica": "view_instalacion",
    "/consumos": "view_repuestoordentrabajo",
    "/mi-comunidad": "view_instalacion",
    "/tecnicos": "view_ordentrabajo",
  };
  const canOpen = (path) =>
    user.is_superuser ||
    (path === "/catalogos"
      ? catalogs.some((kind) => user.permisos.includes(catalogPermissions[kind]))
        : path === "/mi-alertas" && user.roles.includes("Líder Comunitario")
        ? user.permisos.includes("view_alerta")
        : !routePermissions[path] || user.permisos.includes(routePermissions[path]));
  const baseLinks = user.admin
    ? [
        ["/dashboard", "Resumen", LayoutDashboard],
        ["/usuarios", "Usuarios", Users],
        ["/roles", "Roles y permisos", Shield],
        ...[
          "comunidades",
          "instalaciones",
          "dispositivos",
          "umbrales",
          "alertas",
          "ordenes",
          "repuestos",
        ].map((k) => [
          `/${k === "ordenes" ? "mantenimiento" : k}`,
          ...definitions[k],
        ]),
        ["/catalogos", "Catálogos", Layers],
      ]
    : tech
      ? [
          ["/dashboard", "Mi espacio", LayoutDashboard],
          ["/mis-casos", "Mis casos asignados", Wrench],
          ["/ficha-tecnica", "Fichas técnicas", Layers],
          ["/consumos", "Repuestos utilizados", Package],
        ]
      : user.roles.includes("Líder Comunitario")
        ? [
            ["/dashboard", "Mi espacio", LayoutDashboard],
            ["/mi-comunidad", "Mi comunidad", MapPin],
            ["/mi-alertas", "Alertas de mi zona", Bell],
            ["/tecnicos", "Técnicos asignados", Wrench],
          ]
        : [];
  const baseRoutes = user.admin
    ? {
        "/usuarios": ["usuarios"],
        "/roles": ["roles"],
        ...Object.fromEntries(
          Object.keys(definitions).map((k) => [
            `/${k === "ordenes" ? "mantenimiento" : k}`,
            [k],
          ]),
        ),
      }
    : tech
      ? {
          "/mis-casos": ["ordenes", "Mis casos asignados"],
          "/ficha-tecnica": ["instalaciones", "Fichas técnicas", true],
          "/consumos": ["consumos"],
        }
      : user.roles.includes("Líder Comunitario")
        ? {
            "/mi-comunidad": ["instalaciones", "Mi comunidad", true],
            "/mi-alertas": ["alertas", "Alertas de mi comunidad", true],
            "/tecnicos": ["ordenes", "Técnicos asignados", true],
          }
        : {};
  const resourceRoutes = [
    ["/usuarios", "usuarios", "view_usuario"],
    ["/roles", "roles", "view_role"],
    ["/comunidades", "comunidades", "view_comunidad"],
    ["/instalaciones", "instalaciones", "view_instalacion"],
    ["/dispositivos", "dispositivos", "view_dispositivo"],
    ["/umbrales", "umbrales", "view_umbral"],
    ["/alertas", "alertas", "view_alerta"],
    ["/mantenimiento", "ordenes", "view_ordentrabajo"],
    ["/repuestos", "repuestos", "view_repuesto"],
    ["/consumos", "consumos", "view_repuestoordentrabajo"],
    ["/notificaciones", "notificaciones", "view_notificacion"],
    ["/estados-instalacion", "estados-instalacion", "view_estadoinstalacion"],
    ["/estados-orden", "estados-orden", "view_estadoordentrabajo"],
    ["/tipos-medicion", "tipos-medicion", "view_tipomedicion"],
    ["/estados-alerta", "estados-alerta", "view_estadoalerta"],
    ["/prioridades", "prioridades", "view_prioridadalerta"],
    ["/tipos-alerta", "tipos-alerta", "view_tipoalerta"],
  ];
  const linkedPaths = new Set(baseLinks.map(([path]) => path));
  const extras = resourceRoutes.filter(
    ([path, , permission]) =>
      !linkedPaths.has(path) &&
      (user.is_superuser || user.permisos.includes(permission)),
  );
  const links = [
    ...baseLinks,
    ...extras.map(([path, kind]) => [path, ...definitions[kind]]),
    ["/perfil", "Mi perfil", UserCircle],
    ...(user.admin ? [["/auditoria", "Auditoría de seguridad", ClipboardText]] : []),
  ];
  const routes = {
    ...baseRoutes,
    ...Object.fromEntries(extras.map(([path, kind]) => [path, [kind]])),
  };
  const groups = [
    { id: "home", label: "Espacio de trabajo", Icon: LayoutDashboard, paths: ["/dashboard", "/mis-casos", "/mi-comunidad", "/mi-alertas", "/ficha-tecnica", "/tecnicos"] },
    { id: "security", label: "Seguridad", Icon: Shield, paths: ["/usuarios", "/roles", "/auditoria"] },
    { id: "energy", label: "Red energética", Icon: MapPin, paths: ["/comunidades", "/instalaciones", "/dispositivos", "/umbrales"] },
    { id: "operations", label: "Operación y mantenimiento", Icon: Wrench, paths: ["/alertas", "/mantenimiento", "/repuestos", "/consumos", "/notificaciones"] },
    { id: "configuration", label: "Administración", Icon: Layers, paths: ["/catalogos", "/estados-instalacion", "/estados-orden", "/tipos-medicion", "/estados-alerta", "/prioridades", "/tipos-alerta"] },
  ].map((group) => ({ ...group, items: links.filter(([path]) => group.paths.includes(path)) })).filter((group) => group.items.length);
  return (
    <div className="workspace">
      <aside className={open ? "sidebar open" : "sidebar"}>
        <div className="sidebar-brand-row"><Brand /><button className="sidebar-close icon-button" aria-label="Cerrar menú" onClick={() => setOpen(false)}><X size={18} /></button></div>
        <div className="workspace-label">
          PLATAFORMA SOLAR <span>01</span>
        </div>
        <nav aria-label="Navegación principal" className="sidebar-groups">
          {groups.map((group) => {
            const visibleItems = group.items.filter(([path]) => canOpen(path));
            if (!visibleItems.length) return null;
            const expanded = openGroups.has(group.id) || group.items.some(([path]) => path === loc.pathname);
            return (
              <section className={`nav-group${expanded ? " expanded" : ""}`} key={group.id}>
                <button
                  className="nav-group-toggle"
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpenGroups((current) => {
                    const next = new Set(current);
                    next.has(group.id) ? next.delete(group.id) : next.add(group.id);
                    return next;
                  })}
                >
                  <group.Icon size={15} />
                  <span>{group.label}</span>
                  <small>{visibleItems.length}</small>
                  <CaretDown size={14} />
                </button>
                {expanded && (
                  <div className="nav-group-items">
                    {visibleItems.map(([path, label, Icon]) => (
                      <NavLink key={path} to={path}>
                        <Icon size={17} weight="regular" />
                        <span>{label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          {user.is_staff && (
            <a href="/admin/" target="_blank" rel="noreferrer">
              <Shield size={16} />
              Administración Django ↗
            </a>
          )}
          <div className="profile">
            <span className="avatar">
              {user.username.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <strong>{user.username}</strong>
              <small>
                {user.is_superuser
                  ? "Superadministrador"
                  : user.roles.join(", ") || "Sin rol asignado"}
              </small>
            </div>
          </div>
          <Link className="profile-settings" to="/perfil">
            <UserCircle size={16} /> Configurar mi perfil
          </Link>
          <button onClick={onLogout}>
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>
      {open && <button className="sidebar-scrim" aria-label="Cerrar menú de navegación" onClick={() => setOpen(false)} />}
      <div className="workspace-body">
        <header className="workspace-header">
          <button
            className="mobile-menu icon-button"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <Menu />
          </button>
          <span>
            Ka’illisto <span className="muted">/ Espacio de trabajo</span>
          </span>
          <span className="tag">GESTIÓN SOLAR</span>
        </header>
        <main className="workspace-main">
          <Routes>
            <Route
              path="/dashboard"
              element={
                links.length ? (
                  <Dashboard user={user} />
                ) : (
                  <p className="notice">
                    Tu cuenta aún no tiene un rol activo. Contacta al
                    administrador.
                  </p>
                )
              }
            />
            {Object.entries(routes)
              .filter(([path]) => canOpen(path))
              .map(([path, [kind, title, readonly]]) => (
                <Route
                  key={path}
                  path={path}
                  element={
                    kind === "roles" ? (
                      <RoleMatrix user={user} />
                    ) : (
                      <Records
                        key={kind}
                        kind={kind}
                        user={user}
                        title={title}
                        readonly={readonly}
                      />
                    )
                  }
                />
              ))}
            {canOpen("/catalogos") && (
              <Route path="/catalogos" element={<Catalogs user={user} />} />
            )}
            {user.admin && <Route path="/auditoria" element={<SecurityAudit />} />}
            <Route path="/perfil" element={<ProfileSettings onProfileUpdated={onProfileUpdated} />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
function SecurityAudit() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api.get("/security/audit/")
      .then(({ data }) => { if (active) setEvents(data); })
      .catch((e) => { if (active) setError(errorText(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const actionNames = {
    "role.created": "Rol creado",
    "role.updated": "Rol o permisos modificados",
    "role.deactivated": "Rol desactivado",
    "role.defaults_restored": "Permisos predeterminados restaurados",
    "user_role.assigned": "Rol asignado",
    "user_role.revoked": "Rol retirado",
    "account.created": "Cuenta creada",
    "account.updated": "Cuenta modificada",
    "account.profile_updated": "Perfil personal actualizado",
    "account.superadmin_changed": "Acceso superadministrador cambiado",
    "work_order.closed": "Orden de trabajo cerrada",
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">SEGURIDAD / TRAZABILIDAD</span>
          <h1>Auditoría de seguridad</h1>
          <p>Últimos 200 cambios de roles, permisos y cuentas.</p>
        </div>
      </div>
      {error && <p role="alert" className="notice">{error}</p>}
      <section className="data-panel">
        {loading ? <p className="empty">Cargando historial…</p> : events.length ? (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Fecha</th><th>Actor</th><th>Acción</th><th>Objetivo</th><th>Cambios</th></tr></thead>
              <tbody>{events.map((event) => (
                <tr key={event.id}>
                  <td>{new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.created_at))}</td>
                  <td>{event.actor}</td>
                  <td>{actionNames[event.action] || event.action}</td>
                  <td>{event.target_label || `${event.target_type} #${event.target_id}`}</td>
                  <td><details><summary>Ver detalle</summary><pre className="audit-json">{JSON.stringify(event.changes, null, 2)}</pre>{event.reason && <small>Motivo: {event.reason}</small>}</details></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="empty">Aún no hay cambios de seguridad registrados.</p>}
      </section>
    </>
  );
}
function Catalogs({ user }) {
  const availableCatalogs = catalogs.filter(
    (item) => user.is_superuser || user.permisos.includes(catalogPermissions[item]),
  );
  const [kind, setKind] = useState(availableCatalogs[0] || catalogs[0]);
  useEffect(() => {
    if (!availableCatalogs.includes(kind) && availableCatalogs.length) {
      setKind(availableCatalogs[0]);
    }
  }, [kind, availableCatalogs.join(",")]);
  return (
    <>
      <div className="tabs">
        {availableCatalogs.map((k) => (
          <button
            className={kind === k ? "active" : ""}
            key={k}
            onClick={() => setKind(k)}
          >
            {definitions[k][0]}
          </button>
        ))}
      </div>
      {availableCatalogs.length ? (
        <Records key={kind} kind={kind} user={user} />
      ) : (
        <p className="notice">Tu rol no tiene acceso a estos catálogos.</p>
      )}
    </>
  );
}
function Shell() {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const loc = useLocation(),
    navigate = useNavigate();
  const refresh = useCallback(async () => {
    const r = await api.get("/security/session/");
    setUser(r.data);
    return r.data;
  }, []);
  useEffect(() => {
    if (loc.pathname === "/" || loc.pathname === "/login") {
      setLoading(false);
      return;
    }
    if (user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    refresh()
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [loc.pathname, user, refresh]);
  useEffect(() => {
    // Las páginas públicas no consultan sesión ni reaccionan a eventos de
    // foco/otras pestañas. La sincronización solo existe dentro del portal.
    if (!user || loc.pathname === "/" || loc.pathname === "/login") return;

    const update = () => refresh().catch(() => setUser(null));
    const onStorage = (event) => {
      if (event.key === "kaillisto:permissions-updated") update();
    };
    const onFocus = () => {
      if (document.visibilityState === "visible") update();
    };
    let refreshTimer;
    const scheduleUpdate = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(update, 150);
    };
    let channel;
    if ("BroadcastChannel" in window) {
      channel = new BroadcastChannel("kaillisto:permissions");
      channel.addEventListener("message", update);
    }
    window.addEventListener("kaillisto:permissions", update);
    window.addEventListener("focus", scheduleUpdate);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("kaillisto:permissions", update);
      window.removeEventListener("focus", scheduleUpdate);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onFocus);
      window.clearTimeout(refreshTimer);
      channel?.close();
    };
  }, [user?.id, loc.pathname, refresh]);
  if (loading) return <div className="boot">Conectando con Ka’illisto…</div>;
  return (
    <>
      {error && (
        <div role="alert" className="notice">
          {error}
        </div>
      )}
      {loc.pathname === "/" ? (
        <Landing />
      ) : loc.pathname === "/login" ? (
        <Login
          user={user}
          onLogin={async () => {
            await refresh();
            navigate("/dashboard");
          }}
        />
      ) : user ? (
        <Workspace
          user={user}
          onProfileUpdated={refresh}
          onLogout={async () => {
            try {
              await api.post("/cerrar_sesion/");
              setUser(null);
              navigate("/login");
            } catch (e) {
              setError(errorText(e));
            }
          }}
        />
      ) : (
        <Navigate to="/login" replace />
      )}
    </>
  );
}

function ProfileSettings({ onProfileUpdated }) {
  const [profile, setProfile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    api.get("/security/profile/").then(({ data }) => setProfile(data)).catch((e) => setError(errorText(e)));
  }, []);
  if (!profile) return <p className="empty">{error || "Cargando tus datos…"}</p>;
  return <>
    <div className="page-heading"><div><span className="eyebrow">CUENTA / DATOS PERSONALES</span><h1>Mi perfil</h1><p>Actualiza cómo te identificamos y, si quieres, cambia tu contraseña.</p></div></div>
    {error && <p role="alert" className="notice">{error}</p>}
    {saved && <p role="status" className="notice">Tus datos quedaron actualizados.</p>}
    <section className="data-panel profile-panel">
      <form onSubmit={async (event) => {
        event.preventDefault(); setBusy(true); setError(""); setSaved(false);
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        const values = Object.fromEntries(form);
        if (!values.current_password) delete values.current_password;
        if (!values.new_password) delete values.new_password;
        try {
          const { data } = await api.patch("/security/profile/", values);
          setProfile(data); formElement.reset();
          ["first_name", "last_name", "email", "telefono", "documento"].forEach((name) => {
            const field = formElement.elements.namedItem(name);
            if (field) field.value = data[name] || "";
          });
          setSaved(true); await onProfileUpdated?.();
        } catch (e) { setError(errorText(e)); }
        finally { setBusy(false); }
      }}>
        <label>Usuario<input value={profile.username} readOnly /></label>
        <label>Nombre<input name="first_name" defaultValue={profile.first_name} autoComplete="given-name" /></label>
        <label>Apellido<input name="last_name" defaultValue={profile.last_name} autoComplete="family-name" /></label>
        <label>Correo electrónico<input name="email" type="email" defaultValue={profile.email} autoComplete="email" /></label>
        <label>Teléfono<input name="telefono" defaultValue={profile.telefono} autoComplete="tel" /></label>
        <label>Documento<input name="documento" defaultValue={profile.documento || ""} /></label>
        <div className="profile-password"><h2>Cambiar contraseña</h2><p>Deja estos campos vacíos si no necesitas cambiarla.</p>
          <label>Contraseña actual<input name="current_password" type="password" autoComplete="current-password" /></label>
          <label>Nueva contraseña<input name="new_password" type="password" autoComplete="new-password" /></label>
        </div>
        <button className="primary" disabled={busy}>{busy ? "Guardando…" : "Guardar cambios"}</button>
      </form>
    </section>
  </>;
}
export default function Portal() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
