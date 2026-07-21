/**
 * Normalización de errores internos vs mensajes seguros para el estudiante.
 * El frontend solo debe mostrar userMessage.
 */

/** @type {Record<string, string>} */
export const USER_SAFE_MESSAGES = {
  INVALID_FILE: "Selecciona un archivo PDF de programación académica.",
  FILE_EMPTY: "El archivo seleccionado está vacío. Intenta descargarlo nuevamente.",
  FILE_TOO_LARGE: "El PDF supera el tamaño máximo permitido de 10 MB.",
  PDF_PROTECTED:
    "Este PDF está protegido y no puede procesarse. Descarga una versión sin contraseña.",
  PDF_NO_TEXT:
    "No pudimos leer el contenido del PDF. Comprueba que corresponda a una programación académica descargada desde UNAB.",
  NO_EXTRACTABLE_TEXT:
    "No pudimos leer el contenido del PDF. Comprueba que corresponda a una programación académica descargada desde UNAB.",
  UNRECOGNIZED_FORMAT:
    "El archivo se pudo abrir, pero no reconocimos el formato de la programación académica.",
  NO_SECTIONS:
    "No encontramos secciones en este archivo. Verifica que sea la programación académica completa.",
  PARTIAL_PARSE:
    "Procesamos el archivo, pero algunas secciones no pudieron reconocerse. Revisa la información antes de crear tu horario.",
  UNEXPECTED:
    "No pudimos procesar el archivo. Puedes intentarlo nuevamente con una copia nueva.",
  STORAGE_QUOTA:
    "Tu horario se creó, pero no pudimos guardarlo en este navegador.",
  STORAGE_BLOCKED:
    "No pudimos guardar datos en este navegador. Revisa si el almacenamiento está bloqueado.",
  MALLA_LOAD_FAILED:
    "No pudimos cargar la malla. Comprueba tu conexión e intenta nuevamente.",
  MALLA_INVALID:
    "La malla seleccionada no tiene un formato válido. Intenta elegirla de nuevo.",
  CANCELLED: "El procesamiento se canceló.",
  SECTION_RENDER:
    "Ocurrió un problema al mostrar esta sección.",
};

/**
 * @param {string} [code]
 * @returns {string}
 */
export function getUserSafeMessage(code) {
  if (code && USER_SAFE_MESSAGES[code]) return USER_SAFE_MESSAGES[code];
  return USER_SAFE_MESSAGES.UNEXPECTED;
}

/**
 * @param {unknown} error
 * @param {{ context?: string, fallbackCode?: string }} [options]
 */
export function logInternalError(error, options = {}) {
  if (!import.meta.env.DEV) return;
  const ctx = options.context || "app";
  console.error(`[MallaPro:${ctx}]`, {
    code: error && typeof error === "object" ? error.code : undefined,
    technicalMessage:
      error && typeof error === "object" ? error.technicalMessage || error.message : undefined,
    cause: error && typeof error === "object" ? error.cause : error,
    error,
  });
}

/**
 * @param {string} code
 * @param {string} [technicalMessage]
 * @param {unknown} [cause]
 */
export function createAppError(code, technicalMessage = "", cause = null) {
  const err = new Error(technicalMessage || getUserSafeMessage(code));
  err.code = code;
  err.userMessage = getUserSafeMessage(code);
  err.technicalMessage = technicalMessage || String(cause?.message || "");
  err.cause = cause;
  return err;
}

/**
 * @param {unknown} error
 * @param {{ context?: string, fallbackCode?: string }} [context]
 * @returns {{ code: string, userMessage: string, technicalMessage: string, cause: unknown }}
 */
export function normalizeAppError(error, context = {}) {
  const fallbackCode = context.fallbackCode || "UNEXPECTED";

  if (error && typeof error === "object" && error.code === "CANCELLED") {
    return {
      code: "CANCELLED",
      userMessage: getUserSafeMessage("CANCELLED"),
      technicalMessage: "Processing aborted",
      cause: error,
    };
  }

  const rawCode =
    (error && typeof error === "object" && typeof error.code === "string" && error.code) ||
    null;

  let code = rawCode;

  // Alias históricos del parser → códigos canónicos
  if (code === "NO_EXTRACTABLE_TEXT") code = "PDF_NO_TEXT";

  if (!code || !USER_SAFE_MESSAGES[code]) {
    const msg = String(
      (error && typeof error === "object" && (error.message || error.name)) || ""
    ).toLowerCase();

    if (msg.includes("password") || msg.includes("encrypted")) {
      code = "PDF_PROTECTED";
    } else if (msg.includes("quota") || error?.name === "QuotaExceededError") {
      code = "STORAGE_QUOTA";
    } else if (msg.includes("securityerror") || error?.name === "SecurityError") {
      code = "STORAGE_BLOCKED";
    } else if (rawCode && USER_SAFE_MESSAGES[rawCode]) {
      code = rawCode;
    } else {
      code = fallbackCode;
    }
  }

  const technicalMessage =
    (error && typeof error === "object" && (error.technicalMessage || error.message)) ||
    String(error ?? "Unknown error");

  const normalized = {
    code,
    userMessage: getUserSafeMessage(code),
    technicalMessage: String(technicalMessage),
    cause: error,
  };

  logInternalError(normalized, context);
  return normalized;
}
