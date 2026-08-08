import { normalizeCourseCode } from "../utils/normalizeCourseCode";
import { parseNrc } from "../utils/parseNrc";
import { parseMeetings, DAY_CODE_TO_WEEKDAY } from "../utils/parseMeetings";
import { parseModality } from "../utils/parseModality";

export const STUDENT_SCHEDULE_PARSER = "UNAB_STUDENT_SCHEDULE";

/**
 * Normaliza NRC como identificador string (solo dígitos).
 * @param {unknown} nrc
 * @returns {string}
 */
export function normalizeNrc(nrc) {
  return parseNrc(nrc);
}

/**
 * Normaliza código de asignatura.
 * @param {unknown} codigo
 * @returns {string}
 */
export function normalizeCodigo(codigo) {
  return normalizeCourseCode(codigo);
}

/**
 * Sala vacía / guion → null (UI puede mostrar "Virtual" o "no informada").
 * @param {unknown} sala
 * @returns {string | null}
 */
export function normalizarSala(sala) {
  const limpia = String(sala ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!limpia || limpia === "-" || limpia === "—" || limpia === "–") {
    return null;
  }
  return limpia;
}

/**
 * @param {string} texto
 * @returns {string}
 */
export function normalizeStudentScheduleText(texto) {
  return String(texto ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\u00a0/g, " ");
}

/**
 * Extrae asignaturas inscritas desde texto de Horario del Alumno UNAB.
 * Parte por bloques "Asignatura …" para no perder ramos cuando el PDF
 * aplasta varias asignaturas en una sola línea o parte un ramo entre páginas.
 *
 * @param {string} texto
 * @returns {{
 *   ramos: Array<{
 *     codigo: string,
 *     nombre: string,
 *     nrc: string,
 *     modality?: string,
 *     meetings: import('../types/academicProgramming').AcademicMeeting[],
 *   }>,
 *   warnings: Array<{ type: string, message: string, sectionNrc?: string }>,
 * }}
 */
export function extractStudentScheduleCourses(texto) {
  const normalizado = normalizeStudentScheduleText(texto);
  /** @type {Array<{ type: string, message: string, sectionNrc?: string }>} */
  const warnings = [];

  /** @type {Map<string, { codigo: string, nombre: string, nrc: string, meetings: import('../types/academicProgramming').AcademicMeeting[] }>} */
  const byNrc = new Map();

  const starts = [];
  const startRe = /Asignatura\s+[A-Za-z0-9]+/gi;
  let startMatch;
  while ((startMatch = startRe.exec(normalizado)) !== null) {
    starts.push(startMatch.index);
  }

  if (!starts.length) {
    return { ramos: [], warnings };
  }

  // Cabecera: Asignatura CODIGO Nombre - NRC 1234 (guion opcional / NRC con o sin :)
  const HEADER_RE =
    /^Asignatura\s+([A-Za-z0-9]+)\s+([\s\S]+?)\s*[-–—]?\s*NRC\s*:?\s*(\d{4,})\b/i;

  for (let i = 0; i < starts.length; i++) {
    const block = normalizado
      .slice(starts[i], starts[i + 1] ?? normalizado.length)
      .trim();

    const header = block.match(HEADER_RE);
    if (!header) {
      warnings.push({
        type: "SKIPPED_COURSE",
        message: "Se omitió un bloque de asignatura sin cabecera reconocible.",
      });
      continue;
    }

    const codigo = normalizeCodigo(header[1]);
    const nombre = String(header[2] || "")
      .replace(/\s+/g, " ")
      .trim();
    const nrc = normalizeNrc(header[3]);

    if (!codigo || !nrc) {
      warnings.push({
        type: "SKIPPED_COURSE",
        message: "Se omitió un bloque de asignatura sin código o NRC válido.",
      });
      continue;
    }

    // Horario puede estar varias líneas más abajo (y en otra página del PDF)
    const horarioMatch = block.match(
      /Horario\s*:\s*([\s\S]*?)(?=\s*Profesores(?:\/as)?\s*:|$)/i
    );
    let bloqueHorario = String(horarioMatch?.[1] || "")
      .replace(/\s+/g, " ")
      .replace(/\s*;\s*/g, "; ")
      .trim();
    // Por si Profesores quedó pegado en la misma captura
    bloqueHorario = bloqueHorario
      .replace(/\s*Profesores(?:\/as)?\s*:.*$/i, "")
      .trim();

    const modalidadMatch = block.match(/Modalidad\s*:\s*([^\n]+)/i);
    const modality = parseModality(modalidadMatch?.[1] || "");

    const { meetings, warnings: meetingWarnings } = parseMeetings(
      bloqueHorario || "-"
    );
    for (const w of meetingWarnings) {
      warnings.push({
        type: "MEETING_PARSE",
        sectionNrc: nrc,
        message: w,
      });
    }

    if (!horarioMatch) {
      warnings.push({
        type: "MISSING_SCHEDULE",
        sectionNrc: nrc,
        message: `NRC ${nrc} sin bloque Horario reconocible.`,
      });
    }

    const isVirtualModality = modality === "VIRTUAL" || modality === "E_LEARNING";
    const normalizedMeetings = meetings.map((m) => {
      const location = normalizarSala(m.location);
      return {
        dayCode: m.dayCode,
        dayOfWeek: m.dayOfWeek || DAY_CODE_TO_WEEKDAY[m.dayCode],
        startTime: m.startTime,
        endTime: m.endTime,
        location,
        isOnline: Boolean(m.isOnline) || (isVirtualModality && !location),
      };
    });

    if (byNrc.has(nrc)) {
      warnings.push({
        type: "DUPLICATE_NRC",
        sectionNrc: nrc,
        message: `NRC ${nrc} apareció más de una vez; se conservó la primera ocurrencia.`,
      });
      continue;
    }

    byNrc.set(nrc, {
      codigo,
      nombre: nombre || codigo,
      nrc,
      modality,
      meetings: normalizedMeetings,
    });
  }

  return {
    ramos: [...byNrc.values()],
    warnings,
  };
}

/**
 * Aplana ramos → clases ordenadas (útil para tests / debug).
 * @param {Array<{ codigo: string, nombre: string, nrc: string, meetings: import('../types/academicProgramming').AcademicMeeting[] }>} ramos
 */
export function flattenStudentScheduleClasses(ramos) {
  const clases = [];
  for (const ramo of ramos || []) {
    for (const m of ramo.meetings || []) {
      const [sh, sm] = String(m.startTime || "0:0").split(":").map(Number);
      const [eh, em] = String(m.endTime || "0:0").split(":").map(Number);
      clases.push({
        codigo: ramo.codigo,
        nombre: ramo.nombre,
        nrc: ramo.nrc,
        dia: m.dayCode,
        diaNumero: m.dayOfWeek,
        horaInicio: m.startTime,
        horaFin: m.endTime,
        sala: m.location,
        inicioMinutos: sh * 60 + sm,
        finMinutos: eh * 60 + em,
      });
    }
  }
  clases.sort((a, b) => {
    if (a.diaNumero !== b.diaNumero) return a.diaNumero - b.diaNumero;
    return a.inicioMinutos - b.inicioMinutos;
  });
  return clases;
}

/**
 * @param {string} texto
 */
export function parseStudentScheduleText(texto) {
  const { ramos, warnings } = extractStudentScheduleCourses(texto);
  return {
    ramos,
    clases: flattenStudentScheduleClasses(ramos),
    warnings,
  };
}

/**
 * Convierte ramos del horario del alumno a AcademicProgramming mínimo.
 * @param {{ ramos: Array, warnings?: Array }} parsed
 * @param {{ fileName?: string, periodLabel?: string }} [meta]
 */
export function studentScheduleToProgramming(parsed, meta = {}) {
  const importedAt = new Date().toISOString();
  const coursesMap = new Map();

  for (const ramo of parsed.ramos || []) {
    const courseCode = normalizeCodigo(ramo.codigo);
    if (!courseCode) continue;
    if (!coursesMap.has(courseCode)) {
      coursesMap.set(courseCode, {
        courseCode,
        courseTitle: ramo.nombre || courseCode,
        sections: [],
      });
    }
    const course = coursesMap.get(courseCode);
    const sectionId = ["student-schedule", "", courseCode, "", ramo.nrc].join("|");
    course.sections.push({
      id: sectionId,
      nrc: ramo.nrc,
      linkedNrcs: [],
      courseCode,
      courseTitle: ramo.nombre || course.courseTitle,
      sectionNumber: "",
      activityType: "",
      capacity: null,
      professors: [],
      modality: ramo.modality && ramo.modality !== "UNKNOWN" ? ramo.modality : "UNKNOWN",
      meetings: Array.isArray(ramo.meetings) ? ramo.meetings : [],
      warnings: [],
      enrolled: true,
      sources: {
        programacionAcademica: false,
        horarioAlumno: true,
      },
    });
    if (ramo.nombre && !course.courseTitle) {
      course.courseTitle = ramo.nombre;
    }
  }

  return {
    schemaVersion: "1.0",
    source: {
      originalFileName: meta.fileName || "",
      parser: STUDENT_SCHEDULE_PARSER,
      importedAt,
    },
    academicPeriod: {
      label: meta.periodLabel || "Horario del alumno",
      year: null,
      semester: null,
    },
    curriculum: {
      code: null,
      careerName: null,
      campus: null,
    },
    courses: [...coursesMap.values()],
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
  };
}

/**
 * Parser de archivo PDF → horario del alumno.
 */
export class UnabStudentScheduleParser {
  get id() {
    return STUDENT_SCHEDULE_PARSER;
  }

  /**
   * @param {File} file
   * @param {{ signal?: AbortSignal, onProgress?: Function }} [options]
   */
  async parse(file, options = {}) {
    // Import dinámico: evita cargar pdfjs en tests unitarios del parser de texto
    const { extractPdfText } = await import("../utils/extractPdfText");
    const { text, totalPages } = await extractPdfText(file, {
      signal: options.signal,
      onProgress: (p) => {
        options.onProgress?.({
          page: p.page,
          totalPages: p.totalPages,
          percent: p.percent,
          sectionsDetected: 0,
        });
      },
    });

    const parsed = parseStudentScheduleText(text);
    options.onProgress?.({
      page: totalPages,
      totalPages,
      percent: 100,
      sectionsDetected: parsed.ramos.length,
    });

    if (!parsed.ramos.length) {
      const looksLikeSchedule =
        /Asignatura/i.test(text) || /Horario\s*:/i.test(text) || /NRC/i.test(text);
      throw Object.assign(
        new Error(
          looksLikeSchedule
            ? "No encontramos asignaturas inscritas en este archivo."
            : "No pudimos reconocer este horario. Verifica que sea el PDF de horario descargado desde UNAB."
        ),
        {
          code: looksLikeSchedule ? "EMPTY_SCHEDULE" : "UNRECOGNIZED_SCHEDULE",
          userMessage: looksLikeSchedule
            ? "No encontramos asignaturas inscritas en este archivo."
            : "No pudimos reconocer este horario. Verifica que sea el PDF de horario descargado desde UNAB.",
        }
      );
    }

    return {
      ...parsed,
      programming: studentScheduleToProgramming(parsed, {
        fileName: file?.name || "",
      }),
      totalPages,
    };
  }
}

export const unabStudentScheduleParser = new UnabStudentScheduleParser();

/**
 * @param {File} file
 * @param {{ signal?: AbortSignal, onProgress?: Function }} [options]
 */
export async function parseStudentScheduleFile(file, options = {}) {
  return unabStudentScheduleParser.parse(file, options);
}
