import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  collectCursandoIdsFromStudentSchedule,
  syncStudentScheduleToMallaProgress,
} from "../services/syncStudentScheduleToMallaProgress";
import { writeAcademicProgress } from "../../../utils/academicProgressStorage";
import { readProgressStateFromStorage } from "../../../utils/curriculumProgress";

const malla = { nombre: "Ingeniería de Prueba", url: "/mallas/test.json" };

const curriculum = {
  carrera: "Ingeniería de Prueba",
  totalSemestres: 2,
  semestres: [
    {
      numero: 1,
      cursos: [
        { id: 1, codigo: "MAT1", nombre: "Matemática I", prerrequisitos: [] },
        { id: 2, codigo: "PROG-1", nombre: "Programación I", prerrequisitos: [] },
      ],
    },
    {
      numero: 2,
      cursos: [
        { id: 3, codigo: "MAT2", nombre: "Matemática II", prerrequisitos: [1] },
      ],
    },
  ],
};

function mockLocalStorage() {
  const store = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  });
}

describe("syncStudentScheduleToMallaProgress", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it("marca como cursando ramos desmarcados que aparecen en el horario", () => {
    const { toAdd, skipped } = collectCursandoIdsFromStudentSchedule({
      ramos: [
        { codigo: "MAT1" },
        { codigo: "PROG-1" },
      ],
      curriculum,
      progressState: { aprobados: [], excepciones: [], cursando: [] },
    });

    expect(toAdd).toEqual([1, 2]);
    expect(skipped).toEqual([]);
  });

  it("no toca ramos ya aprobados o convalidados", () => {
    const { toAdd, skipped } = collectCursandoIdsFromStudentSchedule({
      ramos: [{ codigo: "MAT1" }, { codigo: "PROG1" }],
      curriculum,
      progressState: { aprobados: [1], excepciones: [2], cursando: [] },
    });

    expect(toAdd).toEqual([]);
    expect(skipped.map((s) => s.reason).sort()).toEqual([
      "completed",
      "completed",
    ]);
  });

  it("no vuelve a marcar un ramo que ya está cursando", () => {
    const { toAdd, skipped } = collectCursandoIdsFromStudentSchedule({
      ramos: [{ codigo: "MAT1" }],
      curriculum,
      progressState: { aprobados: [], excepciones: [], cursando: [1] },
    });

    expect(toAdd).toEqual([]);
    expect(skipped).toEqual([
      { reason: "already-in-progress", codigo: "MAT1", id: 1 },
    ]);
  });

  it("omite códigos que no están en la malla", () => {
    const { toAdd, skipped } = collectCursandoIdsFromStudentSchedule({
      ramos: [{ codigo: "XXXX999" }, { codigo: "MAT1" }],
      curriculum,
      progressState: { aprobados: [], excepciones: [], cursando: [] },
    });

    expect(toAdd).toEqual([1]);
    expect(skipped).toEqual([{ reason: "unmatched", codigo: "XXXX999" }]);
  });

  it("normaliza códigos (PROG-1 ≡ PROG1) y no duplica el mismo id", () => {
    const { toAdd } = collectCursandoIdsFromStudentSchedule({
      ramos: [{ codigo: "PROG-1" }, { codigo: "PROG1" }],
      curriculum,
      progressState: { aprobados: [], excepciones: [], cursando: [] },
    });

    expect(toAdd).toEqual([2]);
  });

  it("persiste solo los nuevos cursando y conserva aprobados", () => {
    writeAcademicProgress(malla, {
      aprobados: [1],
      excepciones: [],
      cursando: [],
    });

    const result = syncStudentScheduleToMallaProgress(malla, curriculum, [
      { codigo: "MAT1" },
      { codigo: "PROG-1" },
    ]);

    expect(result.ok).toBe(true);
    expect(result.added).toBe(1);
    expect(result.progress.aprobados).toEqual([1]);
    expect(result.progress.cursando).toEqual([2]);

    const stored = readProgressStateFromStorage(malla);
    expect(stored.aprobados).toEqual([1]);
    expect(stored.cursando).toEqual([2]);
  });
});
