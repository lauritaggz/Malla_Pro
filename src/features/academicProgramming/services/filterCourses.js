import { DAY_ORDER } from "../utils/parseMeetings";

/**
 * @typedef {"MORNING" | "AFTERNOON" | "EVENING" | "SATURDAY"} TimePeriod
 *
 * @typedef {"COURSE_CODE" | "COURSE_NAME" | "MOST_SECTIONS" | "FEWEST_SECTIONS" | "EARLIEST_START" | "LATEST_END"} SortBy
 *
 * @typedef {"" | "WITH_SCHEDULE" | "WITHOUT_SCHEDULE"} SchedulePresence
 *
 * @typedef {Object} ProgrammingViewFilters
 * @property {string} query
 * @property {string[]} modalities
 * @property {string[]} days
 * @property {TimePeriod[]} periods
 * @property {string[]} activityTypes
 * @property {SortBy} sortBy
 * @property {string} [professorQuery]
 * @property {SchedulePresence} [schedulePresence]
 * @property {boolean} [onlyWithCapacity]
 */

export const DEFAULT_FILTERS = {
  query: "",
  modalities: [],
  days: [],
  periods: [],
  activityTypes: [],
  sortBy: /** @type {SortBy} */ ("COURSE_CODE"),
  professorQuery: "",
  schedulePresence: /** @type {SchedulePresence} */ (""),
  onlyWithCapacity: false,
};

export const PERIOD_OPTIONS = [
  { value: "MORNING", label: "Mañana" },
  { value: "AFTERNOON", label: "Tarde" },
  { value: "EVENING", label: "Vespertina" },
  { value: "SATURDAY", label: "Sábado" },
];

export const SORT_OPTIONS = [
  { value: "COURSE_CODE", label: "Código de asignatura" },
  { value: "COURSE_NAME", label: "Nombre de asignatura" },
  { value: "MOST_SECTIONS", label: "Mayor cantidad de secciones" },
  { value: "FEWEST_SECTIONS", label: "Menor cantidad de secciones" },
  { value: "EARLIEST_START", label: "Horario más temprano" },
  { value: "LATEST_END", label: "Horario más tarde" },
];

export const MODALITY_LABELS = {
  PRESENCIAL: "Presencial",
  VIRTUAL: "Virtual",
  E_LEARNING: "E-learning",
  BLENDED: "Blended",
  UNKNOWN: "Desconocida",
};

/**
 * @param {string} text
 */
export function normalizeSearch(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {string} time
 * @returns {number | null}
 */
export function timeToMinutes(time) {
  const m = String(time || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * @param {import('../types/academicProgramming').AcademicMeeting} meeting
 * @param {TimePeriod} period
 */
export function meetingMatchesPeriod(meeting, period) {
  if (period === "SATURDAY") return meeting.dayCode === "SA";

  const mins = timeToMinutes(meeting.startTime);
  if (mins == null) return false;

  if (period === "MORNING") return mins < 13 * 60;
  if (period === "AFTERNOON") return mins >= 13 * 60 && mins < 18 * 60;
  if (period === "EVENING") return mins >= 18 * 60;
  return false;
}

/**
 * @param {import('../types/academicProgramming').AcademicSection} section
 * @param {TimePeriod[]} periods
 */
function sectionMatchesPeriods(section, periods) {
  if (!periods?.length) return true;
  return (section.meetings || []).some((meeting) =>
    periods.some((p) => meetingMatchesPeriod(meeting, p))
  );
}

/**
 * @param {import('../types/academicProgramming').AcademicSection} section
 * @param {ProgrammingViewFilters} filters
 * @param {string} queryNorm
 */
function sectionMatchesFilters(section, filters, queryNorm) {
  if (filters.modalities?.length && !filters.modalities.includes(section.modality)) {
    return false;
  }

  if (filters.days?.length) {
    const hasDay = (section.meetings || []).some((m) => filters.days.includes(m.dayCode));
    if (!hasDay) return false;
  }

  if (!sectionMatchesPeriods(section, filters.periods || [])) return false;

  if (filters.activityTypes?.length) {
    const act = normalizeSearch(section.activityType);
    const ok = filters.activityTypes.some((a) => act.includes(normalizeSearch(a)));
    if (!ok) return false;
  }

  if (filters.professorQuery) {
    const pq = normalizeSearch(filters.professorQuery);
    const hit = (section.professors || []).some((p) =>
      normalizeSearch(p).includes(pq)
    );
    if (!hit) return false;
  }

  if (filters.schedulePresence === "WITH_SCHEDULE") {
    if (!(section.meetings || []).length) return false;
  }
  if (filters.schedulePresence === "WITHOUT_SCHEDULE") {
    if ((section.meetings || []).length > 0) return false;
  }

  if (filters.onlyWithCapacity && section.capacity == null) {
    return false;
  }

  if (!queryNorm) return true;

  const haystack = normalizeSearch(
    [
      section.courseCode,
      section.courseTitle,
      section.nrc,
      section.sectionNumber,
      section.activityType,
      ...(section.professors || []),
      ...(section.linkedNrcs || []),
    ].join(" ")
  );

  const codeQ = queryNorm.replace(/[^A-Z0-9]/g, "");
  const codeS = String(section.courseCode || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (codeQ && codeS.includes(codeQ)) return true;

  return haystack.includes(queryNorm);
}

/**
 * @param {import('../types/academicProgramming').AcademicCourse} course
 */
function earliestStartMinutes(course) {
  let min = Infinity;
  for (const section of course.sections || []) {
    for (const m of section.meetings || []) {
      const t = timeToMinutes(m.startTime);
      if (t != null && t < min) min = t;
    }
  }
  return Number.isFinite(min) ? min : 24 * 60;
}

/**
 * @param {import('../types/academicProgramming').AcademicCourse} course
 */
function latestEndMinutes(course) {
  let max = -1;
  for (const section of course.sections || []) {
    for (const m of section.meetings || []) {
      const t = timeToMinutes(m.endTime);
      if (t != null && t > max) max = t;
    }
  }
  return max >= 0 ? max : -1;
}

/**
 * @param {import('../types/academicProgramming').AcademicCourse[]} courses
 * @param {SortBy} sortBy
 */
export function sortFilteredCourses(courses, sortBy = "COURSE_CODE") {
  const list = [...(courses || [])];

  list.sort((a, b) => {
    switch (sortBy) {
      case "COURSE_NAME":
        return String(a.courseTitle || "").localeCompare(String(b.courseTitle || ""), "es", {
          sensitivity: "base",
        });
      case "MOST_SECTIONS":
        return (b.sections?.length || 0) - (a.sections?.length || 0);
      case "FEWEST_SECTIONS":
        return (a.sections?.length || 0) - (b.sections?.length || 0);
      case "EARLIEST_START":
        return earliestStartMinutes(a) - earliestStartMinutes(b);
      case "LATEST_END":
        return latestEndMinutes(b) - latestEndMinutes(a);
      case "COURSE_CODE":
      default:
        if (a._integration?.curriculumCourse && b._integration?.curriculumCourse) {
          return (a._integration.curriculumCourse.orderIndex ?? 0) - (b._integration.curriculumCourse.orderIndex ?? 0);
        }
        return String(a.courseCode || "").localeCompare(String(b.courseCode || ""), "es", {
          numeric: true,
        });
    }
  });

  return list;
}

/**
 * Filtra cursos/secciones y ordena el resultado.
 * Conserva `totalSectionCount` (secciones originales del curso) para UI.
 *
 * @param {import('../types/academicProgramming').AcademicCourse[]} courses
 * @param {ProgrammingViewFilters} filters
 */
export function filterAndSortCourses(courses, filters = DEFAULT_FILTERS) {
  const queryNorm = normalizeSearch(filters.query || "");

  const mapped = (courses || [])
    .map((course) => {
      const totalSectionCount = course.sections?.length || 0;
      const sections = (course.sections || []).filter((section) =>
        sectionMatchesFilters(section, filters, queryNorm)
      );
      if (sections.length === 0) return null;
      return {
        ...course,
        sections,
        totalSectionCount,
        filteredSectionCount: sections.length,
      };
    })
    .filter(Boolean);

  return sortFilteredCourses(mapped, filters.sortBy || "COURSE_CODE");
}

/**
 * Compatibilidad con API anterior (tests / usos simples).
 * @param {import('../types/academicProgramming').AcademicCourse[]} courses
 * @param {object} filters
 */
export function filterCourses(courses, filters = {}) {
  return filterAndSortCourses(courses, {
    ...DEFAULT_FILTERS,
    query: filters.query || "",
    modalities: filters.modality ? [filters.modality] : filters.modalities || [],
    days: filters.dayCode ? [filters.dayCode] : filters.days || [],
    periods: filters.periods || [],
    activityTypes: filters.activityType
      ? [filters.activityType]
      : filters.activityTypes || [],
    sortBy: filters.sortBy || "COURSE_CODE",
  });
}

/**
 * @param {import('../types/academicProgramming').AcademicCourse[]} courses
 */
export function collectFilterOptions(courses) {
  const modalities = new Set();
  const days = new Set();
  const activities = new Set();

  for (const course of courses || []) {
    for (const section of course.sections || []) {
      if (section.modality) modalities.add(section.modality);
      if (section.activityType) activities.add(section.activityType);
      for (const meeting of section.meetings || []) {
        if (meeting.dayCode) days.add(meeting.dayCode);
      }
    }
  }

  return {
    modalities: [...modalities].sort(),
    days: DAY_ORDER.filter((d) => days.has(d)),
    activities: [...activities].sort((a, b) => a.localeCompare(b, "es")),
  };
}

/**
 * @param {import('../types/academicProgramming').AcademicCourse[]} courses
 */
export function collectModalityCount(courses) {
  const set = new Set();
  for (const course of courses || []) {
    for (const section of course.sections || []) {
      if (section.modality && section.modality !== "UNKNOWN") {
        set.add(section.modality);
      } else if (section.modality === "UNKNOWN") {
        set.add("UNKNOWN");
      }
    }
  }
  return set.size;
}

/**
 * @param {ProgrammingViewFilters} filters
 */
export function hasActiveFilters(filters) {
  return Boolean(
    (filters.query && filters.query.trim()) ||
      filters.modalities?.length ||
      filters.days?.length ||
      filters.periods?.length ||
      filters.activityTypes?.length ||
      (filters.professorQuery && filters.professorQuery.trim()) ||
      filters.schedulePresence ||
      filters.onlyWithCapacity
  );
}

/**
 * @param {ProgrammingViewFilters} filters
 */
export function buildActiveFilterChips(filters) {
  /** @type {Array<{ id: string, group: string, value: string, label: string }>} */
  const chips = [];

  for (const m of filters.modalities || []) {
    chips.push({
      id: `modality:${m}`,
      group: "modalities",
      value: m,
      label: MODALITY_LABELS[m] || m,
    });
  }
  for (const d of filters.days || []) {
    chips.push({
      id: `day:${d}`,
      group: "days",
      value: d,
      label: ({ LU: "Lunes", MA: "Martes", MI: "Miércoles", JU: "Jueves", VI: "Viernes", SA: "Sábado", DO: "Domingo" })[d] || d,
    });
  }
  for (const p of filters.periods || []) {
    const opt = PERIOD_OPTIONS.find((o) => o.value === p);
    chips.push({
      id: `period:${p}`,
      group: "periods",
      value: p,
      label: opt?.label || p,
    });
  }
  for (const a of filters.activityTypes || []) {
    chips.push({
      id: `activity:${a}`,
      group: "activityTypes",
      value: a,
      label: a,
    });
  }
  if (filters.professorQuery?.trim()) {
    chips.push({
      id: `professor:${filters.professorQuery}`,
      group: "professorQuery",
      value: filters.professorQuery,
      label: `Profesor: ${filters.professorQuery}`,
    });
  }
  if (filters.schedulePresence === "WITH_SCHEDULE") {
    chips.push({
      id: "schedule:with",
      group: "schedulePresence",
      value: "WITH_SCHEDULE",
      label: "Con horario",
    });
  }
  if (filters.schedulePresence === "WITHOUT_SCHEDULE") {
    chips.push({
      id: "schedule:without",
      group: "schedulePresence",
      value: "WITHOUT_SCHEDULE",
      label: "Sin horario",
    });
  }
  if (filters.onlyWithCapacity) {
    chips.push({
      id: "capacity:yes",
      group: "onlyWithCapacity",
      value: "true",
      label: "Con vacantes informadas",
    });
  }

  return chips;
}

export const SECTION_SORT_OPTIONS = [
  { value: "EARLIEST", label: "Horario más temprano" },
  { value: "SECTION_NUMBER", label: "Número de sección" },
  { value: "PROFESSOR", label: "Profesor" },
  { value: "MODALITY", label: "Modalidad" },
];

/**
 * @param {import('../types/academicProgramming').AcademicSection} section
 */
function sectionEarliestStart(section) {
  let min = Infinity;
  for (const m of section.meetings || []) {
    const t = timeToMinutes(m.startTime);
    if (t != null && t < min) min = t;
  }
  return Number.isFinite(min) ? min : 24 * 60 + 1;
}

/**
 * @param {import('../types/academicProgramming').AcademicSection} section
 */
function sectionEarliestDay(section) {
  let min = 99;
  for (const m of section.meetings || []) {
    const idx = DAY_ORDER.indexOf(m.dayCode);
    if (idx >= 0 && idx < min) min = idx;
  }
  return min;
}

/**
 * Orden por defecto de secciones dentro de una asignatura.
 * @param {import('../types/academicProgramming').AcademicSection[]} sections
 * @param {string} [sortBy]
 */
export function sortSectionsInCourse(sections, sortBy = "EARLIEST") {
  const list = [...(sections || [])];
  list.sort((a, b) => {
    if (sortBy === "SECTION_NUMBER") {
      const na = Number.parseInt(String(a.sectionNumber).replace(/\D/g, ""), 10);
      const nb = Number.parseInt(String(b.sectionNumber).replace(/\D/g, ""), 10);
      if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
      return String(a.sectionNumber).localeCompare(String(b.sectionNumber), "es", {
        numeric: true,
      });
    }
    if (sortBy === "PROFESSOR") {
      const pa = (a.professors || [])[0] || "";
      const pb = (b.professors || [])[0] || "";
      return pa.localeCompare(pb, "es", { sensitivity: "base" });
    }
    if (sortBy === "MODALITY") {
      return String(a.modality || "").localeCompare(String(b.modality || ""));
    }
    // EARLIEST default: con horario primero, luego hora, día, sección, NRC
    const ha = (a.meetings || []).length > 0 ? 0 : 1;
    const hb = (b.meetings || []).length > 0 ? 0 : 1;
    if (ha !== hb) return ha - hb;
    const sa = sectionEarliestStart(a);
    const sb = sectionEarliestStart(b);
    if (sa !== sb) return sa - sb;
    const da = sectionEarliestDay(a);
    const db = sectionEarliestDay(b);
    if (da !== db) return da - db;
    const na = Number.parseInt(String(a.sectionNumber).replace(/\D/g, ""), 10) || 0;
    const nb = Number.parseInt(String(b.sectionNumber).replace(/\D/g, ""), 10) || 0;
    if (na !== nb) return na - nb;
    return String(a.nrc || "").localeCompare(String(b.nrc || ""), "es", { numeric: true });
  });
  return list;
}

/**
 * @param {import('../types/academicProgramming').AcademicSection} section
 * @returns {string}
 */
export function getSectionPrimaryPeriod(section) {
  const meetings = section.meetings || [];
  if (!meetings.length) return "NONE";
  if (meetings.some((m) => m.dayCode === "SA")) return "SATURDAY";
  for (const m of meetings) {
    const mins = timeToMinutes(m.startTime);
    if (mins == null) continue;
    if (mins < 13 * 60) return "MORNING";
    if (mins < 18 * 60) return "AFTERNOON";
    return "EVENING";
  }
  return "NONE";
}

export const PERIOD_GROUP_LABELS = {
  MORNING: "Mañana",
  AFTERNOON: "Tarde",
  EVENING: "Vespertina",
  SATURDAY: "Sábado",
  NONE: "Sin horario",
};
