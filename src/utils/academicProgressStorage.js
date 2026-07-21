import { safeStorage } from "./safeStorage";
import {
  LEGACY_KEYS,
  STORAGE_SCHEMA_VERSION,
  academicProgressKey,
  getCareerId,
} from "./storageKeys";

/**
 * @typedef {{ aprobados: number[], excepciones: number[], cursando: number[], schemaVersion?: number }} AcademicProgress
 */

/**
 * @param {unknown} value
 * @returns {number[]}
 */
function normalizeIdList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((v) => Number(v)).filter((n) => Number.isFinite(n));
}

/**
 * @returns {AcademicProgress}
 */
function emptyProgress() {
  return {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    aprobados: [],
    excepciones: [],
    cursando: [],
  };
}

/**
 * Lee progreso legacy (claves globales).
 * @returns {AcademicProgress}
 */
export function readLegacyAcademicProgress() {
  return {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    aprobados: normalizeIdList(safeStorage.get(LEGACY_KEYS.aprobados, [])),
    excepciones: normalizeIdList(safeStorage.get(LEGACY_KEYS.excepciones, [])),
    cursando: normalizeIdList(safeStorage.get(LEGACY_KEYS.cursando, [])),
  };
}

/**
 * Migra progreso legacy → namespace de carrera si aún no existe.
 * No borra las claves legacy hasta que el write confirme éxito.
 * @param {string} careerId
 * @returns {AcademicProgress}
 */
export function migrateAcademicProgressIfNeeded(careerId) {
  if (!careerId || careerId === "unknown") {
    return readLegacyAcademicProgress();
  }

  const key = academicProgressKey(careerId);
  const existing = safeStorage.get(key, null, {
    validate: (v) => v != null && typeof v === "object",
    removeOnInvalid: true,
  });

  if (existing) {
    return {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      aprobados: normalizeIdList(existing.aprobados),
      excepciones: normalizeIdList(existing.excepciones),
      cursando: normalizeIdList(existing.cursando),
    };
  }

  const legacy = readLegacyAcademicProgress();
  const hasLegacy =
    legacy.aprobados.length > 0 ||
    legacy.excepciones.length > 0 ||
    legacy.cursando.length > 0;

  if (hasLegacy) {
    const result = safeStorage.set(key, legacy);
    if (result.ok) {
      // Dual-write se mantiene; no eliminamos legacy todavía
      // para no romper lectores que aún no migraron.
    }
  }

  return legacy;
}

/**
 * @param {{ url?: string, nombre?: string } | null} [malla]
 * @returns {AcademicProgress}
 */
export function readAcademicProgress(malla) {
  const careerId = getCareerId(malla);
  if (careerId === "unknown") {
    return readLegacyAcademicProgress();
  }
  return migrateAcademicProgressIfNeeded(careerId);
}

/**
 * Escribe en namespace de carrera + dual-write legacy (compatibilidad).
 * @param {{ url?: string, nombre?: string } | null} malla
 * @param {{ aprobados?: number[], excepciones?: number[], cursando?: number[] }} progress
 * @returns {{ ok: boolean, userMessage?: string }}
 */
export function writeAcademicProgress(malla, progress) {
  const payload = {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    aprobados: normalizeIdList(progress.aprobados),
    excepciones: normalizeIdList(progress.excepciones),
    cursando: normalizeIdList(progress.cursando),
  };

  const careerId = getCareerId(malla);
  let namespacedOk = true;

  if (careerId !== "unknown") {
    const result = safeStorage.set(academicProgressKey(careerId), payload);
    namespacedOk = result.ok;
  }

  // Dual-write legacy para PeriodoActualView / curriculumProgress sin malla
  const a = safeStorage.set(LEGACY_KEYS.aprobados, payload.aprobados);
  const e = safeStorage.set(LEGACY_KEYS.excepciones, payload.excepciones);
  const c = safeStorage.set(LEGACY_KEYS.cursando, payload.cursando);

  const ok = namespacedOk && a.ok && e.ok && c.ok;
  return {
    ok,
    userMessage: ok ? undefined : a.userMessage || e.userMessage || c.userMessage,
  };
}

/**
 * Limpia progreso de la carrera actual y claves legacy.
 * @param {{ url?: string, nombre?: string } | null} malla
 */
export function clearAcademicProgress(malla) {
  const careerId = getCareerId(malla);
  if (careerId !== "unknown") {
    safeStorage.remove(academicProgressKey(careerId));
  }
  safeStorage.remove(LEGACY_KEYS.aprobados);
  safeStorage.remove(LEGACY_KEYS.excepciones);
  safeStorage.remove(LEGACY_KEYS.cursando);
}

/**
 * Restaura IDs aprobados por nombre conservado al cambiar de malla.
 * @param {object} mallaData
 * @returns {number[]}
 */
export function consumeConservedApprovedIds(mallaData) {
  const names = safeStorage.get(LEGACY_KEYS.nombresConservados, null, {
    validate: Array.isArray,
  });
  if (!names || !mallaData) return [];

  const nameSet = new Set(
    names.map((n) => String(n).trim().toLowerCase()).filter(Boolean)
  );
  const ids = [];

  const visit = (curso) => {
    if (!curso || curso.id == null) return;
    const nombre = String(curso.nombre || "").trim().toLowerCase();
    if (nameSet.has(nombre)) ids.push(Number(curso.id));
  };

  const walkSemesters = (sems) => {
    (sems || []).forEach((sem) => (sem.cursos || []).forEach(visit));
  };

  walkSemesters(mallaData.semestres);
  walkSemesters(mallaData.semestresComunes || mallaData.semestres_comunes);
  Object.values(mallaData.menciones || {}).forEach((m) => {
    walkSemesters(m.semestres);
  });

  safeStorage.remove(LEGACY_KEYS.nombresConservados);
  return [...new Set(ids.filter(Number.isFinite))];
}
