import { SearchX, FilterX } from "lucide-react";

export default function ProgrammingEmptyState({
  query = "",
  hasFilters = false,
  onClearSearch,
  onClearFilters,
  onShowAll,
}) {
  const q = query.trim();

  return (
    <div className="rounded-2xl border border-dashed border-borderColor bg-bgSecondary/40 px-5 py-10 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {q ? <SearchX className="h-5 w-5" /> : <FilterX className="h-5 w-5" />}
      </div>

      {q ? (
        <p className="text-sm font-semibold text-textPrimary">
          No encontramos secciones que coincidan con “{q}”.
        </p>
      ) : (
        <p className="text-sm font-semibold text-textPrimary">
          No encontramos secciones que coincidan con estos filtros.
        </p>
      )}

      <p className="mt-1 text-xs text-textSecondary max-w-sm mx-auto">
        Prueba quitando uno o más filtros.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {hasFilters && onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="h-9 px-3 rounded-xl bg-primary text-white text-xs font-semibold"
          >
            Limpiar filtros
          </button>
        )}
        {q && onClearSearch && (
          <button
            type="button"
            onClick={onClearSearch}
            className="h-9 px-3 rounded-xl border border-borderColor bg-bgSecondary text-xs font-semibold"
          >
            Limpiar búsqueda
          </button>
        )}
        {onShowAll && (
          <button
            type="button"
            onClick={onShowAll}
            className="h-9 px-3 rounded-xl border border-borderColor bg-bgSecondary text-xs font-semibold text-textSecondary hover:text-textPrimary"
          >
            Ver todas las asignaturas
          </button>
        )}
      </div>
    </div>
  );
}
