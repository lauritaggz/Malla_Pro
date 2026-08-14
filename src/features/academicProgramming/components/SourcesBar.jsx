import { FolderOpen } from "lucide-react";

/**
 * Barra compacta de fuentes (Programación + Mi horario).
 */
export default function SourcesBar({
  programmingLoaded = false,
  programmingDetail = null,
  programmingError = null,
  studentScheduleLoaded = false,
  studentScheduleDetail = null,
  studentScheduleError = null,
  onManage,
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 rounded-xl border border-borderColor bg-bgSecondary px-3 py-2.5 sm:px-4">
      <p className="text-[10px] font-extrabold uppercase tracking-widest text-textSecondary shrink-0">
        Fuentes
      </p>
      <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center gap-2 sm:gap-4">
        <SourceChip
          label="Programación académica"
          loaded={programmingLoaded}
          detail={programmingDetail}
          error={programmingError}
          emptyLabel="Sin cargar"
        />
        <SourceChip
          label="Mi horario"
          loaded={studentScheduleLoaded}
          detail={studentScheduleDetail}
          error={studentScheduleError}
          emptyLabel="Sin cargar"
        />
      </div>
      <button
        type="button"
        onClick={onManage}
        className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg border border-borderColor bg-bgPrimary px-3 py-1.5 text-[11px] sm:text-xs font-bold text-textPrimary hover:border-primary/40 hover:text-primary transition-colors btn-interactive"
      >
        <FolderOpen className="h-3.5 w-3.5" />
        Gestionar archivos
      </button>
    </div>
  );
}

function SourceChip({ label, loaded, detail, error, emptyLabel }) {
  const tone = error ? "error" : loaded ? "ok" : "idle";
  const dot =
    tone === "ok"
      ? "bg-emerald-500"
      : tone === "error"
        ? "bg-red-500"
        : "bg-textSecondary/40";
  const text =
    tone === "error"
      ? "No se pudo leer"
      : loaded
        ? detail || "Cargada"
        : emptyLabel;

  return (
    <div className="min-w-0 flex items-start sm:items-center gap-2">
      <span
        className={`mt-1 sm:mt-0 h-2 w-2 rounded-full shrink-0 ${dot}`}
        aria-hidden
      />
      <div className="min-w-0 leading-tight">
        <p className="text-[11px] font-bold text-textPrimary truncate">{label}</p>
        <p
          className={`text-[10px] font-medium truncate ${
            tone === "error"
              ? "text-red-500"
              : loaded
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-textSecondary"
          }`}
        >
          {text}
        </p>
      </div>
    </div>
  );
}
