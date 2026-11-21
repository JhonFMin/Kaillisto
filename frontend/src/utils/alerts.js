const priorityOrder = (alert) => {
  const priority = String(alert?.prioridad_display || alert?.prioridad || "").toLocaleLowerCase("es-CO");
  if (/crit|urg|alta|alto/.test(priority)) return 0;
  if (/med|moder/.test(priority)) return 1;
  if (/baja|low/.test(priority)) return 2;
  return 3;
};

export function mostImportantAlertsFirst(alerts) {
  return [...alerts].sort((a, b) => priorityOrder(a) - priorityOrder(b)
    || new Date(b?.fecha_creacion || 0).getTime() - new Date(a?.fecha_creacion || 0).getTime());
}
