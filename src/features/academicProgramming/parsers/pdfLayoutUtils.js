/**
 * Utilidades de layout para texto extraído con coordenadas PDF.js.
 */

export const COLUMN_KEYS = [
  "nrc",
  "linkedNrcs",
  "activityType",
  "courseCode",
  "sectionNumber",
  "courseTitle",
  "capacity",
  "professors",
  "schedule",
  "modality",
];

/** Etiquetas de cabecera esperadas (normalizadas) → clave de columna */
export const HEADER_ALIASES = [
  { key: "nrc", patterns: ["NRC"] },
  { key: "linkedNrcs", patterns: ["NRC LIGADOS", "NRC LIGADO"] },
  { key: "activityType", patterns: ["TIPO ACTIVIDAD", "TIPO DE ACTIVIDAD"] },
  { key: "courseCode", patterns: ["CODIGO ASIGNATURA", "CÓDIGO ASIGNATURA", "CODIGO"] },
  { key: "sectionNumber", patterns: ["SECCION", "SECCIÓN"] },
  { key: "courseTitle", patterns: ["TITULO", "TÍTULO"] },
  { key: "capacity", patterns: ["VACANTES", "VACANTE"] },
  { key: "professors", patterns: ["NOMBRE PROFESOR", "PROFESOR", "NOMBRE PROFESORES"] },
  { key: "schedule", patterns: ["HORARIO"] },
  { key: "modality", patterns: ["MODALIDAD"] },
];

/**
 * @param {string} text
 * @returns {string}
 */
export function normalizeHeaderText(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Convierte items de PDF.js a elementos con x/y/width.
 * @param {Array<{ str?: string, transform?: number[], width?: number, height?: number }>} items
 * @param {number} [pageHeight]
 */
export function mapPdfTextItems(items, pageHeight = 0) {
  return (items || [])
    .filter((item) => item && String(item.str ?? "").trim())
    .map((item, index) => {
      const transform = item.transform || [1, 0, 0, 1, 0, 0];
      const x = transform[4] ?? 0;
      const yPdf = transform[5] ?? 0;
      // PDF y crece hacia arriba; invertimos para orden visual de arriba → abajo
      const y = pageHeight ? pageHeight - yPdf : -yPdf;
      return {
        id: index,
        text: String(item.str),
        x,
        y,
        yPdf,
        width: item.width ?? Math.max(4, String(item.str).length * 4),
        height: item.height ?? Math.abs(transform[3] || transform[0] || 8),
      };
    });
}

/**
 * Agrupa elementos cercanos verticalmente en filas.
 * @param {Array<{ x: number, y: number, text: string, width?: number }>} elements
 * @param {number} [tolerance]
 */
export function groupElementsIntoRows(elements, tolerance = 3.5) {
  const sorted = [...(elements || [])].sort((a, b) => {
    if (Math.abs(a.y - b.y) > tolerance) return a.y - b.y;
    return a.x - b.x;
  });

  /** @type {Array<{ y: number, items: typeof sorted }>} */
  const rows = [];

  for (const el of sorted) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(last.y - el.y) <= tolerance) {
      last.items.push(el);
      last.y = (last.y * (last.items.length - 1) + el.y) / last.items.length;
    } else {
      rows.push({ y: el.y, items: [el] });
    }
  }

  for (const row of rows) {
    row.items.sort((a, b) => a.x - b.x);
  }

  return rows;
}

/**
 * Detecta límites de columnas a partir de una fila de cabecera.
 * @param {Array<{ x: number, text: string, width?: number }>} headerItems
 * @param {number} [pageWidth]
 * @returns {Record<string, { start: number, end: number, center: number }> | null}
 */
export function detectColumnBounds(headerItems, pageWidth = 1000) {
  /** @type {Array<{ key: string, x: number, width: number, text: string }>} */
  const found = [];

  for (const item of headerItems || []) {
    const norm = normalizeHeaderText(item.text);
    if (!norm) continue;

    for (const alias of HEADER_ALIASES) {
      const matched = alias.patterns.some(
        (p) => norm === normalizeHeaderText(p) || norm.includes(normalizeHeaderText(p))
      );
      if (matched && !found.some((f) => f.key === alias.key)) {
        found.push({
          key: alias.key,
          x: item.x,
          width: item.width || 20,
          text: item.text,
        });
        break;
      }
    }
  }

  // También intentar emparejar cabeceras multilínea uniendo items cercanos de la misma zona
  if (found.length < 5) {
    const merged = mergeNearbyHeaderTexts(headerItems);
    for (const item of merged) {
      const norm = normalizeHeaderText(item.text);
      for (const alias of HEADER_ALIASES) {
        const matched = alias.patterns.some(
          (p) => norm === normalizeHeaderText(p) || norm.includes(normalizeHeaderText(p))
        );
        if (matched && !found.some((f) => f.key === alias.key)) {
          found.push({
            key: alias.key,
            x: item.x,
            width: item.width || 20,
            text: item.text,
          });
          break;
        }
      }
    }
  }

  if (found.length < 5) return null;

  found.sort((a, b) => a.x - b.x);

  /** @type {Record<string, { start: number, end: number, center: number }>} */
  const bounds = {};

  for (let i = 0; i < found.length; i++) {
    const current = found[i];
    const prev = found[i - 1];
    const next = found[i + 1];

    const start = prev
      ? (prev.x + prev.width + current.x) / 2
      : Math.max(0, current.x - 8);
    const end = next
      ? (current.x + current.width + next.x) / 2
      : pageWidth;

    bounds[current.key] = {
      start,
      end,
      center: current.x + current.width / 2,
    };
  }

  return bounds;
}

/**
 * Une textos de cabecera cercanos horizontalmente.
 * @param {Array<{ x: number, text: string, width?: number }>} items
 */
function mergeNearbyHeaderTexts(items) {
  const sorted = [...(items || [])].sort((a, b) => a.x - b.x);
  const groups = [];

  for (const item of sorted) {
    const last = groups[groups.length - 1];
    const gap = last ? item.x - (last.x + (last.width || 0)) : Infinity;
    if (last && gap < 14) {
      last.text = `${last.text} ${item.text}`.replace(/\s+/g, " ").trim();
      last.width = item.x + (item.width || 0) - last.x;
    } else {
      groups.push({
        x: item.x,
        text: item.text,
        width: item.width || 20,
      });
    }
  }

  return groups;
}

/**
 * Asigna un elemento de texto a la columna cuyo rango contiene su centro.
 * @param {{ x: number, width?: number }} element
 * @param {Record<string, { start: number, end: number }>} columnBounds
 * @returns {string | null}
 */
export function assignElementToColumn(element, columnBounds) {
  if (!columnBounds) return null;
  const center = element.x + (element.width || 0) / 2;

  let bestKey = null;
  let bestDist = Infinity;

  for (const [key, bound] of Object.entries(columnBounds)) {
    if (center >= bound.start - 2 && center <= bound.end + 2) {
      const mid = (bound.start + bound.end) / 2;
      const dist = Math.abs(center - mid);
      if (dist < bestDist) {
        bestDist = dist;
        bestKey = key;
      }
    }
  }

  return bestKey;
}

/**
 * Convierte una fila de items en un mapa columna → fragmentos.
 * @param {Array<{ x: number, text: string, width?: number }>} rowItems
 * @param {Record<string, { start: number, end: number }>} columnBounds
 */
export function rowItemsToColumnFragments(rowItems, columnBounds) {
  /** @type {Record<string, string[]>} */
  const cells = {};
  /** @type {string[]} */
  const unassigned = [];

  for (const item of rowItems || []) {
    const key = assignElementToColumn(item, columnBounds);
    if (!key) {
      unassigned.push(item.text);
      continue;
    }
    if (!cells[key]) cells[key] = [];
    cells[key].push(item.text);
  }

  return { cells, unassigned };
}

/**
 * Une filas de cabecera multilínea cercanas.
 * @param {Array<{ y: number, items: Array<{ x: number, text: string, width?: number }> }>} rows
 * @param {number} [maxGap]
 */
export function findHeaderRowCluster(rows, maxGap = 18) {
  for (let i = 0; i < rows.length; i++) {
    const clusterItems = [...rows[i].items];
    let j = i + 1;
    while (j < rows.length && rows[j].y - rows[j - 1].y <= maxGap) {
      const probe = [...clusterItems, ...rows[j].items];
      const bounds = detectColumnBounds(probe);
      if (bounds && Object.keys(bounds).length >= 5) {
        clusterItems.push(...rows[j].items);
        j += 1;
      } else if (normalizeHeaderText(rows[j].items.map((it) => it.text).join(" ")).match(/NRC|TITULO|HORARIO|MODALIDAD|VACANTES|SECCION/)) {
        clusterItems.push(...rows[j].items);
        j += 1;
      } else {
        break;
      }
    }

    const bounds = detectColumnBounds(clusterItems);
    if (bounds && Object.keys(bounds).length >= 6) {
      return { startIndex: i, endIndex: j - 1, bounds, items: clusterItems };
    }
  }

  return null;
}
