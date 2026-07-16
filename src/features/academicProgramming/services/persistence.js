/**
 * Persistencia opcional del JSON normalizado (desactivada por defecto en v1).
 * Encapsulada para poder habilitarla sin tocar la UI.
 */

const STORAGE_KEY = "malla-programacion-academica-v1";
const ENABLED = false;

/**
 * @param {import('../types/academicProgramming').AcademicProgramming} programming
 */
export function saveAcademicProgramming(programming) {
  if (!ENABLED || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(programming));
  } catch {
    // ignore quota / private mode
  }
}

/**
 * @returns {import('../types/academicProgramming').AcademicProgramming | null}
 */
export function loadAcademicProgramming() {
  if (!ENABLED || typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearAcademicProgramming() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function isAcademicProgrammingPersistenceEnabled() {
  return ENABLED;
}
