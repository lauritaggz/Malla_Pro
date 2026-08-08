import { createSectionId } from "../utils/createSectionId";
import { normalizeCourseCode } from "../utils/normalizeCourseCode";
import { parseNrc } from "../utils/parseNrc";
import { getPeriodId, getPeriodLabel } from "../../../utils/storageKeys";

/** @param {unknown} nrc */
function normalizeNrc(nrc) {
  return parseNrc(nrc);
}

/**
 * @param {unknown} value
 */
function hasValidString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * @param {unknown} meetings
 */
function hasMeetings(meetings) {
  return Array.isArray(meetings) && meetings.length > 0;
}

/**
 * Clona superficialmente una sección preservando meetings.
 * @param {object} section
 */
function cloneSection(section) {
  return {
    ...section,
    linkedNrcs: Array.isArray(section.linkedNrcs) ? [...section.linkedNrcs] : [],
    professors: Array.isArray(section.professors) ? [...section.professors] : [],
    meetings: Array.isArray(section.meetings)
      ? section.meetings.map((m) => ({ ...m }))
      : [],
    warnings: Array.isArray(section.warnings) ? [...section.warnings] : [],
    sources: {
      programacionAcademica: section.sources?.programacionAcademica !== false,
      horarioAlumno: Boolean(section.sources?.horarioAlumno),
      ...(section.sources || {}),
    },
    enrolled: Boolean(section.enrolled),
  };
}

/**
 * Completa campos vacíos de la sección de programación con datos del horario.
 * No sobrescribe valores ya válidos.
 *
 * @param {object} section
 * @param {{ codigo: string, nombre: string, nrc: string, meetings: object[] }} ramo
 * @param {Array} conflicts
 */
function enrichSectionFromStudentSchedule(section, ramo, conflicts) {
  const next = cloneSection(section);
  next.enrolled = true;
  next.sources = {
    programacionAcademica: true,
    horarioAlumno: true,
  };

  if (!hasValidString(next.courseTitle) && hasValidString(ramo.nombre)) {
    next.courseTitle = ramo.nombre;
  } else if (
    hasValidString(next.courseTitle) &&
    hasValidString(ramo.nombre) &&
    next.courseTitle.trim() !== ramo.nombre.trim()
  ) {
    conflicts.push({
      type: "TITLE_MISMATCH",
      nrc: ramo.nrc,
      programming: next.courseTitle,
      studentSchedule: ramo.nombre,
    });
  }

  if (!hasMeetings(next.meetings) && hasMeetings(ramo.meetings)) {
    next.meetings = ramo.meetings.map((m) => ({ ...m }));
    next.incomplete = false;
  } else if (hasMeetings(next.meetings) && hasMeetings(ramo.meetings)) {
    // Completar salas faltantes meeting a meeting si el conteo coincide
    if (next.meetings.length === ramo.meetings.length) {
      next.meetings = next.meetings.map((m, i) => {
        const fromStudent = ramo.meetings[i];
        if (m.location == null && fromStudent?.location) {
          return { ...m, location: fromStudent.location, isOnline: fromStudent.isOnline };
        }
        if (
          m.location &&
          fromStudent?.location &&
          m.location !== fromStudent.location
        ) {
          conflicts.push({
            type: "LOCATION_MISMATCH",
            nrc: ramo.nrc,
            programming: m.location,
            studentSchedule: fromStudent.location,
          });
        }
        return m;
      });
    } else {
      conflicts.push({
        type: "MEETINGS_MISMATCH",
        nrc: ramo.nrc,
        programmingCount: next.meetings.length,
        studentCount: ramo.meetings.length,
      });
    }
  }

  if (
    (!next.modality || next.modality === "UNKNOWN") &&
    ramo.modality &&
    ramo.modality !== "UNKNOWN"
  ) {
    next.modality = ramo.modality;
  }

  return next;
}

/**
 * @param {{ codigo: string, nombre: string, nrc: string, meetings: object[] }} ramo
 * @param {object | null} programming
 */
function buildStudentOnlySection(ramo, programming) {
  const courseCode = normalizeCourseCode(ramo.codigo);
  const period = getPeriodId(programming);
  const curriculumCode = programming?.curriculum?.code || "";
  const id = createSectionId({
    period: period === "unknown" ? "student-schedule" : period,
    curriculumCode,
    courseCode,
    sectionNumber: "",
    nrc: ramo.nrc,
  });

  return {
    id,
    nrc: ramo.nrc,
    linkedNrcs: [],
    courseCode,
    courseTitle: ramo.nombre || courseCode,
    sectionNumber: "",
    activityType: "",
    capacity: null,
    professors: [],
    modality:
      ramo.modality && ramo.modality !== "UNKNOWN" ? ramo.modality : "UNKNOWN",
    meetings: Array.isArray(ramo.meetings) ? ramo.meetings.map((m) => ({ ...m })) : [],
    warnings: [],
    incomplete: !hasMeetings(ramo.meetings),
    enrolled: true,
    sources: {
      programacionAcademica: false,
      horarioAlumno: true,
    },
  };
}

/**
 * Reconcilia Programación Académica + Horario del Alumno por NRC.
 *
 * Prioridad: si Programación ya tiene un campo válido, se conserva.
 * El horario solo completa huecos y marca `enrolled`.
 *
 * @param {object | null} programming
 * @param {{ ramos?: Array } | null} studentSchedule
 * @returns {{
 *   programming: object | null,
 *   enrolledNrcs: string[],
 *   enrolledSectionIds: string[],
 *   selectedSectionsMapFromEnrolled: Record<string, string>,
 *   summary: { enrolledCount: number, matchedInProgramming: number, studentOnly: number },
 *   conflicts: object[],
 *   warnings: object[],
 * }}
 */
export function mergeProgrammingWithStudentSchedule(programming, studentSchedule) {
  const ramos = Array.isArray(studentSchedule?.ramos) ? studentSchedule.ramos : [];
  /** @type {object[]} */
  const conflicts = [];
  /** @type {object[]} */
  const warnings = [];

  if (!programming && ramos.length === 0) {
    return {
      programming: null,
      enrolledNrcs: [],
      enrolledSectionIds: [],
      selectedSectionsMapFromEnrolled: {},
      summary: { enrolledCount: 0, matchedInProgramming: 0, studentOnly: 0 },
      conflicts,
      warnings,
    };
  }

  // Clonar cursos de programación
  /** @type {Map<string, { courseCode: string, courseTitle: string, sections: object[] }>} */
  const coursesMap = new Map();
  if (programming?.courses) {
    for (const course of programming.courses) {
      const code = normalizeCourseCode(course.courseCode);
      if (!code) continue;
      coursesMap.set(code, {
        courseCode: code,
        courseTitle: course.courseTitle || code,
        sections: (course.sections || []).map((s) => {
          const cloned = cloneSection(s);
          cloned.sources = {
            programacionAcademica: true,
            horarioAlumno: Boolean(cloned.sources?.horarioAlumno),
          };
          return cloned;
        }),
      });
    }
  }

  /** @type {Map<string, { courseCode: string, section: object }>} */
  const byNrc = new Map();
  for (const [courseCode, course] of coursesMap) {
    for (const section of course.sections) {
      const nrc = normalizeNrc(section.nrc);
      if (!nrc) continue;
      byNrc.set(nrc, { courseCode, section });
    }
  }

  let matchedInProgramming = 0;
  let studentOnly = 0;
  /** @type {string[]} */
  const enrolledNrcs = [];
  /** @type {string[]} */
  const enrolledSectionIds = [];
  /** @type {Record<string, string>} */
  const selectedSectionsMapFromEnrolled = {};

  for (const ramo of ramos) {
    const nrc = normalizeNrc(ramo.nrc);
    const codigo = normalizeCourseCode(ramo.codigo);
    if (!nrc || !codigo) {
      warnings.push({
        type: "SKIPPED_RAMO",
        message: "Ramo del horario sin NRC o código válido.",
      });
      continue;
    }

    enrolledNrcs.push(nrc);
    const existing = byNrc.get(nrc);

    if (existing) {
      matchedInProgramming += 1;
      const enriched = enrichSectionFromStudentSchedule(
        existing.section,
        { ...ramo, nrc, codigo },
        conflicts
      );
      // Reemplazar en el curso
      const course = coursesMap.get(existing.courseCode);
      if (course) {
        const idx = course.sections.findIndex(
          (s) => normalizeNrc(s.nrc) === nrc
        );
        if (idx >= 0) course.sections[idx] = enriched;
        byNrc.set(nrc, { courseCode: existing.courseCode, section: enriched });
        enrolledSectionIds.push(enriched.id);
        selectedSectionsMapFromEnrolled[existing.courseCode] = enriched.id;
      }
      continue;
    }

    // NRC no está en programación → sección independiente inscrita
    studentOnly += 1;
    const section = buildStudentOnlySection(
      { ...ramo, nrc, codigo },
      programming
    );
    if (!coursesMap.has(codigo)) {
      coursesMap.set(codigo, {
        courseCode: codigo,
        courseTitle: ramo.nombre || codigo,
        sections: [],
      });
    }
    const course = coursesMap.get(codigo);
    if (hasValidString(ramo.nombre)) {
      course.courseTitle = ramo.nombre;
    }
    course.sections.push(section);
    byNrc.set(nrc, { courseCode: codigo, section });
    enrolledSectionIds.push(section.id);
    selectedSectionsMapFromEnrolled[codigo] = section.id;
  }

  const courses = [...coursesMap.values()];
  if (!courses.length) {
    return {
      programming: programming || null,
      enrolledNrcs: [...new Set(enrolledNrcs)],
      enrolledSectionIds,
      selectedSectionsMapFromEnrolled,
      summary: {
        enrolledCount: enrolledNrcs.length,
        matchedInProgramming,
        studentOnly,
      },
      conflicts,
      warnings,
    };
  }

  const baseSource = programming?.source || {
    originalFileName: "",
    parser: "MERGED",
    importedAt: new Date().toISOString(),
  };

  const hasProgrammingSource = Boolean(programming?.courses?.length);
  const hasStudentSource = ramos.length > 0;

  const merged = {
    schemaVersion: programming?.schemaVersion || "1.0",
    source: {
      ...baseSource,
      parser: hasProgrammingSource
        ? baseSource.parser || "UNAB_ACADEMIC_PROGRAMMING"
        : "UNAB_STUDENT_SCHEDULE",
      sources: {
        programacionAcademica: hasProgrammingSource,
        horarioAlumno: hasStudentSource,
      },
    },
    academicPeriod: programming?.academicPeriod || {
      label: "Horario del alumno",
      year: null,
      semester: null,
    },
    curriculum: programming?.curriculum || {
      code: null,
      careerName: null,
      campus: null,
    },
    courses,
    warnings: [
      ...(Array.isArray(programming?.warnings) ? programming.warnings : []),
      ...(Array.isArray(studentSchedule?.warnings) ? studentSchedule.warnings : []),
      ...warnings,
    ],
  };

  // Asegurar periodId usable cuando solo hay horario
  if (getPeriodId(merged) === "unknown" && hasStudentSource && !hasProgrammingSource) {
    merged.source = {
      ...merged.source,
      parser: "UNAB_STUDENT_SCHEDULE",
      sources: {
        programacionAcademica: false,
        horarioAlumno: true,
      },
    };
  }

  return {
    programming: merged,
    enrolledNrcs: [...new Set(enrolledNrcs)],
    enrolledSectionIds,
    selectedSectionsMapFromEnrolled,
    summary: {
      enrolledCount: [...new Set(enrolledNrcs)].length,
      matchedInProgramming,
      studentOnly,
      periodLabel: getPeriodLabel(merged),
    },
    conflicts,
    warnings,
  };
}

/**
 * Combina selección manual con NRCs inscritos (inscritos tienen prioridad por curso).
 * @param {Record<string, string>} manualMap
 * @param {Record<string, string>} enrolledMap
 */
export function mergeSelectedMaps(manualMap = {}, enrolledMap = {}) {
  return {
    ...manualMap,
    ...enrolledMap,
  };
}
