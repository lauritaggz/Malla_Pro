import { normalizeCourseCode } from "../features/academicProgramming/utils/normalizeCourseCode";
import { safeStorage } from "./safeStorage";
import {
  LEGACY_KEYS,
  getCareerId,
} from "./storageKeys";
import { migrateAcademicProgressIfNeeded } from "./academicProgressStorage";

/**
 * @typedef {Object} ProgressState
 * @property {number[]} aprobados
 * @property {number[]} excepciones
 * @property {number[]} cursando
 */

/**
 * @typedef {Object} CurriculumCourse
 * @property {number} id
 * @property {string} codigo
 * @property {string} nombre
 * @property {number[]} [prerrequisitos]
 * @property {number} semester
 * @property {number} [sct]
 * @property {number} [orderIndex]
 */

/**
 * Lee el avance desde localStorage (fuente de verdad de la malla).
 * @param {{ url?: string, nombre?: string } | null} [malla]
 * @returns {ProgressState}
 */
export function readProgressStateFromStorage(malla = null) {
  if (malla) {
    const progress = migrateAcademicProgressIfNeeded(getCareerId(malla));
    return {
      aprobados: progress.aprobados,
      excepciones: progress.excepciones,
      cursando: progress.cursando,
    };
  }

  return {
    aprobados: normalizeIdList(safeStorage.get(LEGACY_KEYS.aprobados, [])),
    excepciones: normalizeIdList(safeStorage.get(LEGACY_KEYS.excepciones, [])),
    cursando: normalizeIdList(safeStorage.get(LEGACY_KEYS.cursando, [])),
  };
}

/**
 * @param {unknown} value
 * @returns {number[]}
 */
function normalizeIdList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((v) => Number(v)).filter((n) => Number.isFinite(n));
}

/**
 * Completada = aprobada o excepcional (convalidación/forzada en Malla Pro).
 * @param {number} courseId
 * @param {ProgressState} progressState
 */
export function isCourseCompleted(courseId, progressState) {
  const id = Number(courseId);
  return (
    (progressState.aprobados || []).includes(id) ||
    (progressState.excepciones || []).includes(id)
  );
}

/**
 * @param {number} courseId
 * @param {ProgressState} progressState
 */
export function isCourseInProgress(courseId, progressState) {
  const id = Number(courseId);
  if (isCourseCompleted(id, progressState)) return false;
  return (progressState.cursando || []).includes(id);
}

/**
 * Misma semántica que MallaViewer.cumplePrereqs.
 * @param {{ prerrequisitos?: number[] }} course
 * @param {ProgressState} progressState
 */
export function meetsPrerequisites(course, progressState) {
  if (!course?.prerrequisitos?.length) return true;
  return course.prerrequisitos.every((pre) => {
    const preId = Number(pre);
    return (
      (progressState.aprobados || []).some((id) => Number(id) === preId) ||
      (progressState.excepciones || []).some((id) => Number(id) === preId)
    );
  });
}

/**
 * Lee el código de mención activa para una carrera.
 * @param {string} careerName
 * @returns {string | null}
 */
export function readActiveMentionCode(careerName) {
  if (!careerName || typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(`malla-mencion-${careerName}`);
  return raw && String(raw).trim() ? String(raw).trim() : null;
}

/**
 * Cursos efectivos de la trayectoria activa (comunes + mención seleccionada).
 * @param {object} mallaData - JSON de malla o shape de MallaViewer
 * @param {string | null} [mentionCode]
 * @returns {CurriculumCourse[]}
 */
export function getEffectiveCurriculumCourses(mallaData, mentionCode = null) {
  if (!mallaData) return [];

  /** @type {CurriculumCourse[]} */
  const result = [];
  let order = 0;

  const pushSemester = (semestre) => {
    const num = Number(semestre?.numero);
    if (!Number.isFinite(num)) return;
    const cursos = semestre?.cursos || [];
    for (const curso of cursos) {
      if (!curso || curso.id == null) continue;
      result.push({
        ...curso,
        semester: num,
        orderIndex: order++,
      });
    }
  };

  // Forma simple: semestres[]
  if (Array.isArray(mallaData.semestres) && mallaData.semestres.length) {
    for (const sem of mallaData.semestres) pushSemester(sem);
    return result;
  }

  // Forma MallaViewer / con menciones
  const comunes =
    mallaData.semestresComunes ||
    mallaData.semestres_comunes ||
    [];
  for (const sem of comunes) pushSemester(sem);

  const menciones = mallaData.menciones || {};
  const active =
    mentionCode && menciones[mentionCode]
      ? mentionCode
      : Object.keys(menciones)[0] || null;

  if (active && menciones[active]?.semestres) {
    for (const sem of menciones[active].semestres) pushSemester(sem);
  }

  return result;
}

/**
 * Total de semestres de la malla efectiva.
 * @param {object} mallaData
 * @param {CurriculumCourse[]} effectiveCourses
 */
export function getTotalSemesters(mallaData, effectiveCourses = []) {
  if (mallaData?.totalSemesters) return Number(mallaData.totalSemesters);
  if (mallaData?.total_semestres) return Number(mallaData.total_semestres);
  const maxFromCourses = effectiveCourses.reduce(
    (max, c) => Math.max(max, c.semester || 0),
    0
  );
  return maxFromCourses || 1;
}

/**
 * Lookup por id dentro de un set de cursos efectivos.
 * @param {CurriculumCourse[]} courses
 * @param {number} id
 */
export function findCurriculumCourseById(courses, id) {
  return courses.find((c) => Number(c.id) === Number(id)) || null;
}

/**
 * Mapa código normalizado → curso de malla.
 * @param {CurriculumCourse[]} courses
 * @param {Record<string, string[]>} [aliases] - CODIGO_MALLA → [CODIGO_PDF]
 */
export function buildCurriculumCodeIndex(courses, aliases = {}) {
  /** @type {Map<string, CurriculumCourse>} */
  const byCode = new Map();

  for (const course of courses) {
    const code = normalizeCourseCode(course.codigo);
    if (code) byCode.set(code, course);
  }

  for (const [mallaCode, pdfCodes] of Object.entries(aliases || {})) {
    const target = byCode.get(normalizeCourseCode(mallaCode));
    if (!target) continue;
    for (const alias of pdfCodes || []) {
      const a = normalizeCourseCode(alias);
      if (a && !byCode.has(a)) byCode.set(a, target);
    }
  }

  return byCode;
}

export const MALLA_PROGRESS_EVENT = "malla-progress-changed";

/**
 * Notifica a otras vistas (p. ej. Programación Académica) que el avance cambió.
 */
export function notifyMallaProgressChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(MALLA_PROGRESS_EVENT));
}
