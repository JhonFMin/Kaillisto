export const WORKSPACE_BASES = Object.freeze({
  // Keep the SPA admin workspace separate from Django's built-in /admin/.
  admin: "/administracion",
  portal: "/portal",
  field: "/campo",
});

const USER_ROLES = new Set([
  "Propietario Solar",
  "Líder Comunitario",
  "Técnico de Campo",
]);

const rolesOf = (user) => new Set(user?.roles || []);

export function isAdministrator(user) {
  const roles = rolesOf(user);
  return Boolean(user && (user.is_superuser || user.admin || roles.has("Administrador")));
}

export function hasUserWorkspace(user) {
  const roles = rolesOf(user);
  return [...USER_ROLES].some((role) => roles.has(role));
}

export function getPrimaryWorkspace(user) {
  if (!user) return null;
  if (isAdministrator(user)) return "admin";
  if (rolesOf(user).has("Técnico de Campo")) return "field";
  return "portal";
}

export function canEnterWorkspace(user, workspace) {
  if (!user || !WORKSPACE_BASES[workspace]) return false;
  if (workspace === "admin") return isAdministrator(user);
  if (workspace === "field") return rolesOf(user).has("Técnico de Campo");
  return !isAdministrator(user) || hasUserWorkspace(user);
}

export function workspaceBase(workspace) {
  return WORKSPACE_BASES[workspace] || WORKSPACE_BASES.portal;
}

export function workspaceForPath(pathname) {
  return Object.entries(WORKSPACE_BASES)
    .find(([, base]) => pathname === base || pathname.startsWith(`${base}/`))?.[0] || null;
}

export function workspaceRoute(workspace, path = "") {
  const base = workspaceBase(workspace);
  const suffix = String(path || "").replace(/^\/+/, "");
  return suffix ? `${base}/${suffix}` : base;
}
