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
import "leaflet/dist/leaflet.css";
import api from "./api/axios";
import { mostImportantAlertsFirst } from "./utils/alerts";
import { getOwnerSystemStatus } from "./utils/portalInsights";
import {
  canEnterWorkspace,
  getPrimaryWorkspace,
  resolveLoginWorkspace,
  workspaceBase,
  workspaceForPath,
  workspaceRoute,
} from "./utils/workspaces";

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
  const experiences = [
    {
      icon: Radio,
      number: "01",
      title: "Monitoreamos",
      description: "Equipos y mediciones en un solo vistazo.",
    },
    {
      icon: Wrench,
      number: "02",
      title: "Cuidamos",
      description: "Avisos claros y mantenimiento con seguimiento.",
    },
    {
      icon: Users,
      number: "03",
      title: "Conectamos",
      description: "Hogares, técnicos y comunidades solares.",
    },
  ];
  return (
    <div className="public-landing">
      <header className="public-nav public-nav--solar">
        <Brand />
        <nav aria-label="Navegación principal">
          <a href="#que-hacemos">Qué hacemos</a>
          <a href="#accesos">Espacios</a>
        </nav>
        <Link className="button public-nav-login" to="/login?area=portal">
          Entrar <ArrowUpRight size={15} />
        </Link>
      </header>
      <main className="public-main">
        <section className="public-hero" aria-labelledby="public-title">
          <div className="public-hero-copy">
            <span className="public-kicker"><span /> ENERGÍA SOLAR · LA GUAJIRA</span>
            <h1 id="public-title">Energía limpia,<br /><em>más cerca de todos.</em></h1>
            <p>Conectamos hogares y comunidades con energía solar que podemos cuidar juntos.</p>
            <div className="public-hero-actions">
              <a className="button primary public-primary" href="#accesos">Encuentra tu espacio <ArrowRight size={16} /></a>
              <a className="public-text-link" href="#que-hacemos">Conoce Ka’illisto <ArrowUpRight size={14} /></a>
            </div>
          </div>
          <figure className="public-hero-visual">
            <img src="/solar-guajira-dawn.webp" alt="Vivienda con paneles solares al amanecer en La Guajira" fetchPriority="high" />
            <figcaption className="public-photo-label"><Sun size={17} /><span>Sol para el territorio</span><span>CO · GUAJIRA</span></figcaption>
            <span className="public-image-index" aria-hidden="true">K / 01</span>
          </figure>
        </section>
        <section className="public-section public-work" id="que-hacemos" aria-labelledby="what-title">
          <div className="public-section-heading">
            <span className="public-kicker">QUÉ HACEMOS</span>
            <h2 id="what-title">Energía solar,<br /><em>bien acompañada.</em></h2>
          </div>
          <div className="public-service-grid">
            {experiences.map(({ icon: Icon, number, title, description }) => (
              <article className="public-service-card" key={number}>
                <div className="public-card-top"><span>{number}</span><Icon size={21} /></div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="public-section public-access" id="accesos" aria-labelledby="access-title">
          <div className="public-section-heading">
            <span className="public-kicker">ACCESO A K A ’ I L L I S T O</span>
            <h2 id="access-title">¿A dónde<br /><em>quieres ir?</em></h2>
          </div>
          <div className="public-access-grid">
            <Link className="public-access-card" to="/login?area=portal">
              <span className="public-access-icon"><Users size={21} /></span>
              <span className="public-kicker">HOGARES · COMUNIDADES · CAMPO</span>
              <strong>Espacio de usuarios</strong>
              <span className="public-access-desc">Consulta tu sistema, tus avisos y tus tareas.</span>
              <span className="public-access-link">Entrar al portal <ArrowRight size={17} /></span>
            </Link>
            <Link className="public-access-card public-access-admin" to="/login?area=admin">
              <span className="public-access-icon"><Shield size={21} /></span>
              <span className="public-kicker">OPERACIÓN · CONFIGURACIÓN</span>
              <strong>Panel administrativo</strong>
              <span className="public-access-desc">Gestiona instalaciones, usuarios y operación.</span>
              <span className="public-access-link">Entrar a administración <ArrowRight size={17} /></span>
            </Link>
          </div>
        </section>
      </main>
      <footer className="public-footer">
        <Brand />
        <span>Gestión solar para hogares y comunidades · La Guajira, Colombia.</span>
        <a href="#public-title">Volver arriba ↑</a>
      </footer>
    </div>
  );
}
function Login({ onLogin, user }) {
  const location = useLocation();
  const initialChoice = new URLSearchParams(location.search).get("area") === "admin" ? "admin" : "portal";
  const [workspaceChoice, setWorkspaceChoice] = useState(initialChoice);
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
  if (user) return <Navigate to={workspaceBase(resolveLoginWorkspace(user, workspaceChoice) || getPrimaryWorkspace(user))} replace />;
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
        <div className="login-content">
          <span className="public-kicker">ELIGE TU ESPACIO</span>
          <h2>Tu energía,<br /><em>tu espacio.</em></h2>
          <div className="login-choice-grid" role="group" aria-label="Elige el espacio al que quieres entrar">
            <button className={`login-choice${workspaceChoice === "portal" ? " selected" : ""}`} type="button" aria-pressed={workspaceChoice === "portal"} onClick={() => { setWorkspaceChoice("portal"); setError(""); }}>
              <Users size={19} /><span><strong>Usuarios</strong><small>Hogares, comunidades y campo</small></span>
            </button>
            <button className={`login-choice${workspaceChoice === "admin" ? " selected" : ""}`} type="button" aria-pressed={workspaceChoice === "admin"} onClick={() => { setWorkspaceChoice("admin"); setError(""); }}>
              <Shield size={19} /><span><strong>Administración</strong><small>Gestión de la plataforma</small></span>
            </button>
          </div>
          <p className="login-selected-space">Acceso seleccionado: <strong>{workspaceChoice === "admin" ? "Panel administrativo" : "Espacio de usuarios"}</strong></p>
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
                const loginError = await onLogin(workspaceChoice);
                if (loginError) {
                  setError(loginError);
                  refreshChallenge();
                }
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
              {busy ? "Ingresando…" : workspaceChoice === "admin" ? "Entrar a administración" : "Entrar al portal"}
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
  const technicianLimited =
    user.roles.includes("Técnico de Campo") &&
    !user.admin &&
    !user.full_resource_access &&
    !user.is_superuser;
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
                  {choices[k].filter((choice) => {
                    if (kind !== "ordenes" || k !== "estado" || !technicianLimited) return true;
                    const stateName = labelOf(choice).toLocaleLowerCase("es-CO");
                    const currentState = Number(idOf(choice)) === Number(data[k]);
                    if (currentState) return true;
                    const currentName = labelOf(choices[k].find((item) => Number(idOf(item)) === Number(data[k])) || {}).toLocaleLowerCase("es-CO");
                    if (["cerrada", "cancelada"].includes(currentName)) return false;
                    if (stateName === "pendiente") return currentName === "pendiente";
                    if (stateName === "en proceso") return ["pendiente", "en proceso"].includes(currentName);
                    return stateName === "cerrada" && ["pendiente", "en proceso"].includes(currentName) && user.permisos.includes("close_ordentrabajo");
                  }).map((r) => (
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
function Records({ kind, user, title, readonly = false, endpointOverride, modelName, workspace = "admin" }) {
  const [rows, setRows] = useState([]),
    [schema, setSchema] = useState({}),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [editing, setEditing] = useState(null),
    [compareDevice, setCompareDevice] = useState(null),
    [partOrder, setPartOrder] = useState(null),
    [locationRow, setLocationRow] = useState(null),
    [search, setSearch] = useState("");
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
  const userWorkspace = workspace !== "admin";
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
  const filteredRows = rows.filter((row) =>
    Object.entries(row).some(([key, value]) =>
      display(key, value, row).toLocaleLowerCase("es-CO").includes(search.toLocaleLowerCase("es-CO")),
    ),
  );
  const cardDetails = (row) => {
    const titleByKind = {
      comunidades: row.nombre || row.name,
      instalaciones: row.nombre || row.name,
      dispositivos: row.codigo,
      alertas: row.tipo_alerta_display || row.tipo_medicion_display,
      ordenes: `Orden de trabajo #${idOf(row)}`,
      consumos: row.repuesto_display || row.repuesto,
      mediciones: row.tipo_medicion_display || row.tipo_medicion,
      notificaciones: row.titulo || row.tipo_alerta_display,
    };
    const descriptionByKind = {
      comunidades: [row.municipio, row.sector].filter(Boolean).join(" · "),
      instalaciones: [row.direccion, row.barrio, row.ubicacion].filter(Boolean).join(" · "),
      dispositivos: row.instalacion_display,
      alertas: row.mensaje,
      ordenes: [row.descripcion, row.instalacion_display].filter(Boolean).join(" · "),
      consumos: row.orden_trabajo_display,
      mediciones: row.dispositivo_display,
      notificaciones: row.mensaje,
    };
    const fieldsByKind = {
      comunidades: [["referencia", "Referencia"]],
      instalaciones: [["capacidad", "Capacidad"], ["estado_instalacion", "Estado"], ["comunidad", "Comunidad"]],
      dispositivos: [["modelo", "Modelo"], ["ultima_comunicacion", "Último contacto"]],
      alertas: [["prioridad", "Prioridad"], ["fecha_creacion", "Registrado"]],
      ordenes: [["estado", "Estado"], ["tecnico", "Técnico"], ["fecha_creacion", "Creada"]],
      consumos: [["cantidad", "Cantidad"], ["fecha_registro", "Registrado"]],
      mediciones: [["valor", "Lectura"], ["fecha_hora", "Fecha"]],
      notificaciones: [["fecha_creacion", "Recibida"]],
    };
    const statusByKind = {
      alertas: row.prioridad_display || row.estado_display,
      ordenes: row.estado_display || "Activa",
      instalaciones: row.estado_instalacion_display,
      dispositivos: row.ultima_comunicacion ? "Con comunicación" : "Sin comunicación",
      mediciones: row.es_anomala ? "Revisar lectura" : "Lectura registrada",
      notificaciones: typeof row.leida === "boolean" ? row.leida ? "Leída" : "Nueva" : "Notificación",
    };
    const statusDetail = kind === "alertas" ? row.estado_display : kind === "notificaciones" && typeof row.leida === "boolean" ? row.leida ? "Leída" : "Pendiente" : "";
    const fields = (fieldsByKind[kind] || []).filter(([key]) => key in row || `${key}_display` in row).map(([key, label]) => {
      const value = row[`${key}_display`] ?? row[key];
      const formatted = /fecha|contacto/i.test(key) && value
        ? formatDashboardDate(value)
        : key === "capacidad" && value !== "" && value != null
          ? `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(Number(value))} kW`
          : display(key, row[key], row);
      return { label, value: formatted };
    });
    return {
      title: titleByKind[kind] || labelOf(row),
      description: descriptionByKind[kind] || row.descripcion || row.mensaje || "",
      status: statusByKind[kind] || "",
      statusDetail,
      fields,
    };
  };
  const canEdit = !readonly && canEditKind;
  const canRegisterParts =
    kind === "ordenes" &&
    user.roles.includes("Técnico de Campo") &&
    !user.admin &&
    !user.full_resource_access &&
    !user.is_superuser &&
    user.permisos.includes("add_repuestoordentrabajo") &&
    user.permisos.includes("view_repuesto") &&
    user.permisos.includes("view_repuestoordentrabajo");
  const canShowLocation = ["comunidades", "instalaciones", "dispositivos"].includes(kind);
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
          <span>{filteredRows.length} {filteredRows.length === 1 ? "resultado" : "resultados"}{search ? ` de ${rows.length}` : ""}</span>
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
        ) : userWorkspace ? (
          filteredRows.length ? <div className="workspace-record-grid">
            {filteredRows.map((row) => {
              const card = cardDetails(row);
              const Icon = definitions[kind]?.[1] || Layers;
              const latitude = kind === "dispositivos" ? row.map_latitud : row.latitud;
              const longitude = kind === "dispositivos" ? row.map_longitud : row.longitud;
              const locationLabel = kind === "dispositivos"
                ? `${row.codigo || "Dispositivo"} · ${row.instalacion_display || row.map_ubicacion_nombre || "instalación vinculada"}`
                : row.nombre || row.ubicacion || title || "Ubicación registrada";
              return <article className="workspace-record-card" key={idOf(row)}>
                <div className="workspace-record-card-heading">
                  <span className="workspace-record-icon"><Icon size={18} /></span>
                  <div><span className="eyebrow">{definitions[kind]?.[0] || "Información"}</span><h2>{card.title}</h2></div>
                  {card.status && <span className="workspace-record-status">{card.status}</span>}
                </div>
                {card.description && <p className="workspace-record-description">{card.description}</p>}
                {card.statusDetail && <span className="workspace-record-status-detail">{card.statusDetail}</span>}
                {card.fields.length > 0 && <dl className="workspace-record-fields">{card.fields.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{value ?? "—"}</dd></div>)}</dl>}
                {(canEdit || canRegisterParts || kind === "dispositivos" || canShowLocation) && <div className="workspace-record-actions">
                  {canShowLocation && <button aria-expanded={locationRow === idOf(row)} onClick={() => setLocationRow((current) => current === idOf(row) ? null : idOf(row))}><MapPin size={15} />{locationRow === idOf(row) ? "Ocultar ubicación" : "Ver ubicación"}</button>}
                  {kind === "dispositivos" && <button onClick={() => setCompareDevice(row)}><ChartLine size={15} />Ver lecturas</button>}
                  {canRegisterParts && !isFinishedRecord(row) && <button onClick={() => setPartOrder(row)}><Package size={15} />Registrar repuesto</button>}
                  {canEdit && <button disabled={schemaLoading} onClick={() => openEditor(row)}>Actualizar</button>}
                </div>}
                {canShowLocation && locationRow === idOf(row) && <div className="workspace-record-location">
                  {latitude != null && longitude != null
                    ? <LocationMap latitude={latitude} longitude={longitude} label={locationLabel} />
                    : <p className="empty">Este registro todavía no tiene una ubicación guardada.</p>}
                </div>}
              </article>;
            })}
          </div> : <div className="empty workspace-record-empty">
            <Layers size={28} />
            <h3>{rows.length ? "No encontramos coincidencias" : kind === "ordenes" && user.roles.includes("Técnico de Campo") ? "No tienes trabajos asignados" : kind === "instalaciones" && user.roles.includes("Líder Comunitario") ? "Tu comunidad aún no tiene instalaciones vinculadas" : "Aún no hay información"}</h3>
            <p>{rows.length
              ? "Prueba con otro nombre o término de búsqueda."
              : kind === "ordenes" && user.roles.includes("Técnico de Campo")
                ? "Cuando te asignen un trabajo, aparecerá aquí con sus pasos y detalles."
                : kind === "instalaciones" && user.roles.includes("Líder Comunitario")
                  ? "Pide al administrador que vincule las instalaciones de tu comunidad."
                  : `Cuando haya ${String(title || definitions[kind]?.[0] || "datos").toLocaleLowerCase("es-CO")} disponibles, aparecerán aquí.`}</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {columns.map((k) => (
                    <th key={k}>{nice(k)}</th>
                  ))}
                  {(canEdit || canRegisterParts || kind === "dispositivos" || canShowLocation) && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                    <Fragment key={idOf(row)}>
                    <tr>
                      {columns.map((k) => (
                        <td key={k}>{display(k, row[k], row)}</td>
                      ))}
                      {(canEdit || canRegisterParts || kind === "dispositivos" || canShowLocation) && (
                        <td className="row-actions">
                          {canShowLocation && <button aria-expanded={locationRow === idOf(row)} onClick={() => setLocationRow((current) => current === idOf(row) ? null : idOf(row))}><MapPin size={15} /> {locationRow === idOf(row) ? "Ocultar mapa" : "Ver ubicación"}</button>}
                          {kind === "dispositivos" && (
                            <button onClick={() => setCompareDevice(row)}>
                              <ChartLine size={15} /> Comparar lecturas
                            </button>
                          )}
                          {canRegisterParts && !isFinishedRecord(row) && <button onClick={() => setPartOrder(row)}>
                            <Package size={15} /> Registrar repuesto
                          </button>}
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
            {!filteredRows.length && (
              <div className="empty">
                <Layers size={28} />
                <h3>{rows.length ? "No encontramos coincidencias" : "Aún no hay registros"}</h3>
                <p>
                  {rows.length
                    ? "Prueba con otro nombre o término de búsqueda."
                    : user.admin || user.full_resource_access
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
      {partOrder && <PartUsageEditor order={partOrder} onClose={() => setPartOrder(null)} onSaved={load} />}
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
function PartUsageEditor({ order, onClose, onSaved }) {
  const [parts, setParts] = useState([]);
  const [usages, setUsages] = useState([]);
  const [partId, setPartId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const orderId = idOf(order);
  useEffect(() => {
    let active = true;
    Promise.all([
      api.get(endpoint("repuestos")),
      api.get(endpoint("consumos")),
    ]).then(([partsResponse, usagesResponse]) => {
      if (!active) return;
      setParts(responseRows(partsResponse.data).filter((part) => part.activo !== false));
      setUsages(responseRows(usagesResponse.data).filter((usage) => Number(usage.orden_trabajo) === Number(orderId)));
    }).catch((e) => {
      if (active) setError(errorText(e));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [orderId]);
  const usedIds = new Set(usages.map((usage) => Number(usage.repuesto)));
  const availableParts = parts.filter((part) => !usedIds.has(Number(idOf(part))));
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal part-usage-modal" role="dialog" aria-modal="true" aria-labelledby="part-usage-title" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span className="eyebrow">ORDEN DE TRABAJO #{orderId}</span>
            <h2 id="part-usage-title">Repuestos utilizados</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar"><X /></button>
        </header>
        <p className="part-usage-context">Registra los materiales que usaste en esta atención. La cantidad debe expresarse en la unidad indicada.</p>
        {usages.length > 0 && <section className="part-usage-list" aria-label="Repuestos ya registrados">
          <strong>Ya registrados en esta orden</strong>
          {usages.map((usage) => <div key={idOf(usage)}><span>{usage.repuesto_nombre || `Repuesto #${usage.repuesto}`}</span><span>{usage.cantidad} {usage.unidad_medida || "unidades"}</span></div>)}
        </section>}
        {error && <p role="alert" className="notice">{error}</p>}
        {loading ? <p className="empty">Cargando catálogo…</p> : (
          <form onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            try {
              await api.post(endpoint("consumos"), {
                orden_trabajo: Number(orderId),
                repuesto: Number(partId),
                cantidad: Number(quantity),
              });
              await onSaved();
              onClose();
            } catch (e) {
              setError(errorText(e));
            } finally {
              setBusy(false);
            }
          }}>
            <label>Repuesto
              <select value={partId} onChange={(event) => setPartId(event.target.value)} required disabled={!availableParts.length}>
                <option value="">{availableParts.length ? "Selecciona un repuesto…" : "No hay repuestos disponibles"}</option>
                {availableParts.map((part) => <option key={idOf(part)} value={idOf(part)}>{labelOf(part)}{part.unidad_medida ? ` · ${part.unidad_medida}` : ""}</option>)}
              </select>
            </label>
            <label>Cantidad
              <input type="number" min="0.01" step="0.01" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
            </label>
            <div className="actions">
              <button type="button" onClick={onClose}>Cancelar</button>
              <button className="primary" disabled={busy || !availableParts.length || !partId || Number(quantity) <= 0}>{busy ? "Guardando…" : "Registrar repuesto"}</button>
            </div>
          </form>
        )}
        {!loading && !parts.length && <p className="empty">No hay repuestos activos en el catálogo. Solicita al administrador que habilite los materiales necesarios.</p>}
      </section>
    </div>
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
const responseRows = (data) =>
  Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

const recordState = (record) =>
  String(record?.estado_display || record?.estado || "").toLocaleLowerCase("es-CO");

const isFinishedRecord = (record) =>
  /cerrad|cancel|resuelt/.test(recordState(record));

const newestFirst = (records, field) =>
  [...records].sort((a, b) => {
    const dateA = new Date(a?.[field] || 0).getTime();
    const dateB = new Date(b?.[field] || 0).getTime();
    return dateB - dateA;
  });

const formatDashboardDate = (value) => {
  if (!value) return "Sin registro";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

function Dashboard({ user, audience = "portal" }) {
  const roles = user.roles || [];
  const permissions = user.permisos || [];
  const globalAccess = Boolean(user.is_superuser || user.admin || user.full_resource_access);
  const isTechnician = audience === "field" || (roles.includes("Técnico de Campo") && !globalAccess);
  const isLeader = audience === "portal" && roles.includes("Líder Comunitario") && !isTechnician;
  const canRead = (model) => globalAccess || permissions.includes("ALL") || permissions.includes(`view_${model}`);
  const canReadAlerts = canRead("alerta");
  const canReadOrders = canRead("ordentrabajo");
  const canReadDevices = canRead("dispositivo");
  const canReadInstallations = canRead("instalacion");
  const [stats, setStats] = useState(null);
  const [records, setRecords] = useState({ alerts: [], orders: [], devices: [] });
  const [loadedRecords, setLoadedRecords] = useState({ alerts: false, orders: false, devices: false });
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const loadedOnce = useRef(false);

  const loadDashboard = useCallback(async () => {
    if (loadedOnce.current) setRefreshing(true);
    else setLoading(true);
    setError("");
    setDetailError("");

    const requests = [
      { key: "stats", url: "/security/portal/resumen/" },
      ...(canReadAlerts ? [{ key: "alerts", url: "/security/portal/alertas/" }] : []),
      ...(canReadOrders ? [{ key: "orders", url: "/security/portal/ordenes/" }] : []),
      ...(canReadDevices ? [{ key: "devices", url: "/security/portal/dispositivos/" }] : []),
    ];

    try {
      const results = await Promise.allSettled(requests.map(({ url }) => api.get(url)));
      const nextRecords = { alerts: [], orders: [], devices: [] };
      const nextLoaded = { alerts: false, orders: false, devices: false };
      const failedDetails = [];
      let nextStats = null;
      let statsError = null;

      results.forEach((result, index) => {
        const key = requests[index].key;
        if (result.status === "fulfilled") {
          if (key === "stats") nextStats = result.value.data;
          else {
            nextRecords[key] = responseRows(result.value.data);
            nextLoaded[key] = true;
          }
        } else if (key === "stats") {
          statsError = result.reason;
        } else {
          failedDetails.push(key === "alerts" ? "alertas" : key === "orders" ? "órdenes" : "dispositivos");
        }
      });

      setStats(nextStats);
      setRecords(nextRecords);
      setLoadedRecords(nextLoaded);
      setError(statsError ? errorText(statsError) : "");
      setDetailError(failedDetails.length ? `No se pudieron cargar ${failedDetails.join(", ")}.` : "");
      setLastUpdated(new Date());
    } catch (requestError) {
      setError(errorText(requestError));
    } finally {
      loadedOnce.current = true;
      setLoading(false);
      setRefreshing(false);
    }
  }, [canReadAlerts, canReadDevices, canReadOrders, user.id]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const alerts = newestFirst(records.alerts, "fecha_creacion");
  const activeAlerts = mostImportantAlertsFirst(alerts.filter((alert) => !isFinishedRecord(alert)));
  const orders = newestFirst(records.orders, "fecha_creacion");
  const activeOrders = orders.filter((order) => !isFinishedRecord(order));
  const closedOrders = orders.filter(isFinishedRecord);
  const devicesWithoutContact = records.devices.filter((device) => !device.ultima_comunicacion);
  const mode = audience === "admin" ? "admin" : isTechnician ? "technician" : isLeader ? "leader" : "general";
  const routeFor = (path) => workspaceRoute(audience === "admin" ? "admin" : audience === "field" ? "field" : "portal", path);
  const heading = {
    admin: "Resumen de operación",
    technician: "Mis órdenes y equipos",
    leader: "Estado de mi comunidad",
    general: "Tu espacio de trabajo",
  }[mode];
  const intro = {
    admin: "Revisa lo que necesita atención en la red solar.",
    technician: "Consulta tus trabajos asignados y el estado de los equipos.",
    leader: "Alertas, instalaciones y mantenimiento dentro de tu comunidad.",
    general: "Este es el estado de los recursos disponibles para tu rol.",
  }[mode];

  const metric = (label, value, icon, ready, visible = true) =>
    visible ? { label, value, icon, ready } : null;
  const metrics = (
    mode === "admin"
      ? [
          metric("Comunidades", stats?.comunidades, MapPin, Boolean(stats)),
          metric("Instalaciones", stats?.instalaciones, Layers, Boolean(stats)),
          metric("Dispositivos", stats?.dispositivos, Radio, Boolean(stats)),
          metric("Alertas activas", activeAlerts.length, Bell, loadedRecords.alerts),
          metric("Órdenes activas", activeOrders.length, Wrench, loadedRecords.orders),
        ]
      : mode === "leader"
        ? [
            metric("Instalaciones", stats?.instalaciones, Layers, Boolean(stats), canReadInstallations),
            metric("Alertas activas", activeAlerts.length, Bell, loadedRecords.alerts, canReadAlerts),
            metric("Órdenes activas", activeOrders.length, Wrench, loadedRecords.orders, canReadOrders),
            metric("Sin comunicación registrada", devicesWithoutContact.length, Radio, loadedRecords.devices, canReadDevices),
          ]
        : mode === "technician"
          ? [
              metric("Órdenes asignadas", stats?.ordenes, Wrench, Boolean(stats), canReadOrders),
              metric("Órdenes activas", activeOrders.length, ClipboardText, loadedRecords.orders, canReadOrders),
              metric("Órdenes cerradas", closedOrders.length, Sun, loadedRecords.orders, canReadOrders),
              metric("Instalaciones asignadas", stats?.instalaciones, Layers, Boolean(stats), canReadInstallations),
            ]
          : [
              metric("Comunidades", stats?.comunidades, MapPin, Boolean(stats), canRead("comunidad")),
              metric("Instalaciones", stats?.instalaciones, Layers, Boolean(stats), canReadInstallations),
              metric("Dispositivos", stats?.dispositivos, Radio, Boolean(stats), canReadDevices),
              metric("Órdenes", stats?.ordenes, Wrench, Boolean(stats), canReadOrders),
            ]
  ).filter(Boolean);

  const alertPath = routeFor(isLeader ? "mi-alertas" : "alertas");
  const orderPath = routeFor(mode === "admin" ? "mantenimiento" : isTechnician ? "mis-casos" : isLeader ? "tecnicos" : "mantenimiento");
  const priorityAlert = canReadAlerts ? activeAlerts[0] : null;
  const priorityOrder = canReadOrders ? activeOrders[0] : null;
  const priorityItem = isTechnician
    ? priorityOrder ? { type: "order", record: priorityOrder, path: orderPath } : null
    : isLeader
      ? priorityAlert ? { type: "alert", record: priorityAlert, path: alertPath } : priorityOrder ? { type: "order", record: priorityOrder, path: orderPath } : null
      : priorityAlert ? { type: "alert", record: priorityAlert, path: alertPath } : priorityOrder ? { type: "order", record: priorityOrder, path: orderPath } : null;
  const priorityLoaded = priorityItem
    ? priorityItem.type === "alert" ? loadedRecords.alerts : loadedRecords.orders
    : isTechnician
      ? !canReadOrders || loadedRecords.orders
      : (canReadAlerts ? loadedRecords.alerts : true) && (canReadOrders ? loadedRecords.orders : true);
  const quickKinds =
    mode === "admin"
      ? ["instalaciones", "dispositivos", "ordenes"]
      : mode === "technician"
        ? ["ordenes", "instalaciones", "consumos"]
        : mode === "leader"
          ? ["instalaciones", "alertas", "notificaciones"]
          : ["instalaciones", "dispositivos", "ordenes", "alertas", "notificaciones", "consumos"];

  return (
    <>
      <div className="page-heading dashboard-heading">
        <div>
          <span className="eyebrow">TU RED DE ENERGÍA</span>
          <h1>{heading}</h1>
          <p>Hola, {user.first_name || user.username}. {intro}</p>
          {user.username.startsWith("demo_") && <span className="demo-data-badge">CUENTA DEMO · DATOS DE EJEMPLO</span>}
        </div>
        <div className="dashboard-toolbar">
          {lastUpdated && <small aria-live="polite">Actualizado {formatDashboardDate(lastUpdated)}</small>}
          <button className="dashboard-refresh" type="button" onClick={loadDashboard} disabled={loading || refreshing}>
            {refreshing ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      </div>
      {error && <p role="alert" className="notice">{error}</p>}
      {detailError && <p role="status" className="notice">{detailError} Los demás datos siguen disponibles.</p>}

      <div className="stat-grid dashboard-stats">
        {metrics.map(({ label, value, icon: Icon, ready }) => (
          <article key={label}>
            <Icon size={18} />
            <span>{label}</span>
            <strong>{ready ? value ?? 0 : "—"}</strong>
            <small>{loading ? "Cargando datos" : "En tu ámbito"}</small>
          </article>
        ))}
      </div>

      {mode !== "admin" && <section className={`workspace-priority-card${priorityItem?.type === "alert" ? " priority-alert" : ""}`} aria-live="polite">
        <span className="workspace-priority-icon">{priorityItem?.type === "alert" ? <Bell size={19} /> : isTechnician ? <Wrench size={19} /> : <Sun size={19} />}</span>
        <div>
          <span className="eyebrow">{isTechnician ? "SIGUIENTE TRABAJO" : "LO MÁS IMPORTANTE"}</span>
          <h2>{!priorityLoaded ? loading ? "Consultando tus prioridades…" : "No pudimos revisar tus prioridades" : priorityItem
            ? priorityItem.type === "alert" ? priorityItem.record.tipo_alerta_display || priorityItem.record.tipo_medicion_display || "Aviso pendiente" : `Orden de trabajo #${idOf(priorityItem.record)}`
            : isTechnician ? "No tienes órdenes pendientes" : "No hay tareas pendientes"}</h2>
          <p>{!priorityLoaded ? loading ? "En un momento te mostraremos qué requiere atención." : "Actualiza el resumen para volver a consultar tus avisos y órdenes." : priorityItem
            ? priorityItem.type === "alert"
              ? `${priorityItem.record.mensaje || "Revisa el aviso de tu sistema."} ${priorityItem.record.prioridad_display ? `· Prioridad ${priorityItem.record.prioridad_display}.` : ""}`
              : [priorityItem.record.descripcion, priorityItem.record.instalacion_display, priorityItem.record.estado_display].filter(Boolean).join(" · ")
            : isTechnician ? "Tus nuevas órdenes aparecerán aquí cuando te asignen un trabajo." : "Cuando aparezca un aviso o una orden, la verás destacada aquí."}</p>
        </div>
        {!priorityLoaded && !loading
          ? <button type="button" className="workspace-priority-retry" onClick={loadDashboard} disabled={refreshing}>Actualizar <ArrowRight size={15} /></button>
          : priorityLoaded && priorityItem && <Link to={priorityItem.path}>Abrir detalle <ArrowRight size={15} /></Link>}
      </section>}

      <div className="section-intro dashboard-section-intro">
        <h2>{mode === "technician" ? "Continúa tu jornada" : mode === "leader" ? "Explora tu comunidad" : mode === "admin" ? "Prioridades de la red" : "Explora tu espacio"}</h2>
        <span className="muted">{mode === "admin" ? "Accesos directos a la operación" : "Entra a cada apartado cuando lo necesites"}</span>
      </div>
      <div className="dashboard-board">
        {canReadAlerts && (
          <section className="dashboard-panel" aria-labelledby="dashboard-alerts-title">
            <div className="dashboard-panel-heading">
              <div>
                <span className="eyebrow">SEGUIMIENTO</span>
                <h2 id="dashboard-alerts-title">{isLeader ? "Alertas de mi comunidad" : "Alertas abiertas"}</h2>
              </div>
            <Link to={alertPath}>Ver todas <ArrowUpRight size={14} /></Link>
            </div>
            {!loadedRecords.alerts ? (
              <p className="dashboard-empty">{loading ? "Cargando alertas…" : "No se pudieron cargar las alertas."}</p>
            ) : activeAlerts.length ? (
              <div className="dashboard-record-list">
                {activeAlerts.slice(0, 4).map((alert) => (
                  <Link className="dashboard-record" to={alertPath} key={idOf(alert)}>
                    <span className="dashboard-record-mark alert-mark"><Bell size={16} /></span>
                    <span className="dashboard-record-copy">
                      <span className="dashboard-record-title">
                        <strong>{alert.tipo_alerta_display || alert.tipo_medicion_display || "Alerta del sistema"}</strong>
                        <span className="dashboard-pill">{alert.prioridad_display || "Revisar"}</span>
                      </span>
                      <span>{alert.mensaje || "Se requiere revisar esta instalación."}</span>
                      <small>{alert.instalacion_display || "Instalación"} · {formatDashboardDate(alert.fecha_creacion)}</small>
                    </span>
                    <ArrowRight size={15} />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="dashboard-empty">No hay alertas abiertas dentro de tu alcance.</p>
            )}
          </section>
        )}

        {canReadOrders && (
          <section className="dashboard-panel" aria-labelledby="dashboard-orders-title">
            <div className="dashboard-panel-heading">
              <div>
                <span className="eyebrow">MANTENIMIENTO</span>
                <h2 id="dashboard-orders-title">{isTechnician ? "Mis órdenes asignadas" : "Órdenes activas"}</h2>
              </div>
            <Link to={orderPath}>Ver órdenes <ArrowUpRight size={14} /></Link>
            </div>
            {!loadedRecords.orders ? (
              <p className="dashboard-empty">{loading ? "Cargando órdenes…" : "No se pudieron cargar las órdenes."}</p>
            ) : activeOrders.length ? (
              <div className="dashboard-record-list">
                {activeOrders.slice(0, 4).map((order) => (
                  <Link className="dashboard-record" to={orderPath} key={idOf(order)}>
                    <span className="dashboard-record-mark order-mark"><Wrench size={16} /></span>
                    <span className="dashboard-record-copy">
                      <span className="dashboard-record-title">
                        <strong>Orden #{idOf(order)}</strong>
                        <span className="dashboard-pill">{order.estado_display || "Activa"}</span>
                      </span>
                      <span>{order.descripcion || "Orden de mantenimiento"}</span>
                      <small>{order.instalacion_display || "Instalación"} · {formatDashboardDate(order.fecha_creacion)}</small>
                    </span>
                    <ArrowRight size={15} />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="dashboard-empty">No hay órdenes activas dentro de tu alcance.</p>
            )}
          </section>
        )}
      </div>

      {canReadDevices && (
        <section className="dashboard-panel dashboard-device-panel" aria-labelledby="dashboard-devices-title">
          <div className="dashboard-panel-heading">
            <div>
              <span className="eyebrow">CONECTIVIDAD</span>
              <h2 id="dashboard-devices-title">Dispositivos sin comunicación registrada</h2>
            </div>
            <Link to={routeFor("dispositivos")}>Ver dispositivos <ArrowUpRight size={14} /></Link>
          </div>
          {!loadedRecords.devices ? (
            <p className="dashboard-empty">{loading ? "Cargando dispositivos…" : "No se pudieron cargar los dispositivos."}</p>
          ) : devicesWithoutContact.length ? (
            <div className="dashboard-device-list">
              {devicesWithoutContact.slice(0, 4).map((device) => (
                <div className="dashboard-device" key={idOf(device)}>
                  <span className="dashboard-record-mark device-mark"><Radio size={16} /></span>
                  <span><strong>{device.codigo || `Dispositivo #${idOf(device)}`}</strong><small>{device.instalacion_display || "Instalación"} · {device.modelo || "Modelo sin indicar"}</small></span>
                  <span className="dashboard-pill">Sin registro</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="dashboard-empty">Todos los dispositivos visibles tienen una comunicación registrada.</p>
          )}
        </section>
      )}

      <div className="section-intro dashboard-section-intro">
        <h2>Continúa con tu trabajo</h2>
        <span className="muted">Accesos rápidos</span>
      </div>
      <div className="three-grid quick-links">
        {quickKinds.filter((kind) => {
          const permission = {
            instalaciones: "view_instalacion",
            dispositivos: "view_dispositivo",
            ordenes: "view_ordentrabajo",
            alertas: "view_alerta",
            notificaciones: "view_notificacion",
            consumos: "view_repuestoordentrabajo",
          }[kind];
          return globalAccess || !permission || permissions.includes(permission);
        }).map((kind) => {
          const Icon = definitions[kind][1];
          const to = kind === "ordenes"
            ? orderPath
            : kind === "alertas"
              ? alertPath
              : routeFor(kind === "instalaciones"
                ? isTechnician ? "ficha-tecnica" : isLeader ? "mi-comunidad" : "instalaciones"
                : kind);
          return (
            <Link key={kind} className="feature" to={to}>
              <Icon weight="duotone" />
              <h3>{definitions[kind][0]}</h3>
              <p>{{
                instalaciones: "Sistemas solares dentro de tu ámbito.",
                dispositivos: "Equipos y sus últimas lecturas.",
                ordenes: "Trabajos y pasos por completar.",
                alertas: "Avisos que necesitan seguimiento.",
                notificaciones: "Novedades de tu sistema.",
                consumos: "Materiales usados en tus trabajos.",
              }[kind]}</p>
              <ArrowUpRight size={18} />
            </Link>
          );
        })}
      </div>
      <section className="territory dashboard-territory">
        <Sun size={36} weight="duotone" />
        <div>
          <span className="eyebrow">UNA PLATAFORMA, UN PROPÓSITO</span>
          <h2>Energía para seguir adelante.</h2>
          <p>Infraestructura solar y mantenimiento para las comunidades rurales de La Guajira.</p>
        </div>
      </section>
    </>
  );
}
function HomeownerOverview({ user }) {
  const location = useLocation();
  const [installations, setInstallations] = useState([]);
  const [devices, setDevices] = useState([]);
  const [deviceReports, setDeviceReports] = useState({});
  const [deviceReportErrors, setDeviceReportErrors] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [availability, setAvailability] = useState({ installations: false, devices: false, alerts: false });
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showAlertHistory, setShowAlertHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const loadedOnce = useRef(false);
  const loadOverview = useCallback(async () => {
    if (loadedOnce.current) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const results = await Promise.allSettled([
        api.get("/security/portal/instalaciones/"),
        api.get("/security/portal/dispositivos/"),
        api.get("/security/portal/alertas/"),
      ]);
      const labels = ["instalaciones", "equipos", "avisos"];
      const failed = results.flatMap((result, index) => result.status === "rejected" ? [labels[index]] : []);
      setAvailability({
        installations: results[0].status === "fulfilled",
        devices: results[1].status === "fulfilled",
        alerts: results[2].status === "fulfilled",
      });
      const nextInstallations = results[0].status === "fulfilled" ? responseRows(results[0].value.data) : [];
      const nextDevices = results[1].status === "fulfilled" ? responseRows(results[1].value.data) : [];
      const nextAlerts = results[2].status === "fulfilled" ? responseRows(results[2].value.data) : [];
      setInstallations(nextInstallations);
      setDevices(nextDevices);
      setAlerts(nextAlerts);
      setError(failed.length === results.length ? errorText(results.find((result) => result.status === "rejected").reason) : "");

      const comparisonResults = await Promise.allSettled(
        nextDevices.slice(0, 4).map((device) => api.get(`/security/portal/dispositivos/${idOf(device)}/comparativa/`)),
      );
      const nextReports = {};
      const nextReportErrors = {};
      comparisonResults.forEach((result, index) => {
        if (result.status === "fulfilled") nextReports[String(idOf(nextDevices[index]))] = result.value.data;
        else {
          failed.push("lecturas de equipos");
          nextReportErrors[String(idOf(nextDevices[index]))] = true;
        }
      });
      setDeviceReports(nextReports);
      setDeviceReportErrors(nextReportErrors);
      setDetailError(failed.length ? `No se pudieron cargar ${[...new Set(failed)].join(", ")}. Los demás datos siguen disponibles.` : "");
      setLastUpdated(new Date());
    } catch (requestError) {
      setError(errorText(requestError));
    } finally {
      loadedOnce.current = true;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    loadOverview();
  }, [loadOverview]);
  useEffect(() => {
    if (!location.hash) return;
    const section = document.getElementById(location.hash.slice(1));
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.hash]);
  const openAlerts = mostImportantAlertsFirst(alerts.filter((alert) => !isFinishedRecord(alert)));
  const disconnectedDevices = devices.filter((device) => !device.ultima_comunicacion);
  const recentAlerts = newestFirst(alerts, "fecha_creacion");
  const visibleAlerts = (showAlertHistory ? recentAlerts : openAlerts).slice(0, 8);
  const systemStatus = getOwnerSystemStatus({
    loading,
    error,
    installations,
    devices,
    devicesWithoutContact: disconnectedDevices,
    openAlerts,
    availability,
  });
  return <>
    <div className="page-heading dashboard-heading">
      <div>
        <span className="eyebrow">TU SISTEMA SOLAR</span>
        <h1>Mi vivienda</h1>
        <p>Consulta tu sistema, sus lecturas y lo que necesita atención.</p>
      </div>
      <div className="dashboard-toolbar">
        <span className="tag">PROPIETARIO SOLAR</span>
        {lastUpdated && <small aria-live="polite">Actualizado {formatDashboardDate(lastUpdated)}</small>}
        <button className="dashboard-refresh" type="button" onClick={loadOverview} disabled={loading || refreshing}>
          {refreshing ? "Actualizando…" : "Actualizar"}
        </button>
      </div>
    </div>
    {user.username.startsWith("demo_") && <p className="demo-data-badge" role="note">CUENTA DE DEMOSTRACIÓN · Los datos que ves son de ejemplo.</p>}
    {error && <p role="alert" className="notice">{error}</p>}
    {detailError && <p role="status" className="notice">{detailError}</p>}
    <div className="stat-grid homeowner-stats">
      {[
        ["Instalaciones", installations.length, Layers, availability.installations],
        ["Equipos", devices.length, Radio, availability.devices],
        ["Avisos activos", openAlerts.length, Bell, availability.alerts],
        ["Avisos registrados", alerts.length, ChartLine, availability.alerts],
      ].map(([label, value, Icon, sourceReady]) => <article key={label}><Icon size={18} /><span>{label}</span><strong>{loading || !sourceReady ? "—" : value}</strong><small>{sourceReady ? "En tu vivienda" : "No disponible"}</small></article>)}
    </div>
    <section className={`owner-system-status ${systemStatus.tone}`} aria-live="polite" aria-labelledby="owner-system-status-title">
      <span className="owner-status-icon">{systemStatus.tone === "attention" ? <Bell size={20} /> : systemStatus.tone === "caution" ? <Radio size={20} /> : <Sun size={20} />}</span>
      <div className="owner-status-copy">
        <span className="eyebrow">ESTADO DE TU SISTEMA</span>
        <h2 id="owner-system-status-title">{systemStatus.title}</h2>
        <p>{systemStatus.description}</p>
      </div>
      {systemStatus.action && (systemStatus.target
        ? <a className="owner-status-action" href={systemStatus.target}>{systemStatus.action}<ArrowRight size={16} /></a>
        : <button className="owner-status-action" type="button" onClick={loadOverview} disabled={loading || refreshing}>{refreshing ? "Actualizando…" : systemStatus.action}<ArrowRight size={16} /></button>)}
    </section>
    <section className="owner-section" id="mi-sistema">
      <div className="section-intro"><h2>Tu instalación</h2><span className="muted">Ubicación y estado</span></div>
      {loading ? <p className="empty">Cargando los datos de tu sistema…</p> : !availability.installations ? <p className="empty">No se pudo cargar tu instalación. Usa “Actualizar” para volver a intentarlo.</p> : installations.length ? <div className="owner-card-grid">
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
    <section className="owner-section" id="equipos">
      <div className="section-intro"><h2>Mediciones del sistema</h2><span className="muted">Valores recientes y comparación con los rangos esperados</span></div>
      {!loading && availability.devices && devices.length ? <div className="owner-card-grid">
        {devices.slice(0, 4).map((device) => {
          const report = deviceReports[String(idOf(device))];
          return <article className="feature owner-card" key={idOf(device)}>
          <Radio size={19} />
          <h3>{device.codigo}</h3>
          <p>{device.modelo || "Dispositivo IoT"} · {device.instalacion_display || "Instalación vinculada"}</p>
          <span className={`device-contact-state${device.ultima_comunicacion ? " recorded" : " missing"}`}><i />{device.ultima_comunicacion ? `Último contacto: ${formatDashboardDate(device.ultima_comunicacion)}` : "Sin comunicación registrada"}</span>
          {report?.mediciones?.length ? <div className="owner-reading-grid" aria-label="Últimas lecturas del equipo">
            {report.mediciones.slice(0, 3).map((reading) => <div className="owner-reading" key={reading.tipo_medicion}>
              <span>{reading.tipo_medicion}</span>
              <strong>{reading.valor == null ? "—" : new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(Number(reading.valor))}<small>{reading.valor == null ? "" : ` ${reading.unidad || ""}`}</small></strong>
              <small className={`reading-state ${String(reading.estado).toLowerCase().replaceAll(" ", "-")}`}>{reading.estado}</small>
            </div>)}
          </div> : deviceReportErrors[String(idOf(device))]
            ? <p className="owner-no-readings">No se pudieron cargar las lecturas recientes.</p>
            : report && <p className="owner-no-readings">Aún no hay lecturas recientes para mostrar.</p>}
          <button className="secondary owner-action" onClick={() => setSelectedDevice(device)}>Ver mediciones e historial</button>
        </article>;
        })}
      </div> : !loading && !availability.devices
        ? <p className="empty">No se pudieron cargar tus equipos. Usa “Actualizar” para volver a intentarlo.</p>
        : !loading && <p className="empty">No hay dispositivos asociados a tu instalación todavía.</p>}
      {!loading && devices.length > 4 && <Link className="owner-more-link" to="/portal/dispositivos">Ver los {devices.length} equipos <ArrowRight size={15} /></Link>}
    </section>
    <section className="owner-section" id="avisos">
      <div className="section-intro owner-alert-heading">
        <div>
          <h2>{showAlertHistory ? "Historial de avisos" : "Avisos que requieren atención"}</h2>
          <span className="muted">{showAlertHistory ? "Novedades recientes de tu sistema" : `${openAlerts.length} pendientes en tu instalación`}</span>
        </div>
        <div className="owner-alert-actions">
          {alerts.length > 0 && <button className="owner-alert-toggle" type="button" onClick={() => setShowAlertHistory((current) => !current)} aria-pressed={showAlertHistory}>{showAlertHistory ? "Ver pendientes" : "Ver historial"}</button>}
          <Link to="/portal/alertas">Todas las alertas ↗</Link>
        </div>
      </div>
      {loading ? <p className="empty">Cargando avisos…</p> : !availability.alerts ? <p className="empty">No se pudieron cargar los avisos. Usa “Actualizar” para volver a intentarlo.</p> : visibleAlerts.length ? <div className="owner-alert-list">
        {visibleAlerts.map((alert) => <article className="owner-alert" key={idOf(alert)}>
          <Bell size={18} />
          <div><strong>{alert.tipo_alerta_display || alert.tipo_medicion_display || "Aviso del sistema"}</strong><p>{alert.mensaje}</p><small>{alert.instalacion_display || "Tu instalación"} · {alert.fecha_creacion ? new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(alert.fecha_creacion)) : "Fecha no disponible"}</small></div>
          <span className={`reading-state ${isFinishedRecord(alert) ? "normal" : "fuera-de-rango"}`}>{alert.estado_display || "Revisar"}</span>
          {alert.prioridad_display && <span className="dashboard-pill">{alert.prioridad_display}</span>}
        </article>)}
      </div> : <p className="empty">{showAlertHistory ? "Aún no hay avisos registrados para tu sistema." : alerts.length ? "No tienes avisos pendientes. Puedes consultar el historial cuando quieras." : "No hay avisos registrados para tu sistema. Aquí aparecerán si una lectura requiere atención."}</p>}
    </section>
    {selectedDevice && <DeviceComparison device={selectedDevice} onClose={() => setSelectedDevice(null)} />}
  </>;
}

function HomePage({ user, audience = "portal" }) {
  const roles = user.roles || [];
  if (audience === "admin") return <Dashboard user={user} audience="admin" />;
  if (audience === "field") return <Dashboard user={user} audience="field" />;
  if (roles.length === 0) {
    return (
      <section className="dashboard-panel dashboard-no-role" role="status">
        <Shield size={24} />
        <h1>Tu cuenta está lista</h1>
        <p>Un administrador debe asignarte un rol para mostrarte los datos y herramientas de tu trabajo.</p>
      </section>
    );
  }

  const homeownerOnly =
    roles.includes("Propietario Solar") &&
    !roles.includes("Técnico de Campo") &&
    !roles.includes("Líder Comunitario");
  return homeownerOnly
    ? <HomeownerOverview user={user} />
    : <Dashboard user={user} audience="portal" />;
}

function Workspace({ user, area, onLogout, onProfileUpdated }) {
  const areaBase = workspaceBase(area);
  const areaRoute = (path) => workspaceRoute(area, path);
  const isAdminArea = area === "admin";
  const isFieldArea = area === "field";
  const roles = new Set(user.roles || []);
  const [open, setOpen] = useState(false);
  const [resourceNav, setResourceNav] = useState([]);
  const [navigationReady, setNavigationReady] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("kaillisto-theme") || "dark");
  const [motionEnabled, setMotionEnabled] = useState(() => localStorage.getItem("kaillisto-motion") !== "off");
  const [openGroups, setOpenGroups] = useState(() => new Set(["home", "security", "energy", "operations"]));
  const loc = useLocation();
  useEffect(() => {
    let active = true;
    const refresh = () => api.get("/security/navigation/")
      .then(({ data }) => { if (active) setResourceNav(data); })
      .catch(() => {})
      .finally(() => { if (active) setNavigationReady(true); });
    refresh();
    const onPermissions = () => refresh();
    window.addEventListener("kaillisto:permissions", onPermissions);
    return () => { active = false; window.removeEventListener("kaillisto:permissions", onPermissions); };
  }, [user.id]);
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => { localStorage.setItem("kaillisto-theme", theme); }, [theme]);
  useEffect(() => { localStorage.setItem("kaillisto-motion", motionEnabled ? "on" : "off"); }, [motionEnabled]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);
  const fieldTechnician = isFieldArea && roles.has("Técnico de Campo");
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
  const relativePath = (path) => path === areaBase
    ? "/dashboard"
    : `/${path.slice(areaBase.length).replace(/^\/+/, "")}`;
  const canOpen = (path) => {
    const normalizedPath = relativePath(path);
    const allReadAccess = user.is_superuser || user.full_resource_access || user.permisos.includes("ALL");
    return allReadAccess ||
    (normalizedPath === "/catalogos"
      ? catalogs.some((kind) => user.permisos.includes(catalogPermissions[kind]))
        : normalizedPath === "/mi-alertas" && roles.has("Líder Comunitario")
        ? user.permisos.includes("view_alerta")
        : !routePermissions[normalizedPath] || user.permisos.includes(routePermissions[normalizedPath]));
  };
  const areaName = isAdminArea ? "Administración" : isFieldArea ? "Trabajo de campo" : "Portal de usuario";
  const baseLinks = [[areaBase, isAdminArea ? "Resumen operativo" : isFieldArea ? "Mi jornada" : "Mi espacio", LayoutDashboard]];
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
  const adminOnlyModels = new Set(["usuario", "role", "userrole", "securityauditevent", "resource"]);
  const userFacingModels = new Set();
  if (roles.has("Propietario Solar")) {
    ["instalacion", "dispositivo", "medicion", "alerta", "notificacion"].forEach((model) => userFacingModels.add(model));
  }
  if (roles.has("Líder Comunitario")) {
    ["comunidad", "instalacion", "dispositivo", "medicion", "alerta", "ordentrabajo", "notificacion"].forEach((model) => userFacingModels.add(model));
  }
  if (roles.has("Técnico de Campo")) {
    ["instalacion", "dispositivo", "medicion", "alerta", "ordentrabajo", "repuestoordentrabajo", "notificacion"].forEach((model) => userFacingModels.add(model));
  }
  const visibleResources = resourceNav.filter((resource) =>
    isAdminArea || (
      !adminOnlyModels.has(String(resource.model || "").toLowerCase())
      && (!userFacingModels.size || userFacingModels.has(String(resource.model || "").toLowerCase()))
    ),
  );
  const dynamicLinks = visibleResources.map((resource) => [
    areaRoute(resource.menu_path), resource.name, iconForResource(resource.menu_icon), resource,
  ]);
  const hasResource = (model) => resourceNav.some((resource) => String(resource.model || "").toLowerCase() === model);
  const workflowLinks = [];
  const baseRoutes = {};
  const addWorkflow = (path, label, Icon, kind, title, readonly = true) => {
    const route = areaRoute(path);
    workflowLinks.push([route, label, Icon]);
    baseRoutes[route] = [kind, title, readonly];
  };
  if (fieldTechnician) {
    if (hasResource("ordentrabajo")) addWorkflow("/mis-casos", "Mis casos asignados", Wrench, "ordenes", "Mis casos asignados", false);
    if (hasResource("instalacion")) addWorkflow("/ficha-tecnica", "Fichas técnicas", Layers, "instalaciones", "Fichas técnicas", true);
    if (hasResource("repuestoordentrabajo")) addWorkflow("/consumos", "Repuestos utilizados", Package, "consumos", "Repuestos utilizados", true);
  }
  if (!isAdminArea && !isFieldArea && roles.has("Líder Comunitario")) {
    if (hasResource("instalacion")) addWorkflow("/mi-comunidad", "Mi comunidad", MapPin, "instalaciones", "Mi comunidad", true);
    if (hasResource("alerta")) addWorkflow("/mi-alertas", "Alertas de mi zona", Bell, "alertas", "Alertas de mi zona", true);
    if (hasResource("ordentrabajo")) addWorkflow("/tecnicos", "Técnicos asignados", Wrench, "ordenes", "Técnicos asignados", true);
  }
  const staticLinks = [...baseLinks, ...workflowLinks, [areaRoute("perfil"), "Mi perfil", UserCircle]];
  const seenPaths = new Set();
  const links = [...staticLinks, ...dynamicLinks].filter(([path]) => {
    if (seenPaths.has(path)) return false;
    seenPaths.add(path);
    return true;
  });
  const routes = {
    ...baseRoutes,
  };
  const groups = [{ id: "home", label: areaName, Icon: LayoutDashboard, paths: [areaBase, ...workflowLinks.map(([path]) => path)] }]
    .map((group) => ({ ...group, items: links.filter(([path]) => group.paths.includes(path)) }))
    .filter((group) => group.items.length);
  const dynamicGroups = [...new Set(dynamicLinks.map(([, , , resource]) => resource.menu_group || "Recursos"))]
    .map((label) => ({
      id: `resource-${label}`,
      label,
      Icon: iconForResource(label),
      items: dynamicLinks.filter(([, , , resource]) => (resource.menu_group || "Recursos") === label),
    }));
  groups.push(...dynamicGroups);
  const switchTo = !isAdminArea && isFieldArea && (roles.has("Propietario Solar") || roles.has("Líder Comunitario"))
    ? workspaceBase("portal")
    : !isAdminArea && !isFieldArea && roles.has("Técnico de Campo")
      ? workspaceBase("field")
      : null;
  const switchLabel = switchTo === workspaceBase("field") ? "Área de técnicos" : "Portal de usuario";
  const pageContent = (
    <Routes>
      <Route path={areaBase} element={<HomePage user={user} audience={area} />} />
      {Object.entries(routes)
        .filter(([path]) => canOpen(path))
        .map(([path, [kind, title, readonly]]) => (
          <Route
            key={path}
            path={path}
            element={kind === "homeowner" ? <HomeownerOverview user={user} /> : (
              <Records key={kind} kind={kind} user={user} title={title} readonly={readonly} workspace={area} />
            )}
          />
        ))}
      {visibleResources.map((resource) => {
        const page = modelPage(resource.model);
        const path = areaRoute(resource.menu_path);
        return page && canOpen(path) ? (
          <Route
            key={`resource-${resource.id}`}
            path={path}
            element={page.kind === "roles" ? <RoleMatrix user={user} /> : page.kind === "audit" ? <SecurityAudit /> : (
              <Records kind={page.kind} user={user} title={resource.name} endpointOverride={resource.endpoint} modelName={resource.model} workspace={area} />
            )}
          />
        ) : null;
      })}
      {canOpen(areaRoute("catalogos")) && <Route path={areaRoute("catalogos")} element={<Catalogs user={user} />} />}
      <Route path={areaRoute("perfil")} element={<ProfileSettings onProfileUpdated={onProfileUpdated} />} />
      {navigationReady && <Route path="*" element={<Navigate to={areaBase} replace />} />}
    </Routes>
  );
  const secondaryPortalLinks = isFieldArea
    ? [...workflowLinks, ...dynamicLinks.filter(([, , , resource]) => ["dispositivo", "alerta", "notificacion"].includes(String(resource.model || "").toLowerCase()))]
    : roles.has("Propietario Solar")
      ? dynamicLinks.filter(([, , , resource]) => ["instalacion", "dispositivo", "alerta", "notificacion"].includes(String(resource.model || "").toLowerCase()))
      : roles.has("Líder Comunitario")
        ? [...workflowLinks, ...dynamicLinks.filter(([, , , resource]) => ["dispositivo", "notificacion"].includes(String(resource.model || "").toLowerCase()))]
        : dynamicLinks.slice(0, 4);
  const portalLinkNames = {
    instalacion: roles.has("Propietario Solar") ? "Mi sistema" : "Instalaciones",
    dispositivo: "Equipos",
    medicion: "Mediciones",
    alerta: roles.has("Líder Comunitario") ? "Alertas de mi zona" : "Alertas",
    notificacion: "Notificaciones",
  };
  const ownerPortalOnly =
    !isAdminArea && !isFieldArea && roles.has("Propietario Solar")
    && !roles.has("Técnico de Campo") && !roles.has("Líder Comunitario");
  const primaryPortalLinks = ownerPortalOnly
    ? [
        [areaBase, "Inicio", LayoutDashboard],
        [`${areaBase}#mi-sistema`, "Mi sistema", MapPin],
        [`${areaBase}#equipos`, "Equipos", Radio],
        [`${areaBase}#avisos`, "Avisos", Bell],
        [areaRoute("perfil"), "Mi perfil", UserCircle],
      ]
    : [
        [areaBase, isFieldArea ? "Resumen" : "Inicio", LayoutDashboard],
        ...secondaryPortalLinks.map(([path, label, Icon, resource]) => [
          path,
          resource ? portalLinkNames[String(resource.model || "").toLowerCase()] || label : label,
          Icon,
        ]),
        [areaRoute("perfil"), "Mi perfil", UserCircle],
      ].filter(([path], index, all) => all.findIndex(([candidate]) => candidate === path) === index);
  if (!isAdminArea) {
    return (
      <div className={`customer-portal${isFieldArea ? " field-portal" : ""}`} data-motion={motionEnabled ? "on" : "off"}>
        <header className="customer-header">
          <div className="customer-header-inner">
            <Brand />
            <nav className="customer-nav" aria-label="Navegación del portal">
              {primaryPortalLinks.filter(([path]) => canOpen(path.split("#")[0])).map(([path, label]) =>
                path.includes("#")
                  ? <a className={loc.hash === path.slice(path.indexOf("#")) ? "active" : ""} key={path} href={path}>{label}</a>
                  : <NavLink key={path} to={path} end={path === areaBase}>{label}</NavLink>
              )}
            </nav>
            <div className="customer-account">
              {switchTo && <Link className="customer-role-switch" to={switchTo}>{switchLabel}</Link>}
              <span className="customer-account-name">{user.first_name || user.username}</span>
              <button type="button" onClick={onLogout}>Salir</button>
            </div>
          </div>
        </header>
        <main className="customer-main">{pageContent}</main>
        <footer className="customer-footer">
          <Brand />
          <span>{isFieldArea ? "Tu trabajo de campo, organizado en un solo lugar." : "El estado de tu energía solar, claro y cerca de ti."}</span>
          <Link to={areaRoute("perfil")}>Mi perfil</Link>
        </footer>
      </div>
    );
  }
  return (
    <div className="workspace" data-theme={theme} data-motion={motionEnabled ? "on" : "off"}>
      <aside className={open ? "sidebar open" : "sidebar"}>
        <div className="sidebar-brand-row"><Brand /><button className="sidebar-close icon-button" aria-label="Cerrar menú" onClick={() => setOpen(false)}><X size={18} /></button></div>
        <div className="workspace-label">
          {isAdminArea ? "PANEL ADMINISTRATIVO" : isFieldArea ? "ÁREA DE CAMPO" : "PORTAL DE USUARIO"} <span>01</span>
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
                    if (next.has(group.id)) next.delete(group.id);
                    else next.add(group.id);
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
          {isAdminArea && user.is_staff && (
            <a href="/admin/" target="_blank" rel="noreferrer">
              <Shield size={16} />
              Administración Django ↗
            </a>
          )}
          {switchTo && (
            <Link className="workspace-area-switch" to={switchTo}>
              {switchTo === workspaceBase("field") ? <Wrench size={16} /> : <Sun size={16} />}
              {switchLabel}
            </Link>
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
          <Link className="profile-settings" to={areaRoute("perfil")}>
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
            Ka’illisto <span className="muted">/ {areaName}</span>
          </span>
          <div className="header-actions"><button className="theme-toggle" type="button" onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"} title={theme === "dark" ? "Tema claro" : "Tema oscuro"}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}<span>{theme === "dark" ? "Claro" : "Oscuro"}</span></button><button className="theme-toggle motion-toggle" type="button" onClick={() => setMotionEnabled((value) => !value)} aria-pressed={motionEnabled} title={motionEnabled ? "Desactivar animaciones" : "Activar animaciones"}><span>{motionEnabled ? "Animaciones: sí" : "Animaciones: no"}</span></button><span className="tag">GESTIÓN SOLAR</span></div>
        </header>
        <main className="workspace-main">{pageContent}</main>
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
          onLogin={async (choice) => {
            const { data: account } = await api.get("/security/session/");
            const destination = resolveLoginWorkspace(account, choice);
            if (!destination) {
              await api.post("/cerrar_sesion/");
              return choice === "admin"
                ? "Esta cuenta no tiene acceso al panel administrativo. Elige el espacio de usuarios o solicita acceso a un administrador."
                : "Esta cuenta no tiene acceso al portal de usuarios. Elige administración si corresponde a tu rol.";
            }
            setUser(account);
            navigate(workspaceBase(destination));
            return null;
          }}
        />
      ) : user ? (
        (() => {
          const area = workspaceForPath(loc.pathname);
          if (area && canEnterWorkspace(user, area)) {
            return (
              <Workspace
                key={`${user.id}-${area}`}
                user={user}
                area={area}
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
            );
          }
          const primary = workspaceBase(getPrimaryWorkspace(user));
          const legacyPath = loc.pathname === "/dashboard" ? "" : loc.pathname;
          return <Navigate to={area ? primary : `${primary}${legacyPath}`} replace />;
        })()
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
