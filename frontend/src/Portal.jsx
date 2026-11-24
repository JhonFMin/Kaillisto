import { Fragment, useCallback, useEffect, useRef, useState } from "react";
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
import { MoonIcon as Moon } from "@phosphor-icons/react/dist/csr/Moon";
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
import { ClockCounterClockwiseIcon as ClockCounterClockwise } from "@phosphor-icons/react/dist/csr/ClockCounterClockwise";
import InstallAppButton from "./components/InstallAppButton.jsx";
import "leaflet/dist/leaflet.css";
import api from "./api/axios";

function LocationPicker({ latitude, longitude, onChange, address, kind }) {
  const mapElement = useRef(null);
  const mapInstance = useRef(null);
  const markerInstance = useRef(null);
  const markerIcon = useRef(null);
  const selection = useRef({ latitude, longitude, onChange });
  const [mapState, setMapState] = useState("loading");
  const [locationError, setLocationError] = useState(false);
  const [allowAddressLookup, setAllowAddressLookup] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  useEffect(() => { selection.current = { latitude, longitude, onChange }; }, [latitude, longitude, onChange]);
  useEffect(() => {
    if (!mapElement.current) return undefined;
    let cancelled = false;
    let map = null;
    let timer = null;
    import("leaflet").then(({ default: L }) => {
      if (cancelled || !mapElement.current) return;
      const selected = selection.current;
      const hasPoint = selected.latitude !== "" && selected.longitude !== "" && selected.latitude != null && selected.longitude != null;
      const center = hasPoint ? [Number(selected.latitude), Number(selected.longitude)] : [11.5449, -72.9072];
      const icon = L.divIcon({ className: "kaillisto-map-pin", html: '<span aria-hidden="true"></span>', iconSize: [24, 24], iconAnchor: [12, 12] });
      markerIcon.current = icon;
      map = L.map(mapElement.current, { scrollWheelZoom: false }).setView(center, hasPoint ? 14 : 8);
      const tiles = L.tileLayer(import.meta.env.VITE_MAP_TILES_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      });
      tiles.on("tileload", () => { if (!cancelled) setMapState("ready"); });
      tiles.on("tileerror", () => { if (!cancelled) setMapState("map-error"); });
      tiles.addTo(map);
      mapInstance.current = map;
      const save = (point) => selection.current?.onChange({ latitud: point.lat.toFixed(6), longitud: point.lng.toFixed(6) });
      const marker = hasPoint ? L.marker(center, { icon, draggable: true }).addTo(map) : null;
      markerInstance.current = marker;
      const setPoint = (point) => {
        if (!markerInstance.current) markerInstance.current = L.marker(point, { icon, draggable: true }).addTo(map);
        else markerInstance.current.setLatLng(point);
        markerInstance.current.off("dragend").on("dragend", (event) => save(event.target.getLatLng()));
        save({ lat: point[0] ?? point.lat, lng: point[1] ?? point.lng });
      };
      map.on("click", (event) => setPoint(event.latlng));
      if (marker) marker.on("dragend", (event) => save(event.target.getLatLng()));
      timer = window.setTimeout(() => map.invalidateSize(), 80);
    }).catch(() => { if (!cancelled) setMapState("map-error"); });
    return () => { cancelled = true; window.clearTimeout(timer); map?.remove(); mapInstance.current = null; markerInstance.current = null; markerIcon.current = null; };
  }, []);
  useEffect(() => {
    const lat = Number(latitude), lng = Number(longitude);
    if (!mapInstance.current || latitude === "" || longitude === "" || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const point = [lat, lng];
    if (!markerInstance.current && mapInstance.current && markerIcon.current) {
      import("leaflet").then(({ default: L }) => {
        if (!mapInstance.current || markerInstance.current || !markerIcon.current) return;
        markerInstance.current = L.marker(point, { icon: markerIcon.current, draggable: true }).addTo(mapInstance.current).on("dragend", (event) => {
      const { lat: nextLat, lng: nextLng } = event.target.getLatLng();
      selection.current?.onChange({ latitud: nextLat.toFixed(6), longitud: nextLng.toFixed(6) });
        });
      });
    } else if (markerInstance.current) markerInstance.current.setLatLng(point);
    mapInstance.current.panTo(point);
  }, [latitude, longitude]);
  const mapsUrl = latitude && longitude
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || "La Guajira, Colombia")}`;
  const locate = () => {
    if (!navigator.geolocation) { setLocationError(true); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setLocationError(false); onChange({ latitud: coords.latitude.toFixed(6), longitud: coords.longitude.toFixed(6) }); mapInstance.current?.setView([coords.latitude, coords.longitude], 16); },
      () => setLocationError(true),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };
  const lookupAddress = async () => {
    if (!allowAddressLookup || !latitude || !longitude) return;
    setLookingUp(true);
    setLocationMessage("");
    try {
      const url = new URL("https://photon.komoot.io/reverse");
      url.searchParams.set("lat", latitude);
      url.searchParams.set("lon", longitude);
      const response = await fetch(url, { headers: { Accept: "application/geo+json" } });
      if (!response.ok) throw new Error("No se encontró la dirección; puedes completarla manualmente.");
      const feature = (await response.json()).features?.[0];
      if (!feature) throw new Error("No se encontró una dirección cercana; puedes completarla manualmente.");
      const p = feature.properties || {};
      const [resultLon, resultLat] = feature.geometry?.coordinates || [];
      const radians = (value) => (value * Math.PI) / 180;
      if (Number.isFinite(resultLat) && Number.isFinite(resultLon)) {
        const lat1 = radians(Number(latitude)), lat2 = radians(resultLat);
        const dLat = lat2 - lat1, dLon = radians(resultLon - Number(longitude));
        const distance = 6371000 * 2 * Math.atan2(
          Math.sqrt(Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2),
          Math.sqrt(1 - (Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2)),
        );
        if (distance > 1000) throw new Error("El resultado más cercano está a más de 1 km del pin. Conservamos tus coordenadas; completa la dirección y el barrio manualmente.");
      }
      const neighborhood = p.suburb || p.neighbourhood || p.city_district || p.locality || "";
      const municipality = p.city || p.town || p.village || p.municipality || p.county || "";
      const street = [p.street, p.housenumber].filter(Boolean).join(" ");
      const location = [municipality, p.state, p.country].filter((value, index, values) => value && values.indexOf(value) === index).join(", ");
      if (kind === "comunidades") {
        onChange({ ubicacion: location, municipio: municipality, sector: neighborhood || p.district || "", referencia: street });
      } else {
        onChange({ direccion: street, barrio: neighborhood, ubicacion: location });
      }
      const missing = kind === "comunidades"
        ? (!municipality || !neighborhood || !street)
        : (!street || !neighborhood || !municipality);
      setLocationMessage(missing
        ? "Se completaron solo los datos confirmados cerca del pin. Revisa y escribe los campos faltantes; el mapa conserva el punto exacto."
        : "Datos cercanos al punto completados. Revísalos antes de guardar.");
    } catch (error) { setLocationMessage(error.message || "No se pudo consultar la dirección."); }
    finally { setLookingUp(false); }
  };
  return (
    <section className="location-picker" aria-label="Ubicación exacta">
      <div><strong>Marca el punto exacto en el mapa</strong><p>Haz clic en el mapa o arrastra el pin. El punto se guarda en el sistema.</p></div>
      <div ref={mapElement} className="location-map-canvas" role="application" aria-label="Mapa interactivo para marcar la ubicación" />
      {mapState === "loading" && <small role="status">Cargando el mapa de La Guajira…</small>}
      {mapState === "map-error" && <small role="alert">No se pudo conectar con el proveedor del mapa. Aún puedes escribir las coordenadas o usar tu ubicación actual; el punto se guardará normalmente.</small>}
      <small>Mapa de OpenStreetMap. Solo se carga al abrir este selector. La dirección se busca por separado si das tu consentimiento.</small>
      <div className="location-coordinates">
        <label>Latitud<input type="number" step="any" min="-90" max="90" value={latitude ?? ""} onChange={(event) => onChange({ latitud: event.target.value, longitud: longitude ?? "" })} /></label>
        <label>Longitud<input type="number" step="any" min="-180" max="180" value={longitude ?? ""} onChange={(event) => onChange({ latitud: latitude ?? "", longitud: event.target.value })} /></label>
      </div>
      <div className="location-actions"><button type="button" onClick={locate}>Usar ubicación actual</button><a href={mapsUrl} target="_blank" rel="noreferrer">Abrir en Google Maps ↗</a></div>
      <label className="geocode-consent"><input type="checkbox" checked={allowAddressLookup} onChange={(e) => setAllowAddressLookup(e.target.checked)} />Acepto enviar este punto a Photon/Komoot para buscar dirección y sector.</label>
      <button type="button" disabled={!allowAddressLookup || !latitude || !longitude || lookingUp} onClick={lookupAddress}>{lookingUp ? "Buscando dirección…" : "Completar dirección desde el punto"}</button>
      {locationMessage && <small role="status">{locationMessage}</small>}
      {locationError && <small>El navegador no pudo obtener la ubicación; permite el acceso al GPS y vuelve a intentar.</small>}
    </section>
  );
}

function LocationMap({ latitude, longitude, label }) {
  const element = useRef(null);
  const [mapState, setMapState] = useState("loading");
  useEffect(() => {
    const lat = Number(latitude), lng = Number(longitude);
    if (!element.current || !Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
    let cancelled = false;
    let map;
    import("leaflet").then(({ default: L }) => {
      if (cancelled || !element.current) return;
      const pin = L.divIcon({ className: "kaillisto-map-pin", html: '<span aria-hidden="true"></span>', iconSize: [24, 24], iconAnchor: [12, 12] });
      map = L.map(element.current, { scrollWheelZoom: false, dragging: true }).setView([lat, lng], 16);
      L.tileLayer(import.meta.env.VITE_MAP_TILES_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).on("tileload", () => { if (!cancelled) setMapState("ready"); })
        .on("tileerror", () => { if (!cancelled) setMapState("map-error"); }).addTo(map);
      L.marker([lat, lng], { icon: pin }).addTo(map).bindPopup(label || "Punto registrado").openPopup();
      window.setTimeout(() => { if (!cancelled) map.invalidateSize(); }, 100);
    }).catch(() => { if (!cancelled) setMapState("map-error"); });
    return () => { cancelled = true; map?.remove(); };
  }, [latitude, longitude, label]);
  const mapsUrl = `https://www.openstreetmap.org/?mlat=${encodeURIComponent(latitude)}&mlon=${encodeURIComponent(longitude)}#map=17/${encodeURIComponent(latitude)}/${encodeURIComponent(longitude)}`;
  return <div className="record-location">
    <div className="record-location-heading"><div><strong>{label || "Ubicación del registro"}</strong><small>{Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}{mapState === "map-error" ? " · No se pudieron cargar los mosaicos del mapa" : ""}</small></div><a href={mapsUrl} target="_blank" rel="noreferrer">Abrir mapa ↗</a></div>
    <div ref={element} className="record-location-map" role="img" aria-label={`Mapa con el punto de ${label || "ubicación registrada"}`} />
  </div>;
}

const definitions = {
  usuarios: ["Usuarios", Users],
  roles: ["Roles y recursos", Shield],
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
  mediciones: ["Mediciones IoT", ChartLine],
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
    municipio: "Municipio o localidad",
    sector: "Barrio, vereda o sector",
    referencia: "Dirección o referencia cercana",
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
const recordsFrom = (data) => Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
const readableDate = (value) => value ? new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Fecha no disponible";
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
  mediciones: "medicion",
  notificaciones: "notificacion",
  "estados-instalacion": "estadoinstalacion",
  "estados-orden": "estadoordentrabajo",
  "tipos-medicion": "tipomedicion",
  "estados-alerta": "estadoalerta",
  prioridades: "prioridadalerta",
  "tipos-alerta": "tipoalerta",
};
const modelPage = (model) => {
  if (model === "securityauditevent") return { kind: "audit" };
  const entry = Object.entries(permissionModelByKind).find(([, value]) => value === model);
  return entry ? { kind: entry[0] } : model ? { kind: model } : null;
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
      <img className="brand-mark" src="/favicon.svg" alt="" aria-hidden="true" width="27" height="27" />
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
          <div className="hero-actions">
            <Link className="button primary" to="/login">
              Entrar a la plataforma <ArrowRight size={16} />
            </Link>
            <Link className="button enrollment-link" to="/registro">
              Solicitar servicio solar <ArrowUpRight size={15} />
            </Link>
            <InstallAppButton />
          </div>
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
              <img className="feature-image" src="/solar-technician.jpg" alt="Técnico revisando el inversor de una instalación solar" loading="lazy" />
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
function personalDestination(user, personalPermissions = user?.permisos || [], personalResources = null) {
  const permissions = personalPermissions;
  const roles = (user?.roles || []).filter((role) => role !== "Administrador");
  const canSee = (permission) => permissions.includes(permission) && (
    personalResources == null || personalResources.some((resource) => resource.model === permission.replace(/^view_/, ""))
  );
  if (roles.includes("Propietario Solar") && canSee("view_instalacion")) return "/mi-vivienda";
  if (roles.includes("Líder Comunitario") && canSee("view_instalacion")) return "/mi-comunidad";
  if (roles.includes("Técnico de Campo") && canSee("view_ordentrabajo")) return "/mis-casos";
  if (canUseAdminWorkspace(user) || roles.length) return "/solicitud-vinculacion";
  return "/dashboard";
}

function canUseAdminWorkspace(user) {
  return Boolean(user?.is_superuser || user?.admin || user?.full_resource_access);
}

function Login({ onLogin, user, destination }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [space, setSpace] = useState("personal");
  const [challenge, setChallenge] = useState(() => ({
    left: crypto.getRandomValues(new Uint8Array(1))[0] % 8 + 2,
    right: crypto.getRandomValues(new Uint8Array(1))[0] % 8 + 2,
  }));
  const refreshChallenge = () => setChallenge({
    left: crypto.getRandomValues(new Uint8Array(1))[0] % 8 + 2,
    right: crypto.getRandomValues(new Uint8Array(1))[0] % 8 + 2,
  });
  if (user) return <Navigate to={destination} replace />;
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
        <div className="login-card">
          <Link className="back" to="/">
            ← Volver al inicio
          </Link>
          <span className="tag">ACCESO A LA PLATAFORMA</span>
          <h2>Bienvenido de nuevo.</h2>
          <p>Elige dónde quieres continuar. Tu cuenta y permisos siguen siendo los mismos.</p>
          <div className="login-space-picker" role="group" aria-label="Elige tu espacio">
            <button type="button" className={space === "personal" ? "selected" : ""} aria-pressed={space === "personal"} onClick={() => setSpace("personal")}>
              <Sun size={19} weight="duotone" />
              <span><strong>Mi espacio</strong><small>Hogar, comunidad o trabajo de campo</small></span>
            </button>
            <button type="button" className={space === "admin" ? "selected" : ""} aria-pressed={space === "admin"} onClick={() => setSpace("admin")}>
              <Shield size={19} weight="duotone" />
              <span><strong>Administración</strong><small>Gestión y operación de la plataforma</small></span>
            </button>
          </div>
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
                await onLogin(space);
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
            ¿Primera vez aquí? <Link to="/registro">Crea tu cuenta</Link> para solicitar la vinculación de tu hogar o comunidad.
          </p>
        </div>
      </main>
    </div>
  );
}

function AccountRegistration() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState("");
  return (
    <div className="login-layout signup-layout">
      <div className="login-story">
        <Brand />
        <div>
          <span className="eyebrow">EMPIEZA CON KA’ILLISTO</span>
          <h1>
            Tu energía.
            <br />
            <span>Tu espacio.</span>
          </h1>
          <p>Crea tu cuenta para solicitar la vinculación de una vivienda solar o una comunidad.</p>
        </div>
        <span className="muted">Ka’illisto / Hogares y comunidades</span>
      </div>
      <main className="login-form">
        <div className="login-card signup-card">
          <Link className="back" to="/">← Volver al inicio</Link>
          {created ? <>
            <span className="tag">CUENTA CREADA</span>
            <h2>Ya puedes continuar.</h2>
            <p className="signup-success">Tu cuenta <strong>{created}</strong> está lista. Inicia sesión y envía la información del lugar para que administración la revise.</p>
            <Link className="button primary signup-submit" to="/login">Ir a iniciar sesión <ArrowRight size={16} /></Link>
          </> : <>
            <span className="tag">REGISTRO PERSONAL</span>
            <h2>Crea tu cuenta.</h2>
            <p>Solo tomará unos minutos. No asignaremos acceso operativo hasta que se apruebe tu solicitud.</p>
            <form onSubmit={async (event) => {
              event.preventDefault(); setBusy(true); setError("");
              const values = Object.fromEntries(new FormData(event.currentTarget));
              if (values.password !== values.password_confirmation) {
                setError("Las contraseñas no coinciden."); setBusy(false); return;
              }
              delete values.password_confirmation;
              try {
                const { data } = await api.post("/security/register/", values);
                setCreated(data.username);
              } catch (e) { setError(errorText(e)); }
              finally { setBusy(false); }
            }}>
              <div className="signup-fields">
                <label>Nombre<input name="first_name" autoComplete="given-name" required maxLength={150} /></label>
                <label>Apellido<input name="last_name" autoComplete="family-name" required maxLength={150} /></label>
                <label>Nombre de usuario<input name="username" autoComplete="username" required maxLength={150} /></label>
                <label>Correo electrónico<input name="email" type="email" autoComplete="email" required maxLength={150} /></label>
                <label>Teléfono <small>(opcional)</small><input name="telefono" type="tel" autoComplete="tel" maxLength={30} /></label>
                <label>Documento <small>(opcional)</small><input name="documento" autoComplete="off" maxLength={30} /></label>
                <label>Contraseña<input name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
                <label>Confirma la contraseña<input name="password_confirmation" type="password" autoComplete="new-password" minLength={8} required /></label>
              </div>
              {error && <p role="alert" className="notice">{error}</p>}
              <button className="primary signup-submit" disabled={busy}>{busy ? "Creando cuenta…" : "Crear cuenta y continuar"}<ArrowRight size={16} /></button>
            </form>
            <p className="caption">¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>.</p>
          </>}
        </div>
      </main>
    </div>
  );
}

const emptyLinkRequest = {
  tipo: "residencial", nombre: "", municipio: "", sector: "", direccion: "", barrio: "",
  referencia: "", latitud: "", longitud: "", capacidad: "", fecha_instalacion: "", descripcion: "",
};

function ServiceRequestPortal({ user }) {
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState(emptyLinkRequest);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  useEffect(() => {
    let active = true;
    api.get("/security/solicitudes-vinculacion/")
      .then(({ data }) => { if (active) setRequests(data); })
      .catch((e) => { if (active) setError(errorText(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const pending = requests.find((item) => item.estado === "pendiente");
  const latest = requests[0];
  const canRequest = !pending;
  const statusIcon = latest?.estado === "aprobada" ? <Shield size={18} /> : <MapPin size={18} />;
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError(""); setSent(false);
    if (!form.latitud || !form.longitud) {
      setError("Marca el lugar en el mapa o escribe las dos coordenadas."); setBusy(false); return;
    }
    const payload = { ...form };
    delete payload.ubicacion;
    try {
      const { data } = await api.post("/security/solicitudes-vinculacion/", payload);
      setRequests((current) => [data, ...current]); setForm(emptyLinkRequest); setSent(true);
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  };

  return <>
    <div className="page-heading">
      <div><span className="eyebrow">VINCULA TU LUGAR</span><h1>Solicita el servicio solar.</h1><p>Cuéntanos dónde está el sistema. Administración revisará los datos antes de vincularlo.</p></div>
      <span className="tag">{user.username}</span>
    </div>
    {error && <p role="alert" className="notice">{error}</p>}
    {sent && <p role="status" className="notice">Solicitud enviada. Puedes ver su estado aquí; administración revisará la ubicación y los datos.</p>}
    {loading ? <p className="empty">Cargando tus solicitudes…</p> : <>
      {requests.length > 0 && <section className="application-history">
        <div className="section-intro"><h2>Estado de tu solicitud</h2><span className="muted">{requests.length} {requests.length === 1 ? "registro" : "registros"}</span></div>
        {requests.map((item) => <article className={`application-status-card status-${item.estado}`} key={item.id_solicitud}>
          {statusIcon}
          <div><strong>{item.nombre}</strong><p>{item.tipo === "residencial" ? "Vivienda solar" : "Proyecto comunitario"} · {item.municipio} · {item.estado_display}</p>
            {item.nota_revision && <small>Nota de administración: {item.nota_revision}</small>}
            <small>Enviada {item.creada_en ? new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date(item.creada_en)) : "recientemente"}</small>
          </div>
          {item.latitud && item.longitud && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.latitud},${item.longitud}`)}`} target="_blank" rel="noreferrer">Ver punto ↗</a>}
        </article>)}
      </section>}
      {canRequest ? <section className="service-request-panel">
        <div className="section-intro"><div><span className="eyebrow">NUEVO REGISTRO</span><h2>{latest?.estado === "rechazada" ? "Corrige los datos y vuelve a enviar." : "¿Qué lugar quieres vincular?"}</h2></div><span className="muted">Paso 1 de 1</span></div>
        {latest?.estado === "rechazada" && <p className="application-retry">Tu solicitud anterior necesita ajustes. Usa la nota de revisión de arriba como guía.</p>}
        <form className="service-request-form" onSubmit={submit}>
          <fieldset className="request-type-picker"><legend>Tipo de lugar</legend>
            <label className={form.tipo === "residencial" ? "selected" : ""}><input type="radio" name="tipo" value="residencial" checked={form.tipo === "residencial"} onChange={() => update("tipo", "residencial")} /><Sun size={20} /><span><strong>Vivienda solar</strong><small>Una casa con paneles solares</small></span></label>
            <label className={form.tipo === "comunitaria" ? "selected" : ""}><input type="radio" name="tipo" value="comunitaria" checked={form.tipo === "comunitaria"} onChange={() => update("tipo", "comunitaria")} /><Users size={20} /><span><strong>Proyecto comunitario</strong><small>Un sistema para varias familias</small></span></label>
          </fieldset>
          <div className="request-fields">
            <label>{form.tipo === "residencial" ? "Nombre para identificar la vivienda" : "Nombre de la comunidad o proyecto"}<input value={form.nombre} required maxLength={150} onChange={(e) => update("nombre", e.target.value)} /></label>
            <label>Municipio<input value={form.municipio} required maxLength={120} onChange={(e) => update("municipio", e.target.value)} /></label>
            {form.tipo === "residencial" ? <>
              <label>Dirección<input value={form.direccion} required maxLength={255} onChange={(e) => update("direccion", e.target.value)} /></label>
              <label>Barrio o vereda<input value={form.barrio} required maxLength={120} onChange={(e) => update("barrio", e.target.value)} /></label>
            </> : <>
              <label>Vereda, barrio o sector<input value={form.sector} required maxLength={160} onChange={(e) => update("sector", e.target.value)} /></label>
              <label>Referencia cercana<input value={form.referencia} maxLength={255} onChange={(e) => update("referencia", e.target.value)} /></label>
            </>}
            <label>Capacidad aproximada (kW)<input type="number" min="0.01" step="0.01" value={form.capacidad} required onChange={(e) => update("capacidad", e.target.value)} /></label>
            <label>Fecha de instalación<input type="date" value={form.fecha_instalacion} required onChange={(e) => update("fecha_instalacion", e.target.value)} /></label>
          </div>
          <LocationPicker kind={form.tipo === "comunitaria" ? "comunidades" : "instalaciones"} latitude={form.latitud} longitude={form.longitud} address={[form.direccion, form.barrio, form.sector, form.municipio].filter(Boolean).join(", ")} onChange={(point) => setForm((current) => ({ ...current, ...point }))} />
          <label className="request-description">Información útil para la revisión <small>(opcional)</small><textarea rows={3} value={form.descripcion} maxLength={2000} onChange={(e) => update("descripcion", e.target.value)} placeholder="Por ejemplo: cantidad de viviendas beneficiadas o detalles de acceso al lugar." /></label>
          <div className="request-consent"><MapPin size={18} /><p>La ubicación solo se comparte con el equipo de Ka’illisto para revisar esta solicitud y atender el sistema.</p></div>
          <button className="primary" disabled={busy}>{busy ? "Enviando solicitud…" : "Enviar para revisión"}<ArrowRight size={16} /></button>
        </form>
      </section> : pending && <p className="application-waiting">Tu solicitud está en revisión. Te avisaremos cuando cambie el estado.</p>}
    </>}
  </>;
}

function ServiceRequestReview() {
  const [requests, setRequests] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [filter, setFilter] = useState("pendiente");
  const [communityTargets, setCommunityTargets] = useState({});
  const [notes, setNotes] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const refresh = async () => {
    setError("");
    const [requestResult, communityResult] = await Promise.allSettled([
      api.get("/security/solicitudes-vinculacion/"),
      api.get("/security/portal/comunidades/"),
    ]);
    if (requestResult.status === "fulfilled") setRequests(requestResult.value.data);
    else setError(errorText(requestResult.reason));
    if (communityResult.status === "fulfilled") setCommunities(communityResult.value.data);
    setLoading(false);
  };
  useEffect(() => {
    let active = true;
    Promise.allSettled([
      api.get("/security/solicitudes-vinculacion/"),
      api.get("/security/portal/comunidades/"),
    ]).then(([requestResult, communityResult]) => {
      if (!active) return;
      if (requestResult.status === "fulfilled") setRequests(requestResult.value.data);
      else setError(errorText(requestResult.reason));
      if (communityResult.status === "fulfilled") setCommunities(communityResult.value.data);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);
  const counts = {
    pendiente: requests.filter((item) => item.estado === "pendiente").length,
    aprobada: requests.filter((item) => item.estado === "aprobada").length,
    rechazada: requests.filter((item) => item.estado === "rechazada").length,
  };
  const visibleRequests = filter === "todas" ? requests : requests.filter((item) => item.estado === filter);
  const review = async (item, decision) => {
    const note = (notes[item.id_solicitud] || "").trim();
    if (decision === "rechazar" && !note) {
      setError("Escribe una nota breve para que la persona sepa qué corregir."); return;
    }
    const payload = { decision, nota_revision: note };
    if (decision === "aprobar" && item.tipo === "comunitaria" && communityTargets[item.id_solicitud]) {
      payload.comunidad_id = Number(communityTargets[item.id_solicitud]);
    }
    setBusyId(item.id_solicitud); setError(""); setNotice("");
    try {
      const { data } = await api.post(`/security/solicitudes-vinculacion/${item.id_solicitud}/revisar/`, payload);
      setRequests((current) => current.map((request) => request.id_solicitud === data.id_solicitud ? data : request));
      setNotice(decision === "aprobar" ? "Solicitud aprobada y vinculada correctamente." : "Solicitud devuelta con la nota de revisión.");
    } catch (e) { setError(errorText(e)); }
    finally { setBusyId(null); }
  };
  return <>
    <div className="page-heading"><div><span className="eyebrow">GESTIÓN DE INGRESOS</span><h1>Revisa nuevos lugares.</h1><p>Comprueba la ubicación y los datos antes de vincular un hogar o comunidad.</p></div><button type="button" onClick={() => { setLoading(true); refresh(); }} disabled={loading}>Actualizar</button></div>
    {error && <p role="alert" className="notice">{error}</p>}
    {notice && <p role="status" className="notice">{notice}</p>}
    <div className="stat-grid application-review-stats">
      {[['Por revisar', counts.pendiente], ['Aprobadas', counts.aprobada], ['Requieren ajustes', counts.rechazada]].map(([label, value]) => <article key={label}><ClipboardText size={18} /><span>{label}</span><strong>{loading ? "—" : value}</strong></article>)}
    </div>
    <div className="tabs application-review-tabs">
      {[['pendiente', 'Pendientes'], ['todas', 'Todas'], ['aprobada', 'Aprobadas'], ['rechazada', 'Requieren ajustes']].map(([value, label]) => <button className={filter === value ? "active" : ""} key={value} onClick={() => setFilter(value)}>{label}</button>)}
    </div>
    {loading ? <p className="empty">Cargando solicitudes…</p> : visibleRequests.length ? <div className="review-request-grid">
      {visibleRequests.map((item) => <article className="review-request-card" key={item.id_solicitud}>
        <header><div><span className="eyebrow">{item.tipo === "residencial" ? "VIVIENDA SOLAR" : "PROYECTO COMUNITARIO"} · #{item.id_solicitud}</span><h2>{item.nombre}</h2><p>{item.solicitante_nombre} · {item.solicitante_email}</p></div><span className="tag">{item.estado_display}</span></header>
        <div className="review-request-facts">
          <div><small>Municipio</small><strong>{item.municipio}</strong></div>
          <div><small>Sector</small><strong>{item.tipo === "residencial" ? item.barrio : item.sector || "Sin indicar"}</strong></div>
          {item.tipo === "residencial" && <div><small>Dirección</small><strong>{item.direccion}</strong></div>}
          <div><small>Capacidad</small><strong>{item.capacidad} kW</strong></div>
          <div><small>Instalación</small><strong>{item.fecha_instalacion}</strong></div>
          <div><small>Enviada</small><strong>{item.creada_en ? new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date(item.creada_en)) : "—"}</strong></div>
        </div>
        {item.referencia && <p>Referencia: {item.referencia}</p>}
        {item.descripcion && <p>{item.descripcion}</p>}
        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.latitud},${item.longitud}`)}`} target="_blank" rel="noreferrer">Ver ubicación exacta en el mapa ↗</a>
        {item.estado === "pendiente" ? <>
          {item.tipo === "comunitaria" && <label>Al aprobar<select value={communityTargets[item.id_solicitud] || ""} onChange={(event) => setCommunityTargets((current) => ({ ...current, [item.id_solicitud]: event.target.value }))}>
            <option value="">Crear comunidad y sistema nuevos</option>
            {communities.map((community) => <option value={community.id_comunidad} key={community.id_comunidad}>Vincular a {community.nombre} (sin duplicar el sistema)</option>)}
          </select></label>}
          <label>Nota para el solicitante<textarea className="review-note" rows={2} value={notes[item.id_solicitud] || ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id_solicitud]: event.target.value }))} placeholder="Si devuelves la solicitud, explica qué debe corregir." /></label>
          <div className="review-request-actions"><button className="approve" type="button" disabled={busyId === item.id_solicitud} onClick={() => review(item, "aprobar")}>{busyId === item.id_solicitud ? "Guardando…" : "Aprobar y vincular"}</button><button className="reject" type="button" disabled={busyId === item.id_solicitud} onClick={() => review(item, "rechazar")}>Solicitar corrección</button></div>
        </> : item.nota_revision && <p className="application-retry">Nota de revisión: {item.nota_revision}</p>}
      </article>)}
    </div> : <div className="empty-state"><ClipboardText size={30} /><h2>No hay solicitudes en esta vista.</h2><p>Los nuevos registros aparecerán aquí para que administración pueda revisarlos.</p></div>}
  </>;
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
    (kind !== "instalaciones" && kind !== "comunidades" || !["latitud", "longitud"].includes(key)) &&
    (kind !== "instalaciones" || key !== "responsable" || installationType === "residencial"),
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
            if (!row && (kind === "instalaciones" || kind === "comunidades") && (!data.latitud || !data.longitud)) {
              setError("Marca el punto exacto en el mapa antes de crear el registro.");
              return;
            }
            setBusy(true);
            setError("");
            try {
              const payload = {};
              for (const [k] of allFields) {
                let v = data[k];
                if (k === "password" && !v && row) continue;
                if (v !== undefined)
                  payload[k] =
                    ["latitud", "longitud"].includes(k) && v === ""
                      ? null
                      : v === "" && schema[k].type === "field" ? null : v;
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
          {(kind === "instalaciones" || kind === "comunidades") && <LocationPicker kind={kind} latitude={data.latitud} longitude={data.longitud} address={data.direccion || data.ubicacion} onChange={(point) => setData((current) => ({ ...current, ...point }))} />}
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
              }[k] || nice(k)) : kind === "comunidades" ? ({ municipio: "Municipio", sector: "Barrio, vereda o sector", referencia: "Dirección o referencia cercana", ubicacion: "Municipio / localidad" }[k] || nice(k)) : nice(k)}
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
function Records({ kind, user, title, readonly = false, endpointOverride, modelName, personalView = false }) {
  const recordsRef = useRef(null);
  const [rows, setRows] = useState([]),
    [schema, setSchema] = useState({}),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [editing, setEditing] = useState(null),
    [compareDevice, setCompareDevice] = useState(null),
    [selectedMeasurement, setSelectedMeasurement] = useState(null),
    [locationRow, setLocationRow] = useState(null),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const resourceEndpoint = endpointOverride || endpoint(kind);
  const permissionModel = modelName || permissionModelByKind[kind];
  const canEditKind =
    user.is_superuser || user.permisos.includes(`change_${permissionModel}`);
  const canCreateKind =
    user.is_superuser || user.permisos.includes(`add_${permissionModel}`);
  async function openEditor(row = {}) {
    setSchemaLoading(true);
    setError("");
    try {
      const response = await api.options(resourceEndpoint);
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
      const r = await api.get(resourceEndpoint);
      setRows(r.data);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }
  async function markNotificationRead(row) {
    const id = idOf(row);
    try {
      const { data } = await api.post(`${resourceEndpoint}${id}/marcar-leida/`);
      setRows((current) => current.map((item) => idOf(item) === id ? { ...item, leida_en: data.leida_en } : item));
    } catch (e) {
      setError(errorText(e));
    }
  }
  useEffect(() => {
    setRows([]);
    setEditing(null);
    load();
  }, [kind, resourceEndpoint]);
  const columns = rows.length
    ? Object.keys(rows[0]).filter(
        (k) =>
          !k.endsWith("_display") &&
          !k.startsWith("map_") &&
          !["dispositivo_modelo", "tipo_medicion_unidad", "instalacion_tipo", "instalacion_direccion", "instalacion_barrio", "instalacion_ubicacion", "instalacion_latitud", "instalacion_longitud", "propietario_display"].includes(k) &&
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
  const canShowLocation = ["comunidades", "instalaciones", "dispositivos"].includes(kind);
  const canCreate =
    !readonly && canCreateKind;
  const filteredRows = rows.filter((row) =>
    Object.entries(row).some(([key, value]) =>
      display(key, value, row).toLowerCase().includes(search.toLowerCase()),
    ),
  );
  const unreadCount = kind === "notificaciones" ? filteredRows.filter((row) => !row.leida_en).length : 0;
  const pageSize = 12;
  const pageCount = Math.ceil(filteredRows.length / pageSize);
  const currentPage = Math.min(page, Math.max(1, pageCount));
  const visibleRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const personalVisuals = {
    alertas: ["Alertas de mi zona", "Señales importantes para cuidar tu sistema solar.", "/solar-operations.jpg", Bell],
    ordenes: ["Seguimiento de visitas", "Cada visita, su avance y la ubicación de atención.", "/solar-technician.jpg", Wrench],
    comunidades: ["Tu red comunitaria", "Sistemas y ubicaciones vinculados a tu comunidad.", "/solar-guajira-dawn.webp", MapPin],
    instalaciones: ["Instalaciones solares", "Consulta el estado y la ubicación de cada sistema.", "/solar-home.jpg", Layers],
    dispositivos: ["Equipos conectados", "Estado de conexión y lecturas de tus dispositivos.", "/solar-controller.webp", Radio],
    consumos: ["Repuestos utilizados", "Materiales registrados durante tus órdenes de trabajo.", "/solar-technician.jpg", Package],
    notificaciones: ["Centro de avisos", "Mensajes y novedades de tu sistema en un solo lugar.", "/solar-dawn.jpg", Bell],
    repuestos: ["Repuestos disponibles", "Consulta los materiales relacionados con el servicio.", "/solar-operations.jpg", Package],
    mediciones: ["Mediciones del sistema", "Lecturas recientes de los equipos conectados.", "/solar-controller.webp", ChartLine],
  }[kind] || [title || definitions[kind]?.[0] || "Tu espacio solar", "Información útil, organizada para ti.", "/solar-home.jpg", definitions[kind]?.[1] || Layers];
  const PersonalVisualIcon = personalVisuals[3];
  const personalCardTitle = (row) => ({
    alertas: row.tipo_alerta_display || row.tipo_medicion_display || `Alerta #${idOf(row)}`,
    mediciones: row.tipo_medicion_display || `Medición #${idOf(row)}`,
    ordenes: `Orden #${idOf(row)}`,
    consumos: row.repuesto_display || row.repuesto_nombre || `Repuesto #${idOf(row)}`,
    dispositivos: row.codigo || `Dispositivo #${idOf(row)}`,
    instalaciones: row.nombre || `Instalación #${idOf(row)}`,
    comunidades: row.nombre || `Comunidad #${idOf(row)}`,
    notificaciones: row.alerta_display || row.asunto || `Aviso #${idOf(row)}`,
  }[kind] || row.nombre || row.codigo || row.asunto || `Registro #${idOf(row)}`);
  const personalCardSummary = (row) => [
    kind === "mediciones" && row.valor != null ? `Lectura: ${row.valor} ${row.tipo_medicion_unidad || ""}`.trim() : null,
    row.mensaje,
    row.descripcion,
    row.diagnostico,
    row.solucion_aplicada,
    row.modelo,
    [row.direccion, row.barrio, row.ubicacion].filter(Boolean).join(" · "),
  ].find((value) => value && String(value).trim()) || "Consulta el detalle y el seguimiento de este registro.";
  const personalCardDate = (row) => row.fecha_creacion || row.fecha_atencion || row.ultima_comunicacion || row.fecha_envio || row.fecha_hora;
  const personalMapPoint = (row) => {
    const latitude = row.instalacion_latitud ?? row.latitud ?? row.map_latitud;
    const longitude = row.instalacion_longitud ?? row.longitud ?? row.map_longitud;
    return latitude != null && longitude != null ? { latitude, longitude } : null;
  };
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
      {personalView && <section className="personal-collection-hero" aria-label={personalVisuals[0]}>
        <img src={personalVisuals[2]} alt="" loading="lazy" />
        <div className="personal-collection-copy"><span className="eyebrow">KA’ILLISTO / MI ESPACIO</span><h2>{personalVisuals[0]}</h2><p>{personalVisuals[1]}</p></div>
        <div className="personal-collection-count"><PersonalVisualIcon size={22} /><strong>{filteredRows.length}</strong><span>{kind === "notificaciones" ? `${unreadCount} sin leer` : filteredRows.length === 1 ? "registro" : "registros"}</span></div>
      </section>}
      <section ref={personalView ? recordsRef : null} className={personalView ? "personal-records-shell" : "data-panel"}>
        <div className={`table-toolbar${personalView ? " personal-record-toolbar" : ""}`}>
          <span>{personalView ? `${filteredRows.length} ${filteredRows.length === 1 ? "registro" : "registros"}` : `${rows.length} registros`}</span>
          <label className="search">
            <Search size={16} />
            <input
              aria-label="Buscar registros"
              placeholder="Buscar en este apartado…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </label>
        </div>
        {error && (
          <p role="alert" className="notice">
            {error}
          </p>
        )}
        {personalView ? loading ? (
          <p className="empty">Cargando información…</p>
        ) : filteredRows.length ? <>
        <div className="personal-record-grid">
          {visibleRows.map((row, index) => {
            const location = personalMapPoint(row);
            const state = kind === "notificaciones" ? row.leida_en ? "Leída" : "Nueva" : row.estado_display || row.estado || row.prioridad_display || row.prioridad_alerta_display || (kind === "mediciones" ? row.es_anomala ? "Lectura anómala" : "Lectura registrada" : "");
            const mapLabel = personalCardTitle(row);
            const extraDetails = [
              ["Diagnóstico", row.diagnostico],
              ["Solución aplicada", row.solucion_aplicada],
              ["Referencia", row.referencia || row.direccion],
            ].filter(([, value]) => value && String(value).trim());
            return <article className="personal-record-card feature" key={idOf(row)} style={{ "--card-index": index }}>
              <div className="personal-record-card-top"><span>{definitions[kind]?.[0] || title || "Seguimiento"}</span>{state && <span className={`personal-record-status${String(state).toLowerCase().includes("cerr") || String(state).toLowerCase().includes("normal") || String(state).toLowerCase().includes("registrad") || String(state).toLowerCase().includes("leíd") ? " is-calm" : ""}`}>{state}</span>}</div>
              <h3>{personalCardTitle(row)}</h3>
              <p>{personalCardSummary(row)}</p>
              <div className="personal-record-meta">
                {row.instalacion_display && <span><MapPin size={14} />{row.instalacion_display}</span>}
                {kind === "mediciones" && row.dispositivo_display && <span><Radio size={14} />{row.dispositivo_display}</span>}
                {kind === "mediciones" && row.comunidad_display && <span><MapPin size={14} />{row.comunidad_display}</span>}
                {personalCardDate(row) && <span><ClockCounterClockwise size={14} />{readableDate(personalCardDate(row))}</span>}
                {row.cantidad != null && <span><Package size={14} />{row.cantidad} unidades</span>}
                {row.canal && <span><Bell size={14} />{row.canal}</span>}
              </div>
              <div className="personal-record-actions">
                {location && <button type="button" className="secondary" aria-expanded={locationRow === idOf(row)} onClick={() => setLocationRow((current) => current === idOf(row) ? null : idOf(row))}><MapPin size={15} />{locationRow === idOf(row) ? "Ocultar ubicación" : "Ver ubicación"}</button>}
                {kind === "dispositivos" && (user.is_superuser || user.permisos.includes("ALL") || user.permisos.includes("view_medicion")) && <button type="button" className="secondary" onClick={() => setCompareDevice(row)}><ChartLine size={15} />Ver mediciones</button>}
                {personalView && kind === "mediciones" && <button type="button" className="secondary" onClick={() => setSelectedMeasurement(row)}><MapPin size={15} />Ver detalle, equipo y mapa</button>}
                {personalView && kind === "notificaciones" && !row.leida_en && <button type="button" className="secondary" onClick={() => markNotificationRead(row)}>Marcar como leída</button>}
                {canEdit && <button type="button" className="secondary" disabled={schemaLoading} onClick={() => openEditor(row)}>Editar</button>}
              </div>
              {extraDetails.length > 0 && <details className="personal-record-details"><summary>Ver detalles del seguimiento</summary><dl>{extraDetails.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></details>}
              {location && locationRow === idOf(row) && <LocationMap latitude={location.latitude} longitude={location.longitude} label={mapLabel} />}
            </article>;
          })}
        </div>
        {pageCount > 1 && <nav className="personal-record-pagination" aria-label="Paginación de registros">
          <span aria-live="polite">Mostrando {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredRows.length)} de {filteredRows.length}</span>
          <div>
            <button type="button" className="secondary" disabled={currentPage === 1} onClick={() => { setPage((value) => Math.max(1, value - 1)); recordsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>Anterior</button>
            <span aria-label={`Página ${currentPage} de ${pageCount}`}>{currentPage} / {pageCount}</span>
            <button type="button" className="secondary" disabled={currentPage === pageCount} onClick={() => { setPage((value) => Math.min(pageCount, value + 1)); recordsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>Siguiente</button>
          </div>
        </nav>}
        </> : <div className="empty personal-record-empty"><Layers size={30} /><h3>{search ? "No encontramos resultados" : "Aún no hay registros"}</h3><p>{search ? "Prueba con otro nombre, estado o ubicación." : kind === "ordenes" ? "Cuando te asignen una visita, aquí verás el estado, el sitio y su ubicación." : "Cuando haya información para tu cuenta, aparecerá aquí organizada en tarjetas."}</p></div> : loading ? (
          <p className="empty">Cargando información…</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {columns.map((k) => (
                    <th key={k}>{nice(k)}</th>
                  ))}
                  {(canEdit || kind === "dispositivos" || canShowLocation) && <th>Acciones</th>}
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
                    <Fragment key={idOf(row)}>
                    <tr>
                      {columns.map((k) => (
                        <td key={k}>{display(k, row[k], row)}</td>
                      ))}
                      {(canEdit || kind === "dispositivos" || canShowLocation) && (
                        <td className="row-actions">
                          {canShowLocation && <button aria-expanded={locationRow === idOf(row)} onClick={() => setLocationRow((current) => current === idOf(row) ? null : idOf(row))}><MapPin size={15} /> {locationRow === idOf(row) ? "Ocultar mapa" : "Ver ubicación"}</button>}
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
                                      `${resourceEndpoint}${idOf(row)}/toggle_superadmin/`,
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
                    {canShowLocation && locationRow === idOf(row) && (() => {
                      const latitude = kind === "dispositivos" ? row.map_latitud : row.latitud;
                      const longitude = kind === "dispositivos" ? row.map_longitud : row.longitud;
                      const locationLabel = kind === "dispositivos"
                        ? `${row.codigo || "Dispositivo"} · ${row.instalacion_display || row.map_ubicacion_nombre || "instalación vinculada"}`
                        : row.nombre || row.ubicacion || title || "Ubicación registrada";
                      return <tr key={`${idOf(row)}-location`} className="location-detail-row"><td colSpan={columns.length + 1}>{latitude != null && longitude != null
                        ? <LocationMap latitude={latitude} longitude={longitude} label={locationLabel} />
                        : <p className="empty">Este registro todavía no tiene un punto GPS guardado.</p>}</td></tr>;
                    })()}
                    </Fragment>
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
      {selectedMeasurement && <MeasurementDetail measurement={selectedMeasurement} onClose={() => setSelectedMeasurement(null)} />}
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
              await api.patch(`${resourceEndpoint}${idOf(editing)}/`, data);
            else await api.post(resourceEndpoint, data);
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
              const history = row.historial || [];
              const historyPoints = history.map((point, index) => {
                const span = range.high - range.low || 1;
                const x = history.length < 2 ? 0 : (index / (history.length - 1)) * 320;
                const y = 58 - Math.max(0, Math.min(1, (Number(point.valor) - range.low) / span)) * 48;
                return `${x},${y}`;
              }).join(" ");
              return <article className="threshold-chart-row" key={row.tipo_medicion}>
                <div className="threshold-chart-heading"><strong>{row.tipo_medicion}<small>{row.unidad}</small></strong><b>{formatted(row.valor)} {row.valor == null ? "" : row.unidad}</b><span className={`reading-state ${row.estado.toLowerCase().replaceAll(" ", "-")}`}>{row.estado}</span></div>
                <div className="threshold-track" role="img" aria-label={`${row.tipo_medicion}: ${formatted(row.valor)} ${row.unidad}, rango de ${formatted(row.minimo)} a ${formatted(row.maximo)}`}>
                  <span className="threshold-zone" style={{ left: `${range.goodStart}%`, width: `${range.goodWidth}%` }} />
                  {range.marker != null && <i className={`threshold-marker ${row.estado === "Normal" ? "in-range" : "out-range"}`} style={{ left: `${range.marker}%` }} />}
                </div>
                <div className="threshold-ticks"><span>{formatted(range.low)}</span><span>Mín. {formatted(row.minimo)}</span><span>Máx. {formatted(row.maximo)}</span><span>{formatted(range.high)}</span></div>
                {history.length > 1 && <div className="reading-history"><div><strong>Tendencia reciente · {history.length} muestras / {row.unidad}</strong><small>De {new Intl.DateTimeFormat("es-CO", { dateStyle: "short" }).format(new Date(history[0].fecha_hora))} a {new Intl.DateTimeFormat("es-CO", { dateStyle: "short" }).format(new Date(history.at(-1).fecha_hora))}</small></div><svg viewBox="0 0 320 64" preserveAspectRatio="none" role="img" aria-label={`Tendencia histórica de ${row.tipo_medicion} durante los últimos días`}><polyline points={historyPoints} /></svg></div>}
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

function MeasurementDetail({ measurement, onClose }) {
  const latitude = measurement.instalacion_latitud;
  const longitude = measurement.instalacion_longitud;
  const zone = [
    measurement.instalacion_direccion,
    measurement.instalacion_barrio,
    measurement.instalacion_ubicacion,
  ].filter(Boolean).join(" · ");
  const value = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(Number(measurement.valor));
  const facts = [
    ["Dispositivo", [measurement.dispositivo_display, measurement.dispositivo_modelo].filter(Boolean).join(" · ")],
    ["Instalación", measurement.instalacion_display],
    ["Zona", zone || "Ubicación descriptiva pendiente"],
    ["Comunidad", measurement.comunidad_display || "Instalación residencial"],
    ["Propietario", measurement.propietario_display || (measurement.instalacion_tipo === "residencial" ? "Responsable sin nombre registrado" : "No aplica")],
    ["Lectura", `${measurement.tipo_medicion_display || "Medición"} · ${value} ${measurement.tipo_medicion_unidad || ""}`.trim()],
    ["Registrada", readableDate(measurement.fecha_hora)],
  ];
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="modal measurement-context-modal" role="dialog" aria-modal="true" aria-labelledby="measurement-context-title">
      <header><div><span className="eyebrow">MEDICIÓN #{idOf(measurement)}</span><h2 id="measurement-context-title">Contexto de la lectura</h2></div><button className="icon-button" type="button" aria-label="Cerrar" onClick={onClose}><X size={18} /></button></header>
      <div className="measurement-context-value"><ChartLine size={21} /><div><span>{measurement.tipo_medicion_display || "Lectura del sistema"}</span><strong>{value} {measurement.tipo_medicion_unidad || ""}</strong></div><span className={`reading-state ${measurement.es_anomala ? "fuera-de-rango" : "normal"}`}>{measurement.es_anomala ? "Revisar" : "Registrada"}</span></div>
      <dl className="measurement-context-facts">{facts.map(([label, detail]) => <div key={label}><dt>{label}</dt><dd>{detail || "Sin información"}</dd></div>)}</dl>
      {latitude != null && longitude != null
        ? <LocationMap latitude={latitude} longitude={longitude} label={`${measurement.dispositivo_display || "Dispositivo"} · ${measurement.instalacion_display || "Instalación"}`} />
        : <p className="empty">Esta instalación todavía no tiene coordenadas para mostrar en el mapa.</p>}
      <footer><button className="secondary" type="button" onClick={onClose}>Cerrar detalle</button></footer>
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
  if (!user.is_superuser && !user.admin && !user.full_resource_access && !user.roles.length) {
    return <section className="onboarding-panel">
      <div className="onboarding-art" aria-hidden="true"><Sun size={52} weight="duotone" /><span /><span /><span /></div>
      <div className="onboarding-copy"><span className="eyebrow">BIENVENIDO A KA’ILLISTO</span><h1>Tu hogar también puede ser parte.</h1><p>Registra una vivienda solar o un proyecto comunitario. Revisaremos el lugar y te avisaremos antes de vincularlo.</p>
        <div className="onboarding-steps"><span><b>01</b> Comparte el lugar</span><span><b>02</b> Administración lo revisa</span><span><b>03</b> Consulta tu espacio solar</span></div>
        <Link className="button primary" to="/solicitud-vinculacion">Solicitar vinculación <ArrowRight size={16} /></Link>
      </div>
    </section>;
  }
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
            : user.roles.includes("Propietario Solar")
              ? ["instalaciones", "dispositivos", "alertas"]
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
                          : user.roles.includes("Propietario Solar")
                            ? "/mi-vivienda"
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
      <section className="service-request-promo">
        <MapPin size={22} />
        <div><strong>¿Tienes otro hogar o comunidad solar?</strong><p>Vincúlalo a tu cuenta y consulta sus novedades desde Ka’illisto.</p></div>
        <Link className="button" to="/solicitud-vinculacion">Solicitar vinculación <ArrowRight size={15} /></Link>
      </section>
      <section className="territory dashboard-territory">
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
function HomeownerOverview({ user }) {
  const [installations, setInstallations] = useState([]);
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const requests = [
      ["installations", "/security/portal/instalaciones/"],
      ...(user.permisos.includes("view_dispositivo") ? [["devices", "/security/portal/dispositivos/"]] : []),
      ...(user.permisos.includes("view_alerta") ? [["alerts", "/security/portal/alertas/"]] : []),
      ...(user.permisos.includes("view_ordentrabajo") ? [["orders", "/security/portal/ordenes/"]] : []),
      ...(user.permisos.includes("view_notificacion") ? [["notifications", "/security/portal/notificaciones/"]] : []),
    ];
    Promise.allSettled(requests.map(([, path]) => api.get(path)))
      .then((results) => {
        if (!active) return;
        const setters = { installations: setInstallations, devices: setDevices, alerts: setAlerts, orders: setOrders, notifications: setNotifications };
        const failures = [];
        results.forEach((result, index) => {
          const [key] = requests[index];
          if (result.status === "fulfilled") setters[key](recordsFrom(result.value.data));
          else failures.push(errorText(result.reason));
        });
        if (failures.length) setError(failures[0]);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user.permisos]);
  const openAlerts = alerts.filter((alert) =>
    !["cerrada", "cerrado"].includes((alert.estado_display || "").toLowerCase()),
  );
  const openOrders = orders.filter((order) => !String(order.estado_display || "").toLowerCase().includes("cerrad"));
  const homeownerStats = [
    ["Instalaciones", installations.length],
    ...(user.permisos.includes("view_dispositivo") ? [["Dispositivos", devices.length]] : []),
    ...(user.permisos.includes("view_alerta") ? [["Avisos activos", openAlerts.length]] : []),
    ...(user.permisos.includes("view_ordentrabajo")
      ? [["Órdenes abiertas", openOrders.length]]
      : user.permisos.includes("view_notificacion") ? [["Notificaciones", notifications.length]] : []),
  ];
  return <>
    <div className="page-heading">
      <div>
        <span className="eyebrow">TU SISTEMA SOLAR</span>
        <h1>Mi vivienda</h1>
        <p>Consulta el estado de tu instalación, los equipos conectados, las mediciones y los avisos recientes.</p>
      </div>
      <span className="tag">PROPIETARIO / {user.username}</span>
    </div>
    {error && <p role="alert" className="notice">{error}</p>}
    <div className="stat-grid homeowner-stats">
      {homeownerStats.map(([label, value]) => <article key={label}><MapPin size={18} /><span>{label}</span><strong>{loading ? "—" : value}</strong><small>En tu vivienda</small></article>)}
    </div>
    <section className="owner-section">
      <div className="section-intro"><h2>Tu instalación</h2><span className="muted">Ubicación y estado</span></div>
      {loading ? <p className="empty">Cargando los datos de tu sistema…</p> : installations.length ? <div className="owner-card-grid">
        {installations.map((item) => <article className="feature owner-card" key={idOf(item)}>
          <Layers size={19} />
          <h3>{item.nombre}</h3>
          <p>{[item.direccion, item.barrio, item.ubicacion].filter(Boolean).join(" · ") || "Ubicación sin completar"}</p>
          <div className="owner-meta"><span>Capacidad</span><strong>{item.capacidad ?? "—"} kW</strong></div>
          <div className="owner-meta"><span>Estado</span><strong>{item.estado_instalacion_display || "Sin estado"}</strong></div>
          {item.latitud && item.longitud && <a className="owner-map-link" href={`https://www.openstreetmap.org/?mlat=${encodeURIComponent(item.latitud)}&mlon=${encodeURIComponent(item.longitud)}#map=16/${encodeURIComponent(item.latitud)}/${encodeURIComponent(item.longitud)}`} target="_blank" rel="noreferrer">Ver ubicación ↗</a>}
        </article>)}
      </div> : <p className="empty">Aún no hay una instalación vinculada a tu cuenta. Pide al administrador que te asigne como responsable de la vivienda.</p>}
    </section>
    {user.permisos.includes("view_dispositivo") && <section className="owner-section">
      <div className="section-intro"><h2>Mediciones del sistema</h2><span className="muted">Valores recientes y comparación con los rangos esperados</span></div>
      {!loading && devices.length ? <div className="owner-card-grid">
        {devices.map((device) => <article className="feature owner-card" key={idOf(device)}>
          <Radio size={19} />
          <h3>{device.codigo}</h3>
          <p>{device.modelo || "Dispositivo IoT"} · {device.instalacion_display || "Instalación vinculada"}</p>
          <small>Último contacto: {device.ultima_comunicacion ? new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(device.ultima_comunicacion)) : "Sin comunicación registrada"}</small>
          {(user.is_superuser || user.permisos.includes("ALL") || user.permisos.includes("view_medicion")) && <button className="secondary owner-action" onClick={() => setSelectedDevice(device)}>Ver mediciones e historial</button>}
        </article>)}
      </div> : !loading && <p className="empty">No hay dispositivos asociados a tu instalación todavía.</p>}
    </section>}
    {user.permisos.includes("view_ordentrabajo") && <section className="owner-section">
      <div className="section-intro"><h2>Mantenimiento de tu vivienda</h2><span className="muted">Órdenes abiertas</span></div>
      {loading ? <p className="empty">Cargando órdenes de trabajo…</p> : openOrders.length ? <div className="owner-card-grid">
        {openOrders.slice(0, 6).map((order) => <article className="feature owner-card" key={idOf(order)}>
          <Wrench size={19} />
          <h3>Orden #{idOf(order)}</h3>
          <p>{order.descripcion || "Visita de mantenimiento"}</p>
          <div className="owner-meta"><span>Estado</span><strong>{order.estado_display || "En seguimiento"}</strong></div>
          <div className="owner-meta"><span>Instalación</span><strong>{order.instalacion_display || order.instalacion_nombre || "Tu vivienda"}</strong></div>
          {order.instalacion_latitud != null && order.instalacion_longitud != null && <a className="owner-map-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${order.instalacion_latitud},${order.instalacion_longitud}`)}`} target="_blank" rel="noreferrer">Ver ubicación ↗</a>}
        </article>)}
      </div> : <p className="empty">No hay órdenes de mantenimiento abiertas para tu vivienda.</p>}
    </section>}
    {user.permisos.includes("view_alerta") && <section className="owner-section">
      <div className="section-intro"><h2>Avisos y novedades</h2><Link to="/alertas">Ver todas las alertas ↗</Link></div>
      {loading ? <p className="empty">Cargando avisos…</p> : alerts.length ? <div className="owner-alert-list">
        {alerts.slice(0, 8).map((alert) => <article className="owner-alert" key={idOf(alert)}>
          <Bell size={18} />
          <div><strong>{alert.tipo_alerta_display || alert.tipo_medicion_display || "Aviso del sistema"}</strong><p>{alert.mensaje}</p><small>{alert.instalacion_display || "Tu instalación"} · {alert.fecha_creacion ? new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(alert.fecha_creacion)) : "Fecha no disponible"}</small></div>
          <span className={`reading-state ${(alert.estado_display || "").toLowerCase().includes("cerr") ? "normal" : "fuera-de-rango"}`}>{alert.estado_display || "Revisar"}</span>
        </article>)}
      </div> : <p className="empty">No hay avisos registrados para tu sistema. Aquí aparecerán si una lectura requiere atención.</p>}
    </section>}
    {user.permisos.includes("view_notificacion") && <section className="owner-section">
      <div className="section-intro"><h2>Notificaciones</h2><Link to="/notificaciones">Abrir bandeja ↗</Link></div>
      {loading ? <p className="empty">Cargando notificaciones…</p> : notifications.length ? <div className="owner-card-grid">
        {notifications.slice(0, 4).map((notification) => <article className="feature owner-card notification-card" key={idOf(notification)}>
          <Bell size={19} />
          <h3>{notification.alerta_display || "Aviso de tu sistema"}</h3>
          <p>{notification.mensaje}</p>
          <div className="owner-meta"><span>Entrega</span><strong>{notification.estado || "Pendiente"}</strong></div>
          <small>{notification.canal || "Canal por confirmar"} · {readableDate(notification.fecha_envio || notification.fecha_creacion)}</small>
        </article>)}
      </div> : <p className="empty">No tienes notificaciones registradas.</p>}
    </section>}
    {selectedDevice && <DeviceComparison device={selectedDevice} onClose={() => setSelectedDevice(null)} />}
  </>;
}

function CommunityOverview({ user }) {
  const [data, setData] = useState({ communities: [], installations: [], devices: [], orders: [], alerts: [], notifications: [] });
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const canViewCommunity = user.permisos.includes("view_comunidad");
  const canViewInstallations = user.permisos.includes("view_instalacion");
  const canViewDevices = user.permisos.includes("view_dispositivo");
  const canViewOrders = user.permisos.includes("view_ordentrabajo");
  const canViewAlerts = user.permisos.includes("view_alerta");
  const canViewNotifications = user.permisos.includes("view_notificacion");
  useEffect(() => {
    let active = true;
    const resources = [
      ["communities", "comunidades", "view_comunidad"],
      ["installations", "instalaciones", "view_instalacion"],
      ["devices", "dispositivos", "view_dispositivo"],
      ["orders", "ordenes", "view_ordentrabajo"],
      ["alerts", "alertas", "view_alerta"],
      ["notifications", "notificaciones", "view_notificacion"],
    ].filter(([, , permission]) => user.permisos.includes(permission));
    Promise.allSettled(resources.map(([, name]) => api.get(`/security/portal/${name}/`)))
      .then((results) => {
        if (!active) return;
        const next = {};
        const failures = [];
        results.forEach((result, index) => {
          const [key] = resources[index];
          if (result.status === "fulfilled") next[key] = recordsFrom(result.value.data);
          else { next[key] = []; failures.push(errorText(result.reason)); }
        });
        setData((current) => ({ ...current, ...next }));
        if (failures.length) setError(failures[0]);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user.permisos]);
  const community = data.communities[0];
  const openOrders = data.orders.filter((order) => !String(order.estado_display || "").toLowerCase().includes("cerrad"));
  const openAlerts = data.alerts.filter((alert) => !["cerrada", "cerrado", "resuelta", "resuelto"].includes(String(alert.estado_display || "").toLowerCase()));
  const pendingDelivery = data.notifications.filter((notification) => ["pendiente", "error", "fallida"].includes(String(notification.estado || "").toLowerCase()));
  const pointUrl = community?.latitud != null && community?.longitud != null
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${community.latitud},${community.longitud}`)}`
    : null;
  const communityStats = [
    ["Instalaciones", data.installations.length, Layers],
    ...(canViewDevices ? [["Equipos", data.devices.length, Radio]] : []),
    ...(canViewAlerts ? [["Alertas activas", openAlerts.length, Bell]] : []),
    ...(canViewOrders ? [["Órdenes abiertas", openOrders.length, Wrench]] : []),
  ];
  return <>
    <div className="page-heading">
      <div><span className="eyebrow">TU TERRITORIO SOLAR</span><h1>Mi comunidad</h1><p>Instalaciones, alertas y trabajo técnico de tu comunidad, reunidos en un solo lugar.</p></div>
      <span className="tag">LÍDER COMUNITARIO / {user.username}</span>
    </div>
    {error && <p role="alert" className="notice">Algunos datos no se pudieron cargar. {error}</p>}
    {canViewCommunity && <section className="community-highlight">
      <div className="community-highlight-icon"><MapPin size={24} /></div>
      <div><span className="eyebrow">COMUNIDAD ASIGNADA</span><h2>{community?.nombre || (loading ? "Cargando comunidad…" : "Tu comunidad")}</h2><p>{[community?.sector, community?.municipio, community?.ubicacion].filter(Boolean).join(" · ") || "Ubicación comunitaria registrada en Ka’illisto"}</p></div>
      {pointUrl && <a className="button secondary" href={pointUrl} target="_blank" rel="noreferrer">Abrir mapa ↗</a>}
    </section>}
    <div className="stat-grid homeowner-stats community-stats">
      {communityStats.map(([label, value, Icon]) => <article key={label}><Icon size={18} /><span>{label}</span><strong>{loading ? "—" : value}</strong><small>En tu comunidad</small></article>)}
    </div>
    {canViewInstallations && <section className="owner-section">
      <div className="section-intro"><h2>Instalaciones de la zona</h2><span className="muted">Ubicación y estado</span></div>
      {loading ? <p className="empty">Cargando instalaciones…</p> : data.installations.length ? <div className="owner-card-grid">
        {data.installations.map((installation) => {
          const mapUrl = installation.latitud != null && installation.longitud != null
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${installation.latitud},${installation.longitud}`)}` : null;
          return <article className="feature owner-card" key={idOf(installation)}>
            <Layers size={19} /><h3>{installation.nombre || `Sistema #${idOf(installation)}`}</h3>
            <p>{[installation.direccion, installation.barrio, installation.ubicacion].filter(Boolean).join(" · ") || "Ubicación vinculada a la comunidad"}</p>
            <div className="owner-meta"><span>Capacidad</span><strong>{installation.capacidad ?? "—"} kW</strong></div>
            <div className="owner-meta"><span>Estado</span><strong>{installation.estado_instalacion_display || "Sin estado"}</strong></div>
            {mapUrl && <a className="owner-map-link" href={mapUrl} target="_blank" rel="noreferrer">Ver ubicación ↗</a>}
          </article>;
        })}
      </div> : <p className="empty">Todavía no hay instalaciones vinculadas a esta comunidad.</p>}
    </section>}
    {canViewDevices && <section className="owner-section">
      <div className="section-intro"><h2>Equipos solares</h2><span className="muted">Conexión y mediciones</span></div>
      {loading ? <p className="empty">Cargando equipos…</p> : data.devices.length ? <div className="owner-card-grid">
        {data.devices.map((device) => <article className="feature owner-card" key={idOf(device)}>
          <Radio size={19} /><h3>{device.codigo || `Equipo #${idOf(device)}`}</h3>
          <p>{device.modelo || "Dispositivo IoT"} · {device.instalacion_display || "Instalación comunitaria"}</p>
          <small>Último contacto: {readableDate(device.ultima_comunicacion)}</small>
          {(user.is_superuser || user.permisos.includes("ALL") || user.permisos.includes("view_medicion")) && <button className="secondary owner-action" onClick={() => setSelectedDevice(device)}>Ver mediciones e historial</button>}
        </article>)}
      </div> : <p className="empty">Todavía no hay equipos conectados a las instalaciones de la comunidad.</p>}
    </section>}
    {canViewOrders && <section className="owner-section">
      <div className="section-intro"><h2>Visitas y mantenimiento</h2><Link to="/tecnicos">Ver órdenes ↗</Link></div>
      {loading ? <p className="empty">Cargando órdenes…</p> : openOrders.length ? <div className="owner-card-grid">
        {openOrders.slice(0, 6).map((order) => {
          const mapUrl = order.instalacion_latitud != null && order.instalacion_longitud != null
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${order.instalacion_latitud},${order.instalacion_longitud}`)}` : null;
          return <article className="feature owner-card" key={idOf(order)}>
            <Wrench size={19} /><h3>{order.instalacion_display || order.instalacion_nombre || `Orden #${idOf(order)}`}</h3>
            <p>{order.descripcion || "Visita de mantenimiento"}</p>
            <div className="owner-meta"><span>Estado</span><strong>{order.estado_display || "En seguimiento"}</strong></div>
            <small>Registrada: {readableDate(order.fecha_creacion)}</small>
            {mapUrl && <a className="owner-map-link" href={mapUrl} target="_blank" rel="noreferrer">Abrir ubicación de la visita ↗</a>}
          </article>;
        })}
      </div> : <p className="empty">No hay visitas pendientes para las instalaciones de tu comunidad.</p>}
    </section>}
    <div className="community-feed-grid">
      {canViewAlerts && <section className="owner-section">
        <div className="section-intro"><h2>Alertas recientes</h2><Link to="/mi-alertas">Ver alertas ↗</Link></div>
        {loading ? <p className="empty">Cargando alertas…</p> : openAlerts.length ? <div className="owner-alert-list">
          {openAlerts.slice(0, 5).map((alert) => <article className="owner-alert" key={idOf(alert)}><Bell size={18} /><div><strong>{alert.tipo_alerta_display || alert.tipo_medicion_display || "Aviso del sistema"}</strong><p>{alert.mensaje}</p><small>{alert.instalacion_display || "Instalación comunitaria"} · {readableDate(alert.fecha_creacion)}</small></div><span className="reading-state fuera-de-rango">{alert.prioridad_display || alert.estado_display || "Revisar"}</span></article>)}
        </div> : <p className="empty">No hay alertas que requieran seguimiento.</p>}
      </section>}
      {canViewNotifications && <section className="owner-section">
        <div className="section-intro"><h2>Notificaciones</h2><Link to="/notificaciones">Abrir bandeja ↗</Link></div>
        {loading ? <p className="empty">Cargando notificaciones…</p> : data.notifications.length ? <div className="owner-card-grid">
          {data.notifications.slice(0, 4).map((notification) => <article className="feature owner-card notification-card" key={idOf(notification)}><Bell size={19} /><h3>{notification.alerta_display || "Aviso comunitario"}</h3><p>{notification.mensaje}</p><div className="owner-meta"><span>Entrega</span><strong>{notification.estado || "Pendiente"}</strong></div><small>{notification.canal || "Canal por confirmar"} · {readableDate(notification.fecha_envio || notification.fecha_creacion)}</small></article>)}
        </div> : <p className="empty">No hay notificaciones registradas.</p>}
        {!loading && pendingDelivery.length > 0 && <p className="notice community-delivery-note">{pendingDelivery.length} notificación{pendingDelivery.length === 1 ? "" : "es"} pendiente{pendingDelivery.length === 1 ? "" : "s"} de entrega.</p>}
      </section>}
    </div>
    {selectedDevice && <DeviceComparison device={selectedDevice} onClose={() => setSelectedDevice(null)} />}
  </>;
}

function TechnicianCases({ user }) {
  const [orders, setOrders] = useState([]);
  const [states, setStates] = useState([]);
  const [consumptions, setConsumptions] = useState([]);
  const [spareCatalog, setSpareCatalog] = useState([]);
  const [spareOrder, setSpareOrder] = useState(null);
  const [spareDraft, setSpareDraft] = useState({ repuesto: "", cantidad: "1" });
  const [spareLoading, setSpareLoading] = useState(false);
  const [spareSaving, setSpareSaving] = useState(false);
  const [spareError, setSpareError] = useState("");
  const [filter, setFilter] = useState("Todas");
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({ diagnostico: "", solucion_aplicada: "", estado: "" });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const canEdit = user.is_superuser || user.permisos.includes("change_ordentrabajo");
  const canClose = user.is_superuser || user.permisos.includes("close_ordentrabajo") || user.permisos.includes("ALL");
  const canViewParts = user.permisos.includes("view_repuestoordentrabajo");
  const canEditParts = canViewParts && (user.is_superuser || user.permisos.includes("add_repuestoordentrabajo") || user.permisos.includes("change_repuestoordentrabajo"));
  const normalize = (value) => String(value || "").trim().toLocaleLowerCase("es-CO");
  const stateName = (order) => normalize(order.estado_display);
  const isClosed = (order) => stateName(order).includes("cerrad");
  const isPending = (order) => stateName(order).includes("pendient");
  const isInProgress = (order) => stateName(order).includes("proceso") || stateName(order).includes("atenci");
  const load = useCallback(async () => {
    const [orderResult, stateResult, partsResult] = await Promise.allSettled([
      api.get(endpoint("ordenes")),
      api.get(endpoint("estados-orden")),
      canViewParts ? api.get(endpoint("consumos")) : Promise.resolve({ data: [] }),
    ]);
    if (orderResult.status === "fulfilled") {
      setOrders(orderResult.value.data);
      setError("");
    }
    else setError(errorText(orderResult.reason));
    if (stateResult.status === "fulfilled") setStates(stateResult.value.data);
    else setStates([]);
    if (partsResult?.status === "fulfilled") setConsumptions(recordsFrom(partsResult.value.data));
    else if (canViewParts) setConsumptions([]);
    setLoading(false);
  }, [canViewParts]);
  useEffect(() => { load(); }, [load]);
  const refresh = async () => {
    setRefreshing(true);
    try { await load(); }
    finally { setRefreshing(false); }
  };

  const counts = {
    Todas: orders.length,
    Pendientes: orders.filter(isPending).length,
    "En proceso": orders.filter(isInProgress).length,
    Cerradas: orders.filter(isClosed).length,
  };
  const filteredOrders = orders.filter((order) => {
    if (filter === "Pendientes") return isPending(order);
    if (filter === "En proceso") return isInProgress(order);
    if (filter === "Cerradas") return isClosed(order);
    return true;
  });
  const statusId = (name) => states.find((state) => normalize(state.nombre) === normalize(name))?.id_estado_orden_trabajo;
  const partsForOrder = (order) => consumptions.filter((item) => String(item.orden_trabajo) === String(idOf(order)));
  const openSpareForm = async (order) => {
    setSpareOrder(order);
    setSpareError("");
    const firstUsed = partsForOrder(order)[0];
    setSpareDraft({ repuesto: firstUsed ? String(firstUsed.repuesto) : "", cantidad: firstUsed?.cantidad || "1" });
    if (spareCatalog.length) return;
    setSpareLoading(true);
    try {
      const response = await api.get(endpoint("repuestos"));
      setSpareCatalog(recordsFrom(response.data).filter((part) => part.activo !== false));
    } catch (e) {
      setSpareError(errorText(e));
    } finally {
      setSpareLoading(false);
    }
  };
  const saveSpareUse = async (event) => {
    event.preventDefault();
    if (!spareOrder || !spareDraft.repuesto) return;
    setSpareSaving(true);
    setSpareError("");
    try {
      const existing = partsForOrder(spareOrder).find((part) => String(part.repuesto) === String(spareDraft.repuesto));
      const data = { orden_trabajo: idOf(spareOrder), repuesto: Number(spareDraft.repuesto), cantidad: spareDraft.cantidad };
      if (existing) await api.patch(`${endpoint("consumos")}${idOf(existing)}/`, data);
      else await api.post(endpoint("consumos"), data);
      setSaved(`${existing ? "Cantidad actualizada" : "Repuesto agregado"} en la orden #${idOf(spareOrder)}.`);
      setSpareOrder(null);
      await load();
    } catch (e) {
      setSpareError(errorText(e));
    } finally {
      setSpareSaving(false);
    }
  };
  const mapLink = (order) => {
    const lat = order.instalacion_latitud;
    const lon = order.instalacion_longitud;
    const destination = lat != null && lon != null
      ? `${lat},${lon}`
      : [order.instalacion_direccion, order.instalacion_barrio, order.instalacion_ubicacion, order.instalacion_comunidad_display, "Colombia"].filter(Boolean).join(", ");
    return destination ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}` : null;
  };
  const beginEditing = (order) => {
    setSaved("");
    setEditing(order);
    setDraft({
      diagnostico: order.diagnostico || "",
      solucion_aplicada: order.solucion_aplicada || "",
      estado: String(order.estado ?? ""),
    });
  };
  const changeState = async (order, nextState) => {
    const id = statusId(nextState);
    if (!id) {
      setError("No encontramos el estado requerido. Actualiza la página o pide al administrador que revise el catálogo de estados.");
      return;
    }
    setError("");
    try {
      await api.patch(`${endpoint("ordenes")}${idOf(order)}/`, { estado: id });
      setSaved(`Orden #${idOf(order)} actualizada.`);
      await load();
    } catch (e) { setError(errorText(e)); }
  };
  const saveProgress = async (event) => {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      const data = {
        diagnostico: draft.diagnostico,
        solucion_aplicada: draft.solucion_aplicada,
      };
      if (draft.estado && String(editing.estado) !== draft.estado) data.estado = draft.estado;
      await api.patch(`${endpoint("ordenes")}${idOf(editing)}/`, data);
      setEditing(null);
      setSaved(`Orden #${idOf(editing)} actualizada.`);
      await load();
    } catch (e) { setError(errorText(e)); }
    finally { setSaving(false); }
  };
  const statusChoices = states.filter((state) => {
    const name = normalize(state.nombre);
    return name.includes("pendient") || name.includes("proceso") || name.includes("atenci") || (canClose && name.includes("cerrad"));
  });

  return <>
    <div className="page-heading tech-page-heading">
      <div>
        <span className="eyebrow">TRABAJO DE CAMPO</span>
        <h1>Mi jornada</h1>
        <p>Órdenes asignadas, ubicación y avance de cada visita.</p>
      </div>
      <span className="tag">TÉCNICO / {user.username}</span>
    </div>
    {error && <p role="alert" className="notice">{error}</p>}
    {saved && <p role="status" className="tech-saved-message">{saved}</p>}
    <div className="tech-order-summary" aria-label="Resumen de órdenes">
      {[["Pendientes", counts.Pendientes], ["En proceso", counts["En proceso"]], ["Cerradas", counts.Cerradas]].map(([label, value]) => <article key={label}><span>{label}</span><strong>{loading ? "—" : value}</strong></article>)}
    </div>
    <div className="tech-order-toolbar" aria-label="Filtrar órdenes">
      <div className="tech-order-filters">
        {["Todas", "Pendientes", "En proceso", "Cerradas"].map((name) => <button key={name} type="button" aria-pressed={filter === name} className={filter === name ? "active" : ""} onClick={() => setFilter(name)}>{name}<span>{loading ? "—" : counts[name]}</span></button>)}
      </div>
      <button className="secondary tech-refresh" type="button" onClick={refresh} disabled={loading || refreshing}>{refreshing ? "Actualizando…" : "Actualizar"}</button>
    </div>
    {loading ? <p className="empty">Cargando las órdenes asignadas…</p> : filteredOrders.length ? <div className="tech-case-grid">
      {filteredOrders.map((order) => {
        const state = order.estado_display || "Estado pendiente";
        const closed = isClosed(order);
        const priority = order.alerta_prioridad_display || "Atención asignada";
        const priorityClass = normalize(priority).includes("alta") || normalize(priority).includes("crít") ? "high" : "";
        const address = [order.instalacion_direccion, order.instalacion_barrio, order.instalacion_ubicacion, order.instalacion_comunidad_display].filter(Boolean).join(" · ");
        const directions = mapLink(order);
        const orderParts = partsForOrder(order);
        return <article className="tech-case-card" key={idOf(order)}>
          <header className="tech-case-card-header">
            <span>ORDEN #{idOf(order)}</span>
            <span className={`tech-status-chip ${closed ? "closed" : isInProgress(order) ? "in-progress" : "pending"}`}>{state}</span>
          </header>
          <div className="tech-case-title-row"><div><small>INSTALACIÓN</small><h2>{order.instalacion_display || order.instalacion_nombre || `Instalación #${order.instalacion}`}</h2></div><span className={`tech-priority ${priorityClass}`}>{priority}</span></div>
          <p className="tech-case-description">{order.descripcion || order.alerta_display || "Visita de mantenimiento asignada."}</p>
          <div className="tech-case-location">
            <MapPin size={18} aria-hidden="true" />
            <div><strong>{address || "Ubicación por confirmar"}</strong>{order.instalacion_latitud != null && order.instalacion_longitud != null && <small>Coordenadas de la instalación: {order.instalacion_latitud}, {order.instalacion_longitud}</small>}</div>
            {directions && <a href={directions} target="_blank" rel="noreferrer">Cómo llegar ↗</a>}
          </div>
          {order.alerta_display && <div className="tech-case-alert"><Bell size={16} /><span>{order.alerta_display}</span></div>}
          <div className="tech-case-progress">
            <div><span>Diagnóstico</span><p>{order.diagnostico || "Pendiente de registrar"}</p></div>
            <div><span>Solución aplicada</span><p>{order.solucion_aplicada || "Pendiente de documentar"}</p></div>
          </div>
          {orderParts.length > 0 && <div className="tech-case-parts"><strong>Repuestos utilizados</strong><ul>{orderParts.map((part) => <li key={part.id_repuesto_orden_trabajo}><span>{part.repuesto_nombre || part.repuesto_display || `Repuesto #${part.repuesto}`}</span><b>{part.cantidad} {part.unidad_medida || "unidades"}</b></li>)}</ul></div>}
          <footer className="tech-case-actions">
            {canEdit && isPending(order) && statusId("En proceso") && <button className="primary" type="button" onClick={() => changeState(order, "En proceso")}>Iniciar atención <ArrowRight size={15} /></button>}
            {canEdit && !closed && <button className="secondary" type="button" onClick={() => beginEditing(order)}>Registrar avance</button>}
            {canEditParts && !closed && <button className="secondary" type="button" onClick={() => openSpareForm(order)}>Registrar repuesto</button>}
            {user.permisos.includes("view_repuestoordentrabajo") && <Link className="tech-parts-link" to="/consumos">Repuestos utilizados ↗</Link>}
          </footer>
        </article>;
      })}
    </div> : <div className="tech-empty-state"><Wrench size={30} /><h2>{orders.length ? "No hay órdenes en este filtro" : "Todavía no tienes visitas asignadas"}</h2><p>{orders.length ? "Elige otro estado para ver tus órdenes." : "Cuando te asignen un mantenimiento, aquí encontrarás la dirección, la ruta y el seguimiento de la intervención."}</p></div>}
    {editing && <div className="tech-edit-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null); }}>
      <section className="tech-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="tech-edit-title">
        <header><div><span className="eyebrow">ORDEN #{idOf(editing)}</span><h2 id="tech-edit-title">Registrar avance</h2></div><button className="icon-button" type="button" aria-label="Cerrar" onClick={() => setEditing(null)}><X size={18} /></button></header>
        <form onSubmit={saveProgress}>
          <label>Diagnóstico<textarea rows="3" value={draft.diagnostico} onChange={(event) => setDraft((value) => ({ ...value, diagnostico: event.target.value }))} placeholder="Describe qué encontraste en la instalación." /></label>
          <label>Solución aplicada<textarea rows="3" value={draft.solucion_aplicada} onChange={(event) => setDraft((value) => ({ ...value, solucion_aplicada: event.target.value }))} placeholder="Registra la reparación o acción realizada." /></label>
          {statusChoices.length > 0 && <label>Estado de la orden<select value={draft.estado} onChange={(event) => setDraft((value) => ({ ...value, estado: event.target.value }))}>{statusChoices.map((state) => <option key={state.id_estado_orden_trabajo} value={state.id_estado_orden_trabajo} disabled={normalize(state.nombre).includes("cerrad") && !canClose}>{state.nombre}</option>)}</select></label>}
          <p className="tech-edit-note">Guarda el diagnóstico y la solución para que la comunidad vea el seguimiento.</p>
          {error && <p role="alert" className="notice">{error}</p>}
          <footer><button className="secondary" type="button" onClick={() => setEditing(null)}>Cancelar</button><button className="primary" type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar avance"}</button></footer>
        </form>
      </section>
    </div>}
    {spareOrder && <div className="tech-edit-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSpareOrder(null); }}>
      <section className="tech-edit-dialog tech-parts-dialog" role="dialog" aria-modal="true" aria-labelledby="tech-parts-title">
        <header><div><span className="eyebrow">ORDEN #{idOf(spareOrder)}</span><h2 id="tech-parts-title">Registrar repuesto</h2></div><button className="icon-button" type="button" aria-label="Cerrar" onClick={() => setSpareOrder(null)}><X size={18} /></button></header>
        {spareLoading ? <p className="empty">Cargando catálogo de repuestos…</p> : spareError && !spareCatalog.length ? <div><p role="alert" className="notice">{spareError}</p><footer><button className="secondary" type="button" onClick={() => openSpareForm(spareOrder)}>Reintentar</button></footer></div> : <form onSubmit={saveSpareUse}>
          {(() => {
            const currentUse = partsForOrder(spareOrder).find((part) => String(part.repuesto) === String(spareDraft.repuesto));
            return spareCatalog.length ? <>
              <label>Repuesto<select required value={spareDraft.repuesto} onChange={(event) => {
                const existing = partsForOrder(spareOrder).find((part) => String(part.repuesto) === event.target.value);
                setSpareDraft({ repuesto: event.target.value, cantidad: existing?.cantidad || "1" });
              }}><option value="">Selecciona un repuesto</option>{spareCatalog.map((part) => <option key={part.id_repuesto} value={part.id_repuesto}>{part.nombre} · {part.unidad_medida || "unidad"}</option>)}</select></label>
              <label>Cantidad<input type="number" min="0.01" step="0.01" required value={spareDraft.cantidad} onChange={(event) => setSpareDraft((current) => ({ ...current, cantidad: event.target.value }))} /></label>
              <p className="tech-edit-note">{currentUse ? "Este repuesto ya figura en la orden; al guardar se actualizará la cantidad total." : "Se agregará al historial de esta orden y quedará visible para su seguimiento."}</p>
              {spareError && <p role="alert" className="notice">{spareError}</p>}
              <footer><button className="secondary" type="button" onClick={() => setSpareOrder(null)}>Cancelar</button><button className="primary" type="submit" disabled={spareSaving}>{spareSaving ? "Guardando…" : currentUse ? "Actualizar cantidad" : "Guardar repuesto"}</button></footer>
            </> : <><p className="tech-edit-note">No hay repuestos activos en el catálogo. Pide al administrador que agregue los materiales necesarios.</p>{spareError && <p role="alert" className="notice">{spareError}</p>}<footer><button className="secondary" type="button" onClick={() => setSpareOrder(null)}>Cerrar</button></footer></>;
          })()}
        </form>}
      </section>
    </div>}
  </>;
}

function ScrollablePersonalNav({ links, personalHome }) {
  const navRef = useRef(null);
  const [scroll, setScroll] = useState({ overflow: false, left: false, right: false });
  useEffect(() => {
    const element = navRef.current;
    if (!element) return undefined;
    const update = () => {
      setScroll({
        overflow: element.scrollWidth > element.clientWidth + 2,
        left: element.scrollLeft > 2,
        right: element.scrollLeft + element.clientWidth < element.scrollWidth - 2,
      });
    };
    update();
    element.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(element);
    return () => {
      element.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      observer?.disconnect();
    };
  }, [links.length]);
  const shift = (direction) => navRef.current?.scrollBy({ left: direction * 220, behavior: "smooth" });
  return <div className={`personal-space-nav-shell${scroll.overflow ? " has-overflow" : ""}`}>
    {scroll.left && <button type="button" className="personal-nav-scroll previous" aria-label="Desplazar navegación a la izquierda" onClick={() => shift(-1)}><CaretDown size={15} /></button>}
    <nav ref={navRef} className="personal-space-nav" aria-label="Navegación de mi espacio" tabIndex={0}>
      {links.map(([path, label, Icon]) => <NavLink key={path} to={path} end={path === personalHome} title={label}><Icon size={16} /><span>{label}</span></NavLink>)}
    </nav>
    {scroll.right && <button type="button" className="personal-nav-scroll next" aria-label="Desplazar navegación a la derecha" onClick={() => shift(1)}><CaretDown size={15} /></button>}
  </div>;
}

const PERSONAL_SUMMARY_RESOURCES = {
  "Líder Comunitario": new Set(["comunidad", "instalacion", "dispositivo", "alerta", "ordentrabajo"]),
  "Propietario Solar": new Set(["comunidad", "instalacion", "dispositivo", "umbral", "alerta", "ordentrabajo"]),
  "Técnico de Campo": new Set(["comunidad", "instalacion", "dispositivo", "umbral", "alerta", "ordentrabajo", "repuesto", "repuestoordentrabajo"]),
};
const PERSONAL_WORKFLOW_NAV_HIDDEN = {
  "Líder Comunitario": new Set(["/mi-alertas", "/tecnicos"]),
};
const PERSONAL_LOOKUP_RESOURCES = new Set(["estadoinstalacion", "estadoordentrabajo", "tipomedicion", "estadoalerta", "prioridadalerta", "tipoalerta"]);

function Workspace({ user: accountUser, onLogout, onProfileUpdated, mode, onModeChange, personalAccess = { permissions: [], resources: [] }, onLoadPersonalAccess }) {
  const adminMode = mode === "admin" && canUseAdminWorkspace(accountUser);
  const personalMode = !adminMode;
  const personalPermissions = personalAccess?.permissions || [];
  const personalResources = personalAccess?.resources || [];
  const scopedPersonalPermissions = personalPermissions.filter((permission) =>
    personalResources.some((resource) => resource.model === permission.replace(/^view_/, "")) ||
    PERSONAL_LOOKUP_RESOURCES.has(permission.replace(/^view_/, "")),
  );
  const user = personalMode ? {
    ...accountUser,
    roles: (accountUser.roles || []).filter((role) => role !== "Administrador"),
    permisos: scopedPersonalPermissions,
    is_superuser: false,
    admin: false,
    full_resource_access: false,
  } : accountUser;
  const themeKey = adminMode ? "kaillisto-admin-theme" : "kaillisto-personal-theme";
  const initialTheme = () => localStorage.getItem(themeKey) || (adminMode ? localStorage.getItem("kaillisto-theme") || "dark" : "light");
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [resourceNav, setResourceNav] = useState([]);
  const [themeState, setThemeState] = useState(() => ({ key: themeKey, value: initialTheme() }));
  const [motionEnabled, setMotionEnabled] = useState(() => localStorage.getItem("kaillisto-motion") !== "off");
  const [openGroups, setOpenGroups] = useState(() => new Set(["home", "security", "energy", "operations"]));
  const loc = useLocation();
  const navigate = useNavigate();
  const theme = themeState.key === themeKey ? themeState.value : initialTheme();
  const personalHome = personalDestination(user, scopedPersonalPermissions, personalResources);
  const toggleTheme = () => setThemeState((current) => {
    const nextTheme = (current.key === themeKey ? current.value : theme) === "dark" ? "light" : "dark";
    localStorage.setItem(themeKey, nextTheme);
    localStorage.setItem("kaillisto-theme", nextTheme);
    return { key: themeKey, value: nextTheme };
  });
  useEffect(() => {
    if (!adminMode) return undefined;
    let active = true;
    const refresh = () => api.get("/security/navigation/").then(({ data }) => { if (active) setResourceNav(data); }).catch(() => {});
    refresh();
    const onPermissions = () => refresh();
    window.addEventListener("kaillisto:permissions", onPermissions);
    return () => { active = false; window.removeEventListener("kaillisto:permissions", onPermissions); };
  }, [adminMode, user.id]);
  useEffect(() => { setOpen(false); setMoreOpen(false); }, [loc.pathname]);
  useEffect(() => { localStorage.setItem("kaillisto-motion", motionEnabled ? "on" : "off"); }, [motionEnabled]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);
  const tech = personalMode && user.roles.includes("Técnico de Campo");
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
    "/mi-vivienda": "view_instalacion",
    "/tecnicos": "view_ordentrabajo",
    "/mi-alertas": "view_alerta",
  };
  const canAccessPersonalPermission = (permission) => personalMode &&
    user.permisos.includes(permission) &&
    personalResources.some((resource) => resource.model === permission.replace(/^view_/, ""));
  const canOpen = (path) => {
    if (adminMode) {
      return accountUser.is_superuser || (path === "/catalogos"
        ? catalogs.some((kind) => accountUser.permisos.includes(catalogPermissions[kind]))
        : !routePermissions[path] || accountUser.permisos.includes(routePermissions[path]));
    }
    const permission = routePermissions[path];
    return !permission || canAccessPersonalPermission(permission);
  };
  const baseLinks = [[adminMode ? "/dashboard" : personalHome, adminMode ? "Resumen" : "Inicio", LayoutDashboard]];
  const iconForResource = (name) => ({
    "map-pin": MapPin, communities: MapPin, comunidad: MapPin,
    radio: Radio, broadcast: Radio, dispositivo: Radio,
    bell: Bell, alert: Bell, notificacion: Bell,
    wrench: Wrench, tool: Wrench, orden: Wrench,
    package: Package, box: Package,
    shield: Shield, users: Users, sliders: SlidersHorizontal,
    "chart-line": ChartLine,
    clipboard: ClipboardText,
    layers: Layers, stack: Layers,
  }[String(name || "").toLowerCase()] || Layers);
  const availableResources = adminMode ? resourceNav : personalResources;
  const dynamicLinks = availableResources.map((resource) => [
    resource.menu_path, resource.name, iconForResource(resource.menu_icon), resource,
  ]);
  const workflowLinks = [];
  const baseRoutes = {};
  const addWorkflow = (path, label, Icon, kind, title, readonly = true) => {
    workflowLinks.push([path, label, Icon]);
    baseRoutes[path] = [kind, title, readonly];
  };
  if (personalMode && tech) {
    if (canAccessPersonalPermission("view_ordentrabajo")) addWorkflow("/mis-casos", "Mis casos asignados", Wrench, "technician-cases", "Mis casos asignados", false);
    if (canAccessPersonalPermission("view_instalacion")) addWorkflow("/ficha-tecnica", "Fichas técnicas", Layers, "instalaciones", "Fichas técnicas", true);
    if (user.permisos.includes("view_repuesto")) addWorkflow("/repuestos", "Catálogo de repuestos", Package, "repuestos", "Catálogo de repuestos", false);
    if (canAccessPersonalPermission("view_repuestoordentrabajo")) addWorkflow("/consumos", "Repuestos utilizados", Package, "consumos", "Repuestos utilizados", true);
  }
  if (personalMode && user.roles.includes("Líder Comunitario")) {
    if (canAccessPersonalPermission("view_instalacion")) addWorkflow("/mi-comunidad", "Mi comunidad", MapPin, "community-overview", "Mi comunidad", true);
    if (canAccessPersonalPermission("view_alerta")) addWorkflow("/mi-alertas", "Alertas de mi zona", Bell, "alertas", "Alertas de mi zona", true);
    if (canAccessPersonalPermission("view_ordentrabajo")) addWorkflow("/tecnicos", "Técnicos asignados", Wrench, "ordenes", "Técnicos asignados", true);
  }
  if (personalMode && user.roles.includes("Propietario Solar") && canAccessPersonalPermission("view_instalacion")) {
    addWorkflow("/mi-vivienda", "Mi vivienda", MapPin, "homeowner", "Mi vivienda", true);
  }
  if (adminMode) {
    addWorkflow("/solicitudes-revision", "Solicitudes de ingreso", ClipboardText, "service-request-review", "Solicitudes de vinculación", false);
  }
  const personalQuickLinks = personalMode ? [
    ...(canAccessPersonalPermission("view_notificacion") ? [["/notificaciones", "Notificaciones", Bell]] : []),
    ["/solicitud-vinculacion", "Solicitar servicio", MapPin],
  ] : [];
  const staticLinks = [...baseLinks, ...workflowLinks, ...personalQuickLinks, ["/perfil", "Mi perfil", UserCircle]];
  const seenPaths = new Set();
  const links = [...staticLinks, ...dynamicLinks].filter(([path]) => {
    if (seenPaths.has(path)) return false;
    seenPaths.add(path);
    return true;
  });
  const summaryResourceModels = new Set([
    ...PERSONAL_LOOKUP_RESOURCES,
    ...user.roles.flatMap((role) => [...(PERSONAL_SUMMARY_RESOURCES[role] || [])]),
  ]);
  const staticPaths = new Set(staticLinks.map(([path]) => path));
  const personalExtraLinks = personalMode
    ? dynamicLinks.filter((link) => !summaryResourceModels.has(link[3].model) && !PERSONAL_LOOKUP_RESOURCES.has(link[3].model) && !staticPaths.has(link[0]))
    : [];
  const primaryDynamicLinks = personalMode ? personalExtraLinks.slice(0, 4) : dynamicLinks;
  const moreLinks = personalMode ? personalExtraLinks.slice(4) : [];
  const personalNavPaths = new Set();
  const hiddenWorkflowPaths = new Set(user.roles.flatMap((role) => [...(PERSONAL_WORKFLOW_NAV_HIDDEN[role] || [])]));
  const personalNavLinks = [...staticLinks, ...primaryDynamicLinks].filter(([path]) => {
    if (hiddenWorkflowPaths.has(path)) return false;
    if (personalNavPaths.has(path)) return false;
    personalNavPaths.add(path);
    return true;
  });
  const routes = {
    ...baseRoutes,
  };
  const groups = [{ id: "home", label: "Espacio de trabajo", Icon: LayoutDashboard, paths: ["/dashboard", ...workflowLinks.map(([path]) => path)] }]
    .map((group) => ({ ...group, items: links.filter(([path]) => group.paths.includes(path)) }))
    .filter((group) => group.items.length);
  const dynamicGroups = [...new Set(dynamicLinks.map(([, , , resource]) => resource.menu_group || "Recursos"))]
    .map((label) => ({
      id: `resource-${label}`,
      label,
      Icon: iconForResource(label),
      items: dynamicLinks.filter(([, , , resource]) => (resource.menu_group || "Recursos") === label),
    }));
  if (adminMode) groups.push(...dynamicGroups);
  const switchMode = async (nextMode) => {
    let access = { permissions: personalPermissions, resources: personalResources };
    if (nextMode === "personal" && onLoadPersonalAccess) {
      try { access = await onLoadPersonalAccess(); }
      catch { access = { permissions: [], resources: [] }; }
    }
    const target = nextMode === "admin" ? "/dashboard" : personalDestination(accountUser, access.permissions, access.resources);
    onModeChange(nextMode, nextMode === "personal" ? access : null);
    navigate(target);
  };
  return (
    <div className={`workspace${personalMode ? " user-space" : ""}`} data-theme={theme} data-motion={motionEnabled ? "on" : "off"}>
      {!personalMode && <aside className={open ? "sidebar open" : "sidebar"}>
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
      </aside>}
      {!personalMode && open && <button className="sidebar-scrim" aria-label="Cerrar menú de navegación" onClick={() => setOpen(false)} />}
      <div className={`workspace-body${personalMode ? " user-space-body" : ""}`}>
        <header className={`workspace-header${personalMode ? " user-space-header" : ""}`}>
          {personalMode ? <>
            <Brand />
            <div className="personal-space-navigation">
              <ScrollablePersonalNav links={personalNavLinks} personalHome={personalHome} />
              {moreLinks.length > 0 && <div className="personal-resource-overflow">
                <button type="button" aria-haspopup="menu" aria-expanded={moreOpen} onClick={() => setMoreOpen((value) => !value)}>Más recursos <CaretDown size={14} /></button>
                {moreOpen && <div className="personal-resource-menu" role="menu" aria-label="Más recursos de mi espacio">
                  {moreLinks.map(([path, label, Icon]) => <NavLink key={path} role="menuitem" to={path}><Icon size={16} /><span>{label}</span></NavLink>)}
                </div>}
              </div>}
            </div>
            <div className="header-actions personal-space-actions">
              <InstallAppButton />
              <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"} title={theme === "dark" ? "Tema claro" : "Tema oscuro"}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}<span>{theme === "dark" ? "Claro" : "Oscuro"}</span></button>
              {canUseAdminWorkspace(accountUser) && <button className="personal-space-switch" type="button" onClick={() => switchMode("admin")}><Shield size={15} /> Administración</button>}
              <Link className="user-space-account" to="/perfil" aria-label="Mi perfil"><span className="avatar">{user.username.slice(0, 2).toUpperCase()}</span></Link>
              <button className="user-space-logout" type="button" onClick={onLogout} aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut size={17} /></button>
            </div>
          </> : <>
            <button
              className="mobile-menu icon-button"
              aria-label={open ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              <Menu />
            </button>
            <span>Ka’illisto <span className="muted">/ Administración</span></span>
            <div className="header-actions">
              {canUseAdminWorkspace(user) && <button className="theme-toggle" type="button" onClick={() => switchMode("personal")}>Mi espacio</button>}
              <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"} title={theme === "dark" ? "Tema claro" : "Tema oscuro"}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}<span>{theme === "dark" ? "Claro" : "Oscuro"}</span></button>
              <button className="theme-toggle motion-toggle" type="button" onClick={() => setMotionEnabled((value) => !value)} aria-pressed={motionEnabled} title={motionEnabled ? "Desactivar animaciones" : "Activar animaciones"}><span>{motionEnabled ? "Animaciones: sí" : "Animaciones: no"}</span></button><span className="tag">GESTIÓN SOLAR</span>
            </div>
          </>}
        </header>
        <main className={`workspace-main${personalMode ? " user-space-main" : ""}`}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                personalMode && personalHome !== "/dashboard" ? (
                  <Navigate to={personalHome} replace />
                ) : links.length ? (
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
                    ) : kind === "homeowner" ? (
                      <HomeownerOverview user={user} />
                    ) : kind === "community-overview" ? (
                      <CommunityOverview user={user} />
                    ) : kind === "technician-cases" ? (
                      <TechnicianCases user={user} />
                    ) : kind === "service-request-review" ? (
                      <ServiceRequestReview />
                    ) : (
                      <Records
                        key={kind}
                        kind={kind}
                        user={user}
                        title={title}
                        readonly={readonly}
                        personalView={personalMode}
                      />
                    )
                  }
                />
              ))}
            {availableResources.filter((resource) => canOpen(resource.menu_path)).map((resource) => {
              const page = modelPage(resource.model);
              return page ? <Route key={`resource-${resource.id}`} path={resource.menu_path} element={page.kind === "roles" ? <RoleMatrix user={user} /> : page.kind === "audit" ? <SecurityAudit /> : <Records kind={page.kind} user={user} title={resource.name} endpointOverride={resource.endpoint} modelName={resource.model} personalView={personalMode} />} /> : null;
            })}
            {adminMode && canOpen("/catalogos") && (
              <Route path="/catalogos" element={<Catalogs user={user} />} />
            )}
            <Route path="/perfil" element={<ProfileSettings onProfileUpdated={onProfileUpdated} />} />
            <Route path="/solicitud-vinculacion" element={<ServiceRequestPortal user={user} />} />
            <Route path="*" element={<Navigate to={adminMode ? "/dashboard" : personalHome} replace />} />
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
    "auth.login": "Inicio de sesión",
    "auth.login_failed": "Intento de inicio de sesión rechazado",
    "auth.logout": "Cierre de sesión",
    "record.created": "Registro creado",
    "record.updated": "Registro actualizado",
    "record.deleted": "Registro eliminado",
    "security.audit_view": "Consulta de bitácora",
    "security.audit_export": "Exportación de bitácora",
  };
  const fieldNames = {
    nombre: "Nombre", username: "Usuario", email: "Correo", first_name: "Nombre", last_name: "Apellido",
    ubicacion: "Ubicación", municipio: "Municipio", sector: "Sector", referencia: "Referencia",
    direccion: "Dirección", barrio: "Barrio", descripcion: "Descripción", capacidad: "Capacidad solar",
    fecha_instalacion: "Fecha de instalación", latitud: "Latitud", longitud: "Longitud", tipo: "Tipo",
    comunidad_id: "Comunidad", responsable_id: "Responsable", estado_instalacion_id: "Estado de instalación",
    codigo: "Código", modelo: "Modelo", activo: "Activo", instalacion_id: "Instalación", valor: "Valor",
    es_anomala: "Lectura anómala", tipo_medicion_id: "Tipo de medición", estado_id: "Estado", prioridad_id: "Prioridad",
    mensaje: "Mensaje", fecha_inicio: "Fecha de inicio", fecha_fin: "Fecha de cierre", tecnico_id: "Técnico",
    diagnostico: "Diagnóstico", solucion_aplicada: "Solución aplicada", cantidad: "Cantidad",
  };
  const displayValue = (value) => value == null ? "Sin valor" : typeof value === "boolean" ? (value ? "Sí" : "No") : typeof value === "object" ? JSON.stringify(value) : String(value);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">SEGURIDAD / TRAZABILIDAD</span>
          <h1>Auditoría de seguridad</h1>
          <p>Últimos 200 eventos. La exportación incluye el historial completo.</p>
        </div>
        <div className="actions"><a className="button" href="/api/security/audit/export/">Exportar Excel</a></div>
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
                  <td><strong>{event.target_label || event.target_type}</strong><small>{event.target_type} · #{event.target_id}</small></td>
                  <td><details className="audit-details"><summary>Ver cambios detallados</summary><div className="audit-detail-body">
                    {(() => {
                      const changes = event.changes || {};
                      const fields = changes.campos || (() => {
                        const before = changes.before || {};
                        const after = changes.after || {};
                        const names = new Set([...Object.keys(before), ...Object.keys(after)]);
                        const diff = Object.fromEntries([...names].filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key])).map((key) => [key, { antes: before[key] ?? null, despues: after[key] ?? null }]));
                        if (Object.keys(diff).length) return diff;
                        return Object.fromEntries(Object.entries(changes).filter(([key]) => !["solicitud", "metodo", "estado_http"].includes(key)).map(([key, value]) => [key, { antes: null, despues: value }]));
                      })();
                      return Object.keys(fields).length > 0 && <ul>{Object.entries(fields).map(([field, values]) => <li key={field}><strong>{fieldNames[field] || nice(field.replace(/_id$/, ""))}</strong><span>{displayValue(values.antes)} <b aria-hidden="true">→</b> {displayValue(values.despues)}</span></li>)}</ul>;
                    })()}
                    {event.changes?.solicitud && <small>Solicitud: {event.changes.solicitud.metodo} {event.changes.solicitud.ruta}</small>}
                    {event.changes?.metodo && <small>{event.changes.metodo} · HTTP {event.changes.estado_http}</small>}
                    {event.reason && <small>Resultado: {event.reason}</small>}
                  </div></details></td>
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
    [error, setError] = useState(""),
    [loginDestination, setLoginDestination] = useState("/dashboard");
  const [workspaceMode, setWorkspaceMode] = useState(() => {
    const savedMode = sessionStorage.getItem("kaillisto-workspace-mode");
    if (savedMode === "admin" || savedMode === "personal") return savedMode;
    return ["/dashboard", "/usuarios", "/roles", "/catalogos", "/solicitudes-revision"].includes(window.location.pathname) ? "admin" : "personal";
  });
  const [personalAccess, setPersonalAccess] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem("kaillisto-personal-access") || "null");
      if (Array.isArray(saved?.permissions) && Array.isArray(saved?.resources)) return saved;
    } catch {}
    return { permissions: [], resources: [] };
  });
  const loc = useLocation(),
    navigate = useNavigate();
  const savePersonalAccess = useCallback((data) => {
    const normalized = {
      permissions: Array.isArray(data?.permissions) ? data.permissions : [],
      resources: Array.isArray(data?.resources) ? data.resources : [],
    };
    sessionStorage.setItem("kaillisto-personal-access", JSON.stringify(normalized));
    setPersonalAccess(normalized);
    return normalized;
  }, []);
  const loadPersonalAccess = useCallback(async () => {
    const { data } = await api.get("/security/navigation/?workspace=personal");
    return savePersonalAccess(data);
  }, [savePersonalAccess]);
  const clearPersonalAccess = useCallback(() => {
    sessionStorage.removeItem("kaillisto-personal-access");
    setPersonalAccess({ permissions: [], resources: [] });
  }, []);
  const changeWorkspaceMode = (mode, access = null) => {
    const safeMode = mode === "admin" ? "admin" : "personal";
    if (access) savePersonalAccess(access);
    sessionStorage.setItem("kaillisto-workspace-mode", safeMode);
    setWorkspaceMode(safeMode);
  };
  const refresh = useCallback(async () => {
    const r = await api.get("/security/session/");
    if (workspaceMode === "personal") {
      try { await loadPersonalAccess(); }
      catch { savePersonalAccess({ permissions: [], resources: [] }); }
    }
    setUser(r.data);
    return r.data;
  }, [loadPersonalAccess, savePersonalAccess, workspaceMode]);
  useEffect(() => {
    if (["/", "/login", "/registro"].includes(loc.pathname)) {
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
    if (!user || ["/", "/login", "/registro"].includes(loc.pathname)) return;

    const update = () => refresh().catch(() => setUser(null));
    const onStorage = (event) => {
      if (event.key === "kaillisto:permissions-updated") update();
    };
    let channel;
    if ("BroadcastChannel" in window) {
      channel = new BroadcastChannel("kaillisto:permissions");
      channel.addEventListener("message", update);
    }
    window.addEventListener("kaillisto:permissions", update);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("kaillisto:permissions", update);
      window.removeEventListener("storage", onStorage);
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
          destination={user ? (workspaceMode === "admin" && canUseAdminWorkspace(user) ? "/dashboard" : personalDestination(user, personalAccess.permissions, personalAccess.resources)) : loginDestination}
          onLogin={async (space) => {
            const { data: authenticatedUser } = await api.get("/security/session/");
            const adminUnavailable = space === "admin" && !canUseAdminWorkspace(authenticatedUser);
            const resolvedMode = space === "admin" && !adminUnavailable ? "admin" : "personal";
            let access = personalAccess;
            if (resolvedMode === "personal") {
              try { access = await loadPersonalAccess(); }
              catch { access = savePersonalAccess({ permissions: [], resources: [] }); }
            }
            const target = resolvedMode === "admin" ? "/dashboard" : personalDestination(authenticatedUser, access.permissions, access.resources);
            setError(adminUnavailable ? "Esta cuenta no tiene acceso administrativo. Abrimos tu espacio personal." : "");
            changeWorkspaceMode(resolvedMode, access);
            setLoginDestination(target);
            setUser(authenticatedUser);
            navigate(target);
          }}
        />
      ) : loc.pathname === "/registro" ? (
        <AccountRegistration />
      ) : user ? (
        <Workspace
          user={user}
          onProfileUpdated={refresh}
          onLogout={async () => {
            try {
              await api.post("/cerrar_sesion/");
              setUser(null);
              clearPersonalAccess();
              changeWorkspaceMode("personal");
              navigate("/login");
            } catch (e) {
              setError(errorText(e));
            }
          }}
          mode={workspaceMode}
          onModeChange={changeWorkspaceMode}
          personalAccess={personalAccess}
          onLoadPersonalAccess={loadPersonalAccess}
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
