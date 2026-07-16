import { Search, X } from "lucide-react";

/**
 * @param {{ value: string, onChange: (v: string) => void }} props
 */
export default function ProgrammingSearch({ value, onChange }) {
  return (
    <div className="relative flex-1 min-w-0">
      <label htmlFor="programming-search" className="sr-only">
        Buscar asignaturas
      </label>
      <Search
        className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-textSecondary pointer-events-none"
        aria-hidden
      />
      <input
        id="programming-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar por asignatura, código, profesor, sección o NRC..."
        className="
          w-full h-11 rounded-xl border border-borderColor bg-bgPrimary
          pl-10 pr-10 text-sm text-textPrimary
          placeholder:text-textSecondary/60
          outline-none
          focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20
        "
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg flex items-center justify-center text-textSecondary hover:text-textPrimary hover:bg-borderColor/40"
          aria-label="Limpiar búsqueda"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
