import { safeStorage } from "../../../utils/safeStorage";
import {
  PARSER_VERSION,
  STORAGE_SCHEMA_VERSION,
  courseRegistrationKey,
  getCareerId,
  getPeriodId,
  getPeriodLabel,
  LEGACY_KEYS,
} from "../../../utils/storageKeys";
import { createAppError, logInternalError } from "../../../utils/appErrors";
import { DAY_CODE_TO_WEEKDAY } from "../utils/parseMeetings";
import { timeToMinutes } from "./scheduleService";

/**
 * Persistencia de toma de ramos por carrera + periodo.
 * No guarda el PDF ni texto crudo.
 */

/**
 * @param {File} file
 */
export async function buildFileFingerprint(file) {
  if (!file) return "unknown";
  const base = `${file.name}|${file.size}|${file.lastModified || 0}`;
  try {
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const buf = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(base)
      );
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .slice(0, 32);
    }
  } catch (err) {
    logInternalError(err, { context: "buildFileFingerprint" });
  }
  return base.replace(/[^a-zA-Z0-9|_-]/g, "").slice(0, 64) || "unknown";
}

/**
 * @param {unknown} meeting
 */
function isValidMeeting(meeting) {
  if (!meeting || typeof meeting !== "object") return false;
  const day = meeting.dayCode;
  if (!day || !DAY_CODE_TO_WEEKDAY[day]) return false;
  if (typeof meeting.startTime !== "string" || typeof meeting.endTime !== "string") {
    return false;
  }
  const start = timeToMinutes(meeting.startTime);
  const end = timeToMinutes(meeting.endTime);
  if (!start && meeting.startTime !== "00:00") return false;
  if (start >= end) return false;
  return true;
}

/**
 * @param {unknown} section
 */
function sanitizeSection(section) {
  if (!section || typeof section !== "object") return null;
  const id = typeof section.id === "string" ? section.id : null;
  const nrc = section.nrc != null ? String(section.nrc).trim() : "";
  const courseCode =
    section.courseCode != null ? String(section.courseCode).trim() : "";
  if (!id || !courseCode) return null;

  const meetings = Array.isArray(section.meetings)
    ? section.meetings.filter(isValidMeeting).map((m) => ({
        dayCode: m.dayCode,
        dayOfWeek: m.dayOfWeek || DAY_CODE_TO_WEEKDAY[m.dayCode],
        startTime: m.startTime,
        endTime: m.endTime,
        location: m.location ?? null,
        isOnline: Boolean(m.isOnline),
      }))
    : [];

  return {
    id,
    nrc,
    linkedNrcs: Array.isArray(section.linkedNrcs)
      ? section.linkedNrcs.map(String)
      : [],
    courseCode,
    courseTitle: String(section.courseTitle || section.subjectName || ""),
    sectionNumber: String(section.sectionNumber || ""),
    activityType: String(section.activityType || ""),
    capacity:
      typeof section.capacity === "number" && Number.isFinite(section.capacity)
        ? section.capacity
        : null,
    professors: Array.isArray(section.professors)
      ? section.professors.map(String)
      : typeof section.teacher === "string"
        ? [section.teacher]
        : [],
    modality: section.modality || "UNKNOWN",
    meetings,
    warnings: Array.isArray(section.warnings)
      ? section.warnings.map(String).slice(0, 20)
      : [],
    incomplete: Boolean(section.incomplete) || meetings.length === 0,
    enrolled: Boolean(section.enrolled),
    sources: {
      programacionAcademica: section.sources
        ? Boolean(section.sources.programacionAcademica)
        : true,
      horarioAlumno: Boolean(section.sources?.horarioAlumno),
    },
  };
}

/**
 * @param {object} programming
 */
export function sanitizeProgrammingForStorage(programming) {
  if (!programming || typeof programming !== "object") return null;

  const courses = Array.isArray(programming.courses)
    ? programming.courses
        .map((course) => {
          if (!course || typeof course !== "object") return null;
          const courseCode = String(course.courseCode || "").trim();
          if (!courseCode) return null;
          const sections = Array.isArray(course.sections)
            ? course.sections.map(sanitizeSection).filter(Boolean)
            : [];
          if (!sections.length) return null;
          return {
            courseCode,
            courseTitle: String(course.courseTitle || ""),
            sections,
          };
        })
        .filter(Boolean)
    : [];

  if (!courses.length) return null;

  return {
    schemaVersion: programming.schemaVersion || "1.0",
    source: {
      originalFileName: String(programming.source?.originalFileName || ""),
      parser: String(programming.source?.parser || PARSER_VERSION),
      importedAt: String(programming.source?.importedAt || new Date().toISOString()),
    },
    academicPeriod: {
      label: String(programming.academicPeriod?.label || getPeriodLabel(programming)),
      year: programming.academicPeriod?.year ?? null,
      semester: programming.academicPeriod?.semester ?? null,
    },
    curriculum: {
      code: programming.curriculum?.code ?? null,
      careerName: programming.curriculum?.careerName ?? null,
      campus: programming.curriculum?.campus ?? null,
    },
    courses,
    warnings: Array.isArray(programming.warnings)
      ? programming.warnings
          .map((w) => ({
            page: typeof w?.page === "number" ? w.page : undefined,
            sectionNrc: w?.sectionNrc ? String(w.sectionNrc) : undefined,
            type: String(w?.type || "WARNING"),
            message: String(w?.message || "").slice(0, 200),
          }))
          .slice(0, 100)
      : [],
  };
}

/**
 * @param {unknown} state
 */
export function validateRegistrationState(state) {
  if (!state || typeof state !== "object") {
    return { ok: false, reason: "not_object", state: null };
  }
  if (state.schemaVersion !== STORAGE_SCHEMA_VERSION && state.schemaVersion !== 1) {
    // aceptar 1 y STORAGE_SCHEMA_VERSION
    if (Number(state.schemaVersion) !== 1) {
      return { ok: false, reason: "schema", state: null };
    }
  }

  const programming = sanitizeProgrammingForStorage(state.programming);
  if (!programming) {
    return { ok: false, reason: "programming", state: null };
  }

  const sectionIndex = new Map();
  for (const course of programming.courses) {
    for (const section of course.sections) {
      sectionIndex.set(section.id, section);
    }
  }

  const selectedSectionsMap = {};
  const rawMap = state.selectedSectionsMap || {};
  if (rawMap && typeof rawMap === "object") {
    for (const [courseCode, sectionId] of Object.entries(rawMap)) {
      if (typeof sectionId === "string" && sectionIndex.has(sectionId)) {
        selectedSectionsMap[courseCode] = sectionId;
      }
    }
  }

  // Compat propuesta legacy
  if (
    Object.keys(selectedSectionsMap).length === 0 &&
    Array.isArray(state.selectedSections)
  ) {
    for (const item of state.selectedSections) {
      if (!item?.sectionId || !item?.courseCode) continue;
      if (sectionIndex.has(item.sectionId)) {
        selectedSectionsMap[item.courseCode] = item.sectionId;
      }
    }
  }

  const selectedNrcs = Object.values(selectedSectionsMap)
    .map((id) => sectionIndex.get(id)?.nrc)
    .filter(Boolean);

  const uniqueNrcs = [...new Set(selectedNrcs)];

  const enrolledNrcs = Array.isArray(state.enrolledNrcs)
    ? [...new Set(state.enrolledNrcs.map((n) => String(n).replace(/\D/g, "")).filter(Boolean))]
    : [];

  // Rehidratar enrolled en secciones si hay lista persistida
  if (enrolledNrcs.length) {
    const enrolledSet = new Set(enrolledNrcs);
    for (const course of programming.courses) {
      for (const section of course.sections) {
        if (enrolledSet.has(String(section.nrc).replace(/\D/g, ""))) {
          section.enrolled = true;
          section.sources = {
            programacionAcademica: Boolean(section.sources?.programacionAcademica ?? true),
            horarioAlumno: true,
          };
        }
      }
    }
  }

  return {
    ok: true,
    reason: null,
    state: {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      parserVersion: String(state.parserVersion || PARSER_VERSION),
      careerId: String(state.careerId || "unknown"),
      periodId: String(state.periodId || getPeriodId(programming)),
      importedAt: String(state.importedAt || programming.source.importedAt),
      fileMetadata: {
        name: String(state.fileMetadata?.name || programming.source.originalFileName || ""),
        size: Number(state.fileMetadata?.size) || 0,
        lastModified: Number(state.fileMetadata?.lastModified) || 0,
        fingerprint: String(state.fileMetadata?.fingerprint || ""),
      },
      studentScheduleMeta:
        state.studentScheduleMeta && typeof state.studentScheduleMeta === "object"
          ? {
              name: String(state.studentScheduleMeta.name || ""),
              size: Number(state.studentScheduleMeta.size) || 0,
              lastModified: Number(state.studentScheduleMeta.lastModified) || 0,
              fingerprint: String(state.studentScheduleMeta.fingerprint || ""),
              enrolledCount: Number(state.studentScheduleMeta.enrolledCount) || enrolledNrcs.length,
            }
          : null,
      programming,
      selectedSectionsMap,
      selectedNrcs: uniqueNrcs,
      enrolledNrcs,
      studentScheduleRamos: Array.isArray(state.studentScheduleRamos)
        ? state.studentScheduleRamos
        : [],
      activeFilters:
        state.activeFilters && typeof state.activeFilters === "object"
          ? state.activeFilters
          : {},
      warnings: programming.warnings,
      lastValidStateAt: String(
        state.lastValidStateAt || new Date().toISOString()
      ),
      restoredHint: Boolean(state.restoredHint),
    },
  };
}

/**
 * @param {object} params
 */
export function buildRegistrationState({
  malla,
  programming,
  selectedSectionsMap = {},
  activeFilters = {},
  fileMetadata = null,
  enrolledNrcs = [],
  studentScheduleMeta = null,
  studentScheduleRamos = [],
}) {
  const sanitized = sanitizeProgrammingForStorage(programming);
  if (!sanitized) return null;

  const careerId = getCareerId(malla);
  const periodId = getPeriodId(sanitized);

  return {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    parserVersion: PARSER_VERSION,
    careerId,
    periodId,
    importedAt: sanitized.source.importedAt,
    fileMetadata: fileMetadata || {
      name: sanitized.source.originalFileName,
      size: 0,
      lastModified: 0,
      fingerprint: "",
    },
    studentScheduleMeta: studentScheduleMeta || null,
    studentScheduleRamos: Array.isArray(studentScheduleRamos)
      ? studentScheduleRamos
      : [],
    programming: sanitized,
    selectedSectionsMap: { ...selectedSectionsMap },
    selectedNrcs: [],
    enrolledNrcs: Array.isArray(enrolledNrcs) ? [...enrolledNrcs] : [],
    activeFilters: { ...activeFilters },
    warnings: sanitized.warnings,
    lastValidStateAt: new Date().toISOString(),
  };
}

/**
 * @param {{ url?: string, nombre?: string } | null} malla
 * @param {string} periodId
 * @param {object} state
 */
export function saveCourseRegistration(malla, periodId, state) {
  const careerId = getCareerId(malla);
  if (careerId === "unknown" || !periodId || periodId === "unknown") {
    return {
      ok: false,
      code: "STORAGE_BLOCKED",
      userMessage: "No pudimos identificar la carrera o el periodo para guardar.",
    };
  }

  const validated = validateRegistrationState(state);
  if (!validated.ok || !validated.state) {
    return {
      ok: false,
      code: "UNEXPECTED",
      userMessage: "El estado de planificación no es válido para guardar.",
    };
  }

  // Compactar: no duplicar selectedNrcs derivados si ya hay map
  const toStore = {
    ...validated.state,
    careerId,
    periodId,
    lastValidStateAt: new Date().toISOString(),
  };

  const key = courseRegistrationKey(careerId, periodId);
  const result = safeStorage.set(key, toStore);

  // Dual-write propuesta compacta para PeriodoActualView
  if (result.ok) {
    const sectionIndex = new Map();
    for (const course of toStore.programming.courses) {
      for (const section of course.sections) {
        sectionIndex.set(section.id, { ...section, courseCode: course.courseCode });
      }
    }
    const selectedSections = Object.entries(toStore.selectedSectionsMap)
      .map(([courseCode, sectionId]) => {
        const s = sectionIndex.get(sectionId);
        if (!s) return null;
        return {
          courseCode,
          sectionId,
          nrc: s.nrc,
          subjectName: s.courseTitle,
          teacher: s.professors,
          modality: s.modality,
          meetings: s.meetings,
          campus: toStore.programming.curriculum?.campus || null,
        };
      })
      .filter(Boolean);

    safeStorage.set(LEGACY_KEYS.propuesta, {
      id: `proposal-${Date.now()}`,
      name: `Propuesta ${getPeriodLabel(toStore.programming)}`,
      academicPeriod: getPeriodLabel(toStore.programming),
      curriculumCode: toStore.programming.curriculum?.code || "Malla",
      careerId,
      periodId,
      selectedSections,
      createdAt: toStore.importedAt,
      updatedAt: toStore.lastValidStateAt,
    });
  }

  return result;
}

/**
 * @param {{ url?: string, nombre?: string } | null} malla
 * @param {string} [periodId]
 */
export function loadCourseRegistration(malla, periodId) {
  const careerId = getCareerId(malla);
  if (careerId === "unknown") return null;

  if (periodId && periodId !== "unknown") {
    const raw = safeStorage.get(courseRegistrationKey(careerId, periodId), null);
    const validated = validateRegistrationState(raw);
    if (validated.ok) return validated.state;
  }

  // Buscar cualquier periodo guardado para esta carrera
  try {
    if (typeof localStorage === "undefined") return null;
    const prefix = `mallaPro:v1:career:${careerId}:courseRegistration:`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      const raw = safeStorage.get(key, null);
      const validated = validateRegistrationState(raw);
      if (validated.ok) return validated.state;
    }
  } catch (err) {
    logInternalError(err, { context: "loadCourseRegistration" });
  }

  // Fallback propuesta legacy (solo selecciones, sin programming completo)
  const legacy = safeStorage.get(LEGACY_KEYS.propuesta, null);
  if (legacy && Array.isArray(legacy.selectedSections) && legacy.selectedSections.length) {
    const legacyCareer = legacy.careerId || null;
    if (legacyCareer && legacyCareer !== careerId) {
      return null;
    }
    // Sin careerId en propuestas antiguas: solo usar si no hay programming namespaced
    // y el periodo coincide o es desconocido.
    if (
      legacy.periodId &&
      periodId &&
      periodId !== "unknown" &&
      legacy.periodId !== periodId &&
      legacyCareer
    ) {
      return null;
    }

    return {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      parserVersion: PARSER_VERSION,
      careerId: legacy.careerId || careerId,
      periodId: legacy.periodId || "unknown",
      importedAt: legacy.createdAt || new Date().toISOString(),
      fileMetadata: { name: "", size: 0, lastModified: 0, fingerprint: "" },
      programming: null,
      selectedSectionsMap: Object.fromEntries(
        legacy.selectedSections
          .filter((s) => s?.courseCode && s?.sectionId)
          .map((s) => [s.courseCode, s.sectionId])
      ),
      selectedNrcs: legacy.selectedSections.map((s) => s.nrc).filter(Boolean),
      activeFilters: {},
      warnings: [],
      lastValidStateAt: legacy.updatedAt || legacy.createdAt || new Date().toISOString(),
      legacyProposalOnly: true,
      legacySelectedSections: legacy.selectedSections,
    };
  }

  return null;
}

/**
 * Elimina solo la planificación de toma de ramos del periodo (no toca progreso académico).
 * @param {{ url?: string, nombre?: string } | null} malla
 * @param {string} periodId
 */
export function clearCourseRegistration(malla, periodId) {
  const careerId = getCareerId(malla);
  if (careerId !== "unknown" && periodId && periodId !== "unknown") {
    safeStorage.remove(courseRegistrationKey(careerId, periodId));
  }
  // Solo quitar propuesta legacy si pertenece a esta carrera/periodo
  const legacy = safeStorage.get(LEGACY_KEYS.propuesta, null);
  if (
    !legacy ||
    !legacy.careerId ||
    legacy.careerId === careerId ||
    (!legacy.careerId && careerId)
  ) {
    safeStorage.remove(LEGACY_KEYS.propuesta);
  }
  safeStorage.remove(LEGACY_KEYS.programacionV1);
}

export function isAcademicProgrammingPersistenceEnabled() {
  return true;
}

/** @deprecated usar saveCourseRegistration */
export function saveAcademicProgramming() {
  throw createAppError(
    "UNEXPECTED",
    "saveAcademicProgramming deprecated — use saveCourseRegistration"
  );
}

/** @deprecated */
export function loadAcademicProgramming() {
  return null;
}

export function clearAcademicProgramming() {
  safeStorage.remove(LEGACY_KEYS.programacionV1);
}
