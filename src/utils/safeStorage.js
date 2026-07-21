import { safeJsonParse } from "./safeJsonParse";
import { createAppError, logInternalError, normalizeAppError } from "./appErrors";

/**
 * Capa centralizada y segura sobre localStorage.
 */
export const safeStorage = {
  /**
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    try {
      if (typeof localStorage === "undefined") return false;
      return localStorage.getItem(key) != null;
    } catch (err) {
      logInternalError(err, { context: "safeStorage.has" });
      return false;
    }
  },

  /**
   * @param {string} key
   * @returns {string | null}
   */
  getRaw(key) {
    try {
      if (typeof localStorage === "undefined") return null;
      return localStorage.getItem(key);
    } catch (err) {
      logInternalError(err, { context: "safeStorage.getRaw" });
      return null;
    }
  },

  /**
   * @template T
   * @param {string} key
   * @param {T} fallback
   * @param {{ validate?: (value: unknown) => value is T, removeOnInvalid?: boolean }} [options]
   * @returns {T}
   */
  get(key, fallback, options = {}) {
    const raw = this.getRaw(key);
    if (raw == null || raw === "") return fallback;

    const parsed = safeJsonParse(raw, Symbol.for("parse-failed"));
    if (parsed === Symbol.for("parse-failed")) {
      logInternalError(
        createAppError("UNEXPECTED", `Corrupt JSON for key ${key}`),
        { context: "safeStorage.get" }
      );
      if (options.removeOnInvalid !== false) this.remove(key);
      return fallback;
    }

    if (typeof options.validate === "function" && !options.validate(parsed)) {
      logInternalError(
        createAppError("UNEXPECTED", `Invalid shape for key ${key}`),
        { context: "safeStorage.get" }
      );
      if (options.removeOnInvalid !== false) this.remove(key);
      return fallback;
    }

    return /** @type {T} */ (parsed);
  },

  /**
   * @param {string} key
   * @param {unknown} value
   * @returns {{ ok: boolean, code?: string, userMessage?: string }}
   */
  set(key, value) {
    try {
      if (typeof localStorage === "undefined") {
        return {
          ok: false,
          code: "STORAGE_BLOCKED",
          userMessage: normalizeAppError({ code: "STORAGE_BLOCKED" }).userMessage,
        };
      }
      localStorage.setItem(key, JSON.stringify(value));
      return { ok: true };
    } catch (err) {
      const normalized = normalizeAppError(err, {
        context: "safeStorage.set",
        fallbackCode: "STORAGE_QUOTA",
      });
      return {
        ok: false,
        code: normalized.code,
        userMessage: normalized.userMessage,
      };
    }
  },

  /**
   * @param {string} key
   * @param {string} value
   * @returns {{ ok: boolean, code?: string, userMessage?: string }}
   */
  setRaw(key, value) {
    try {
      if (typeof localStorage === "undefined") {
        return { ok: false, code: "STORAGE_BLOCKED" };
      }
      localStorage.setItem(key, String(value));
      return { ok: true };
    } catch (err) {
      const normalized = normalizeAppError(err, {
        context: "safeStorage.setRaw",
        fallbackCode: "STORAGE_QUOTA",
      });
      return { ok: false, code: normalized.code, userMessage: normalized.userMessage };
    }
  },

  /**
   * @param {string} key
   */
  remove(key) {
    try {
      if (typeof localStorage === "undefined") return;
      localStorage.removeItem(key);
    } catch (err) {
      logInternalError(err, { context: "safeStorage.remove" });
    }
  },
};

export default safeStorage;
