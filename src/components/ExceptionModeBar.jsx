import { Sparkles, HelpCircle } from "lucide-react";
import { selectionCountLabel } from "../utils/exceptionSelection";

/**
 * Barra compacta del Modo Excepcional (desktop sticky / mobile bottom).
 */
export default function ExceptionModeBar({
  selectedCount = 0,
  hasChanges = false,
  onCancel,
  onApply,
}) {
  const countLabel = selectionCountLabel(selectedCount);

  return (
    <div
      className="exception-mode-bar pointer-events-auto w-full max-w-3xl rounded-2xl border border-violet-500/35 bg-bgSecondary/95 shadow-lg backdrop-blur-md px-3.5 py-2.5 sm:px-4 sm:py-3"
      role="region"
      aria-label="Modo Excepcional"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-black text-violet-600 dark:text-violet-300">
              <Sparkles className="h-3.5 w-3.5" />
              Modo Excepcional
            </span>
            <span className="text-[11px] font-bold text-textSecondary">
              {countLabel}
            </span>
            <span className="relative group/help">
              <button
                type="button"
                className="rounded-md p-0.5 text-textSecondary/70 hover:text-violet-500"
                aria-label="Qué es una excepción"
                title="Los ramos excepcionales se consideran aprobados aunque no cumplas sus prerrequisitos."
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </span>
          </div>
          <p className="text-[11px] text-textSecondary mt-0.5 leading-snug">
            Sirve para marcar ramos como aprobados aunque no cumplas los prerrequisitos,
            por ejemplo convalidaciones o casos especiales.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl border border-borderColor text-[11px] sm:text-xs font-bold text-textSecondary hover:text-textPrimary hover:bg-bgPrimary btn-interactive"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={hasChanges ? onApply : onCancel}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold btn-interactive ${
              hasChanges
                ? "bg-violet-600 text-white hover:brightness-110"
                : "bg-violet-600/80 text-white hover:brightness-110"
            }`}
          >
            {hasChanges ? "Aplicar y salir" : "Salir"}
          </button>
        </div>
      </div>
    </div>
  );
}
