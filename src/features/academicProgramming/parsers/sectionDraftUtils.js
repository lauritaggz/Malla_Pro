import { COLUMN_KEYS } from "./pdfLayoutUtils";
import { normalizeCourseCode } from "../utils/normalizeCourseCode";
import {
  joinHyphenatedFragments,
  normalizeCellText,
  normalizeCourseTitle,
} from "../utils/normalizeCellText";
import { parseNrc, parseLinkedNrcs } from "../utils/parseNrc";
import { parseProfessors } from "../utils/parseProfessors";
import { parseModality } from "../utils/parseModality";
import { parseMeetings } from "../utils/parseMeetings";
import { createSectionId } from "../utils/createSectionId";
import { normalizeHeaderText } from "./pdfLayoutUtils";

/**
 * @returns {Record<string, string[]>}
 */
export function emptyFragments() {
  return Object.fromEntries(COLUMN_KEYS.map((k) => [k, []]));
}

/**
 * @param {Record<string, string[]>} target
 * @param {Record<string, string[]>} source
 */
export function appendFragments(target, source) {
  for (const key of COLUMN_KEYS) {
    if (source[key]?.length) {
      target[key].push(...source[key]);
    }
  }
}

/**
 * @param {string[]} parts
 */
function looksLikeCourseCode(parts) {
  const code = normalizeCourseCode(joinHyphenatedFragments(parts || []));
  return /^[A-Z]{2,6}\d{2,4}[A-Z]?$/.test(code);
}

/**
 * @param {string[]} parts
 */
function looksLikeSectionNumber(parts) {
  const text = joinHyphenatedFragments(parts || []).replace(/\s+/g, "");
  return /^\d{1,4}[A-Z]?$/.test(text);
}

/**
 * @param {string[]} parts
 */
function looksLikeNrcStart(parts) {
  const digits = parseNrc(parts || []);
  return digits.length >= 4 && digits.length <= 6;
}

/**
 * Determina si una fila inicia una sección nueva.
 * @param {Record<string, string[]>} cells
 */
export function isNewSectionRow(cells) {
  const hasNrc = looksLikeNrcStart(cells.nrc || []);
  const hasCode = looksLikeCourseCode(cells.courseCode || []);
  const hasSection = looksLikeSectionNumber(cells.sectionNumber || []);
  return hasNrc && hasCode && hasSection;
}

/**
 * @param {string} text
 */
export function parsePeriodFromLabel(text) {
  const normalized = normalizeHeaderText(text);
  const yearMatch = normalized.match(/\b(20\d{2})\b/);
  const year = yearMatch ? Number(yearMatch[1]) : null;

  let semester = null;
  if (/PRIMER\s+SEMESTRE|1(ER|ER\.|°)?\s+SEMESTRE|SEMESTRE\s+1\b/.test(normalized)) {
    semester = 1;
  } else if (/SEGUNDO\s+SEMESTRE|2(DO|DO\.|°)?\s+SEMESTRE|SEMESTRE\s+2\b/.test(normalized)) {
    semester = 2;
  }

  const labelMatch = String(text).match(
    /PROGRAMACI[OÓ]N\s+ACAD[EÉ]MICA\s*[-–—]?\s*(.+)/i
  );
  const label = labelMatch ? labelMatch[1].trim() : normalizeCellText(text);

  return { label, year, semester };
}

/**
 * @param {string} text
 */
export function parseCurriculumLine(text) {
  const cleaned = normalizeCellText(text);
  const match = cleaned.match(/^([A-Z]{2,6}\d{3,6})\s*[-–—]\s*(.+)$/i);
  if (!match) return null;
  return {
    code: match[1].toUpperCase(),
    careerName: match[2].trim(),
  };
}

/**
 * @param {Record<string, string[]>} fragments
 * @param {{ period: string, curriculumCode: string | null, page?: number, continuedAcrossPages?: boolean }} ctx
 */
export function finalizeDraftSection(fragments, ctx) {
  const raw = {
    nrc: joinHyphenatedFragments(fragments.nrc),
    linkedNrcs: normalizeCellText(fragments.linkedNrcs),
    activityType: normalizeCellText(fragments.activityType),
    courseCode: joinHyphenatedFragments(fragments.courseCode).replace(/\s+/g, ""),
    sectionNumber: joinHyphenatedFragments(fragments.sectionNumber).replace(/\s+/g, ""),
    courseTitle: normalizeCourseTitle(fragments.courseTitle),
    capacity: normalizeCellText(fragments.capacity),
    professors: joinHyphenatedFragments(fragments.professors),
    schedule: joinHyphenatedFragments(fragments.schedule),
    modality: normalizeCellText(fragments.modality),
  };

  const nrc = parseNrc(fragments.nrc);
  const courseCode = normalizeCourseCode(raw.courseCode);
  const sectionNumber = raw.sectionNumber.replace(/[^\dA-Za-z]/g, "");
  const linkedNrcs = parseLinkedNrcs(raw.linkedNrcs);
  const professors = parseProfessors(raw.professors);
  const modality = parseModality(raw.modality);
  const { meetings, warnings: meetingWarnings } = parseMeetings(raw.schedule);

  const capacityDigits = raw.capacity.replace(/\D/g, "");
  const capacity = capacityDigits ? Number.parseInt(capacityDigits, 10) : null;

  /** @type {string[]} */
  const warnings = [...meetingWarnings];

  if (!nrc) warnings.push("Falta NRC en la sección.");
  if (!courseCode) warnings.push("Falta código de asignatura.");
  if (!sectionNumber) warnings.push("Falta número de sección.");
  if (raw.modality && modality === "UNKNOWN") {
    warnings.push(`Modalidad desconocida: "${raw.modality}".`);
  }
  if (ctx.continuedAcrossPages) {
    warnings.push("Se unió contenido de esta sección entre páginas consecutivas.");
  }

  const incomplete = !nrc || !courseCode || !sectionNumber;
  if (incomplete) {
    warnings.push("La sección quedó incompleta tras el parseo.");
  }

  const id = createSectionId({
    period: ctx.period,
    curriculumCode: ctx.curriculumCode,
    courseCode,
    sectionNumber,
    nrc,
  });

  return {
    id,
    nrc,
    linkedNrcs,
    courseCode,
    courseTitle: raw.courseTitle,
    sectionNumber,
    activityType: raw.activityType,
    capacity: Number.isFinite(capacity) ? capacity : null,
    professors,
    modality,
    meetings,
    raw,
    warnings,
    _incomplete: incomplete,
    _page: ctx.page,
  };
}
