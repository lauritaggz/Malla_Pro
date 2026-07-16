import { normalizeCourseCode } from "../utils/normalizeCourseCode";
import {
  isCourseCompleted,
  isCourseInProgress,
  meetsPrerequisites,
  getEffectiveCurriculumCourses,
  getTotalSemesters,
  buildCurriculumCodeIndex,
  findCurriculumCourseById,
} from "../../../utils/curriculumProgress";

/**
 * @typedef {"PRIMARY_SEMESTER"|"PREVIOUS_PENDING"|"PRIMARY_BLOCKED"|"PREVIOUS_BLOCKED"|"FUTURE_ELIGIBLE"|"FUTURE_BLOCKED"|"COMPLETED"|"IN_PROGRESS"|"UNMATCHED"} ProgrammingCourseCategory
 *
 * @typedef {Object} SemesterProgressSummary
 * @property {number} semester
 * @property {number} totalCourses
 * @property {number} completedCourses
 * @property {number} inProgressCourses
 * @property {number} pendingCourses
 * @property {number} eligiblePendingCourses
 * @property {number} offeredPendingCourses
 *
 * @typedef {Object} IntegratedCourse
 * @property {object} curriculumCourse
 * @property {object} programmingCourse
 * @property {ProgrammingCourseCategory} category
 * @property {number} semester
 * @property {boolean} isCompleted
 * @property {boolean} isInProgress
 * @property {boolean} isEligible
 * @property {object[]} missingPrerequisites
 */

/**
 * Frontera curricular = mayor semestre con progreso + 1 (acotada al último semestre).
 * @param {object[]} effectiveCourses
 * @param {import('../../../utils/curriculumProgress').ProgressState} progressState
 * @param {number} totalSemesters
 */
export function getCurricularFrontier(effectiveCourses, progressState, totalSemesters) {
  const maxSem = Math.max(1, Number(totalSemesters) || 1);
  const withProgress = (effectiveCourses || [])
    .filter(
      (c) =>
        isCourseCompleted(c.id, progressState) ||
        isCourseInProgress(c.id, progressState)
    )
    .map((c) => c.semester);

  if (!withProgress.length) return 1;
  return Math.min(Math.max(...withProgress) + 1, maxSem);
}

/**
 * @param {object[]} effectiveCourses
 * @param {import('../../../utils/curriculumProgress').ProgressState} progressState
 * @param {number} curricularFrontier
 * @param {Map<string, object>} programmingByCode
 */
export function getSemesterProgressSummaries(
  effectiveCourses,
  progressState,
  curricularFrontier,
  programmingByCode
) {
  /** @type {SemesterProgressSummary[]} */
  const summaries = [];

  for (let sem = 1; sem <= curricularFrontier; sem++) {
    const courses = effectiveCourses.filter((c) => c.semester === sem);
    let completed = 0;
    let inProgress = 0;
    let pending = 0;
    let eligiblePending = 0;
    let offeredPending = 0;

    for (const course of courses) {
      if (isCourseCompleted(course.id, progressState)) {
        completed += 1;
        continue;
      }
      if (isCourseInProgress(course.id, progressState)) {
        inProgress += 1;
        continue;
      }
      pending += 1;
      const eligible = meetsPrerequisites(course, progressState);
      if (eligible) eligiblePending += 1;
      const code = normalizeCourseCode(course.codigo);
      if (code && programmingByCode.has(code)) offeredPending += 1;
    }

    summaries.push({
      semester: sem,
      totalCourses: courses.length,
      completedCourses: completed,
      inProgressCourses: inProgress,
      pendingCourses: pending,
      eligiblePendingCourses: eligiblePending,
      offeredPendingCourses: offeredPending,
    });
  }

  return summaries;
}

/**
 * Semestre con más pendientes dentro de la frontera; empate → el más alto.
 * @param {SemesterProgressSummary[]} semesterSummaries
 * @param {number} curricularFrontier
 */
export function getPrimaryPendingSemester(semesterSummaries, curricularFrontier) {
  const inRange = (semesterSummaries || []).filter(
    (s) => s.semester >= 1 && s.semester <= curricularFrontier
  );

  if (!inRange.length) return Math.max(1, curricularFrontier);

  let best = inRange[0];
  for (const s of inRange) {
    if (s.pendingCourses > best.pendingCourses) {
      best = s;
    } else if (
      s.pendingCourses === best.pendingCourses &&
      s.semester > best.semester
    ) {
      best = s;
    }
  }

  // Si nadie tiene pendientes, usar la frontera
  if (best.pendingCourses === 0) {
    return curricularFrontier;
  }

  return best.semester;
}

/**
 * @param {Map<string, object>} programmingByCode
 * @param {string} code
 * @param {Record<string, string[]>} aliases
 */
export function matchCurriculumCourseWithProgramming(
  programmingByCode,
  code,
  aliases = {}
) {
  const norm = normalizeCourseCode(code);
  if (!norm) return null;
  if (programmingByCode.has(norm)) return programmingByCode.get(norm);

  // Alias: CODIGO_MALLA → [CODIGO_PDF]
  for (const [mallaCode, pdfCodes] of Object.entries(aliases || {})) {
    if (normalizeCourseCode(mallaCode) !== norm) continue;
    for (const pdf of pdfCodes || []) {
      const a = normalizeCourseCode(pdf);
      if (a && programmingByCode.has(a)) return programmingByCode.get(a);
    }
  }
  return null;
}

/**
 * @param {object} params
 * @param {object} params.curriculumCourse
 * @param {object|null} params.programmingCourse
 * @param {number} params.primarySemester
 * @param {import('../../../utils/curriculumProgress').ProgressState} params.progressState
 * @param {object[]} params.effectiveCourses
 */
export function classifyProgrammingCourse({
  curriculumCourse,
  primarySemester,
  progressState,
  effectiveCourses,
}) {
  if (!curriculumCourse) {
    return {
      category: /** @type {ProgrammingCourseCategory} */ ("UNMATCHED"),
      isCompleted: false,
      isInProgress: false,
      isEligible: false,
      missingPrerequisites: [],
    };
  }

  const completed = isCourseCompleted(curriculumCourse.id, progressState);
  const inProgress = isCourseInProgress(curriculumCourse.id, progressState);
  const eligible = meetsPrerequisites(curriculumCourse, progressState);
  const missing = (curriculumCourse.prerrequisitos || [])
    .filter(
      (preId) =>
        !(progressState.aprobados || []).includes(preId) &&
        !(progressState.excepciones || []).includes(preId)
    )
    .map((preId) => findCurriculumCourseById(effectiveCourses, preId))
    .filter(Boolean);

  if (completed) {
    return {
      category: "COMPLETED",
      isCompleted: true,
      isInProgress: false,
      isEligible: true,
      missingPrerequisites: [],
    };
  }
  if (inProgress) {
    return {
      category: "IN_PROGRESS",
      isCompleted: false,
      isInProgress: true,
      isEligible: eligible,
      missingPrerequisites: missing,
    };
  }

  const sem = curriculumCourse.semester;
  if (sem === primarySemester) {
    return {
      category: eligible ? "PRIMARY_SEMESTER" : "PRIMARY_BLOCKED",
      isCompleted: false,
      isInProgress: false,
      isEligible: eligible,
      missingPrerequisites: missing,
    };
  }
  if (sem < primarySemester) {
    return {
      category: eligible ? "PREVIOUS_PENDING" : "PREVIOUS_BLOCKED",
      isCompleted: false,
      isInProgress: false,
      isEligible: eligible,
      missingPrerequisites: missing,
    };
  }
  return {
    category: eligible ? "FUTURE_ELIGIBLE" : "FUTURE_BLOCKED",
    isCompleted: false,
    isInProgress: false,
    isEligible: eligible,
    missingPrerequisites: missing,
  };
}

/**
 * Agrupa pendientes anteriores por semestre descendente.
 * @param {IntegratedCourse[]} courses
 */
export function groupPreviousPendingBySemester(courses) {
  /** @type {Map<number, IntegratedCourse[]>} */
  const map = new Map();
  for (const course of courses || []) {
    const sem = course.semester;
    if (!map.has(sem)) map.set(sem, []);
    map.get(sem).push(course);
  }

  for (const [, list] of map) {
    list.sort(
      (a, b) =>
        (a.curriculumCourse?.orderIndex ?? 0) -
        (b.curriculumCourse?.orderIndex ?? 0)
    );
  }

  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([semester, items]) => ({ semester, courses: items }));
}

/**
 * Integra programación académica con el avance de la malla.
 * @param {{
 *   curriculum: object,
 *   progressState: import('../../../utils/curriculumProgress').ProgressState,
 *   academicProgramming: { courses: object[] },
 *   mentionCode?: string | null,
 *   courseCodeAliases?: Record<string, string[]>
 * }} params
 */
export function integrateProgrammingWithProgress({
  curriculum,
  progressState,
  academicProgramming,
  mentionCode = null,
  courseCodeAliases = {},
}) {
  const effectiveCourses = getEffectiveCurriculumCourses(curriculum, mentionCode);
  const totalSemesters = getTotalSemesters(curriculum, effectiveCourses);
  const curricularFrontier = getCurricularFrontier(
    effectiveCourses,
    progressState,
    totalSemesters
  );

  /** @type {Map<string, object>} */
  const programmingByCode = new Map();
  for (const course of academicProgramming?.courses || []) {
    const code = normalizeCourseCode(course.courseCode);
    if (code) programmingByCode.set(code, course);
  }

  const codeIndex = buildCurriculumCodeIndex(effectiveCourses, courseCodeAliases);

  const semesterSummaries = getSemesterProgressSummaries(
    effectiveCourses,
    progressState,
    curricularFrontier,
    programmingByCode
  );

  let primarySemester = getPrimaryPendingSemester(
    semesterSummaries,
    curricularFrontier
  );

  // Si la frontera está completamente aprobada y hay siguiente semestre, avanzar
  const frontierSummary = semesterSummaries.find(
    (s) => s.semester === curricularFrontier
  );
  if (
    frontierSummary &&
    frontierSummary.pendingCourses === 0 &&
    frontierSummary.inProgressCourses === 0 &&
    curricularFrontier < totalSemesters
  ) {
    primarySemester = Math.min(curricularFrontier + 1, totalSemesters);
  }

  /** @type {IntegratedCourse[]} */
  const primarySemesterCourses = [];
  /** @type {IntegratedCourse[]} */
  const previousPendingCourses = [];
  /** @type {IntegratedCourse[]} */
  const primaryBlockedCourses = [];
  /** @type {IntegratedCourse[]} */
  const previousBlockedCourses = [];
  /** @type {IntegratedCourse[]} */
  const futureEligibleCourses = [];
  /** @type {IntegratedCourse[]} */
  const futureBlockedCourses = [];
  /** @type {IntegratedCourse[]} */
  const completedCourses = [];
  /** @type {IntegratedCourse[]} */
  const inProgressCourses = [];
  /** @type {object[]} */
  const unmatchedCourses = [];

  const matchedProgrammingCodes = new Set();

  // Recorrer malla efectiva en orden
  for (const curriculumCourse of effectiveCourses) {
    const programmingCourse = matchCurriculumCourseWithProgramming(
      programmingByCode,
      curriculumCourse.codigo,
      courseCodeAliases
    );

    if (programmingCourse) {
      matchedProgrammingCodes.add(normalizeCourseCode(programmingCourse.courseCode));
    }

    // Solo integramos cursos que aparecen en el PDF en las listas principales;
    // los missing se calculan aparte.
    if (!programmingCourse) continue;

    const classified = classifyProgrammingCourse({
      curriculumCourse,
      primarySemester,
      progressState,
      effectiveCourses,
    });

    /** @type {IntegratedCourse} */
    const integrated = {
      curriculumCourse,
      programmingCourse,
      category: classified.category,
      semester: curriculumCourse.semester,
      isCompleted: classified.isCompleted,
      isInProgress: classified.isInProgress,
      isEligible: classified.isEligible,
      missingPrerequisites: classified.missingPrerequisites,
    };

    switch (classified.category) {
      case "PRIMARY_SEMESTER":
        primarySemesterCourses.push(integrated);
        break;
      case "PREVIOUS_PENDING":
        previousPendingCourses.push(integrated);
        break;
      case "PRIMARY_BLOCKED":
        primaryBlockedCourses.push(integrated);
        break;
      case "PREVIOUS_BLOCKED":
        previousBlockedCourses.push(integrated);
        break;
      case "FUTURE_ELIGIBLE":
        futureEligibleCourses.push(integrated);
        break;
      case "FUTURE_BLOCKED":
        futureBlockedCourses.push(integrated);
        break;
      case "COMPLETED":
        completedCourses.push(integrated);
        break;
      case "IN_PROGRESS":
        inProgressCourses.push(integrated);
        break;
      default:
        break;
    }
  }

  // PDF sin match en malla
  for (const course of academicProgramming?.courses || []) {
    const code = normalizeCourseCode(course.courseCode);
    if (!code || matchedProgrammingCodes.has(code)) continue;
    // Si el código está en el índice de malla pero no se recorrió (mención?), no
    if (codeIndex.has(code) && !matchedProgrammingCodes.has(code)) {
      // Curso de otra mención / fuera de trayectoria → unmatched
    }
    unmatchedCourses.push(course);
  }

  // Pendientes de malla no ofrecidos en el PDF
  /** @type {{ curriculumCourse: object, semester: number, scope: "PRIMARY"|"PREVIOUS" }[]} */
  const missingFromProgramming = [];
  for (const curriculumCourse of effectiveCourses) {
    if (isCourseCompleted(curriculumCourse.id, progressState)) continue;
    if (isCourseInProgress(curriculumCourse.id, progressState)) continue;
    if (curriculumCourse.semester > primarySemester) continue;

    const offered = matchCurriculumCourseWithProgramming(
      programmingByCode,
      curriculumCourse.codigo,
      courseCodeAliases
    );
    if (offered) continue;

    missingFromProgramming.push({
      curriculumCourse,
      semester: curriculumCourse.semester,
      scope:
        curriculumCourse.semester === primarySemester ? "PRIMARY" : "PREVIOUS",
    });
  }

  const byMallaOrder = (a, b) =>
    (a.curriculumCourse?.orderIndex ?? 0) - (b.curriculumCourse?.orderIndex ?? 0);

  primarySemesterCourses.sort(byMallaOrder);
  previousPendingCourses.sort(
    (a, b) =>
      b.semester - a.semester ||
      (a.curriculumCourse?.orderIndex ?? 0) - (b.curriculumCourse?.orderIndex ?? 0)
  );
  primaryBlockedCourses.sort(byMallaOrder);
  previousBlockedCourses.sort(
    (a, b) =>
      b.semester - a.semester ||
      (a.curriculumCourse?.orderIndex ?? 0) - (b.curriculumCourse?.orderIndex ?? 0)
  );
  futureEligibleCourses.sort(byMallaOrder);
  futureBlockedCourses.sort(byMallaOrder);

  const primarySummary = semesterSummaries.find((s) => s.semester === primarySemester);

  return {
    curricularFrontier,
    primarySemester,
    totalSemesters,
    semesterSummaries,
    primarySummary: primarySummary || null,
    previousPendingCount: previousPendingCourses.length,
    primarySemesterCourses,
    previousPendingCourses,
    primaryBlockedCourses,
    previousBlockedCourses,
    futureEligibleCourses,
    futureBlockedCourses,
    completedCourses,
    inProgressCourses,
    unmatchedCourses,
    missingFromProgramming,
    hasCurriculum: effectiveCourses.length > 0,
  };
}

/**
 * Convierte IntegratedCourse a shape de acordeón + meta.
 * @param {IntegratedCourse} integrated
 * @param {string} [badge]
 */
export function toDisplayCourse(integrated, badge) {
  const prog = integrated.programmingCourse;
  return {
    ...prog,
    curriculumCourse: integrated.curriculumCourse,
    semester: integrated.semester,
    totalSectionCount: prog.sections?.length || 0,
    filteredSectionCount: prog.sections?.length || 0,
    _integration: {
      category: integrated.category,
      semester: integrated.semester,
      badge: badge || null,
      isEligible: integrated.isEligible,
      missingPrerequisites: integrated.missingPrerequisites || [],
      curriculumCourse: integrated.curriculumCourse,
    },
  };
}

export { isCourseCompleted, isCourseInProgress };

