import { AlertTriangle, FolderOpen } from "lucide-react";

/**
 * Fuentes cargadas como chips compactos (Programación + Mi horario).
 */
export default function SourcesBar({
  programmingLoaded = false,
  programmingDetail = null,
  programmingError = null,
  studentScheduleLoaded = false,
  studentScheduleDetail = null,
  studentScheduleError = null,
  warningCount = 0,
  onManage,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SourceChip
        label="Programación"
        loaded={programmingLoaded}
        detail={programmingDetail}
        error={programmingError}
        onClick={onManage}
      />
      <SourceChip
        label="Mi horario"
        loaded={studentScheduleLoaded}
        detail={studentScheduleDetail}
        error={studentScheduleError}
        onClick={onManage}
      />
      {warningCount > 0 && (
        <button
          type="button"
          onClick={onManage}
          className="inline-flex items-center gap-1.5 rounded-full border border-exception/40 bg-exception/10 px-3 py-1.5 text-[12px] font-semibold text-exception transition-colors hover:bg-exception/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          {warningCount} {warningCount === 1 ? "aviso" : "avisos"} de lectura
        </button>
      )}
      <button
        type="button"
        onClick={onManage}
        className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-textSecondary transition-colors hover:text-textPrimary hover:bg-borderColor/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <FolderOpen className="h-3.5 w-3.5" aria-hidden />
        Gestionar archivos
      </button>
    </div>
  );
}

function SourceChip({ label, loaded, detail, error, onClick }) {
  const tone = error ? "error" : loaded ? "ok" : "idle";
  const dot =
    tone === "ok" ? "bg-approved" : tone === "error" ? "bg-danger" : "bg-textSecondary/40";
  const text = tone === "error" ? "No se pudo leer" : loaded ? detail || "Cargada" : "Sin cargar";

  return (
    <button
      type="button"
      onClick={onClick}
      title={loaded ? "Cambiar o revisar el archivo" : "Cargar el archivo"}
      className="inline-flex min-w-0 items-center gap-2 rounded-full border border-borderColor bg-bgSecondary px-3 py-1.5 text-[12px] transition-colors hover:border-textSecondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden />
      <span className="font-semibold text-textPrimary">{label}</span>
      <span
        className={`truncate font-medium ${
          tone === "error" ? "text-danger" : loaded ? "text-textSecondary" : "text-textSecondary/80"
        }`}
      >
        {text}
      </span>
    </button>
  );
}
