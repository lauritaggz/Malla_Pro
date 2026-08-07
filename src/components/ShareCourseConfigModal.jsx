import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, Copy, Lock } from "lucide-react";
import DrawerPanel from "./DrawerPanel";
import {
  ShareCourseConfigError,
  createSharePayload,
  encodeShareCode,
  formatPeso,
  isFullWeight,
  normalizeInstitution,
  sumWeights,
} from "../utils/shareCourseConfig";

/**
 * @param {string} text
 * @returns {Promise<boolean>}
 */
async function copyTextToClipboard(text) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fallback abajo */
    }
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return Boolean(ok);
  } catch {
    return false;
  }
}

/**
 * Modal V1 — solo compartir (sin importar).
 */
export default function ShareCourseConfigModal({
  isOpen,
  onClose,
  curso,
  evaluations = [],
  institutionSource,
}) {
  const codeFieldId = useId();
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [copyFeedback, setCopyFeedback] = useState("idle"); // idle | copied | failed
  const copyTimerRef = useRef(null);
  const genIdRef = useRef(0);

  const evalCount = Array.isArray(evaluations) ? evaluations.length : 0;
  const totalWeight = sumWeights(evaluations);
  const totalLabel = formatPeso(totalWeight);
  const isComplete = isFullWeight(totalWeight);

  // Escape del modal hijo no debe cerrar NotasModal (captura)
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
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setStatus("idle");
      setCode("");
      setErrorMessage("");
      setCopyFeedback("idle");
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      return;
    }

    if (!curso || evalCount === 0) {
      setStatus("error");
      setCode("");
      setErrorMessage("Configura al menos una evaluación para poder compartir.");
      return;
    }

    const institution = normalizeInstitution(institutionSource);
    if (!institution) {
      setStatus("error");
      setCode("");
      setErrorMessage("No pudimos identificar la universidad de esta malla.");
      return;
    }

    const genId = ++genIdRef.current;
    setStatus("loading");
    setCode("");
    setErrorMessage("");
    setCopyFeedback("idle");

    let cancelled = false;

    (async () => {
      try {
        const payload = createSharePayload({
          institution,
          courseCode: curso.codigo,
          courseName: curso.nombre,
          evaluations,
        });
        const nextCode = await encodeShareCode(payload);
        if (cancelled || genId !== genIdRef.current) return;
        setCode(nextCode);
        setStatus("success");
      } catch (err) {
        if (cancelled || genId !== genIdRef.current) return;
        setStatus("error");
        setCode("");
        if (err instanceof ShareCourseConfigError) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage("No pudimos generar el código de configuración.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Snapshot al abrir: evaluations / curso fijos en esa apertura
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleCopy = useCallback(async () => {
    if (!code) return;
    const ok = await copyTextToClipboard(code);
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    if (ok) {
      setCopyFeedback("copied");
      copyTimerRef.current = window.setTimeout(() => setCopyFeedback("idle"), 2000);
    } else {
      setCopyFeedback("failed");
    }
  }, [code]);

  if (!curso) return null;

  return (
    <DrawerPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Compartir configuración"
      subtitle="Evaluaciones y porcentajes de este ramo"
      variant="modal"
      width="max-w-lg"
    >
      <div className="flex flex-col gap-4 p-4 sm:p-5 min-h-0 overflow-y-auto overflow-x-hidden max-w-full">
        <p className="text-xs text-textSecondary m-0 leading-relaxed">
          Comparte las evaluaciones y porcentajes de este ramo con tus compañeros.
        </p>

        <div className="rounded-xl border border-borderColor bg-bgPrimary/50 px-3.5 py-3 min-w-0">
          <p className="text-sm font-bold text-textPrimary m-0 truncate">{curso.nombre}</p>
          <p className="text-xs font-semibold text-textSecondary m-0 mt-1 font-mono tracking-wide">
            {curso.codigo}
          </p>
          <p className="text-[11px] text-textSecondary m-0 mt-2">
            {evalCount} {evalCount === 1 ? "evaluación" : "evaluaciones"}
            {" · "}
            Ponderación total: {totalLabel}%
            {isComplete ? " ✓" : ""}
          </p>
          {!isComplete && evalCount > 0 && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 m-0 mt-1.5 leading-snug">
              Los porcentajes actualmente suman {totalLabel}%. Puedes compartir igualmente.
            </p>
          )}
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-borderColor/80 bg-bgPrimary/40 px-3 py-2.5 min-w-0">
          <Lock className="w-3.5 h-3.5 text-textSecondary shrink-0 mt-0.5" aria-hidden />
          <p className="text-[11px] text-textSecondary m-0 leading-relaxed">
            El código comparte únicamente nombres y porcentajes. Tus notas y datos personales no se
            incluyen.
          </p>
        </div>

        {status === "loading" && (
          <p className="text-sm text-textSecondary m-0 py-6 text-center">Generando código…</p>
        )}

        {status === "error" && (
          <div
            role="alert"
            className="rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs px-3.5 py-3 leading-relaxed"
          >
            {errorMessage}
          </div>
        )}

        {status === "success" && code && (
          <div className="flex flex-col gap-2.5 min-w-0 w-full">
            <label
              htmlFor={codeFieldId}
              className="text-[10px] font-bold text-textSecondary uppercase tracking-wider"
            >
              Código de configuración
            </label>
            <textarea
              id={codeFieldId}
              readOnly
              value={code}
              rows={5}
              spellCheck={false}
              aria-label="Código de configuración de Malla Pro"
              className="w-full max-w-full min-w-0 box-border rounded-xl border border-borderColor bg-bgPrimary text-textPrimary text-[11px] sm:text-xs font-mono leading-relaxed px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/25 resize-y break-all overflow-x-hidden overflow-y-auto"
              style={{ overflowWrap: "anywhere", wordBreak: "break-all" }}
              onFocus={(e) => e.target.select()}
            />

            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copiar código de configuración"
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-white text-sm font-bold px-4 py-2.5 hover:brightness-110 active:scale-[0.99] transition cursor-pointer"
            >
              {copyFeedback === "copied" ? (
                <>
                  <Check className="w-4 h-4" aria-hidden />
                  Código copiado
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" aria-hidden />
                  Copiar código
                </>
              )}
            </button>

            {copyFeedback === "failed" && (
              <p role="alert" className="text-[11px] text-amber-600 dark:text-amber-400 m-0 leading-snug">
                No pudimos copiar el código automáticamente. Puedes seleccionarlo y copiarlo
                manualmente.
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-3.5 py-2 rounded-lg text-sm font-semibold text-textSecondary hover:text-textPrimary hover:bg-bgPrimary border border-transparent hover:border-borderColor transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </DrawerPanel>
  );
}
