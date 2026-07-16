import SectionBlockHeading from "./SectionBlockHeading";
import ParserWarningsPanel from "./ParserWarningsPanel";

/**
 * Bloque 1: documento cargado + resumen compacto.
 * @param {{
 *   programming: import('../types/academicProgramming').AcademicProgramming,
 *   courseCount: number,
 *   sectionCount: number,
 *   modalityCount: number,
 *   warningCount: number,
 *   warningsOpen: boolean,
 *   onWarningsOpenChange: (open: boolean) => void
 * }} props
 */
export default function LoadedProgrammingBlock({
  programming,
  courseCount,
  sectionCount,
  modalityCount,
  warningCount,
  warningsOpen,
  onWarningsOpenChange,
}) {
  const period = programming?.academicPeriod?.label;
  const career = programming?.curriculum?.careerName;
  const plan = programming?.curriculum?.code;
  const campus = programming?.curriculum?.campus;
  const meta = [plan ? `Plan ${plan}` : null, campus].filter(Boolean).join(" · ");

  return (
    <section
      aria-labelledby="block-loaded-heading"
      className="rounded-2xl border border-borderColor bg-bgSecondary p-5 sm:p-6"
    >
      <SectionBlockHeading
        id="block-loaded-heading"
        number={1}
        title="Programación cargada"
        description="Resumen del documento que estás revisando."
      />

      <div className="space-y-1 pl-0 sm:pl-[2.125rem]">
        <p className="text-lg sm:text-xl font-bold text-textPrimary tracking-tight">
          {period || "Periodo no identificado"}
        </p>
        {career && (
          <p className="text-sm font-medium text-textPrimary/90">{career}</p>
        )}
        {meta && <p className="text-xs sm:text-sm text-textSecondary">{meta}</p>}
      </div>

      {/* Stats en una sola fila con divisores */}
      <div
        className="
          mt-5 grid grid-cols-2 sm:grid-cols-4
          border-t border-borderColor
          divide-x-0 sm:divide-x divide-borderColor
          gap-y-3 sm:gap-y-0
          pt-4
        "
      >
        <Stat value={courseCount} label={courseCount === 1 ? "Asignatura" : "Asignaturas"} />
        <Stat value={sectionCount} label={sectionCount === 1 ? "Sección" : "Secciones"} />
        <Stat value={modalityCount} label={modalityCount === 1 ? "Modalidad" : "Modalidades"} />
        <Stat
          value={warningCount}
          label={warningCount === 1 ? "Advertencia" : "Advertencias"}
          muted={warningCount === 0}
        />
      </div>

      {warningCount > 0 && (
        <div className="mt-4 pt-4 border-t border-borderColor/70">
          <ParserWarningsPanel
            warnings={programming.warnings}
            open={warningsOpen}
            onOpenChange={onWarningsOpenChange}
          />
        </div>
      )}
    </section>
  );
}

function Stat({ value, label, muted = false }) {
  return (
    <div className="px-3 sm:px-4 first:pl-0 sm:first:pl-0">
      <p
        className={`text-xl sm:text-2xl font-bold tabular-nums leading-none ${
          muted ? "text-textSecondary" : "text-textPrimary"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] sm:text-xs text-textSecondary">{label}</p>
    </div>
  );
}
