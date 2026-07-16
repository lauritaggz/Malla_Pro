/**
 * Normaliza un código de asignatura eliminando espacios y símbolos.
 * @param {string} code
 * @returns {string}
 */
export function normalizeCourseCode(code) {
  return String(code ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}
