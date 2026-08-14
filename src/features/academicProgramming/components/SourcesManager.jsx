import { useEffect } from "react";
import { X } from "lucide-react";
import DocumentSourcesPanel from "./DocumentSourcesPanel";

/**
 * Modal para subir / cambiar Programación y Mi horario.
 */
export default function SourcesManager({
  open,
  onClose,
  programmingLoaded,
  programmingDetail,
  studentScheduleLoaded,
  studentScheduleDetail,
  mergeSummary,
  onProgrammingFile,
  onStudentScheduleFile,
  disabled,
  programmingError,
  studentScheduleError,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sources-manager-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="relative z-10 w-full sm:max-w-2xl max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-borderColor bg-bgPrimary shadow-xl p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h2
              id="sources-manager-title"
              className="text-base sm:text-lg font-black text-textPrimary"
            >
              Gestionar archivos
            </h2>
            <p className="text-xs text-textSecondary mt-0.5">
              Añade uno o ambos. Malla Pro combina la información automáticamente.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-textSecondary hover:text-textPrimary hover:bg-bgSecondary"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <DocumentSourcesPanel
          compact
          programmingLoaded={programmingLoaded}
          programmingDetail={programmingDetail}
          studentScheduleLoaded={studentScheduleLoaded}
          studentScheduleDetail={studentScheduleDetail}
          mergeSummary={mergeSummary}
          onProgrammingFile={(file) => {
            onProgrammingFile(file);
            onClose();
          }}
          onStudentScheduleFile={(file) => {
            onStudentScheduleFile(file);
            onClose();
          }}
          disabled={disabled}
          programmingError={programmingError}
          studentScheduleError={studentScheduleError}
        />
      </div>
    </div>
  );
}
