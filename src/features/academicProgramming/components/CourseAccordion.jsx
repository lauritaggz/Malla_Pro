import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { MODALITY_LABELS } from "../services/filterCourses";
import SectionComparison from "./SectionComparison";

/**
 * @param {{
 *   course: object,
 *   expanded: boolean,
 *   onToggle: () => void,
 *   highlightedDays?: string[],
 *   highlight?: boolean,
 *   courseRef?: (el: HTMLElement | null) => void
 * }} props
 */
export default function CourseAccordion({
  course,
  expanded,
  onToggle,
  highlightedDays = [],
  highlight = false,
  courseRef,
}) {
  const panelId = useId();
  const headerId = useId();
  const visibleCount = course.sections?.length || 0;
  const totalCount = course.totalSectionCount ?? visibleCount;

  const modalities = [
    ...new Set((course.sections || []).map((s) => s.modality).filter(Boolean)),
  ];
  const modalityText = modalities
    .map((m) => MODALITY_LABELS[m] || m)
    .filter(Boolean)
    .join(" · ");

  const meta = course._integration || null;
  const badge = meta?.badge;
  const missing = meta?.missingPrerequisites || [];
  const semesterLabel =
    meta?.semester != null ? `${meta.semester}.º semestre` : null;

  return (
    <div
      ref={courseRef}
      data-course-code={course.courseCode}
      className={`
        rounded-xl border overflow-hidden transition-[border-color,box-shadow,background-color] duration-200
        ${highlight ? "ring-2 ring-primary/40 border-primary/40" : ""}
        ${expanded
          ? "border-primary/30 bg-bgSecondary"
          : "border-borderColor bg-bgSecondary hover:border-primary/25"}
      `}
    >
      <h3 className="m-0">
        <button
          type="button"
          id={headerId}
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={onToggle}
          className="
            w-full flex items-center gap-3
            px-4 py-3.5 sm:px-5 text-left min-h-[52px]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40
          "
        >
          {/* Identidad */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="inline-flex items-center rounded-md border border-borderColor bg-bgPrimary px-1.5 py-0.5 text-[11px] font-semibold text-textSecondary tracking-tight">
                {course.courseCode}
              </span>
              <span className="text-[15px] sm:text-base font-bold text-textPrimary leading-snug">
                {course.courseTitle || "Sin título"}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-textSecondary">
              {badge && (
                <span className="inline-flex items-center rounded-md border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                  {badge}
                </span>
              )}
              {semesterLabel && <span>{semesterLabel}</span>}
              {(badge || semesterLabel) && (
                <span aria-hidden className="text-textSecondary/40">
                  ·
                </span>
              )}
              <span>
                {visibleCount === totalCount
                  ? `${totalCount} ${totalCount === 1 ? "sección disponible" : "secciones disponibles"}`
                  : `${visibleCount} de ${totalCount} secciones`}
              </span>
              {modalityText && (
                <>
                  <span aria-hidden className="text-textSecondary/40">
                    ·
                  </span>
                  <span>{modalityText}</span>
                </>
              )}
            </div>
            {missing.length > 0 && (
              <div className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-400">
                <p className="font-semibold">Te falta aprobar:</p>
                <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                  {missing.map((p) => (
                    <li key={p.id}>
                      {p.codigo} - {p.nombre}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <span className="hidden sm:inline text-xs font-medium text-textSecondary shrink-0">
            {expanded ? "Ocultar" : "Ver secciones"}
          </span>
          <span
            className={`
              shrink-0 h-8 w-8 rounded-full flex items-center justify-center
              ${expanded ? "bg-primary text-white" : "border border-borderColor text-textSecondary"}
            `}
            aria-hidden
          >
            <ChevronDown
              className="h-4 w-4 text-textSecondary accordion-chevron"
              style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </span>
        </button>
      </h3>

      <div className="accordion-grid" data-open={expanded ? "true" : "false"}>
        <div className="accordion-content">
          <div id={panelId} role="region" aria-labelledby={headerId} className="px-4 sm:px-5 pb-4 pt-3 border-t border-borderColor/70 space-y-3">
            <div>
              <p className="text-sm font-semibold text-textPrimary">
                Opciones de horario
              </p>
              <p className="text-xs text-textSecondary mt-0.5">
                Compara las secciones disponibles para esta asignatura.
              </p>
            </div>
            <SectionComparison
              sections={course.sections}
              totalSectionCount={totalCount}
              highlightedDays={highlightedDays}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
