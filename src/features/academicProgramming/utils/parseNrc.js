import { normalizeCellText } from "./normalizeCellText";

/**
 * Une dígitos de un NRC que puede venir partido en varias líneas.
 * @param {string | string[]} value
 * @returns {string}
 */
export function parseNrc(value) {
  const text = Array.isArray(value)
    ? value.map((v) => String(v ?? "").trim()).join("")
    : String(value ?? "");

  const digits = text.replace(/\D/g, "");
  return digits;
}

/**
 * Parsea NRC ligados a un arreglo de strings numéricos.
 * @param {string | string[]} value
 * @returns {string[]}
 */
export function parseLinkedNrcs(value) {
  const text = normalizeCellText(value);
  if (!text || text === "-" || text === "—") return [];

  const matches = text.match(/\d{4,}/g);
  if (!matches) return [];

  return [...new Set(matches)];
}
