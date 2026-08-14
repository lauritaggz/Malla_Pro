import { describe, expect, it } from "vitest";
import {
  applyExceptionSelection,
  appliedExceptionsToast,
  canSelectInExceptionMode,
  isNormallyApproved,
  sameIdSet,
  selectionCountLabel,
  toggleIdInSelection,
} from "./exceptionSelection";

describe("exceptionSelection", () => {
  it("al entrar, la selección inicial coincide con las excepciones existentes", () => {
    const snapshot = [1, 4];
    expect(sameIdSet(snapshot, [4, 1])).toBe(true);
    expect(sameIdSet(snapshot, [1])).toBe(false);
  });

  it("toggle agrega y quita sin tocar el snapshot", () => {
    const snapshot = [1];
    let selected = [...snapshot];
    selected = toggleIdInSelection(selected, 2);
    selected = toggleIdInSelection(selected, 3);
    expect(selected).toEqual([1, 2, 3]);
    expect(sameIdSet(snapshot, [1])).toBe(true);
  });

  it("deseleccionar un id lo saca de la selección temporal", () => {
    let selected = [1, 2];
    selected = toggleIdInSelection(selected, 1);
    expect(selected).toEqual([2]);
  });

  it("cancelar descarta la selección y deja el progreso intacto", () => {
    const progress = { excepciones: [1], aprobados: [1, 9], cursando: [3] };
    const selected = [1, 2, 3];
    expect(sameIdSet(selected, progress.excepciones)).toBe(false);
    expect(progress).toEqual({
      excepciones: [1],
      aprobados: [1, 9],
      cursando: [3],
    });
  });

  it("aplicar agrega excepciones nuevas a excepciones y aprobados", () => {
    const next = applyExceptionSelection(
      { excepciones: [1], aprobados: [1, 9], cursando: [2] },
      [1, 2]
    );
    expect(next.excepciones).toEqual([1, 2]);
    expect(next.aprobados.sort()).toEqual([1, 2, 9]);
    expect(next.cursando).toEqual([]);
  });

  it("aplicar al quitar una excepción la saca también de aprobados", () => {
    const next = applyExceptionSelection(
      { excepciones: [1, 2], aprobados: [1, 2, 9], cursando: [] },
      [1]
    );
    expect(next.excepciones).toEqual([1]);
    expect(next.aprobados.sort()).toEqual([1, 9]);
  });

  it("un curso aprobado normalmente no es seleccionable", () => {
    const progress = { aprobados: [5], excepciones: [] };
    expect(isNormallyApproved(5, progress)).toBe(true);
    expect(canSelectInExceptionMode(5, progress)).toBe(false);
  });

  it("un curso bloqueado o pendiente sí es seleccionable", () => {
    const progress = { aprobados: [], excepciones: [] };
    expect(canSelectInExceptionMode(8, progress)).toBe(true);
  });

  it("una excepción actual sigue siendo seleccionable (para poder quitarla)", () => {
    const progress = { aprobados: [3], excepciones: [3] };
    expect(isNormallyApproved(3, progress)).toBe(false);
    expect(canSelectInExceptionMode(3, progress)).toBe(true);
  });

  it("un curso cursando es seleccionable y al aplicar sale de cursando", () => {
    const progress = { excepciones: [], aprobados: [], cursando: [7] };
    expect(canSelectInExceptionMode(7, progress)).toBe(true);
    const next = applyExceptionSelection(progress, [7]);
    expect(next.excepciones).toEqual([7]);
    expect(next.aprobados).toEqual([7]);
    expect(next.cursando).toEqual([]);
  });

  it("singulariza el contador y el toast", () => {
    expect(selectionCountLabel(0)).toBe("0 seleccionados");
    expect(selectionCountLabel(1)).toBe("1 seleccionado");
    expect(selectionCountLabel(3)).toBe("3 seleccionados");
    expect(appliedExceptionsToast(1)).toBe("1 excepción activa");
    expect(appliedExceptionsToast(3)).toBe("3 excepciones activas");
  });

  it("sin cambios sameIdSet es true (Aplicar disabled)", () => {
    expect(sameIdSet([2, 1], [1, 2])).toBe(true);
  });
});
