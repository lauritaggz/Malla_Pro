import { normalizeCellText, joinHyphenatedFragments } from "./normalizeCellText";

/**
 * @param {string} name
 * @returns {string}
 */
function collapsePorDefinir(name) {
  return name
    .replace(/(POR\s+DEFINIR)(?:\s+POR\s+DEFINIR)+/gi, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {string} name
 * @returns {string}
 */
function normalizeProfessorKey(name) {
  return collapsePorDefinir(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Separa profesores por `/`, une líneas y elimina duplicados exactos normalizados.
 * @param {string | string[]} value
 * @returns {string[]}
 */
export function parseProfessors(value) {
  const joined = Array.isArray(value)
    ? joinHyphenatedFragments(value)
    : normalizeCellText(value);

  if (!joined || joined === "-" || joined === "—") return [];

  const parts = joined
    .split(/\s*\/\s*/)
    .map((p) => collapsePorDefinir(p.replace(/\s+/g, " ").trim()))
    .filter(Boolean);

  const seen = new Set();
  const result = [];

  for (const part of parts) {
    const key = normalizeProfessorKey(part);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(part);
  }

  return result;
}
