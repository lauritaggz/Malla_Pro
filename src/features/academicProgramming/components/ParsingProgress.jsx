import { Loader2 } from "lucide-react";

/**
 * @param {{ page?: number, totalPages?: number, percent?: number, sectionsDetected?: number }} props
 */
export default function ParsingProgress({
  page = 0,
  totalPages = 0,
  percent = 0,
  sectionsDetected = 0,
}) {
  const safePercent = Math.max(0, Math.min(100, percent || 0));

  return (
    <div className="w-full max-w-lg mx-auto rounded-2xl border border-borderColor bg-bgSecondary p-6 sm:p-8 shadow-sm">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
        <h2 className="text-base sm:text-lg font-semibold text-textPrimary">
          Procesando programación académica...
        </h2>
      </div>

      <div className="mt-5 h-2 rounded-full bg-borderColor/40 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${safePercent}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:text-sm text-textSecondary">
        <div>
          <span className="block text-[11px] uppercase tracking-wide opacity-70">Página</span>
          <span className="font-medium text-textPrimary">
            {page || "—"} / {totalPages || "—"}
          </span>
        </div>
        <div>
          <span className="block text-[11px] uppercase tracking-wide opacity-70">Progreso</span>
          <span className="font-medium text-textPrimary">{safePercent}%</span>
        </div>
        <div className="col-span-2">
          <span className="block text-[11px] uppercase tracking-wide opacity-70">
            Secciones detectadas
          </span>
          <span className="font-medium text-textPrimary">{sectionsDetected}</span>
        </div>
      </div>
    </div>
  );
}
