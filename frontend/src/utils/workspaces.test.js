import assert from "node:assert/strict";
import test from "node:test";
import {
  canEnterWorkspace,
  getPrimaryWorkspace,
  hasUserWorkspace,
  isAdministrator,
  resolveLoginWorkspace,
  workspaceForPath,
  workspaceRoute,
} from "./workspaces.js";

test("administrator starts in the existing administration area", () => {
  const admin = { admin: true, roles: ["Administrador"] };
  assert.equal(isAdministrator(admin), true);
  assert.equal(getPrimaryWorkspace(admin), "admin");
  assert.equal(canEnterWorkspace(admin, "admin"), true);
  assert.equal(canEnterWorkspace(admin, "portal"), false);
});

test("a user with multiple roles starts in the field workflow when applicable", () => {
  const technician = { roles: ["Propietario Solar", "Técnico de Campo"] };
  assert.equal(getPrimaryWorkspace(technician), "field");
  assert.equal(canEnterWorkspace(technician, "field"), true);
  assert.equal(canEnterWorkspace(technician, "admin"), false);
});

test("homeowners and community leaders enter the user portal", () => {
  for (const role of ["Propietario Solar", "Líder Comunitario"]) {
    const user = { roles: [role] };
    assert.equal(getPrimaryWorkspace(user), "portal");
    assert.equal(canEnterWorkspace(user, "portal"), true);
  }
});

test("login choice routes only to workspaces allowed by the account roles", () => {
  const administrator = { is_superuser: true, roles: [] };
  const homeowner = { roles: ["Propietario Solar"] };
  const technician = { roles: ["Técnico de Campo"] };
  const combined = { admin: true, roles: ["Administrador", "Propietario Solar"] };

  assert.equal(resolveLoginWorkspace(administrator, "admin"), "admin");
  assert.equal(resolveLoginWorkspace(administrator, "portal"), null);
  assert.equal(resolveLoginWorkspace(homeowner, "portal"), "portal");
  assert.equal(resolveLoginWorkspace(homeowner, "admin"), null);
  assert.equal(resolveLoginWorkspace(technician, "portal"), "field");
  assert.equal(resolveLoginWorkspace(combined, "admin"), "admin");
  assert.equal(resolveLoginWorkspace(combined, "portal"), "portal");
});

test("roleless accounts reach the portal's safe empty state", () => {
  const user = { roles: [] };
  assert.equal(hasUserWorkspace(user), false);
  assert.equal(getPrimaryWorkspace(user), "portal");
  assert.equal(canEnterWorkspace(user, "portal"), true);
});

test("workspace URLs are consistently namespaced", () => {
  assert.equal(workspaceRoute("admin"), "/administracion");
  assert.equal(workspaceRoute("admin", "/alertas"), "/administracion/alertas");
  assert.equal(workspaceRoute("field", "mis-casos"), "/campo/mis-casos");
  assert.equal(workspaceRoute("portal", "/perfil"), "/portal/perfil");
  assert.equal(workspaceForPath("/administracion/alertas"), "admin");
  assert.equal(workspaceForPath("/portal"), "portal");
  assert.equal(workspaceForPath("/dashboard"), null);
});
