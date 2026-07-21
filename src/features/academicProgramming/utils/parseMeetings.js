import { joinHyphenatedFragments, normalizeCellText } from "./normalizeCellText";

/** @type {Record<string, 1|2|3|4|5|6|7>} */
export const DAY_CODE_TO_WEEKDAY = {
  LU: 1,
  MA: 2,
  MI: 3,
  JU: 4,
  VI: 5,
  SA: 6,
  DO: 7,
};

export const DAY_ORDER = ["LU", "MA", "MI", "JU", "VI", "SA", "DO"];

export const DAY_LABELS = {
  LU: "Lunes",
  MA: "Martes",
  MI: "Miércoles",
  JU: "Jueves",
  VI: "Viernes",
  SA: "Sábado",
  DO: "Domingo",
};

/** Alias frecuentes en PDFs / abreviaciones largas → código canónico */
const DAY_ALIASES = {
  LU: "LU",
  LUN: "LU",
  LUNES: "LU",
  MA: "MA",
  MAR: "MA",
  MARTES: "MA",
  MI: "MI",
  MIE: "MI",
  MIER: "MI",
  MIERCOLES: "MI",
  JU: "JU",
  JUE: "JU",
  JUEVES: "JU",
  VI: "VI",
  VIE: "VI",
  VIERNES: "VI",
  SA: "SA",
  SAB: "SA",
  SABADO: "SA",
  DO: "DO",
  DOM: "DO",
  DOMINGO: "DO",
};

const DAY_ALT = "LU|LUN|LUNES|MA|MAR|MARTES|MI|MIE|MIER|MIERCOLES|JU|JUE|JUEVES|VI|VIE|VIERNES|SA|SAB|SABADO|DO|DOM|DOMINGO";

const MEETING_SPLIT_RE = new RegExp(
  `(?=(?:${DAY_ALT})\\s+\\d{1,2}:\\d{2}\\s+A\\s+\\d{1,2}:\\d{2})`,
  "i"
);

// Permite sala pegada a la hora (ej. 21:25-) o separada (21:25 - / 21:25 VM-...)
const MEETING_PARSE_RE = new RegExp(
  `^(${DAY_ALT})\\s+(\\d{1,2}:\\d{2})\\s+A\\s+(\\d{1,2}:\\d{2})\\s*(.*)?$`,
  "i"
);

/**
 * @param {string} raw
 * @returns {import('../types/academicProgramming').DayCode | null}
 */
export function normalizeDayCode(raw) {
  const key = String(raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  return DAY_ALIASES[key] || null;
}

/**
 * Une fragmentos de horario/sala respetando guiones.
 * @param {string | string[]} value
 * @returns {string}
 */
export function normalizeScheduleText(value) {
  let text = Array.isArray(value)
    ? joinHyphenatedFragments(value)
    : normalizeCellText(value);

  // Separar guion de “sin sala” pegado a la hora: "21:25-" → "21:25 -"
  text = text.replace(/(\d{1,2}:\d{2})-(?=\s|$|;)/g, "$1 -");
  // También cuando el guion es el final absoluto del string: "21:25-"
  text = text.replace(/(\d{1,2}:\d{2})-$/g, "$1 -");

  return text;
}

/**
 * @param {string} raw
 * @returns {string | null}
 */
function normalizeClock(raw) {
  const m = String(raw || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/**
 * @param {string} time
 */
function clockToMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * @param {string} locationRaw
 * @returns {{ location: string | null, isOnline: boolean }}
 */
function parseLocation(locationRaw) {
  let loc = String(locationRaw ?? "")
    .replace(/;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  loc = loc.replace(/^[;\s]+|[;\s]+$/g, "").trim();

  if (!loc || loc === "-" || loc === "—" || loc === "–") {
    return { location: null, isOnline: false };
  }

  const upper = loc.toUpperCase();
  const isOnline =
    upper.includes("ONLINE") ||
    upper.includes("VIRTUAL") ||
    upper.includes("ZOOM") ||
    upper.includes("TEAMS");

  return { location: loc, isOnline };
}

/**
 * Parsea uno o varios bloques horarios desde texto de columna HORARIO.
 * @param {string | string[]} value
 * @returns {{ meetings: import('../types/academicProgramming').AcademicMeeting[], warnings: string[] }}
 */
export function parseMeetings(value) {
  const text = normalizeScheduleText(value);
  const warnings = [];

  if (!text || text === "-" || text === "—") {
    return { meetings: [], warnings };
  }

  const chunks = text
    .split(MEETING_SPLIT_RE)
    .map((c) => c.replace(/^[;\s]+|[;\s]+$/g, "").trim())
    .filter(Boolean);

  /** @type {import('../types/academicProgramming').AcademicMeeting[]} */
  const meetings = [];
  let chunkFailures = 0;

  for (const chunk of chunks) {
    const match = chunk.match(MEETING_PARSE_RE);
    if (!match) {
      if (/\d{1,2}:\d{2}/.test(chunk) || /^(LU|MA|MI|JU|VI|SA|DO|LUN|MAR|MIE|JUE|VIE)\b/i.test(chunk)) {
        warnings.push(`No se pudo interpretar el horario: "${chunk}"`);
        chunkFailures += 1;
      }
      continue;
    }

    const dayCode = normalizeDayCode(match[1]);
    if (!dayCode) {
      warnings.push(`No se pudo interpretar el día del horario: "${chunk}"`);
      chunkFailures += 1;
      continue;
    }

    const startTime = normalizeClock(match[2]);
    const endTime = normalizeClock(match[3]);
    if (!startTime || !endTime) {
      warnings.push(`Horario con hora inválida: "${chunk}"`);
      chunkFailures += 1;
      continue;
    }

    const startMins = clockToMinutes(startTime);
    const endMins = clockToMinutes(endTime);
    if (startMins >= endMins) {
      warnings.push(`Horario con hora inicial posterior o igual a la final: "${chunk}"`);
      chunkFailures += 1;
      continue;
    }

    const { location, isOnline } = parseLocation(match[4] || "");

    meetings.push({
      dayCode,
      dayOfWeek: DAY_CODE_TO_WEEKDAY[dayCode],
      startTime,
      endTime,
      location,
      isOnline,
    });
  }

  // Evitar duplicar la misma advertencia (chunk + texto completo)
  if (meetings.length === 0 && chunkFailures === 0 && /\d{1,2}:\d{2}/.test(text)) {
    warnings.push(`No se pudo interpretar el horario: "${text}"`);
  }

  return { meetings, warnings };
}
