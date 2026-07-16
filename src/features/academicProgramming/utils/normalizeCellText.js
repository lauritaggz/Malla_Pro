/**
 * Une fragmentos de celda respetando guiones de continuación.
 * @param {string[]} fragments
 * @returns {string}
 */
export function joinHyphenatedFragments(fragments) {
  if (!Array.isArray(fragments) || fragments.length === 0) return "";

  let result = "";
  for (const raw of fragments) {
    const part = String(raw ?? "").replace(/\s+/g, " ").trim();
    if (!part) continue;

    if (!result) {
      result = part;
      continue;
    }

    if (result.endsWith("-")) {
      result += part;
    } else if (part.startsWith("-") && !result.endsWith(" ")) {
      result += part;
    } else {
      result += ` ${part}`;
    }
  }

  return result.replace(/\s+/g, " ").trim();
}

/**
 * Limpia texto de celda: espacios, saltos y fragmentos unidos por guion.
 * @param {string | string[]} value
 * @returns {string}
 */
export function normalizeCellText(value) {
  if (Array.isArray(value)) {
    return joinHyphenatedFragments(value);
  }

  return String(value ?? "")
    .replace(/\r\n|\r|\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normaliza títulos (capitalización suave, sin inventar palabras).
 * @param {string} title
 * @returns {string}
 */
export function normalizeCourseTitle(title) {
  const cleaned = normalizeCellText(title);
  if (!cleaned) return "";

  // Conservar el texto reconstruido; solo colapsar espacios.
  return cleaned;
}
