/**
 * Capa segura de eventos para Google Analytics 4 (gtag.js en index.html).
 * No envía datos personales — solo uso agregado de la app.
 */

export function generarSlug(texto = "") {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getDeviceContext() {
  if (typeof window === "undefined") return "unknown";
  const w = window.innerWidth;
  if (w <= 640) return "mobile";
  if (w <= 1024) return "tablet";
  return "desktop";
}

export function inferUniversidadFromUrl(url = "") {
  if (url.includes("uch")) return "Universidad de Chile";
  if (url.includes("/mallas/") || url.endsWith(".json")) {
    return "Universidad Andrés Bello";
  }
  return "No especificada";
}

export function buildMallaParams(malla, extra = {}) {
  if (!malla) return { ...extra };
  return {
    malla_nombre: malla.nombre || "Sin nombre",
    malla_url: malla.url || "Sin URL",
    malla_slug: generarSlug(malla.nombre || ""),
    universidad: malla.universidad || inferUniversidadFromUrl(malla.url) || "No especificada",
    ...extra,
  };
}

export function countMallaCursos(mallaData) {
  if (!mallaData) return 0;
  let total = 0;
  const countSemestres = (sems) => {
    (sems || []).forEach((sem) => {
      total += sem.cursos?.length || 0;
    });
  };
  countSemestres(mallaData.semestres);
  countSemestres(mallaData.semestresComunes);
  Object.values(mallaData.menciones || {}).forEach((m) => {
    countSemestres(m.semestres);
  });
  return total;
}

export function countMallaSemestres(mallaData) {
  if (!mallaData) return 0;
  if (mallaData.totalSemestres) return mallaData.totalSemestres;
  return mallaData.semestres?.length || 0;
}

export function trackEvent(eventName, params = {}) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;

  if (import.meta.env.DEV) {
    console.log("[GA4 event]", eventName, params);
  }

  window.gtag("event", eventName, params);
}

export function trackMallaView(mallaSeleccionada, mallaData, extra = {}) {
  if (!mallaSeleccionada || !mallaData) return;

  trackEvent("view_malla", {
    ...buildMallaParams(mallaSeleccionada),
    total_semestres: countMallaSemestres(mallaData),
    total_cursos: countMallaCursos(mallaData),
    device_context: getDeviceContext(),
    source: "malla_viewer",
    ...extra,
  });
}

export function trackSelectMalla(malla) {
  if (!malla) return;

  trackEvent("select_malla", {
    ...buildMallaParams(malla),
    source: "selector_mallas",
    device_context: getDeviceContext(),
  });
}

export function trackFullscreenMalla(malla, opening) {
  trackEvent(opening ? "fullscreen_malla_open" : "fullscreen_malla_close", {
    ...buildMallaParams(malla),
    device_context: getDeviceContext(),
  });
}

export function trackOpenNotas(malla, curso) {
  trackEvent("open_notas", {
    ...buildMallaParams(malla),
    curso_codigo: curso?.codigo || "sin_codigo",
    device_context: getDeviceContext(),
  });
}

export function trackToggleCursoEstado(malla, curso, estado) {
  trackEvent("toggle_curso_estado", {
    ...buildMallaParams(malla),
    curso_codigo: curso?.codigo || "sin_codigo",
    estado,
    device_context: getDeviceContext(),
  });
}
