import { normalizeCourseCode } from "../utils/normalizeCourseCode";
import {
  buildCurriculumCodeIndex,
  getEffectiveCurriculumCourses,
  isCourseCompleted,
  isCourseInProgress,
  notifyMallaProgressChanged,
  readProgressStateFromStorage,
} from "../../../utils/curriculumProgress";
import { writeAcademicProgress } from "../../../utils/academicProgressStorage";

/**
 * IDs de malla que deberían pasar a "cursando" a partir del Horario del Alumno.
 * No toca ramos ya aprobados, convalidados o cursando.
 * Omite códigos que no existen en la malla activa.
 *
 * @param {{
 *   ramos?: Array<{ codigo?: string, courseCode?: string }>,
 *   curriculum?: object | null,
 *   progressState?: import('../../../utils/curriculumProgress').ProgressState,
 *   mentionCode?: string | null,
 *   courseCodeAliases?: Record<string, string[]>,
 * }} params
 * @returns {{ toAdd: number[], skipped: Array<{ reason: string, codigo?: string, id?: number }> }}
 */
export function collectCursandoIdsFromStudentSchedule({
  ramos = [],
  curriculum = null,
  progressState = { aprobados: [], excepciones: [], cursando: [] },
  mentionCode = null,
  courseCodeAliases = {},
} = {}) {
  /** @type {number[]} */
  const toAdd = [];
  /** @type {Array<{ reason: string, codigo?: string, id?: number }>} */
  const skipped = [];

  if (!curriculum || !Array.isArray(ramos) || ramos.length === 0) {
    return { toAdd, skipped };
  }

  const effectiveCourses = getEffectiveCurriculumCourses(curriculum, mentionCode);
  const codeIndex = buildCurriculumCodeIndex(effectiveCourses, courseCodeAliases);
  const seenIds = new Set();

  for (const ramo of ramos) {
    const codigo = normalizeCourseCode(ramo?.codigo || ramo?.courseCode);
    if (!codigo) continue;

    const course = codeIndex.get(codigo);
    if (!course) {
      skipped.push({ reason: "unmatched", codigo });
      continue;
    }

    const id = Number(course.id);
    if (!Number.isFinite(id) || seenIds.has(id)) continue;
    seenIds.add(id);

    if (isCourseCompleted(id, progressState)) {
      skipped.push({ reason: "completed", codigo, id });
      continue;
    }

    if (isCourseInProgress(id, progressState)) {
      skipped.push({ reason: "already-in-progress", codigo, id });
      continue;
    }

    toAdd.push(id);
  }

  return { toAdd, skipped };
}

/**
 * Persiste en Mi malla los ramos inscritos que estaban desmarcados.
 * Solo suma a `cursando`. Nunca desmarca ni cambia aprobados/excepciones.
 *
 * @param {{ url?: string, nombre?: string } | null} malla
 * @param {object | null} curriculum
 * @param {Array} ramos
 * @param {{ mentionCode?: string | null, courseCodeAliases?: Record<string, string[]> }} [options]
 * @returns {{ ok: boolean, added: number, skipped: Array, progress: object, userMessage?: string }}
 */
export function syncStudentScheduleToMallaProgress(
  malla,
  curriculum,
  ramos,
  { mentionCode = null, courseCodeAliases = {} } = {}
) {
  const progressState = readProgressStateFromStorage(malla);
  const { toAdd, skipped } = collectCursandoIdsFromStudentSchedule({
    ramos,
    curriculum,
    progressState,
    mentionCode,
    courseCodeAliases,
  });

  if (toAdd.length === 0) {
    return { ok: true, added: 0, skipped, progress: progressState };
  }

  const next = {
    aprobados: progressState.aprobados || [],
    excepciones: progressState.excepciones || [],
    cursando: [...new Set([...(progressState.cursando || []), ...toAdd])],
  };

  const result = writeAcademicProgress(malla, next);
  if (!result.ok) {
    return {
      ok: false,
      added: 0,
      skipped,
      progress: progressState,
      userMessage: result.userMessage,
    };
  }

  notifyMallaProgressChanged();
  return { ok: true, added: toAdd.length, skipped, progress: next };
}
