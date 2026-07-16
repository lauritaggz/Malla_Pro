import { useState, useRef, useEffect } from "react";
import { MoreHorizontal } from "lucide-react";
import SectionBlockHeading from "./SectionBlockHeading";
import { SORT_OPTIONS } from "../services/filterCourses";

/**
 * Bloque 3: resultados + orden de asignaturas.
 */
export default function ProgrammingResultsHeader({
  filteredCourseCount,
  totalCourseCount,
  filteredSectionCount,
  totalSectionCount,
  sortBy,
  onSortChange,
  onExpandAll,
  onCollapseAll,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const filtered = filteredCourseCount !== totalCourseCount;

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <section aria-labelledby="block-results-heading" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <SectionBlockHeading
            id="block-results-heading"
            number={3}
            title="Asignaturas encontradas"
          />
          <div className="pl-[2.125rem] -mt-2 space-y-0.5 text-sm text-textSecondary">
            <p>
              {filtered ? (
                <>
                  <span className="font-semibold text-textPrimary">
                    {filteredCourseCount}
                  </span>
                  {" de "}
                  <span className="font-semibold text-textPrimary">
                    {totalCourseCount}
                  </span>
                  {" asignaturas"}
                </>
              ) : (
                <>
                  <span className="font-semibold text-textPrimary">
                    {totalCourseCount}
                  </span>
                  {totalCourseCount === 1
                    ? " asignatura"
                    : " asignaturas"}
                </>
              )}
            </p>
            <p className="text-xs">
              <span className="font-semibold text-textPrimary">
                {filteredSectionCount}
              </span>
              {" de "}
              <span className="font-semibold text-textPrimary">
                {totalSectionCount}
              </span>
              {" secciones visibles"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:pt-1">
          <label className="inline-flex items-center gap-2 text-xs text-textSecondary">
            <span className="font-medium whitespace-nowrap">Ordenar asignaturas</span>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="h-9 rounded-lg border border-borderColor bg-bgSecondary px-2.5 text-xs font-medium text-textPrimary outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="
                h-9 w-9 inline-flex items-center justify-center rounded-lg
                border border-borderColor bg-bgSecondary text-textSecondary
                hover:text-textPrimary
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
              "
              aria-label="Opciones de vista"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-1 z-40 w-48 rounded-xl border border-borderColor bg-bgSecondary shadow-lg py-1"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="w-full text-left px-3 py-2 text-xs font-medium text-textPrimary hover:bg-primary/5"
                  onClick={() => {
                    onExpandAll();
                    setMenuOpen(false);
                  }}
                >
                  Expandir todo
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="w-full text-left px-3 py-2 text-xs font-medium text-textPrimary hover:bg-primary/5"
                  onClick={() => {
                    onCollapseAll();
                    setMenuOpen(false);
                  }}
                >
                  Contraer todo
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
