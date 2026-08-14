/**
 * Lógica pura del Modo Excepcional (selección temporal → apply/cancel).
 * Replica la semántica actual de marcarExcepcional:
 *  - agregar excepción → entra a excepciones y a aprobados; sale de cursando
 *  - quitar excepción → sale de excepciones y de aprobados
 * No distingue "aprobado manual" vs "aprobado por excepción" al quitar:
 * ese es el modelo persistido hoy (excepciones ⊆ aprobados).
 */

export function normalizeIdList(ids) {
  return [...new Set((ids || []).map((id) => Number(id)).filter((n) => Number.isFinite(n)))];
}

export function sameIdSet(a, b) {
  const left = new Set(normalizeIdList(a));
  const right = new Set(normalizeIdList(b));
  if (left.size !== right.size) return false;
  for (const id of left) {
    if (!right.has(id)) return false;
  }
  return true;
}

export function isInIdList(id, list) {
  const n = Number(id);
  return (list || []).some((x) => Number(x) === n);
}

/**
 * Aprobado "normal": está en aprobados y NO en excepciones.
 */
export function isNormallyApproved(id, { aprobados = [], excepciones = [] } = {}) {
  return isInIdList(id, aprobados) && !isInIdList(id, excepciones);
}

/**
 * En el modo se puede seleccionar: pendientes, bloqueados, cursando
 * y excepciones actuales. No los ya aprobados de forma normal.
 */
export function canSelectInExceptionMode(id, progress = {}) {
  return !isNormallyApproved(id, progress);
}

/**
 * Aplica la selección temporal sobre el progreso persistente.
 * @param {{ aprobados?: number[], excepciones?: number[], cursando?: number[] }} progress
 * @param {number[]} nextExceptionIds
 */
export function applyExceptionSelection(progress = {}, nextExceptionIds = []) {
  const prevExc = new Set(normalizeIdList(progress.excepciones));
  const nextExc = new Set(normalizeIdList(nextExceptionIds));
  const aprobados = new Set(normalizeIdList(progress.aprobados));
  const cursando = new Set(normalizeIdList(progress.cursando));

  for (const id of nextExc) {
    if (!prevExc.has(id)) {
      aprobados.add(id);
      cursando.delete(id);
    }
  }

  for (const id of prevExc) {
    if (!nextExc.has(id)) {
      aprobados.delete(id);
    }
  }

  return {
    excepciones: [...nextExc],
    aprobados: [...aprobados],
    cursando: [...cursando],
  };
}

export function toggleIdInSelection(selectedIds, id) {
  const current = normalizeIdList(selectedIds);
  const n = Number(id);
  if (!Number.isFinite(n)) return current;
  return current.includes(n) ? current.filter((x) => x !== n) : [...current, n];
}

export function selectionCountLabel(count) {
  const n = Number(count) || 0;
  if (n === 1) return "1 seleccionado";
  return `${n} seleccionados`;
}

export function appliedExceptionsToast(count) {
  const n = Number(count) || 0;
  if (n === 1) return "1 excepción activa";
  return `${n} excepciones activas`;
}
