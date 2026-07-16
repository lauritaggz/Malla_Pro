import { Link } from "react-router-dom";
import { ArrowLeft, FileUp } from "lucide-react";

/**
 * Encabezado de página (solo presentación).
 * @param {{ onChangePdf: () => void }} props
 */
export default function ProgrammingHeader({ onChangePdf }) {
  return (
    <header className="space-y-3">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-textSecondary">
        <Link
          to="/app"
          className="hover:text-primary transition-colors inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Inicio
        </Link>
        <span aria-hidden className="text-textSecondary/50">
          /
        </span>
        <span className="text-textPrimary font-medium">Programación académica</span>
      </nav>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-[1.75rem] sm:text-[2rem] font-bold tracking-tight text-textPrimary leading-tight">
            Programación académica
          </h1>
          <p className="text-sm text-textSecondary leading-relaxed max-w-xl">
            Revisa y compara todas las secciones disponibles para cada asignatura.
          </p>
        </div>

        <button
          type="button"
          onClick={onChangePdf}
          className="
            inline-flex items-center justify-center gap-2 self-start
            h-10 px-3.5 rounded-xl text-sm font-medium
            border border-borderColor bg-transparent text-textSecondary
            hover:text-textPrimary hover:border-primary/30 hover:bg-primary/5
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
            transition-colors
          "
        >
          <FileUp className="h-4 w-4" aria-hidden />
          Cambiar archivo
        </button>
      </div>
    </header>
  );
}
