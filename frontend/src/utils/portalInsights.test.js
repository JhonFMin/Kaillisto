import assert from "node:assert/strict";
import test from "node:test";
import { getOwnerSystemStatus } from "./portalInsights.js";

test("owner overview gives active alerts the first action", () => {
  const status = getOwnerSystemStatus({
    installations: [{ id: 1 }],
    devices: [{ codigo: "ESP32-1" }],
    devicesWithoutContact: [{ codigo: "ESP32-1" }],
    openAlerts: [{ tipo_alerta_display: "Voltaje bajo" }],
  });

  assert.equal(status.tone, "attention");
  assert.equal(status.title, "1 aviso requiere tu atención");
  assert.equal(status.target, "#avisos");
});

test("owner overview explains missing device communication when there are no alerts", () => {
  const status = getOwnerSystemStatus({
    installations: [{ id: 1 }],
    devices: [{ codigo: "ESP32-1" }],
    devicesWithoutContact: [{ codigo: "ESP32-1" }],
  });

  assert.equal(status.tone, "caution");
  assert.match(status.description, /ESP32-1/);
  assert.equal(status.target, "#equipos");
});

test("owner overview does not claim a healthy system when it has no readings", () => {
  const status = getOwnerSystemStatus({ installations: [{ id: 1 }] });

  assert.equal(status.tone, "waiting");
  assert.equal(status.title, "Tu instalación está vinculada");
});

test("owner overview provides a retry when loading fails", () => {
  const status = getOwnerSystemStatus({ error: "network" });

  assert.equal(status.tone, "attention");
  assert.equal(status.action, "Actualizar datos");
});

test("owner overview does not show an empty-installation state when that source failed", () => {
  const status = getOwnerSystemStatus({
    installations: [],
    availability: { installations: false, alerts: true, devices: true },
  });

  assert.equal(status.title, "No pudimos consultar tu instalación");
  assert.equal(status.action, "Intentar de nuevo");
});

test("owner overview does not claim there are no alerts when alerts could not load", () => {
  const status = getOwnerSystemStatus({
    installations: [{ id: 1 }],
    devices: [{ codigo: "ESP32-1" }],
    availability: { installations: true, alerts: false, devices: true },
  });

  assert.equal(status.title, "No pudimos revisar los avisos");
  assert.equal(status.target, null);
});
