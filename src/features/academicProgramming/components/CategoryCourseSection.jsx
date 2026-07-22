import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import CourseAccordionList from "./CourseAccordionList";

/**
 * Sección de categoría (recomendada, anteriores, otras…).
 */
export default function CategoryCourseSection({
  title,
  description,
  summary,
  courses,
  expandedCodes,
  onToggle,
  highlightedDays = [],
  defaultCollapsed = false,
  children,
}) {
  const [open, setOpen] = useState(!defaultCollapsed);
  const panelId = useId();
  const headingId = useId();

  if ((!courses || courses.length === 0) && !children) return null;

  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            id={headingId}
            className="text-base sm:text-lg font-bold text-textPrimary tracking-tight"
          >
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm text-textSecondary leading-relaxed">
              {description}
            </p>
          )}
          {summary && (
            <p className="mt-1.5 text-xs text-textSecondary">{summary}</p>
          )}
        </div>
        {defaultCollapsed && (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((v) => !v)}
            className="
              shrink-0 h-9 px-2.5 rounded-lg border border-borderColor
              text-xs font-semibold text-textSecondary
              inline-flex items-center gap-1
              hover:text-textPrimary
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
            "
          >
            {open ? "Ocultar" : "Mostrar"}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      {(open || !defaultCollapsed) && (
        <div id={panelId} className="space-y-3">
          {children}
          {courses?.length > 0 && (
            <CourseAccordionList
              courses={courses}
              expandedCodes={expandedCodes}
              onToggle={onToggle}
              highlightedDays={highlightedDays}
            />
          )}
        </div>
      )}
    </section>
  );
}

/**
 * Grupo de semestre para pendientes anteriores.
 */
export function SemesterCourseGroup({
  semester,
  courses,
  expandedCodes,
  onToggle,
  highlightedDays,
}) {
  if (!courses?.length) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2 px-0.5">
        <h3 className="text-sm font-bold text-textPrimary">
          {semester}.º semestre
        </h3>
        <span className="text-xs text-textSecondary">
          {courses.length}{" "}
          {courses.length === 1 ? "asignatura pendiente" : "asignaturas pendientes"}
        </span>
      </div>
      <CourseAccordionList
        courses={courses}
        expandedCodes={expandedCodes}
        onToggle={onToggle}
        highlightedDays={highlightedDays}
      />
    </div>
  );
}
