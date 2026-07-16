import { normalizeCellText } from "./normalizeCellText";

/**
 * @param {string} value
 * @returns {"PRESENCIAL" | "VIRTUAL" | "E_LEARNING" | "BLENDED" | "UNKNOWN"}
 */
export function parseModality(value) {
  const raw = normalizeCellText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!raw) return "UNKNOWN";

  if (raw.includes("E LEARNING") || raw === "ELEARNING") return "E_LEARNING";
  if (raw.includes("BLENDED") || raw.includes("HIBRID")) return "BLENDED";
  if (raw.includes("VIRTUAL") || raw.includes("ONLINE")) return "VIRTUAL";
  if (raw.includes("PRESENCIAL")) return "PRESENCIAL";

  return "UNKNOWN";
}
