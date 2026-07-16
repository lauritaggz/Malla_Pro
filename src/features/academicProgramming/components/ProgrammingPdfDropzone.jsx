import { useCallback, useRef, useState } from "react";
import { FileUp, Upload } from "lucide-react";

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * @param {{ onFileSelected: (file: File) => void, disabled?: boolean, error?: string | null }} props
 */
export default function ProgrammingPdfDropzone({ onFileSelected, disabled = false, error = null }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [localError, setLocalError] = useState(null);

  const handleFile = useCallback(
    (file) => {
      setLocalError(null);
      if (!file) return;

      const isPdf =
        file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

      if (!isPdf) {
        setLocalError("El archivo seleccionado no es un PDF válido.");
        setFileName("");
        return;
      }

      if (file.size > MAX_BYTES) {
        setLocalError("El PDF supera el tamaño máximo permitido de 10 MB.");
        setFileName("");
        return;
      }

      setFileName(file.name);
      onFileSelected(file);
    },
    [onFileSelected]
  );

  return (
    <div className="w-full space-y-3">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!disabled) inputRef.current?.click();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(false);
          if (disabled) return;
          const file = e.dataTransfer.files?.[0];
          handleFile(file);
        }}
        className={`
          relative rounded-2xl border-2 border-dashed px-4 py-10 sm:py-12 text-center transition-colors
          ${dragging ? "border-primary bg-primary/10" : "border-borderColor bg-bgSecondary/60"}
          ${disabled ? "opacity-60 pointer-events-none" : "hover:border-primary/50 cursor-pointer"}
        `}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          disabled={disabled}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Upload className="h-6 w-6" strokeWidth={1.75} />
        </div>

        <p className="text-sm sm:text-base font-semibold text-textPrimary">
          Arrastra tu PDF aquí
        </p>
        <p className="mt-1 text-xs sm:text-sm text-textSecondary">
          o selecciona un archivo desde tu dispositivo
        </p>

        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-110 transition-all"
        >
          <FileUp className="h-4 w-4" />
          Seleccionar PDF
        </button>

        {fileName && (
          <p className="mt-4 text-xs sm:text-sm text-textPrimary font-medium truncate px-2">
            {fileName}
          </p>
        )}
      </div>

      <p className="text-xs text-textSecondary text-center leading-relaxed px-2">
        El archivo se procesa localmente en tu dispositivo y no se envía a ningún servidor.
      </p>

      {(localError || error) && (
        <p className="text-sm text-red-500 text-center font-medium px-2" role="alert">
          {localError || error}
        </p>
      )}
    </div>
  );
}
