/**
 * Claves versionadas de localStorage para Malla Pro.
 * Legado se mantiene durante la migración gradual.
 */

export const STORAGE_SCHEMA_VERSION = 1;
export const PARSER_VERSION = "UNAB_ACADEMIC_PROGRAMMING";

/** Claves legacy (lectura + dual-write durante migración) */
export const LEGACY_KEYS = {
  seleccionada: "malla-seleccionada",
  aprobados: "malla-aprobados",
  excepciones: "malla-excepciones",
  cursando: "malla-cursando",
  nombresConservados: "malla-nombres-conservados",
  theme: "malla-theme",
  darkmode: "malla-darkmode",
  notas: "malla-notas",
  configs: "malla-configs",
  examenes: "malla-examenes",
  horario: "malla-horario-v1",
  propuesta: "malla-programacion-propuesta",
  programacionV1: "malla-programacion-academica-v1",
  tour: "malla-has-seen-tour",
};

/**
 * @param {string} careerId
 */
export function academicProgressKey(careerId) {
  return `mallaPro:v1:career:${careerId}:academicProgress`;
}

/**
 * @param {string} careerId
 * @param {string} periodId
 */
export function courseRegistrationKey(careerId, periodId) {
  return `mallaPro:v1:career:${careerId}:courseRegistration:${periodId}`;
}

/**
 * Identificador estable de carrera a partir de la malla seleccionada.
 * No depende solo del nombre visible.
 * @param {{ url?: string, nombre?: string } | null | undefined} malla
 */
export function getCareerId(malla) {
  if (!malla || typeof malla !== "object") return "unknown";
  const url = typeof malla.url === "string" ? malla.url.trim() : "";
  if (url) {
    const uniMatch = url.match(/\/mallas\/([^/]+)\//i);
    const uni = (uniMatch?.[1] || "unab").toLowerCase();
    const file = url
      .replace(/^.*\//, "")
      .replace(/\.json$/i, "")
      .toLowerCase();
    const id = `${uni}-${file}`.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (id) return id;
  }
  const nombre = typeof malla.nombre === "string" ? malla.nombre : "carrera";
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "unknown";
}

/**
 * @param {import('../features/academicProgramming/types/academicProgramming.js') | object | null | undefined} programming
 */
export function getPeriodId(programming) {
  if (!programming || typeof programming !== "object") return "unknown";

  const ap = programming.academicPeriod;
  if (ap?.year != null && ap?.semester != null) {
    return `${ap.year}-${ap.semester}`;
  }

  const label = ap?.label || programming.periodLabel || "";
  const match = String(label).match(/(20\d{2})\s*[-–]?\s*([12])/);
  if (match) return `${match[1]}-${match[2]}`;

  if (programming.period?.year && programming.period?.semester) {
    return `${programming.period.year}-${programming.period.semester}`;
  }

  // Horario del alumno sin periodo académico explícito
  if (
    programming.source?.parser === "UNAB_STUDENT_SCHEDULE" ||
    (programming.source?.sources?.horarioAlumno &&
      !programming.source?.sources?.programacionAcademica)
  ) {
    return "student-schedule";
  }

  return "unknown";
}

/**
 * @param {object | null | undefined} programming
 */
export function getPeriodLabel(programming) {
  if (!programming || typeof programming !== "object") return "Periodo";
  if (programming.academicPeriod?.label) return programming.academicPeriod.label;
  const id = getPeriodId(programming);
  if (id !== "unknown") return id;
  return programming.periodLabel || "Periodo";
}
