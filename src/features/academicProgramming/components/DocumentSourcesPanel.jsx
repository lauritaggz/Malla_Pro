import { useRef, useState } from "react";
import { Check, FileUp, RefreshCw } from "lucide-react";

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * @param {{
 *   title: string,
 *   description: string,
 *   loadedLabel?: string | null,
 *   detail?: string | null,
 *   onFileSelected: (file: File) => void,
 *   disabled?: boolean,
 *   error?: string | null,
 * }} props
 */
function SourceCard({
  title,
  description,
  loadedLabel,
  detail,
  onFileSelected,
  disabled = false,
  error = null,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState(null);
  const loaded = Boolean(loadedLabel);

  const handleFile = (file) => {
    setLocalError(null);
    if (!file) return;
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setLocalError("El archivo no es un PDF válido.");
      return;
    }
    if (file.size === 0) {
      setLocalError("El archivo está vacío.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setLocalError("El PDF supera 10 MB.");
      return;
    }
    onFileSelected(file);
  };

  return (
    <div
      className={`rounded-2xl border px-4 py-4 sm:px-5 sm:py-5 text-left transition-colors ${
        loaded
          ? "border-emerald-500/35 bg-emerald-500/5"
          : "border-borderColor bg-bgSecondary/60"
      } ${dragging ? "border-primary bg-primary/10" : ""}`}
      onDragEnter={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (disabled) return;
        handleFile(e.dataTransfer.files?.[0]);
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="text-sm font-bold text-textPrimary">{title}</h3>
          <p className="text-xs text-textSecondary leading-relaxed">{description}</p>
        </div>
        {loaded && (
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-bold">
            <Check className="h-3 w-3" strokeWidth={2.5} />
            Listo
          </span>
        )}
      </div>

      {loaded ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold text-textPrimary flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2.5} />
            {loadedLabel}
          </p>
          {detail && (
            <p className="text-[11px] text-textSecondary pl-5">{detail}</p>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
          >
            <RefreshCw className="h-3 w-3" />
            Cambiar archivo
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:brightness-110 transition-all disabled:opacity-50"
        >
          <FileUp className="h-4 w-4" />
          Subir PDF
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        disabled={disabled}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {(localError || error) && (
        <p className="mt-3 text-xs text-red-500 font-medium" role="alert">
          {localError || error}
        </p>
      )}
    </div>
  );
}

/**
 * Panel dual de carga: Programación Académica + Horario del Alumno.
 */
export default function DocumentSourcesPanel({
  programmingLoaded = false,
  programmingDetail = null,
  studentScheduleLoaded = false,
  studentScheduleDetail = null,
  mergeSummary = null,
  onProgrammingFile,
  onStudentScheduleFile,
  disabled = false,
  programmingError = null,
  studentScheduleError = null,
  compact = false,
}) {
  return (
    <div className={`w-full ${compact ? "space-y-3" : "space-y-5"}`}>
      {!compact && (
        <div className="text-center space-y-1.5 max-w-lg mx-auto">
          <h2 className="text-base sm:text-lg font-bold text-textPrimary">
            Carga tus documentos
          </h2>
          <p className="text-xs sm:text-sm text-textSecondary leading-relaxed">
            Añade uno o ambos archivos. Malla Pro combina la información automáticamente.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <SourceCard
          title="Programación Académica"
          description="Oferta de ramos, NRC, profesores y cupos."
          loadedLabel={programmingLoaded ? "Programación cargada" : null}
          detail={programmingDetail}
          onFileSelected={onProgrammingFile}
          disabled={disabled}
          error={programmingError}
        />
        <SourceCard
          title="Mi horario"
          description="Detecta automáticamente los ramos que ya tienes inscritos."
          loadedLabel={studentScheduleLoaded ? "Horario cargado" : null}
          detail={studentScheduleDetail}
          onFileSelected={onStudentScheduleFile}
          disabled={disabled}
          error={studentScheduleError}
        />
      </div>

      {mergeSummary && (
        <p className="text-[11px] sm:text-xs text-textSecondary text-center leading-relaxed">
          {mergeSummary}
        </p>
      )}

      <p className="text-[11px] text-textSecondary text-center leading-relaxed px-2">
        Los archivos se procesan solo en tu dispositivo. No se envían a ningún servidor.
      </p>
    </div>
  );
}
