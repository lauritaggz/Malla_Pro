import { useEffect, useId, useState } from "react";
import { AlertTriangle } from "lucide-react";
import DrawerPanel from "./DrawerPanel";
import {
  SHARE_ERROR_CODES,
  ShareCourseConfigError,
  buildEvaluationsFromPayload,
  decodeShareCode,
  formatPeso,
  isFullWeight,
  normalizeInstitution,
  sumWeights,
  validateCourseCompatibility,
} from "../utils/shareCourseConfig";

/**
 * @param {unknown} evaluations
 * @returns {boolean}
 */
export function hasExistingPerformance(evaluations) {
  if (!Array.isArray(evaluations)) return false;
  return evaluations.some((e) => {
    if (!e || typeof e !== "object") return false;
    const hasNota = e.nota !== null && e.nota !== undefined;
    const hasSubs = Array.isArray(e.subNotas) && e.subNotas.length > 0;
    return hasNota || hasSubs;
  });
}

/**
 * @param {string} code
 * @returns {string}
 */
function mapShareErrorMessage(code) {
  switch (code) {
    case SHARE_ERROR_CODES.INVALID_PREFIX:
      return "Este no parece ser un código válido de Malla Pro.";
    case SHARE_ERROR_CODES.UNSUPPORTED_VERSION:
      return "Este código usa un formato antiguo. Genera uno nuevo con Compartir.";
    case SHARE_ERROR_CODES.CORRUPTED_CODE:
      return "No pudimos leer esta configuración. El código puede estar incompleto o modificado.";
    case SHARE_ERROR_CODES.COMPRESSION_UNSUPPORTED:
      return "Tu navegador no puede abrir este código comprimido. Actualiza el navegador o pide un nuevo código.";
    case SHARE_ERROR_CODES.INVALID_PAYLOAD:
    case SHARE_ERROR_CODES.EMPTY_EVALUATIONS:
      return "La configuración contiene información que Malla Pro no puede importar.";
    default:
      return "No pudimos leer esta configuración. El código puede estar incompleto o modificado.";
  }
}

/**
 * Modal V1 — importar configuración (reemplazo total de evaluaciones).
 * Capas: NotasModal → este modal (estados internos, sin más modales).
 */
export default function ImportCourseConfigModal({
  isOpen,
  onClose,
  curso,
  evaluations = [],
  institutionSource,
  onApply,
}) {
  const codeFieldId = useId();
  /** @type {"paste"|"preview"|"confirmReplace"|"confirmDestructive"|"mismatch"} */
  const [step, setStep] = useState("paste");
  const [rawCode, setRawCode] = useState("");
  const [pasteError, setPasteError] = useState("");
  const [payload, setPayload] = useState(null);
  const [mismatch, setMismatch] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [applyError, setApplyError] = useState("");

  // Escape: no cerrar NotasModal
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      onClose?.();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setStep("paste");
      setRawCode("");
      setPasteError("");
      setPayload(null);
      setMismatch(null);
      setIsValidating(false);
      setApplyError("");
    }
  }, [isOpen]);

  if (!curso) return null;

  const currentCount = Array.isArray(evaluations) ? evaluations.length : 0;
  const currentInstitution = normalizeInstitution(institutionSource);

  const titleByStep = {
    paste: "Importar configuración",
    preview: "Configuración encontrada",
    confirmReplace: "Reemplazar configuración",
    confirmDestructive: "Este ramo ya contiene notas",
    mismatch: "Configuración incompatible",
  };

  const handleReview = async () => {
    setPasteError("");
    setApplyError("");
    setMismatch(null);

    const trimmed = rawCode.trim();
    if (!trimmed) {
      setPasteError("Pega un código de configuración de Malla Pro.");
      return;
    }

    if (!currentInstitution) {
      setPasteError("No pudimos identificar la universidad de esta malla.");
      return;
    }

    setIsValidating(true);
    try {
      const decoded = await decodeShareCode(trimmed);
      const compat = validateCourseCompatibility(decoded, {
        institution: currentInstitution,
        courseCode: curso.codigo,
      });

      if (!compat.compatible) {
        setPayload(decoded);
        setMismatch(compat);
        setStep("mismatch");
        return;
      }

      setPayload(decoded);
      setStep("preview");
    } catch (err) {
      const code =
        err instanceof ShareCourseConfigError
          ? err.code
          : SHARE_ERROR_CODES.CORRUPTED_CODE;
      setPasteError(mapShareErrorMessage(code));
      setStep("paste");
    } finally {
      setIsValidating(false);
    }
  };

  const goApplyOrConfirm = () => {
    setApplyError("");
    if (currentCount === 0) {
      applyImport();
      return;
    }
    if (hasExistingPerformance(evaluations)) {
      setStep("confirmDestructive");
      return;
    }
    setStep("confirmReplace");
  };

  const applyImport = () => {
    if (!payload) return;
    setApplyError("");
    try {
      const built = buildEvaluationsFromPayload(payload);
      onApply?.(built);
      onClose?.();
    } catch {
      setApplyError(
        "No pudimos aplicar esta configuración. Tu estructura actual no se modificó."
      );
      setStep("preview");
    }
  };

  const total = payload ? sumWeights(payload.evaluations) : 0;
  const totalLabel = formatPeso(total);
  const totalComplete = isFullWeight(total);
  const importedCount = payload?.evaluations?.length ?? 0;

  return (
    <DrawerPanel
      isOpen={isOpen}
      onClose={onClose}
      title={titleByStep[step] || "Importar configuración"}
      subtitle={`${curso.nombre} · ${curso.codigo}`}
      variant="modal"
      width="max-w-lg"
    >
      <div className="flex flex-col gap-4 p-4 sm:p-5 min-h-0 overflow-y-auto overflow-x-hidden max-w-full">
        {step === "paste" && (
          <>
            <p className="text-xs text-textSecondary m-0 leading-relaxed">
              Pega un código de configuración de Malla Pro para cargar las evaluaciones y
              porcentajes de este ramo.
            </p>

            <div className="flex flex-col gap-2 min-w-0 w-full">
              <label
                htmlFor={codeFieldId}
                className="text-[10px] font-bold text-textSecondary uppercase tracking-wider"
              >
                Código
              </label>
              <textarea
                id={codeFieldId}
                value={rawCode}
                onChange={(e) => {
                  setRawCode(e.target.value);
                  if (pasteError) setPasteError("");
                }}
                rows={6}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                autoComplete="off"
                placeholder="Pega aquí el código MP1C..."
                aria-label="Código de configuración de Malla Pro"
                aria-invalid={Boolean(pasteError)}
                className="w-full max-w-full min-w-0 box-border rounded-xl border border-borderColor bg-bgPrimary text-textPrimary text-[11px] sm:text-xs font-mono leading-relaxed px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/25 resize-y break-all overflow-x-hidden"
                style={{ overflowWrap: "anywhere", wordBreak: "break-all" }}
              />
            </div>

            {pasteError && (
              <div
                role="alert"
                className="rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs px-3.5 py-3 leading-relaxed"
              >
                {pasteError}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-3.5 py-2 rounded-xl text-sm font-semibold text-textSecondary hover:text-textPrimary border border-borderColor hover:bg-bgPrimary transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleReview}
                disabled={isValidating}
                className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-bold bg-primary text-white hover:brightness-110 disabled:opacity-50 transition cursor-pointer"
              >
                {isValidating ? "Revisando…" : "Revisar configuración"}
              </button>
            </div>
          </>
        )}

        {step === "mismatch" && mismatch && payload && (
          <>
            <div
              role="alert"
              className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3.5 py-3 text-xs leading-relaxed text-amber-800 dark:text-amber-300"
            >
              {mismatch.reason === SHARE_ERROR_CODES.INSTITUTION_MISMATCH ? (
                <>
                  <p className="font-bold m-0 mb-2">
                    Esta configuración pertenece a otra universidad.
                  </p>
                  <p className="m-0 text-textSecondary">
                    Configuración:{" "}
                    <span className="font-semibold text-textPrimary">
                      {mismatch.payload?.institution || "—"}
                    </span>
                  </p>
                  <p className="m-0 mt-1 text-textSecondary">
                    Actual:{" "}
                    <span className="font-semibold text-textPrimary">
                      {mismatch.target?.institution || currentInstitution || "—"}
                    </span>
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold m-0 mb-2">
                    Esta configuración corresponde a otra asignatura.
                  </p>
                  <p className="m-0 text-textSecondary">
                    Configuración recibida:{" "}
                    <span className="font-semibold text-textPrimary break-words">
                      {payload.courseName} · {payload.courseCode}
                    </span>
                  </p>
                  <p className="m-0 mt-1 text-textSecondary">
                    Asignatura actual:{" "}
                    <span className="font-semibold text-textPrimary break-words">
                      {curso.nombre} · {curso.codigo}
                    </span>
                  </p>
                </>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  setMismatch(null);
                  setStep("paste");
                }}
                className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-bold border border-borderColor text-textPrimary hover:bg-bgPrimary transition cursor-pointer"
              >
                Volver
              </button>
            </div>
          </>
        )}

        {step === "preview" && payload && (
          <>
            <div className="rounded-xl border border-borderColor bg-bgPrimary/50 px-3.5 py-3 min-w-0">
              <p className="text-sm font-bold text-textPrimary m-0 break-words">
                {payload.courseName}
              </p>
              <p className="text-xs font-semibold text-textSecondary m-0 mt-1 font-mono tracking-wide">
                {payload.courseCode}
              </p>
              <p className="text-[11px] text-textSecondary m-0 mt-2">
                {importedCount}{" "}
                {importedCount === 1 ? "evaluación" : "evaluaciones"}
              </p>
            </div>

            <div className="rounded-xl border border-borderColor bg-bgPrimary/30 min-w-0 max-h-[40vh] overflow-y-auto overflow-x-hidden">
              <ul className="m-0 p-0 list-none divide-y divide-borderColor/60">
                {payload.evaluations.map((ev, idx) => (
                  <li
                    key={`${idx}-${ev.nombre}`}
                    className="flex items-start justify-between gap-3 px-3.5 py-2.5 text-xs min-w-0"
                  >
                    <span className="text-textPrimary font-medium min-w-0 break-words">
                      {ev.nombre}
                    </span>
                    <span className="text-textSecondary font-semibold shrink-0 tabular-nums">
                      {formatPeso(ev.peso)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div
              className={`rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed ${
                totalComplete
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400"
              }`}
            >
              <p className="m-0 font-semibold">
                Ponderación total: {totalLabel}%{totalComplete ? " ✓" : ""}
              </p>
              {!totalComplete && (
                <p className="m-0 mt-1.5 opacity-95">
                  Los porcentajes de esta configuración suman {totalLabel}%. Puedes
                  importarla igualmente y editarla después.
                </p>
              )}
            </div>

            {applyError && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400 text-xs px-3.5 py-3"
              >
                {applyError}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-between pt-1">
              <button
                type="button"
                onClick={() => setStep("paste")}
                className="min-h-[44px] px-3.5 py-2 rounded-xl text-sm font-semibold text-textSecondary hover:text-textPrimary border border-borderColor hover:bg-bgPrimary transition cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={goApplyOrConfirm}
                className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-bold bg-primary text-white hover:brightness-110 transition cursor-pointer"
              >
                {currentCount === 0 ? "Aplicar configuración" : "Continuar"}
              </button>
            </div>
          </>
        )}

        {step === "confirmReplace" && payload && (
          <>
            <p className="text-sm text-textPrimary m-0 font-semibold leading-snug">
              Este ramo ya tiene evaluaciones configuradas.
            </p>
            <p className="text-xs text-textSecondary m-0 leading-relaxed">
              Al continuar, la estructura actual será reemplazada por la configuración
              importada.
            </p>
            <div className="rounded-xl border border-borderColor bg-bgPrimary/40 px-3.5 py-3 text-xs space-y-1.5">
              <p className="m-0 flex justify-between gap-3">
                <span className="text-textSecondary">Evaluaciones actuales</span>
                <span className="font-bold text-textPrimary tabular-nums">{currentCount}</span>
              </p>
              <p className="m-0 flex justify-between gap-3">
                <span className="text-textSecondary">Evaluaciones nuevas</span>
                <span className="font-bold text-textPrimary tabular-nums">{importedCount}</span>
              </p>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-between pt-1">
              <button
                type="button"
                onClick={() => setStep("preview")}
                className="min-h-[44px] px-3.5 py-2 rounded-xl text-sm font-semibold border border-borderColor text-textPrimary hover:bg-bgPrimary transition cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={applyImport}
                className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-bold bg-primary text-white hover:brightness-110 transition cursor-pointer"
              >
                Reemplazar configuración
              </button>
            </div>
          </>
        )}

        {step === "confirmDestructive" && payload && (
          <>
            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-3">
              <AlertTriangle
                className="w-4 h-4 text-red-500 shrink-0 mt-0.5"
                aria-hidden
              />
              <div className="min-w-0 text-xs leading-relaxed text-red-700 dark:text-red-300">
                <p className="m-0 font-bold text-sm text-red-600 dark:text-red-400">
                  La configuración actual tiene notas o subnotas registradas.
                </p>
                <p className="m-0 mt-2">
                  Si reemplazas la configuración, esas evaluaciones serán eliminadas y la
                  nueva estructura comenzará sin notas.
                </p>
                <p className="m-0 mt-2 text-textSecondary">
                  Las evaluaciones actuales y sus notas serán reemplazadas. La configuración
                  de eximición y examen no se modifica.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-borderColor bg-bgPrimary/40 px-3.5 py-3 text-xs space-y-1.5">
              <p className="m-0 flex justify-between gap-3">
                <span className="text-textSecondary">Evaluaciones actuales</span>
                <span className="font-bold text-textPrimary tabular-nums">{currentCount}</span>
              </p>
              <p className="m-0 flex justify-between gap-3">
                <span className="text-textSecondary">Evaluaciones nuevas</span>
                <span className="font-bold text-textPrimary tabular-nums">{importedCount}</span>
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-between pt-1">
              <button
                type="button"
                onClick={() => setStep("preview")}
                className="min-h-[44px] px-3.5 py-2 rounded-xl text-sm font-semibold border border-borderColor text-textPrimary hover:bg-bgPrimary transition cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={applyImport}
                className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-500 text-white transition cursor-pointer"
              >
                Reemplazar y eliminar notas actuales
              </button>
            </div>
          </>
        )}
      </div>
    </DrawerPanel>
  );
}
