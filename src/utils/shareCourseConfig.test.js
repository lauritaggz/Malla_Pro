import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SHARE_ERROR_CODES,
  SHARE_LIMITS,
  SHARE_PREFIX,
  SHARE_PREFIX_COMPRESSED,
  ShareCourseConfigError,
  buildEvaluationsFromPayload,
  createSharePayload,
  decodeCompressedV1,
  decodeLegacyV1,
  decodeShareCode,
  encodeCompressedV1,
  encodeLegacyV1,
  encodeShareCode,
  formatPeso,
  isFullWeight,
  normalizeInstitution,
  normalizeShareCourseCode,
  sumWeights,
  toCompactTransportPayload,
  validateCourseCompatibility,
  validateSharePayload,
} from "./shareCourseConfig";

/** Fixture legacy real (generado antes de MP1C) — NO regenerar con encodeShareCode. */
const LEGACY_QUIM090_CODE =
  "MP1.eyJ2IjoxLCJpbnN0aXR1dGlvbiI6IlVOQUIiLCJjb3Vyc2VDb2RlIjoiUVVJTTA5MCIsImNvdXJzZU5hbWUiOiJRdcOtbWljYSB5IEFtYmllbnRlIiwiZXZhbHVhdGlvbnMiOlt7Im5vbWJyZSI6IlNvbGVtbmUgMSIsInBlc28iOjI1fSx7Im5vbWJyZSI6IlNvbGVtbmUgMiIsInBlc28iOjE1fSx7Im5vbWJyZSI6InRhcmVhIDEiLCJwZXNvIjozMy4zfV19.XV9_FlhrU8M";

const QUIM090_PAYLOAD = {
  v: 1,
  institution: "UNAB",
  courseCode: "QUIM090",
  courseName: "Química y Ambiente",
  evaluations: [
    { nombre: "Solemne 1", peso: 25 },
    { nombre: "Solemne 2", peso: 15 },
    { nombre: "tarea 1", peso: 33.3 },
  ],
};

function makeEvalNames(n) {
  const labels = [
    "Control",
    "Laboratorio",
    "Informe",
    "Prueba Teórica",
    "Evaluación Práctica",
    "Solemne",
    "Tarea",
    "Quiz",
  ];
  return Array.from({ length: n }, (_, i) => ({
    nombre: `${labels[i % labels.length]} ${Math.floor(i / labels.length) + 1}`,
    peso: Math.min(100, 1 + (i % 20) * 0.5),
  }));
}

describe("normalizeInstitution", () => {
  it("normaliza aliases y careerId a UNAB", () => {
    expect(normalizeInstitution("UNAB")).toBe("UNAB");
    expect(normalizeInstitution("unab")).toBe("UNAB");
    expect(normalizeInstitution("Universidad Andrés Bello")).toBe("UNAB");
    expect(normalizeInstitution("unab-comp")).toBe("UNAB");
    expect(
      normalizeInstitution({ universidad: "Universidad Andrés Bello" })
    ).toBe("UNAB");
    expect(normalizeInstitution({ url: "/mallas/Comp.json" })).toBe("UNAB");
    expect(normalizeInstitution({ url: "/mallas/unab/Comp.json" })).toBe("UNAB");
  });

  it("devuelve vacío para desconocidos", () => {
    expect(normalizeInstitution("")).toBe("");
    expect(normalizeInstitution(null)).toBe("");
    expect(normalizeInstitution({ nombre: "Sin uni" })).toBe("");
  });
});

describe("normalizeShareCourseCode", () => {
  it("trim + mayúsculas", () => {
    expect(normalizeShareCourseCode(" tmed302 ")).toBe("TMED302");
  });
});

describe("createSharePayload", () => {
  const base = {
    institution: "UNAB",
    courseCode: "TMED302",
    courseName: "Bioquímica Clínica",
  };

  it("crea payload correcto y preserva orden/nombres/pesos", () => {
    const payload = createSharePayload({
      ...base,
      evaluations: [
        { nombre: "Control 2", peso: 5 },
        { nombre: "Prueba 1", peso: 20 },
        { nombre: "Laboratorio 3", peso: 3 },
      ],
    });

    expect(payload).toEqual({
      v: 1,
      institution: "UNAB",
      courseCode: "TMED302",
      courseName: "Bioquímica Clínica",
      evaluations: [
        { nombre: "Control 2", peso: 5 },
        { nombre: "Prueba 1", peso: 20 },
        { nombre: "Laboratorio 3", peso: 3 },
      ],
    });
  });

  it("whitelist: elimina nota, subNotas y campos privados", () => {
    const payload = createSharePayload({
      ...base,
      evaluations: [
        {
          id: 123,
          nombre: "Prueba 1",
          peso: 20,
          nota: 5.6,
          subNotas: [{ id: 1, nota: 6 }],
          completed: true,
          comment: "privado",
          somePrivateField: "SECRETO",
        },
      ],
    });

    expect(payload.evaluations).toEqual([{ nombre: "Prueba 1", peso: 20 }]);
    expect(payload.evaluations[0]).not.toHaveProperty("nota");
    expect(payload.evaluations[0]).not.toHaveProperty("subNotas");
    expect(payload.evaluations[0]).not.toHaveProperty("id");
    expect(payload.evaluations[0]).not.toHaveProperty("somePrivateField");
  });

  it("rechaza lista vacía", () => {
    expect(() =>
      createSharePayload({ ...base, evaluations: [] })
    ).toThrow(ShareCourseConfigError);
  });
});

describe("Unicode roundtrip", () => {
  it("conserva acentos y ñ", async () => {
    const payload = createSharePayload({
      institution: "UNAB",
      courseCode: "PSI101",
      courseName: "Introducción a la Bioquímica",
      evaluations: [
        { nombre: "Evaluación Práctica Nº 1", peso: 10 },
        { nombre: "Niñez y Salud", peso: 15.5 },
      ],
    });
    const code = await encodeShareCode(payload);
    const decoded = await decodeShareCode(code);
    expect(decoded.courseName).toBe("Introducción a la Bioquímica");
    expect(decoded.evaluations[0].nombre).toBe("Evaluación Práctica Nº 1");
    expect(decoded.evaluations[1].nombre).toBe("Niñez y Salud");
    expect(decoded.evaluations[1].peso).toBe(15.5);
  });
});

describe("decimales", () => {
  it("acepta y conserva pesos decimales", async () => {
    const payload = createSharePayload({
      institution: "UNAB",
      courseCode: "TMED1",
      courseName: "Curso",
      evaluations: [
        { nombre: "A", peso: 3.5 },
        { nombre: "B", peso: 7.25 },
        { nombre: "C", peso: 12.75 },
      ],
    });
    const decoded = await decodeShareCode(await encodeShareCode(payload));
    expect(decoded.evaluations.map((e) => e.peso)).toEqual([3.5, 7.25, 12.75]);
  });
});

describe("encode/decode — legacy MP1", () => {
  it("encodeLegacyV1 genera MP1 de 3 segmentos y roundtrip", async () => {
    const payload = createSharePayload({
      institution: "UNAB",
      courseCode: "TMED302",
      courseName: "Bioquímica Clínica",
      evaluations: [
        { nombre: "Control 1", peso: 5 },
        { nombre: "Laboratorio 1", peso: 3 },
        { nombre: "Prueba 1", peso: 20 },
      ],
    });
    const code = await encodeLegacyV1(payload);
    expect(code.startsWith(`${SHARE_PREFIX}.`)).toBe(true);
    expect(code.startsWith(SHARE_PREFIX_COMPRESSED)).toBe(false);
    expect(code.split(".")).toHaveLength(3);
    expect(code).not.toMatch(/[+/]/);
    expect(await decodeLegacyV1(code)).toEqual(payload);
  });

  it("decodeShareCode rechaza fixture legacy MP1 (solo MP1C admisible)", async () => {
    expect(LEGACY_QUIM090_CODE.startsWith("MP1.")).toBe(true);
    await expect(decodeShareCode(LEGACY_QUIM090_CODE)).rejects.toMatchObject({
      code: SHARE_ERROR_CODES.UNSUPPORTED_VERSION,
    });
    expect(await decodeLegacyV1(LEGACY_QUIM090_CODE)).toEqual(QUIM090_PAYLOAD);
  });
});

describe("encode/decode — compressed MP1C", () => {
  it("encodeCompressedV1 genera MP1C y roundtrip canónico", async () => {
    const payload = validateSharePayload(QUIM090_PAYLOAD);
    const code = await encodeCompressedV1(payload);
    expect(code.startsWith(`${SHARE_PREFIX_COMPRESSED}.`)).toBe(true);
    expect(code.split(".")).toHaveLength(2);
    expect(code).not.toMatch(/[+/]/);
    expect(await decodeShareCode(code)).toEqual(payload);
  });

  it("encodeShareCode siempre genera MP1C", async () => {
    const code = await encodeShareCode(QUIM090_PAYLOAD);
    const compressed = await encodeCompressedV1(QUIM090_PAYLOAD);
    expect(code).toBe(compressed);
    expect(code.startsWith(`${SHARE_PREFIX_COMPRESSED}.`)).toBe(true);
    expect(code.length).toBeLessThan((await encodeLegacyV1(QUIM090_PAYLOAD)).length);
  });

  it("conserva institution, courseName, orden y privacidad", async () => {
    const payload = createSharePayload({
      institution: "UNAB",
      courseCode: "QUIM090",
      courseName: "Química y Ambiente",
      evaluations: [
        {
          id: 9,
          nombre: "Solemne 1",
          peso: 25,
          nota: 6.1,
          subNotas: [{ id: 1, nota: 5 }],
          secret: "NO",
        },
        { nombre: "Solemne 2", peso: 15 },
        { nombre: "tarea 1", peso: 33.3 },
      ],
    });
    const decoded = await decodeShareCode(await encodeCompressedV1(payload));
    expect(decoded.institution).toBe("UNAB");
    expect(decoded.courseName).toBe("Química y Ambiente");
    expect(decoded.evaluations.map((e) => e.nombre)).toEqual([
      "Solemne 1",
      "Solemne 2",
      "tarea 1",
    ]);
    expect(Object.keys(decoded.evaluations[0]).sort()).toEqual(["nombre", "peso"]);
    expect(JSON.stringify(decoded)).not.toContain("6.1");
    expect(JSON.stringify(decoded)).not.toContain("secret");
  });

  it("decodeShareCode solo acepta MP1C (rechaza MP1 del mismo payload)", async () => {
    const payload = validateSharePayload(QUIM090_PAYLOAD);
    const legacy = await encodeLegacyV1(payload);
    const compressed = await encodeCompressedV1(payload);
    await expect(decodeShareCode(legacy)).rejects.toMatchObject({
      code: SHARE_ERROR_CODES.UNSUPPORTED_VERSION,
    });
    expect(await decodeShareCode(compressed)).toEqual(payload);
  });
});

describe("transport compacto", () => {
  it("toCompactTransportPayload es posicional sin v", () => {
    const compact = toCompactTransportPayload(QUIM090_PAYLOAD);
    expect(compact).toEqual([
      "UNAB",
      "QUIM090",
      "Química y Ambiente",
      [
        ["Solemne 1", 25],
        ["Solemne 2", 15],
        ["tarea 1", 33.3],
      ],
    ]);
  });
});

describe("corrupción", () => {
  it("legacy helper: rechaza payload o integrity modificados", async () => {
    const code = await encodeLegacyV1({
      institution: "UNAB",
      courseCode: "TMED302",
      courseName: "Bioquímica Clínica",
      evaluations: [{ nombre: "Control 1", peso: 5 }],
    });
    const [p, payload, integrity] = code.split(".");
    const flippedPayload =
      payload[0] === "A" ? `B${payload.slice(1)}` : `A${payload.slice(1)}`;
    await expect(
      decodeLegacyV1(`${p}.${flippedPayload}.${integrity}`)
    ).rejects.toMatchObject({ code: SHARE_ERROR_CODES.CORRUPTED_CODE });

    const flippedIntegrity =
      integrity[0] === "A" ? `B${integrity.slice(1)}` : `A${integrity.slice(1)}`;
    await expect(
      decodeLegacyV1(`${p}.${payload}.${flippedIntegrity}`)
    ).rejects.toMatchObject({ code: SHARE_ERROR_CODES.CORRUPTED_CODE });
  });

  it("MP1C: rechaza bytes/caracteres corruptos", async () => {
    const code = await encodeCompressedV1(QUIM090_PAYLOAD);
    const [prefix, body] = code.split(".");
    const flipped =
      body[10] === "A" ? `${body.slice(0, 10)}B${body.slice(11)}` : `${body.slice(0, 10)}A${body.slice(11)}`;
    await expect(decodeShareCode(`${prefix}.${flipped}`)).rejects.toMatchObject({
      code: SHARE_ERROR_CODES.CORRUPTED_CODE,
    });
  });

  it("MP1C: rechaza truncado", async () => {
    const code = await encodeCompressedV1(QUIM090_PAYLOAD);
    await expect(decodeShareCode(code.slice(0, 25))).rejects.toBeInstanceOf(
      ShareCourseConfigError
    );
  });

  it("MP1C: deflate válido con JSON inválido → INVALID_PAYLOAD", async () => {
    const badJson = new TextEncoder().encode(JSON.stringify(["solo", "tres"]));
    const compressed = await new Response(
      new Blob([badJson]).stream().pipeThrough(new CompressionStream("deflate"))
    ).arrayBuffer();
    const b64 = Buffer.from(compressed)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
    await expect(decodeShareCode(`MP1C.${b64}`)).rejects.toMatchObject({
      code: SHARE_ERROR_CODES.INVALID_PAYLOAD,
    });
  });

  it("rechaza sin separadores / basura", async () => {
    await expect(decodeShareCode("MP1solo")).rejects.toBeInstanceOf(
      ShareCourseConfigError
    );
    await expect(decodeShareCode("XXXX.abc.def")).rejects.toMatchObject({
      code: SHARE_ERROR_CODES.INVALID_PREFIX,
    });
  });
});

describe("versiones", () => {
  it("MP2 → unsupported", async () => {
    await expect(decodeShareCode("MP2.abc.def")).rejects.toMatchObject({
      code: SHARE_ERROR_CODES.UNSUPPORTED_VERSION,
    });
  });

  it("MP1 (formato antiguo) → unsupported en decodeShareCode", async () => {
    await expect(decodeShareCode(LEGACY_QUIM090_CODE)).rejects.toMatchObject({
      code: SHARE_ERROR_CODES.UNSUPPORTED_VERSION,
    });
  });

  it("MP1 con v:2 interno → decodeLegacyV1 reject", async () => {
    const json = JSON.stringify({
      v: 2,
      institution: "UNAB",
      courseCode: "TMED302",
      courseName: "X",
      evaluations: [{ nombre: "A", peso: 1 }],
    });
    const bytes = new TextEncoder().encode(json);
    const subtle = globalThis.crypto.subtle;
    const digest = new Uint8Array(await subtle.digest("SHA-256", bytes)).slice(0, 8);
    const payloadPart = Buffer.from(bytes)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
    const integrityPart = Buffer.from(digest)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");

    await expect(decodeLegacyV1(`MP1.${payloadPart}.${integrityPart}`)).rejects.toMatchObject({
      code: SHARE_ERROR_CODES.UNSUPPORTED_VERSION,
    });
  });
});

describe("fallback sin CompressionStream / DecompressionStream", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sin CompressionStream → encodeShareCode lanza COMPRESSION_UNSUPPORTED", async () => {
    vi.stubGlobal("CompressionStream", undefined);
    await expect(encodeShareCode(QUIM090_PAYLOAD)).rejects.toMatchObject({
      code: SHARE_ERROR_CODES.COMPRESSION_UNSUPPORTED,
    });
  });

  it("sin DecompressionStream → MP1C lanza COMPRESSION_UNSUPPORTED", async () => {
    const code = await encodeCompressedV1(QUIM090_PAYLOAD);
    vi.stubGlobal("DecompressionStream", undefined);
    await expect(decodeCompressedV1(code)).rejects.toMatchObject({
      code: SHARE_ERROR_CODES.COMPRESSION_UNSUPPORTED,
    });
    await expect(decodeShareCode(code)).rejects.toMatchObject({
      code: SHARE_ERROR_CODES.COMPRESSION_UNSUPPORTED,
    });
  });
});

describe("benchmark tamaño", () => {
  it("QUIM090: compressed < legacy", async () => {
    const legacy = await encodeLegacyV1(QUIM090_PAYLOAD);
    const compressed = await encodeCompressedV1(QUIM090_PAYLOAD);
    expect(legacy.length).toBe(284);
    expect(compressed.length).toBeLessThan(legacy.length);
    // eslint-disable-next-line no-console
    console.log(
      `[benchmark QUIM090] Legacy: ${legacy.length} | Nuevo: ${compressed.length} | Reducción: ${(
        ((legacy.length - compressed.length) / legacy.length) *
        100
      ).toFixed(1)}%`
    );
  });

  it("20 evaluaciones: compressed gana claramente", async () => {
    const payload = createSharePayload({
      institution: "UNAB",
      courseCode: "TMED999",
      courseName: "Curso Benchmark 20",
      evaluations: makeEvalNames(20),
    });
    const legacy = await encodeLegacyV1(payload);
    const compressed = await encodeCompressedV1(payload);
    expect(compressed.length).toBeLessThan(legacy.length);
    // eslint-disable-next-line no-console
    console.log(
      `[benchmark 20] Legacy: ${legacy.length} | Nuevo: ${compressed.length} | Reducción: ${(
        ((legacy.length - compressed.length) / legacy.length) *
        100
      ).toFixed(1)}%`
    );
  });

  it("100 evaluaciones: roundtrip bajo maxCodeLength", async () => {
    const payload = createSharePayload({
      institution: "UNAB",
      courseCode: "TMED100",
      courseName: "Curso Benchmark 100",
      evaluations: makeEvalNames(100),
    });
    const t0 = Date.now();
    const code = await encodeShareCode(payload);
    const decoded = await decodeShareCode(code);
    const elapsed = Date.now() - t0;
    expect(code.length).toBeLessThanOrEqual(SHARE_LIMITS.maxCodeLength);
    expect(decoded.evaluations).toHaveLength(100);
    expect(decoded.evaluations[99].nombre).toBe(payload.evaluations[99].nombre);
    expect(elapsed).toBeLessThan(2000);
    // eslint-disable-next-line no-console
    console.log(`[benchmark 100] code.length=${code.length} elapsed=${elapsed}ms`);
  });
});

describe("validateSharePayload", () => {
  const okEval = [{ nombre: "A", peso: 10 }];

  it("rechaza raíces inválidas", () => {
    expect(() => validateSharePayload(null)).toThrow(ShareCourseConfigError);
    expect(() => validateSharePayload([])).toThrow(ShareCourseConfigError);
    expect(() =>
      validateSharePayload({
        v: 1,
        institution: "",
        courseCode: "X",
        courseName: "Y",
        evaluations: okEval,
      })
    ).toThrow(ShareCourseConfigError);
    expect(() =>
      validateSharePayload({
        v: 1,
        institution: "UNAB",
        courseCode: "",
        courseName: "Y",
        evaluations: okEval,
      })
    ).toThrow(ShareCourseConfigError);
    expect(() =>
      validateSharePayload({
        v: 1,
        institution: "UNAB",
        courseCode: "X",
        courseName: "",
        evaluations: okEval,
      })
    ).toThrow(ShareCourseConfigError);
  });

  it("rechaza evaluations vacío, 101 items, nombre vacío o largo", () => {
    expect(() =>
      validateSharePayload({
        v: 1,
        institution: "UNAB",
        courseCode: "X",
        courseName: "Y",
        evaluations: [],
      })
    ).toThrow(ShareCourseConfigError);

    expect(() =>
      validateSharePayload({
        v: 1,
        institution: "UNAB",
        courseCode: "X",
        courseName: "Y",
        evaluations: Array.from({ length: 101 }, (_, i) => ({
          nombre: `E${i}`,
          peso: 1,
        })),
      })
    ).toThrow(ShareCourseConfigError);

    expect(() =>
      validateSharePayload({
        v: 1,
        institution: "UNAB",
        courseCode: "X",
        courseName: "Y",
        evaluations: [{ nombre: "   ", peso: 1 }],
      })
    ).toThrow(ShareCourseConfigError);

    expect(() =>
      validateSharePayload({
        v: 1,
        institution: "UNAB",
        courseCode: "X",
        courseName: "Y",
        evaluations: [{ nombre: "x".repeat(101), peso: 1 }],
      })
    ).toThrow(ShareCourseConfigError);
  });
});

describe("pesos", () => {
  const wrap = (peso) => ({
    v: 1,
    institution: "UNAB",
    courseCode: "X",
    courseName: "Y",
    evaluations: [{ nombre: "A", peso }],
  });

  it("acepta 0, 3, 3.5, 100", () => {
    for (const p of [0, 3, 3.5, 100]) {
      expect(validateSharePayload(wrap(p)).evaluations[0].peso).toBe(p);
    }
  });

  it("rechaza inválidos sin coerción", () => {
    for (const p of [-1, 101, NaN, Infinity, -Infinity, "20", null]) {
      expect(() => validateSharePayload(wrap(p))).toThrow(ShareCourseConfigError);
    }
  });
});

describe("roundPeso / formatPeso", () => {
  it("elimina basura de punto flotante", () => {
    expect(formatPeso(26.700000000000003)).toBe("26.7");
    expect(formatPeso(100 - 73.3)).toBe("26.7");
    expect(formatPeso(100)).toBe("100");
    expect(isFullWeight(99.999999999)).toBe(true);
  });
});

describe("sumWeights — suma no bloquea validez", () => {
  it("92, 100 y 105 son payloads válidos", () => {
    const make = (weights) =>
      validateSharePayload({
        v: 1,
        institution: "UNAB",
        courseCode: "TMED302",
        courseName: "Bioquímica Clínica",
        evaluations: weights.map((peso, i) => ({
          nombre: `E${i + 1}`,
          peso,
        })),
      });

    const p92 = make([40, 40, 12]);
    expect(sumWeights(p92.evaluations)).toBe(92);

    const p100 = make([50, 50]);
    expect(sumWeights(p100.evaluations)).toBe(100);

    const p105 = make([50, 55]);
    expect(sumWeights(p105.evaluations)).toBe(105);
  });
});

describe("validateCourseCompatibility", () => {
  it("compatible con normalización", () => {
    const r = validateCourseCompatibility(
      { institution: "UNAB", courseCode: "TMED302" },
      { institution: "unab", courseCode: " tmed302 " }
    );
    expect(r.compatible).toBe(true);
    expect(r.reason).toBeNull();
  });

  it("institution mismatch", () => {
    const r = validateCourseCompatibility(
      { institution: "UNAB", courseCode: "TMED302" },
      { institution: "UCH", courseCode: "TMED302" }
    );
    expect(r.compatible).toBe(false);
    expect(r.reason).toBe(SHARE_ERROR_CODES.INSTITUTION_MISMATCH);
  });

  it("course mismatch", () => {
    const r = validateCourseCompatibility(
      { institution: "UNAB", courseCode: "TMED302" },
      { institution: "UNAB", courseCode: "TMED305" }
    );
    expect(r.compatible).toBe(false);
    expect(r.reason).toBe(SHARE_ERROR_CODES.COURSE_MISMATCH);
  });
});

describe("buildEvaluationsFromPayload", () => {
  it("materializa modelo NotasModal sin notas", () => {
    const built = buildEvaluationsFromPayload({
      v: 1,
      institution: "UNAB",
      courseCode: "TMED302",
      courseName: "Bioquímica Clínica",
      evaluations: [
        { nombre: "Control 1", peso: 5 },
        { nombre: "Prueba 1", peso: 20 },
      ],
    });

    expect(built).toHaveLength(2);
    expect(built[0]).toEqual({
      id: expect.any(Number),
      nombre: "Control 1",
      peso: 5,
      nota: null,
      subNotas: [],
    });
    expect(built[1].nota).toBeNull();
    expect(built[1].subNotas).toEqual([]);
    expect(built[0].id).not.toBe(built[1].id);
  });
});

describe("privacidad end-to-end", () => {
  it("encode/decode solo deja nombre y peso", async () => {
    const code = await encodeShareCode({
      institution: { url: "/mallas/TM.json" },
      courseCode: "TMED302",
      courseName: "Bioquímica Clínica",
      evaluations: [
        {
          id: 123,
          nombre: "Prueba 1",
          peso: 20,
          nota: 5.6,
          subNotas: [{ id: 1, nota: 6 }],
          completed: true,
          comment: "privado",
          somePrivateField: "SECRETO",
        },
      ],
    });
    const decoded = await decodeShareCode(code);
    expect(Object.keys(decoded).sort()).toEqual([
      "courseCode",
      "courseName",
      "evaluations",
      "institution",
      "v",
    ]);
    expect(Object.keys(decoded.evaluations[0]).sort()).toEqual([
      "nombre",
      "peso",
    ]);
    expect(JSON.stringify(decoded)).not.toContain("5.6");
    expect(JSON.stringify(decoded)).not.toContain("SECRETO");
    expect(JSON.stringify(decoded)).not.toContain("subNotas");
  });
});
