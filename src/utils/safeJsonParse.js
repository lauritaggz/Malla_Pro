/**
 * Parsea JSON desde localStorage (o cualquier string) sin lanzar.
 * @template T
 * @param {string | null} raw
 * @param {T} fallback
 * @returns {T}
 */
export function safeJsonParse(raw, fallback) {
  if (raw == null || raw === "") return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
