/**
 * Motor V1 — compartir configuración de evaluaciones (sin notas / PII).
 *
 * Formato de transporte admisible (compartir e importar):
 *  - MP1C.<Base64URL(deflate(JSON compacto posicional))>
 *
 * MP1 legacy permanece implementado solo como helpers internos de prueba
 * (encodeLegacyV1 / decodeLegacyV1); decodeShareCode ya no lo acepta.
 *
 * El payload canónico interno NO cambia.
 *
 * Institución — prioridad de normalizeInstitution(input):
 *  1. string ya conocida / alias ("UNAB", "Universidad Andrés Bello", …)
 *  2. malla.universidad (si es objeto mallaSeleccionada)
 *  3. prefijo de careerId / getCareerId-like ("unab-comp" → UNAB)
 *  4. URL /mallas/… (default UNAB en este producto)
 *  5. vacío / desconocido → "" (falla validación)
 *
 * Nota: el código compartido NO usa curso.id. La persistencia local
 * por id sigue siendo responsabilidad de NotasModal / malla-notas.
 */

export const SHARE_FORMAT_VERSION = 1;
export const SHARE_PREFIX = "MP1";
export const SHARE_PREFIX_COMPRESSED = "MP1C";

export const SHARE_LIMITS = Object.freeze({
  maxEvaluations: 100,
  maxNameLength: 100,
  maxCodeLength: 48_000,
  maxDecompressedBytes: 200_000,
  minEvaluations: 1,
  integrityBytes: 8,
});

/** @typedef {"INVALID_PREFIX"|"UNSUPPORTED_VERSION"|"CORRUPTED_CODE"|"INVALID_PAYLOAD"|"COURSE_MISMATCH"|"INSTITUTION_MISMATCH"|"EMPTY_EVALUATIONS"|"COMPRESSION_UNSUPPORTED"} ShareErrorCode */

export const SHARE_ERROR_CODES = Object.freeze({
  INVALID_PREFIX: "INVALID_PREFIX",
  UNSUPPORTED_VERSION: "UNSUPPORTED_VERSION",
  CORRUPTED_CODE: "CORRUPTED_CODE",
  INVALID_PAYLOAD: "INVALID_PAYLOAD",
  COURSE_MISMATCH: "COURSE_MISMATCH",
  INSTITUTION_MISMATCH: "INSTITUTION_MISMATCH",
  EMPTY_EVALUATIONS: "EMPTY_EVALUATIONS",
  COMPRESSION_UNSUPPORTED: "COMPRESSION_UNSUPPORTED",
});

/**
 * @extends {Error}
 */
export class ShareCourseConfigError extends Error {
  /**
   * @param {ShareErrorCode | string} code
   * @param {string} message
   */
  constructor(code, message) {
    super(message);
    this.name = "ShareCourseConfigError";
    /** @type {string} */
    this.code = code;
  }
}

/** @type {Record<string, string>} */
const INSTITUTION_ALIASES = {
  unab: "UNAB",
  "universidad andres bello": "UNAB",
  "universidad andrés bello": "UNAB",
  "u. andres bello": "UNAB",
  "u andres bello": "UNAB",
};

/**
 * Obtiene SubtleCrypto (navegador o Node).
 * @returns {SubtleCrypto}
 */
function getSubtle() {
  const c =
    globalThis.crypto?.subtle
      ? globalThis.crypto
      : undefined;
  if (c?.subtle) return c.subtle;
  throw new ShareCourseConfigError(
    SHARE_ERROR_CODES.CORRUPTED_CODE,
    "Web Crypto no está disponible en este entorno."
  );
}

/**
 * @param {string} value
 */
function stripDiacritics(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Normaliza institución a código canónico (hoy: UNAB).
 *
 * Prioridad si `input` es objeto tipo mallaSeleccionada:
 *  1. input.universidad
 *  2. careerId / input.url (prefijo / archivo)
 *  3. URL con /mallas/ → UNAB
 *
 * Si `input` es string: alias directo o prefijo de careerId.
 *
 * @param {string | { universidad?: string, url?: string, nombre?: string } | null | undefined} input
 * @returns {string} p.ej. "UNAB" o ""
 */
export function normalizeInstitution(input) {
  if (input == null) return "";

  if (typeof input === "string") {
    return resolveInstitutionToken(input);
  }

  if (typeof input !== "object") return "";

  const fromUniversidad = resolveInstitutionToken(input.universidad || "");
  if (fromUniversidad) return fromUniversidad;

  const url = typeof input.url === "string" ? input.url : "";
  if (url) {
    const uniInPath = url.match(/\/mallas\/([^/]+)\//i);
    if (uniInPath?.[1]) {
      const fromPath = resolveInstitutionToken(uniInPath[1]);
      if (fromPath) return fromPath;
    }
    // Catálogo actual: /mallas/Comp.json → UNAB
    if (/\/mallas\/[^/]+\.json/i.test(url) || /\/mallas\//i.test(url)) {
      return "UNAB";
    }
  }

  return "";
}

/**
 * @param {string} raw
 * @returns {string}
 */
function resolveInstitutionToken(raw) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";

  const lower = stripDiacritics(trimmed).toLowerCase();
  if (INSTITUTION_ALIASES[lower]) return INSTITUTION_ALIASES[lower];

  // careerId: "unab-comp" | "UNAB"
  const prefix = lower.split(/[^a-z0-9]+/)[0] || "";
  if (INSTITUTION_ALIASES[prefix]) return INSTITUTION_ALIASES[prefix];

  // Ya es código corto conocido
  const upper = trimmed.toUpperCase();
  if (upper === "UNAB") return "UNAB";

  return "";
}

/**
 * Código de ramo para comparación: trim + mayúsculas.
 * @param {unknown} code
 * @returns {string}
 */
export function normalizeShareCourseCode(code) {
  return String(code ?? "").trim().toUpperCase();
}

/**
 * @param {unknown} evaluations
 * @returns {number}
 */
export function sumWeights(evaluations) {
  if (!Array.isArray(evaluations)) return 0;
  return evaluations.reduce((sum, e) => {
    const w = e?.peso;
    return sum + (typeof w === "number" && Number.isFinite(w) ? w : 0);
  }, 0);
}

/**
 * Redondea un porcentaje evitando basura de punto flotante (ej. 26.700000000000003).
 * @param {unknown} value
 * @param {number} [decimals=2]
 * @returns {number}
 */
export function roundPeso(value, decimals = 2) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Formato legible para UI: "26.7", "100", "12.25".
 * @param {unknown} value
 * @param {number} [decimals=2]
 * @returns {string}
 */
export function formatPeso(value, decimals = 2) {
  const rounded = roundPeso(value, decimals);
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded);
}

/**
 * ¿La suma de pesos cubre el 100%? (tolerante a float)
 * @param {unknown} value
 */
export function isFullWeight(value) {
  return roundPeso(value) === 100;
}

/**
 * Construye payload V1 con whitelist estricta (sin notas ni campos privados).
 *
 * @param {{
 *   institution: string | object,
 *   courseCode: string,
 *   courseName: string,
 *   evaluations: Array<Record<string, unknown>>,
 * }} input
 */
export function createSharePayload(input) {
  if (!input || typeof input !== "object") {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.INVALID_PAYLOAD,
      "La configuración contiene información que Malla Pro no puede importar."
    );
  }

  const institution = normalizeInstitution(input.institution);
  const courseCode = normalizeShareCourseCode(input.courseCode);
  const courseName =
    typeof input.courseName === "string" ? input.courseName.trim() : "";

  if (!Array.isArray(input.evaluations) || input.evaluations.length === 0) {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.EMPTY_EVALUATIONS,
      "Primero configura las evaluaciones de este ramo para poder compartirlas."
    );
  }

  /** @type {{ nombre: string, peso: number }[]} */
  const evaluations = [];
  for (const raw of input.evaluations) {
    if (!raw || typeof raw !== "object") {
      throw new ShareCourseConfigError(
        SHARE_ERROR_CODES.INVALID_PAYLOAD,
        "La configuración contiene información que Malla Pro no puede importar."
      );
    }
    // Whitelist explícita — NUNCA spread del objeto original
    const nombre =
      typeof raw.nombre === "string" ? raw.nombre.trim() : "";
    const peso = raw.peso;
    evaluations.push({
      nombre,
      peso: /** @type {number} */ (peso),
    });
  }

  const payload = {
    v: SHARE_FORMAT_VERSION,
    institution,
    courseCode,
    courseName,
    evaluations,
  };

  validateSharePayload(payload);
  return payload;
}

/**
 * Sanitiza hacia el contrato canónico V1 (solo campos permitidos).
 * @param {unknown} value
 */
function sanitizeToCanonicalV1(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.INVALID_PAYLOAD,
      "La configuración contiene información que Malla Pro no puede importar."
    );
  }

  const src = /** @type {Record<string, unknown>} */ (value);
  if (!Array.isArray(src.evaluations)) {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.INVALID_PAYLOAD,
      "La configuración contiene información que Malla Pro no puede importar."
    );
  }

  return {
    v: SHARE_FORMAT_VERSION,
    institution: normalizeInstitution(String(src.institution ?? "")),
    courseCode: normalizeShareCourseCode(src.courseCode),
    courseName:
      typeof src.courseName === "string" ? src.courseName.trim() : "",
    evaluations: src.evaluations.map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        throw new ShareCourseConfigError(
          SHARE_ERROR_CODES.INVALID_PAYLOAD,
          "La configuración contiene información que Malla Pro no puede importar."
        );
      }
      const row = /** @type {Record<string, unknown>} */ (item);
      return {
        nombre: typeof row.nombre === "string" ? row.nombre.trim() : "",
        peso: row.peso,
      };
    }),
  };
}

/**
 * Valida (y opcionalmente recibe ya sanitizado) un payload V1.
 * Lanza ShareCourseConfigError si es inválido.
 * @param {unknown} payload
 * @returns {{ v: 1, institution: string, courseCode: string, courseName: string, evaluations: { nombre: string, peso: number }[] }}
 */
export function validateSharePayload(payload) {
  const canonical = sanitizeToCanonicalV1(payload);

  if (canonical.v !== SHARE_FORMAT_VERSION) {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.UNSUPPORTED_VERSION,
      "Esta configuración utiliza una versión de Malla Pro que no es compatible."
    );
  }

  if (!canonical.institution || typeof canonical.institution !== "string") {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.INVALID_PAYLOAD,
      "La configuración contiene información que Malla Pro no puede importar."
    );
  }

  if (!canonical.courseCode) {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.INVALID_PAYLOAD,
      "La configuración contiene información que Malla Pro no puede importar."
    );
  }

  if (!canonical.courseName) {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.INVALID_PAYLOAD,
      "La configuración contiene información que Malla Pro no puede importar."
    );
  }

  const { evaluations } = canonical;
  if (
    evaluations.length < SHARE_LIMITS.minEvaluations ||
    evaluations.length > SHARE_LIMITS.maxEvaluations
  ) {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.INVALID_PAYLOAD,
      "La configuración contiene información que Malla Pro no puede importar."
    );
  }

  for (const ev of evaluations) {
    if (typeof ev.nombre !== "string" || !ev.nombre) {
      throw new ShareCourseConfigError(
        SHARE_ERROR_CODES.INVALID_PAYLOAD,
        "La configuración contiene información que Malla Pro no puede importar."
      );
    }
    if (ev.nombre.length > SHARE_LIMITS.maxNameLength) {
      throw new ShareCourseConfigError(
        SHARE_ERROR_CODES.INVALID_PAYLOAD,
        "La configuración contiene información que Malla Pro no puede importar."
      );
    }
    // Rechazar strings / null / NaN / Infinity — sin coerción silenciosa
    if (typeof ev.peso !== "number" || !Number.isFinite(ev.peso)) {
      throw new ShareCourseConfigError(
        SHARE_ERROR_CODES.INVALID_PAYLOAD,
        "La configuración contiene información que Malla Pro no puede importar."
      );
    }
    if (ev.peso < 0 || ev.peso > 100) {
      throw new ShareCourseConfigError(
        SHARE_ERROR_CODES.INVALID_PAYLOAD,
        "La configuración contiene información que Malla Pro no puede importar."
      );
    }
  }

  return canonical;
}

/**
 * @param {{ institution: string, courseCode: string }} payloadLike
 * @param {{ institution: string | object, courseCode: string }} target
 */
export function validateCourseCompatibility(payloadLike, target) {
  const payloadInst = normalizeInstitution(payloadLike?.institution);
  const targetInst = normalizeInstitution(target?.institution);
  const payloadCode = normalizeShareCourseCode(payloadLike?.courseCode);
  const targetCode = normalizeShareCourseCode(target?.courseCode);

  if (!payloadInst || !targetInst || payloadInst !== targetInst) {
    return {
      compatible: false,
      reason: SHARE_ERROR_CODES.INSTITUTION_MISMATCH,
      payload: { institution: payloadInst, courseCode: payloadCode },
      target: { institution: targetInst, courseCode: targetCode },
    };
  }

  if (!payloadCode || !targetCode || payloadCode !== targetCode) {
    return {
      compatible: false,
      reason: SHARE_ERROR_CODES.COURSE_MISMATCH,
      payload: { institution: payloadInst, courseCode: payloadCode },
      target: { institution: targetInst, courseCode: targetCode },
    };
  }

  return {
    compatible: true,
    reason: null,
    payload: { institution: payloadInst, courseCode: payloadCode },
    target: { institution: targetInst, courseCode: targetCode },
  };
}

/**
 * Materializa evaluaciones importadas al modelo de NotasModal.
 * @param {{ evaluations: { nombre: string, peso: number }[] }} payload
 */
export function buildEvaluationsFromPayload(payload) {
  const valid = validateSharePayload(payload);
  const base = Date.now();
  return valid.evaluations.map((ev, index) => ({
    id: base + index,
    nombre: ev.nombre,
    peso: ev.peso,
    nota: null,
    subNotas: [],
  }));
}

/**
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function bytesToBase64Url(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/**
 * @param {string} b64url
 * @returns {Uint8Array}
 */
function base64UrlToBytes(b64url) {
  const padded = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const b64 = padded + pad;
  let binary;
  if (typeof atob === "function") {
    binary = atob(b64);
  } else {
    binary = Buffer.from(b64, "base64").toString("binary");
  }
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

/**
 * @param {Uint8Array} bytes
 * @returns {Promise<Uint8Array>}
 */
async function sha256Prefix(bytes) {
  const subtle = getSubtle();
  const digest = await subtle.digest("SHA-256", bytes);
  return new Uint8Array(digest).slice(0, SHARE_LIMITS.integrityBytes);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/**
 * Serializa payload canónico con orden de claves estable (legacy JSON).
 * @param {ReturnType<typeof validateSharePayload>} payload
 */
function serializeCanonicalJson(payload) {
  const body = {
    v: payload.v,
    institution: payload.institution,
    courseCode: payload.courseCode,
    courseName: payload.courseName,
    evaluations: payload.evaluations.map((e) => ({
      nombre: e.nombre,
      peso: e.peso,
    })),
  };
  return JSON.stringify(body);
}

/**
 * Transport compacto posicional (solo wire format).
 * @param {ReturnType<typeof validateSharePayload>} payload
 * @returns {[string, string, string, [string, number][]]}
 */
export function toCompactTransportPayload(payload) {
  const valid = validateSharePayload(payload);
  return [
    valid.institution,
    valid.courseCode,
    valid.courseName,
    valid.evaluations.map((e) => /** @type {[string, number]} */ ([e.nombre, e.peso])),
  ];
}

/**
 * @param {unknown} data
 * @returns {ReturnType<typeof validateSharePayload>}
 */
export function fromCompactTransportPayload(data) {
  if (!Array.isArray(data) || data.length !== 4) {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.INVALID_PAYLOAD,
      "La configuración contiene información que Malla Pro no puede importar."
    );
  }

  const [institution, courseCode, courseName, evaluationsRaw] = data;
  if (!Array.isArray(evaluationsRaw)) {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.INVALID_PAYLOAD,
      "La configuración contiene información que Malla Pro no puede importar."
    );
  }

  const evaluations = evaluationsRaw.map((row) => {
    if (!Array.isArray(row) || row.length !== 2) {
      throw new ShareCourseConfigError(
        SHARE_ERROR_CODES.INVALID_PAYLOAD,
        "La configuración contiene información que Malla Pro no puede importar."
      );
    }
    return { nombre: row[0], peso: row[1] };
  });

  return validateSharePayload({
    v: SHARE_FORMAT_VERSION,
    institution,
    courseCode,
    courseName,
    evaluations,
  });
}

function supportsCompressionStream() {
  try {
    if (typeof CompressionStream !== "function") return false;
    // Probar construcción real (algunos entornos exponen el nombre sin implementación)
    // eslint-disable-next-line no-new
    new CompressionStream("deflate");
    return true;
  } catch {
    return false;
  }
}

function supportsDecompressionStream() {
  try {
    if (typeof DecompressionStream !== "function") return false;
    // eslint-disable-next-line no-new
    new DecompressionStream("deflate");
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {ReadableStream} stream
 * @returns {Promise<Uint8Array>}
 */
async function readStreamToBytes(stream) {
  const reader = stream.getReader();
  /** @type {Uint8Array[]} */
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    const chunk = value instanceof Uint8Array ? value : new Uint8Array(value);
    chunks.push(chunk);
    total += chunk.length;
    if (total > SHARE_LIMITS.maxDecompressedBytes) {
      throw new ShareCourseConfigError(
        SHARE_ERROR_CODES.CORRUPTED_CODE,
        "No pudimos leer esta configuración. El código puede estar incompleto o modificado."
      );
    }
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/**
 * @param {Uint8Array} bytes
 * @returns {Promise<Uint8Array>}
 */
async function compressBytes(bytes) {
  if (!supportsCompressionStream()) {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.COMPRESSION_UNSUPPORTED,
      "Tu navegador no puede generar códigos comprimidos."
    );
  }
  try {
    const stream = new Blob([bytes]).stream().pipeThrough(
      new CompressionStream("deflate")
    );
    return await readStreamToBytes(stream);
  } catch (err) {
    if (err instanceof ShareCourseConfigError) throw err;
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.CORRUPTED_CODE,
      "No pudimos leer esta configuración. El código puede estar incompleto o modificado."
    );
  }
}

/**
 * @param {Uint8Array} bytes
 * @returns {Promise<Uint8Array>}
 */
async function decompressBytes(bytes) {
  if (!supportsDecompressionStream()) {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.COMPRESSION_UNSUPPORTED,
      "Tu navegador no puede abrir este código comprimido. Actualiza el navegador o pide un nuevo código."
    );
  }
  try {
    const stream = new Blob([bytes]).stream().pipeThrough(
      new DecompressionStream("deflate")
    );
    return await readStreamToBytes(stream);
  } catch (err) {
    if (err instanceof ShareCourseConfigError) throw err;
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.CORRUPTED_CODE,
      "No pudimos leer esta configuración. El código puede estar incompleto o modificado."
    );
  }
}

/**
 * Encoder legacy MP1 (comportamiento V1 original).
 * @param {ReturnType<typeof validateSharePayload>} payload
 * @returns {Promise<string>}
 */
export async function encodeLegacyV1(payload) {
  const valid = validateSharePayload(payload);
  const json = serializeCanonicalJson(valid);
  const bytes = new TextEncoder().encode(json);
  const payloadPart = bytesToBase64Url(bytes);
  const integrityBytes = await sha256Prefix(bytes);
  const integrityPart = bytesToBase64Url(integrityBytes);
  const code = `${SHARE_PREFIX}.${payloadPart}.${integrityPart}`;

  if (code.length > SHARE_LIMITS.maxCodeLength) {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.INVALID_PAYLOAD,
      "La configuración contiene información que Malla Pro no puede importar."
    );
  }

  return code;
}

/**
 * @param {string} code
 * @returns {Promise<ReturnType<typeof validateSharePayload>>}
 */
export async function decodeLegacyV1(code) {
  const trimmed = String(code ?? "").trim();
  const parts = trimmed.split(".");
  if (parts.length !== 3) {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.CORRUPTED_CODE,
      "No pudimos leer esta configuración. El código puede estar incompleto o modificado."
    );
  }

  const [prefix, payloadPart, integrityPart] = parts;

  if (!prefix || !/^MP\d+$/i.test(prefix)) {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.INVALID_PREFIX,
      "Este no parece ser un código válido de Malla Pro."
    );
  }

  const versionMatch = /^MP(\d+)$/i.exec(prefix);
  const externalVersion = versionMatch ? Number(versionMatch[1]) : NaN;

  if (
    externalVersion !== SHARE_FORMAT_VERSION ||
    prefix.toUpperCase() !== SHARE_PREFIX
  ) {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.UNSUPPORTED_VERSION,
      "Esta configuración utiliza una versión de Malla Pro que no es compatible."
    );
  }

  if (!payloadPart || !integrityPart) {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.CORRUPTED_CODE,
      "No pudimos leer esta configuración. El código puede estar incompleto o modificado."
    );
  }

  let bytes;
  let claimedIntegrity;
  try {
    bytes = base64UrlToBytes(payloadPart);
    claimedIntegrity = base64UrlToBytes(integrityPart);
  } catch {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.CORRUPTED_CODE,
      "No pudimos leer esta configuración. El código puede estar incompleto o modificado."
    );
  }

  if (claimedIntegrity.length !== SHARE_LIMITS.integrityBytes) {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.CORRUPTED_CODE,
      "No pudimos leer esta configuración. El código puede estar incompleto o modificado."
    );
  }

  const expectedIntegrity = await sha256Prefix(bytes);
  if (!timingSafeEqual(expectedIntegrity, claimedIntegrity)) {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.CORRUPTED_CODE,
      "No pudimos leer esta configuración. El código puede estar incompleto o modificado."
    );
  }

  let parsed;
  try {
    const json = new TextDecoder().decode(bytes);
    parsed = JSON.parse(json);
  } catch {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.CORRUPTED_CODE,
      "No pudimos leer esta configuración. El código puede estar incompleto o modificado."
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.INVALID_PAYLOAD,
      "La configuración contiene información que Malla Pro no puede importar."
    );
  }

  if (parsed.v !== SHARE_FORMAT_VERSION) {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.UNSUPPORTED_VERSION,
      "Esta configuración utiliza una versión de Malla Pro que no es compatible."
    );
  }

  switch (externalVersion) {
    case 1:
      return validateSharePayload(parsed);
    default:
      throw new ShareCourseConfigError(
        SHARE_ERROR_CODES.UNSUPPORTED_VERSION,
        "Esta configuración utiliza una versión de Malla Pro que no es compatible."
      );
  }
}

/**
 * Encoder comprimido MP1C.
 * @param {ReturnType<typeof validateSharePayload>} payload
 * @returns {Promise<string>}
 */
export async function encodeCompressedV1(payload) {
  const valid = validateSharePayload(payload);
  const compact = toCompactTransportPayload(valid);
  const json = JSON.stringify(compact);
  const utf8 = new TextEncoder().encode(json);
  const compressed = await compressBytes(utf8);
  const code = `${SHARE_PREFIX_COMPRESSED}.${bytesToBase64Url(compressed)}`;

  if (code.length > SHARE_LIMITS.maxCodeLength) {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.INVALID_PAYLOAD,
      "La configuración contiene información que Malla Pro no puede importar."
    );
  }

  return code;
}

/**
 * @param {string} code
 * @returns {Promise<ReturnType<typeof validateSharePayload>>}
 */
export async function decodeCompressedV1(code) {
  const trimmed = String(code ?? "").trim();
  const parts = trimmed.split(".");
  if (parts.length !== 2) {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.CORRUPTED_CODE,
      "No pudimos leer esta configuración. El código puede estar incompleto o modificado."
    );
  }

  const [prefix, payloadPart] = parts;
  if (prefix.toUpperCase() !== SHARE_PREFIX_COMPRESSED) {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.UNSUPPORTED_VERSION,
      "Esta configuración utiliza una versión de Malla Pro que no es compatible."
    );
  }

  if (!payloadPart) {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.CORRUPTED_CODE,
      "No pudimos leer esta configuración. El código puede estar incompleto o modificado."
    );
  }

  let compressed;
  try {
    compressed = base64UrlToBytes(payloadPart);
  } catch {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.CORRUPTED_CODE,
      "No pudimos leer esta configuración. El código puede estar incompleto o modificado."
    );
  }

  const decompressed = await decompressBytes(compressed);
  if (decompressed.length > SHARE_LIMITS.maxDecompressedBytes) {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.CORRUPTED_CODE,
      "No pudimos leer esta configuración. El código puede estar incompleto o modificado."
    );
  }

  let parsed;
  try {
    const json = new TextDecoder().decode(decompressed);
    parsed = JSON.parse(json);
  } catch {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.CORRUPTED_CODE,
      "No pudimos leer esta configuración. El código puede estar incompleto o modificado."
    );
  }

  return fromCompactTransportPayload(parsed);
}

function resolveCanonicalPayload(input) {
  return input && typeof input === "object" && "v" in input && input.v === 1
    ? validateSharePayload(input)
    : createSharePayload(
        /** @type {Parameters<typeof createSharePayload>[0]} */ (input)
      );
}

/**
 * Genera siempre MP1C (único formato admisible al importar).
 * @param {ReturnType<typeof createSharePayload> | Parameters<typeof createSharePayload>[0]} input
 * @returns {Promise<string>}
 */
export async function encodeShareCode(input) {
  const payload = resolveCanonicalPayload(input);
  if (!supportsCompressionStream()) {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.COMPRESSION_UNSUPPORTED,
      "Tu navegador no puede generar códigos comprimidos. Actualiza el navegador para compartir."
    );
  }
  return encodeCompressedV1(payload);
}

/**
 * Solo acepta MP1C. Los códigos MP1 legacy se rechazan.
 * @param {string} code
 * @returns {Promise<ReturnType<typeof validateSharePayload>>}
 */
export async function decodeShareCode(code) {
  if (typeof code !== "string" || !code.trim()) {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.INVALID_PREFIX,
      "Este no parece ser un código válido de Malla Pro."
    );
  }

  const trimmed = code.trim();
  if (trimmed.length > SHARE_LIMITS.maxCodeLength) {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.CORRUPTED_CODE,
      "No pudimos leer esta configuración. El código puede estar incompleto o modificado."
    );
  }

  const firstDot = trimmed.indexOf(".");
  if (firstDot <= 0) {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.INVALID_PREFIX,
      "Este no parece ser un código válido de Malla Pro."
    );
  }

  const prefix = trimmed.slice(0, firstDot).toUpperCase();

  if (prefix === SHARE_PREFIX_COMPRESSED) {
    return decodeCompressedV1(trimmed);
  }

  // MP1 u otros MP* — formato ya no admisible en importar
  if (prefix === SHARE_PREFIX || /^MP\d+$/.test(prefix)) {
    throw new ShareCourseConfigError(
      SHARE_ERROR_CODES.UNSUPPORTED_VERSION,
      "Este código usa un formato antiguo. Genera uno nuevo con Compartir."
    );
  }

  throw new ShareCourseConfigError(
    SHARE_ERROR_CODES.INVALID_PREFIX,
    "Este no parece ser un código válido de Malla Pro."
  );
}
