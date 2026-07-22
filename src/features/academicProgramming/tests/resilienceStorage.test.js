import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getUserSafeMessage,
  normalizeAppError,
  USER_SAFE_MESSAGES,
} from "../../../utils/appErrors";
import { safeStorage } from "../../../utils/safeStorage";
import {
  getCareerId,
  getPeriodId,
  LEGACY_KEYS,
  courseRegistrationKey,
} from "../../../utils/storageKeys";
import {
  migrateAcademicProgressIfNeeded,
  readLegacyAcademicProgress,
  writeAcademicProgress,
  clearAcademicProgress,
} from "../../../utils/academicProgressStorage";
import {
  buildRegistrationState,
  clearCourseRegistration,
  loadCourseRegistration,
  saveCourseRegistration,
  sanitizeProgrammingForStorage,
  validateRegistrationState,
} from "../services/persistence";
import { parseMeetings } from "../utils/parseMeetings";
import { hasMeetingConflict, timeToMinutes } from "../services/scheduleService";

function mockLocalStorage() {
  const store = new Map();
  const api = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => {
      if (api._quotaExceeded) {
        const err = new Error("QuotaExceededError");
        err.name = "QuotaExceededError";
        throw err;
      }
      store.set(String(k), String(v));
    },
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    key: (i) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
    _store: store,
    _quotaExceeded: false,
  };
  vi.stubGlobal("localStorage", api);
  return api;
}

describe("appErrors", () => {
  it("nunca expone mensajes técnicos al usuario", () => {
    const normalized = normalizeAppError(
      new Error("PDF.js worker crashed at pdf.js:123"),
      { context: "test", fallbackCode: "UNEXPECTED" }
    );
    expect(normalized.userMessage).toBe(USER_SAFE_MESSAGES.UNEXPECTED);
    expect(normalized.userMessage).not.toContain("pdf.js");
    expect(normalized.userMessage).not.toContain("worker");
  });

  it("mapea códigos conocidos a mensajes seguros", () => {
    expect(getUserSafeMessage("PDF_NO_TEXT")).toContain("programación académica");
    expect(getUserSafeMessage("FILE_EMPTY")).toContain("vacío");
    expect(getUserSafeMessage("PDF_PROTECTED")).toContain("protegido");
  });

  it("mapea QuotaExceededError", () => {
    const err = new Error("quota");
    err.name = "QuotaExceededError";
    const normalized = normalizeAppError(err);
    expect(normalized.code).toBe("STORAGE_QUOTA");
    expect(normalized.userMessage).toBe(USER_SAFE_MESSAGES.STORAGE_QUOTA);
  });
});

describe("safeStorage", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it("devuelve fallback sin datos", () => {
    expect(safeStorage.get("missing", { a: 1 })).toEqual({ a: 1 });
  });

  it("guarda y lee datos válidos", () => {
    expect(safeStorage.set("k", { ok: true }).ok).toBe(true);
    expect(safeStorage.get("k", null)).toEqual({ ok: true });
  });

  it("tolera JSON corrupto", () => {
    localStorage.setItem("bad", "{not-json");
    expect(safeStorage.get("bad", [])).toEqual([]);
    expect(safeStorage.has("bad")).toBe(false);
  });

  it("maneja espacio agotado", () => {
    localStorage._quotaExceeded = true;
    const result = safeStorage.set("big", { x: 1 });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("STORAGE_QUOTA");
  });
});

describe("namespaces carrera/periodo", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it("genera careerId estable desde URL", () => {
    expect(
      getCareerId({ url: "/mallas/unab/Comp.json", nombre: "Computación" })
    ).toBe("unab-comp");
  });

  it("migra progreso legacy a namespace", () => {
    localStorage.setItem("malla-aprobados", JSON.stringify([1, 2]));
    localStorage.setItem("malla-excepciones", JSON.stringify([3]));
    localStorage.setItem("malla-cursando", JSON.stringify([4]));

    const migrated = migrateAcademicProgressIfNeeded("unab-comp");
    expect(migrated.aprobados).toEqual([1, 2]);
    expect(safeStorage.has("mallaPro:v1:career:unab-comp:academicProgress")).toBe(
      true
    );
    // legacy sigue disponible (dual)
    expect(readLegacyAcademicProgress().aprobados).toEqual([1, 2]);
  });

  it("no mezcla progreso al escribir por carrera", () => {
    const mallaA = { url: "/mallas/unab/A.json", nombre: "A" };
    const mallaB = { url: "/mallas/unab/B.json", nombre: "B" };
    writeAcademicProgress(mallaA, { aprobados: [10], excepciones: [], cursando: [] });
    writeAcademicProgress(mallaB, { aprobados: [20], excepciones: [], cursando: [] });

    const a = migrateAcademicProgressIfNeeded(getCareerId(mallaA));
    const b = migrateAcademicProgressIfNeeded(getCareerId(mallaB));
    expect(a.aprobados).toEqual([10]);
    expect(b.aprobados).toEqual([20]);
  });

  it("clearAcademicProgress limpia carrera y legacy", () => {
    const malla = { url: "/mallas/unab/Comp.json", nombre: "Comp" };
    writeAcademicProgress(malla, { aprobados: [1], excepciones: [], cursando: [] });
    clearAcademicProgress(malla);
    expect(migrateAcademicProgressIfNeeded("unab-comp").aprobados).toEqual([]);
    expect(safeStorage.get(LEGACY_KEYS.aprobados, [])).toEqual([]);
  });
});

describe("persistencia toma de ramos", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  const sampleProgramming = {
    schemaVersion: "1.0",
    source: {
      originalFileName: "prog.pdf",
      parser: "UNAB_ACADEMIC_PROGRAMMING",
      importedAt: "2026-01-01T00:00:00.000Z",
    },
    academicPeriod: { label: "2026-1", year: 2026, semester: 1 },
    curriculum: { code: "COMP", careerName: "Computación", campus: "Viña" },
    courses: [
      {
        courseCode: "TDFI103",
        courseTitle: "Cálculo",
        sections: [
          {
            id: "sec-1",
            nrc: "12345",
            courseCode: "TDFI103",
            courseTitle: "Cálculo",
            sectionNumber: "01",
            meetings: [
              {
                dayCode: "LU",
                dayOfWeek: 1,
                startTime: "08:30",
                endTime: "09:15",
                location: "A1",
                isOnline: false,
              },
            ],
            professors: ["Profe"],
            modality: "PRESENCIAL",
            linkedNrcs: [],
            warnings: [],
          },
        ],
      },
    ],
    warnings: [],
  };

  it("guarda y restaura planificación por carrera/periodo", () => {
    const malla = { url: "/mallas/unab/Comp.json", nombre: "Comp" };
    const state = buildRegistrationState({
      malla,
      programming: sampleProgramming,
      selectedSectionsMap: { TDFI103: "sec-1" },
      activeFilters: {},
      fileMetadata: {
        name: "prog.pdf",
        size: 100,
        lastModified: 1,
        fingerprint: "abc",
      },
    });

    const saved = saveCourseRegistration(malla, "2026-1", state);
    expect(saved.ok).toBe(true);

    const loaded = loadCourseRegistration(malla, "2026-1");
    expect(loaded.programming.courses[0].courseCode).toBe("TDFI103");
    expect(loaded.selectedSectionsMap.TDFI103).toBe("sec-1");
    expect(loaded.periodId).toBe("2026-1");
  });

  it("no mezcla datos de otra carrera", () => {
    const mallaA = { url: "/mallas/unab/A.json", nombre: "A" };
    const mallaB = { url: "/mallas/unab/B.json", nombre: "B" };
    const state = buildRegistrationState({
      malla: mallaA,
      programming: sampleProgramming,
      selectedSectionsMap: { TDFI103: "sec-1" },
    });
    saveCourseRegistration(mallaA, "2026-1", state);
    expect(loadCourseRegistration(mallaB, "2026-1")).toBeNull();
    expect(loadCourseRegistration(mallaA, "2026-1")?.careerId).toBe("unab-a");
  });

  it("clearCourseRegistration solo borra planificación del periodo", () => {
    const malla = { url: "/mallas/unab/Comp.json", nombre: "Comp" };
    writeAcademicProgress(malla, { aprobados: [9], excepciones: [], cursando: [] });
    const state = buildRegistrationState({
      malla,
      programming: sampleProgramming,
      selectedSectionsMap: { TDFI103: "sec-1" },
    });
    saveCourseRegistration(malla, "2026-1", state);
    clearCourseRegistration(malla, "2026-1");

    expect(loadCourseRegistration(malla, "2026-1")).toBeNull();
    expect(migrateAcademicProgressIfNeeded("unab-comp").aprobados).toEqual([9]);
  });

  it("descarta secciones inválidas individualmente", () => {
    const dirty = {
      schemaVersion: 1,
      careerId: "unab-comp",
      periodId: "2026-1",
      programming: {
        ...sampleProgramming,
        courses: [
          {
            courseCode: "TDFI103",
            courseTitle: "Cálculo",
            sections: [
              sampleProgramming.courses[0].sections[0],
              {
                id: "bad",
                nrc: "999",
                courseCode: "TDFI103",
                meetings: [
                  {
                    dayCode: "XX",
                    startTime: "10:00",
                    endTime: "09:00",
                  },
                ],
              },
            ],
          },
        ],
      },
      selectedSectionsMap: { TDFI103: "sec-1", BAD: "missing" },
    };

    const validated = validateRegistrationState(dirty);
    expect(validated.ok).toBe(true);
    expect(validated.state.selectedSectionsMap.TDFI103).toBe("sec-1");
    expect(validated.state.selectedSectionsMap.BAD).toBeUndefined();
    const meetings =
      validated.state.programming.courses[0].sections.find((s) => s.id === "bad")
        ?.meetings || [];
    expect(meetings).toEqual([]);
  });

  it("sanitizeProgramming no incluye File ni texto crudo", () => {
    const sanitized = sanitizeProgrammingForStorage(sampleProgramming);
    expect(JSON.stringify(sanitized)).not.toContain("ArrayBuffer");
    expect(sanitized.source.originalFileName).toBe("prog.pdf");
  });

  it("getPeriodId usa academicPeriod", () => {
    expect(getPeriodId(sampleProgramming)).toBe("2026-1");
  });

  it("clave namespaced correcta", () => {
    expect(courseRegistrationKey("unab-comp", "2026-1")).toBe(
      "mallaPro:v1:career:unab-comp:courseRegistration:2026-1"
    );
  });
});

describe("parseMeetings integridad", () => {
  it("rechaza hora inicial >= final", () => {
    const { meetings, warnings } = parseMeetings("LU 10:00 A 09:00 AULA1");
    expect(meetings).toEqual([]);
    expect(warnings.some((w) => /inicial/i.test(w))).toBe(true);
  });

  it("acepta bloque válido", () => {
    const { meetings } = parseMeetings("LU 08:30 A 09:15 SALA-1");
    expect(meetings).toHaveLength(1);
    expect(meetings[0].startTime).toBe("08:30");
  });
});

describe("conflictos horarios", () => {
  it("no marca conflicto con horas inválidas", () => {
    expect(Number.isNaN(timeToMinutes("xx:yy"))).toBe(true);
    expect(
      hasMeetingConflict(
        { dayCode: "LU", startTime: "bad", endTime: "09:00" },
        { dayCode: "LU", startTime: "08:30", endTime: "09:15" }
      )
    ).toBe(false);
  });

  it("detecta solape real", () => {
    expect(
      hasMeetingConflict(
        { dayCode: "LU", startTime: "08:30", endTime: "10:00" },
        { dayCode: "LU", startTime: "09:00", endTime: "11:00" }
      )
    ).toBe(true);
  });
});
