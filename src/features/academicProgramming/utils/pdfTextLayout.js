/** Tolerancia vertical (pt) para agrupar items de la misma línea. */
const LINE_Y_TOLERANCE = 2.5;

/**
 * Convierte items de pdf.js en texto con saltos de línea según posición Y.
 * Evita aplastar toda la página en una sola línea (rompe parsers por bloques).
 * @param {Array<{ str?: string, transform?: number[] }>} items
 * @returns {string}
 */
export function textItemsToLinedText(items) {
  const enriched = (items || [])
    .filter((item) => item && typeof item.str === "string" && item.str.length)
    .map((item) => ({
      str: item.str,
      x: Array.isArray(item.transform) ? Number(item.transform[4]) || 0 : 0,
      y: Array.isArray(item.transform) ? Number(item.transform[5]) || 0 : 0,
    }));

  if (!enriched.length) return "";

  enriched.sort((a, b) => b.y - a.y || a.x - b.x);

  const lines = [];
  let current = [];
  let lastY = null;

  for (const item of enriched) {
    if (lastY !== null && Math.abs(item.y - lastY) > LINE_Y_TOLERANCE) {
      lines.push(current.join(" ").replace(/[ \t]+/g, " ").trim());
      current = [];
    }
    current.push(item.str);
    lastY = item.y;
  }
  if (current.length) {
    lines.push(current.join(" ").replace(/[ \t]+/g, " ").trim());
  }

  return lines.filter(Boolean).join("\n");
}
