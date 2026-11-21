import assert from "node:assert/strict";
import test from "node:test";
import { mostImportantAlertsFirst } from "./alerts.js";

test("pending alerts are sorted by urgency before recency", () => {
  const alerts = [
    { id: 1, prioridad_display: "Baja", fecha_creacion: "2026-11-21T12:00:00Z" },
    { id: 2, prioridad_display: "Alta", fecha_creacion: "2026-11-20T12:00:00Z" },
    { id: 3, prioridad_display: "Alta", fecha_creacion: "2026-11-21T13:00:00Z" },
    { id: 4, prioridad_display: "Media", fecha_creacion: "2026-11-21T12:30:00Z" },
  ];
  assert.deepEqual(mostImportantAlertsFirst(alerts).map(({ id }) => id), [3, 2, 4, 1]);
});

test("sorting alerts does not mutate the API response", () => {
  const alerts = [{ id: 1, prioridad_display: "Baja" }, { id: 2, prioridad_display: "Urgente" }];
  mostImportantAlertsFirst(alerts);
  assert.deepEqual(alerts.map(({ id }) => id), [1, 2]);
});
