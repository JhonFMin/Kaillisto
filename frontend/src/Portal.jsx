import { useEffect, useState } from "react";
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
import {
  Sun,
  LayoutDashboard,
  Users,
  MapPin,
  Layers,
  Radio,
  SlidersHorizontal,
  Bell,
  Wrench,
  Package,
  Shield,
  ArrowUpRight,
  LogOut,
  ArrowRight,
  Plus,
  X,
  Search,
  Menu,
} from "lucide-react";
import api from "./api/axios";

const definitions = {
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
      <Sun size={25} />
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
          <a href="#comunidades">Comunidades energéticas</a>
        </nav>
        <Link className="button" to="/login">
          Iniciar sesión <ArrowUpRight size={15} />
        </Link>
      </header>
      <main>
        <section className="hero">
          <span className="tag">
            <span className="signal" /> Energía que conecta comunidades
          </span>
          <h1>
            La energía del sol.
            <br />
            <span>El futuro de La Guajira.</span>
          </h1>
          <p>
            Una plataforma para acompañar la infraestructura solar rural.
            <br />
            Monitoreo conectado, mantenimiento coordinado y comunidades
            informadas.
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
              <Radio />
              <h3>Infraestructura conectada</h3>
              <p>
                Instalaciones y dispositivos organizados por comunidad. Una base
                clara para el monitoreo de energía.
              </p>
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
              <Wrench />
              <h3>Atención con seguimiento</h3>
              <p>
                Órdenes asignadas, diagnóstico y soluciones. Todo el contexto
                que necesita un técnico en campo.
              </p>
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
            Tecnología al servicio
            <br />
            de la comunidad.
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
                "Líderes comunitarios",
                "Conoce el estado y las alertas de tu comunidad.",
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
        <span>La Guajira, Colombia · Energía para seguir adelante.</span>
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
          <span className="eyebrow">CONECTAMOS ENERGÍA Y TERRITORIO</span>
          <h1>
            Cada instalación.
            <br />
            Cada comunidad.
            <br />
            <span>Un mismo futuro.</span>
          </h1>
          <p>El espacio de trabajo de la energía solar rural en La Guajira.</p>
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
    if (kind === "usuarios")
      d.roles = row?.roles_detail?.map((r) => r.rol_id) || [];
    return d;
  });
  const [choices, setChoices] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fields = Object.entries(schema).filter(
    ([k, f]) =>
      !f.read_only &&
      (!row || k !== "username") &&
      (user.admin ||
        kind !== "ordenes" ||
        ["diagnostico", "solucion_aplicada", "estado"].includes(k)),
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
  }, [kind]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal"
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
              for (const [k] of fields) {
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
          {fields.map(([k, f]) => (
            <label key={k}>
              {nice(k)} {f.required && <span aria-hidden="true">*</span>}
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
                  onChange={(e) => setData({ ...data, [k]: e.target.value })}
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
                  required={f.required && !(row && k === "password")}
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
    [search, setSearch] = useState("");
  const [lookup, setLookup] = useState({});
  const [schemaLoading, setSchemaLoading] = useState(false);
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
      setLoading(false);
      const relationFields = new Set(r.data.flatMap((row) => Object.keys(row)));
      const neededRelations = new Set(
        [...relationFields]
          .map((field) =>
            field === "estado"
              ? kind === "ordenes"
                ? "estados-orden"
                : kind === "alertas"
                  ? "estados-alerta"
                  : null
              : relations[field],
          )
          .filter((rel) => rel && (rel !== "usuarios" || user.admin)),
      );
      Promise.all(
        [...neededRelations].map(async (rel) => {
          try {
            return [rel, (await api.get(endpoint(rel))).data];
          } catch {
            return [rel, []];
          }
        }),
      ).then((lookupResults) => setLookup(Object.fromEntries(lookupResults)));
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
  function display(k, v) {
    if (v == null || v === "") return "—";
    if (typeof v === "boolean") return v ? "Sí" : "No";
    if (k === "roles_detail")
      return v.map((r) => r.rol__name).join(", ") || "Sin rol";
    if (Array.isArray(v)) return `${v.length} asignados`;
    let rel = relations[k];
    if (k === "estado")
      rel =
        kind === "ordenes"
          ? "estados-orden"
          : kind === "alertas"
            ? "estados-alerta"
            : null;
    return lookup[rel]?.find((r) => String(idOf(r)) === String(v))
      ? labelOf(lookup[rel].find((r) => String(idOf(r)) === String(v)))
      : String(v);
  }
  const canEditRole =
    !readonly &&
    (user.admin ||
      (kind === "ordenes" && user.permisos.includes("change_ordentrabajo")) ||
      (kind === "consumos" &&
        user.permisos.includes("add_repuestoordentrabajo")));
  const permissionModel = {
    comunidades: "comunidad",
    instalaciones: "instalacion",
    dispositivos: "dispositivo",
    umbrales: "umbral",
    alertas: "alerta",
    ordenes: "ordentrabajo",
    repuestos: "repuesto",
    consumos: "repuestoordentrabajo",
    usuarios: "usuario",
    "estados-instalacion": "estadoinstalacion",
    "estados-orden": "estadoordentrabajo",
    "tipos-medicion": "tipomedicion",
    "estados-alerta": "estadoalerta",
    prioridades: "prioridadalerta",
    "tipos-alerta": "tipoalerta",
  }[kind];
  const canEdit =
    canEditRole &&
    (user.is_superuser || user.permisos.includes(`change_${permissionModel}`));
  const canCreate =
    !readonly &&
    (user.admin || kind === "consumos") &&
    (user.is_superuser || user.permisos.includes(`add_${permissionModel}`));
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            ESPACIO DE TRABAJO / {user.admin ? "GESTIÓN" : "CONSULTA"}
          </span>
          <h1>
            {title ||
              { usuarios: "Usuarios", roles: "Roles y permisos" }[kind] ||
              definitions[kind]?.[0]}
          </h1>
          <p>
            {kind === "usuarios"
              ? "Administra las cuentas y el acceso a la plataforma."
              : kind === "ordenes" && !user.admin
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
                  {canEdit && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {rows
                  .filter((r) =>
                    Object.entries(r).some(([k, v]) =>
                      display(k, v)
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                    ),
                  )
                  .map((row) => (
                    <tr key={idOf(row)}>
                      {columns.map((k) => (
                        <td key={k}>{display(k, row[k])}</td>
                      ))}
                      {canEdit && (
                        <td className="row-actions">
                          <button disabled={schemaLoading} onClick={() => openEditor(row)}>
                            Editar
                          </button>
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
                  {user.admin
                    ? "Crea el primer registro para comenzar."
                    : kind === "consumos" &&
                        user.roles.includes("Técnico de Campo")
                      ? "Aquí aparecen los repuestos de tus órdenes asignadas. Pide que te asignen una orden y registra allí los materiales."
                      : user.roles.includes("Técnico de Campo")
                        ? "Los permisos abren módulos; los datos de Técnico siguen limitados a sus órdenes e instalaciones asignadas."
                    : "Los registros de tu ámbito aparecerán aquí."}
                </p>
              </div>
            )}
          </div>
        )}
      </section>
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
          <h1>Todo comienza con una buena conexión.</h1>
          <p>
            Hola, {user.username}. Este es el estado de tu espacio de trabajo.
          </p>
        </div>
        <span className="tag">LA GUAJIRA / COLOMBIA</span>
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
        {(user.admin
          ? ["instalaciones", "dispositivos", "ordenes"]
          : user.roles.includes("Técnico de Campo")
            ? ["ordenes", "instalaciones", "consumos"]
            : ["instalaciones", "alertas", "notificaciones"]
        ).filter((k) => {
          const path = `/${k === "ordenes" ? "mantenimiento" : k}`;
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
                user.admin
                  ? `/${k === "ordenes" ? "mantenimiento" : k}`
                  : k === "ordenes"
                    ? "/mis-casos"
                    : k === "instalaciones"
                      ? user.roles.includes("Técnico de Campo")
                        ? "/ficha-tecnica"
                        : "/mi-comunidad"
                      : k === "alertas"
                        ? "/notificaciones"
                        : `/${k}`
              }
            >
              <Icon />
              <h3>{definitions[k][0]}</h3>
              <p>Consulta la información y continúa con tu trabajo.</p>
              <ArrowUpRight size={18} />
            </Link>
          );
        })}
      </div>
      <section className="territory">
        <Sun size={36} />
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
function Workspace({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
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
    "/mis-casos": "view_ordentrabajo",
    "/ficha-tecnica": "view_instalacion",
    "/consumos": "view_repuestoordentrabajo",
    "/mi-comunidad": "view_instalacion",
    "/notificaciones": "view_alerta",
    "/tecnicos": "view_ordentrabajo",
  };
  const canOpen = (path) =>
    user.is_superuser ||
    (path === "/notificaciones" && user.roles.includes("Líder Comunitario")
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
            ["/notificaciones", "Alertas de mi zona", Bell],
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
            "/notificaciones": ["alertas", "Alertas de mi comunidad", true],
            "/tecnicos": ["ordenes", "Técnicos asignados", true],
          }
        : {};
  const resourceRoutes = [
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
  const existingPaths = new Set(Object.keys(baseRoutes));
  const existingKinds = new Set(Object.values(baseRoutes).map(([kind]) => kind));
  const extras = user.admin
    ? []
    : resourceRoutes.filter(
        ([path, kind, permission]) =>
          !existingPaths.has(path) &&
          !existingKinds.has(kind) &&
          (user.is_superuser || user.permisos.includes(permission)),
      );
  const links = [
    ...baseLinks,
    ...extras.map(([path, kind]) => [path, ...definitions[kind]]),
  ];
  const routes = {
    ...baseRoutes,
    ...Object.fromEntries(extras.map(([path, kind]) => [path, [kind]])),
  };
  return (
    <div className="workspace">
      <aside className={open ? "sidebar open" : "sidebar"}>
        <Brand />
        <div className="workspace-label">
          PLATAFORMA SOLAR <span>01</span>
        </div>
        <nav aria-label="Navegación principal">
          {links
            .filter(([path]) => canOpen(path))
            .map(([path, label, Icon]) => (
              <NavLink key={path} to={path}>
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
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
          <button onClick={onLogout}>
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>
      <div className="workspace-body">
        <header className="workspace-header">
          <button
            className="mobile-menu icon-button"
            aria-label="Abrir menú"
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
            {user.admin && (
              <Route path="/catalogos" element={<Catalogs user={user} />} />
            )}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
function Catalogs({ user }) {
  const [kind, setKind] = useState(catalogs[0]);
  return (
    <>
      <div className="tabs">
        {catalogs.map((k) => (
          <button
            className={kind === k ? "active" : ""}
            key={k}
            onClick={() => setKind(k)}
          >
            {definitions[k][0]}
          </button>
        ))}
      </div>
      <Records key={kind} kind={kind} user={user} />
    </>
  );
}
function Shell() {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const loc = useLocation(),
    navigate = useNavigate();
  async function refresh() {
    const r = await api.get("/security/session/");
    setUser(r.data);
    return r.data;
  }
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
  }, [loc.pathname, user]);
  useEffect(() => {
    const update = () => refresh().catch(() => setUser(null));
    window.addEventListener("kaillisto:permissions", update);
    return () => window.removeEventListener("kaillisto:permissions", update);
  }, []);
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
export default function Portal() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
