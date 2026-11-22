export function getOwnerSystemStatus({
  loading = false,
  error = "",
  installations = [],
  devices = [],
  devicesWithoutContact = [],
  openAlerts = [],
  availability = {},
}) {
  if (loading) {
    return {
      tone: "loading",
      title: "Revisando tu sistema",
      description: "Estamos buscando el estado más reciente de tu instalación.",
      action: null,
      target: null,
    };
  }

  if (error) {
    return {
      tone: "attention",
      title: "No pudimos actualizar tus datos",
      description: "Vuelve a intentarlo para consultar el estado de tu sistema.",
      action: "Actualizar datos",
      target: null,
    };
  }

  if (availability.installations === false) {
    return {
      tone: "attention",
      title: "No pudimos consultar tu instalación",
      description: "Actualiza los datos para volver a revisar el sistema vinculado a tu cuenta.",
      action: "Intentar de nuevo",
      target: null,
    };
  }

  if (availability.alerts === false) {
    return {
      tone: "attention",
      title: "No pudimos revisar los avisos",
      description: "Actualiza los datos para confirmar si hay algo que necesite tu atención.",
      action: "Intentar de nuevo",
      target: null,
    };
  }

  if (!installations.length) {
    return {
      tone: "waiting",
      title: "Tu instalación aún no está vinculada",
      description: "Pide al administrador que asocie el sistema solar con tu cuenta.",
      action: null,
      target: null,
    };
  }

  if (openAlerts.length) {
    const firstAlert = openAlerts[0];
    const alertName = firstAlert.tipo_alerta_display || firstAlert.tipo_medicion_display || "un aviso del sistema";
    return {
      tone: "attention",
      title: `${openAlerts.length} ${openAlerts.length === 1 ? "aviso requiere" : "avisos requieren"} tu atención`,
      description: `El aviso más importante es ${alertName}. Revisa el detalle y su prioridad.`,
      action: "Revisar avisos",
      target: "#avisos",
    };
  }

  if (availability.devices === false) {
    return {
      tone: "caution",
      title: "No pudimos confirmar el estado de tus equipos",
      description: "Actualiza los datos para comprobar su comunicación y sus lecturas recientes.",
      action: "Intentar de nuevo",
      target: null,
    };
  }

  if (devicesWithoutContact.length) {
    const device = devicesWithoutContact[0];
    return {
      tone: "caution",
      title: "Hay un equipo sin comunicación registrada",
      description: `${devicesWithoutContact.length > 1 ? `${devicesWithoutContact.length} equipos no tienen` : `${device.codigo || "Tu equipo"} no tiene`} una conexión registrada. Consulta el equipo o contacta a tu técnico.`,
      action: "Ver equipos",
      target: "#equipos",
    };
  }

  if (!devices.length) {
    return {
      tone: "waiting",
      title: "Tu instalación está vinculada",
      description: "Cuando se asocie un equipo, aquí aparecerán sus mediciones y conexión.",
      action: "Ver instalación",
      target: "#mi-sistema",
    };
  }

  return {
    tone: "calm",
    title: "No hay avisos pendientes",
    description: "Puedes consultar las lecturas y el historial de tu sistema cuando lo necesites.",
    action: "Ver mediciones",
    target: "#equipos",
  };
}
