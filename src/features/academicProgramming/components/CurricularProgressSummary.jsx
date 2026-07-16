import SectionBlockHeading from "./SectionBlockHeading";

/**
 * Bloque “Tu avance curricular”.
 * @param {{
 *   primarySemester: number,
 *   primarySummary: object | null,
 *   previousPendingCount: number,
 *   hasCurriculum: boolean,
 *   mallaName?: string | null
 * }} props
 */
export default function CurricularProgressSummary({
  primarySemester,
  primarySummary,
  previousPendingCount,
  hasCurriculum,
  mallaName,
}) {
  if (!hasCurriculum) {
    return (
      <section
        aria-labelledby="block-progress-heading"
        className="rounded-2xl border border-borderColor bg-bgSecondary p-5 sm:p-6"
      >
        <SectionBlockHeading
          id="block-progress-heading"
          number={2}
          title="Tu avance curricular"
        />
        <p className="text-sm text-textSecondary pl-0 sm:pl-[2.125rem] leading-relaxed">
          Selecciona una malla en{" "}
          <span className="font-medium text-textPrimary">Inicio</span> y registra
          tus ramos aprobados para priorizar esta programación según tu avance.
        </p>
      </section>
    );
  }

  const pending = primarySummary?.pendingCourses ?? 0;
  const total = primarySummary?.totalCourses ?? 0;
  const offered = primarySummary?.offeredPendingCourses ?? 0;

  return (
    <section
      aria-labelledby="block-progress-heading"
      className="rounded-2xl border border-borderColor bg-bgSecondary p-5 sm:p-6"
    >
      <SectionBlockHeading
        id="block-progress-heading"
        number={2}
        title="Tu avance curricular"
        description="Organizamos la programación según los ramos que tienes registrados como aprobados en tu malla."
      />

      <div className="space-y-3 sm:pl-[2.125rem]">
        {mallaName && (
          <p className="text-xs text-textSecondary">{mallaName}</p>
        )}

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-textSecondary">
            Semestre principal detectado
          </p>
          <p className="text-xl sm:text-2xl font-bold text-textPrimary mt-0.5">
            {primarySemester}.º semestre
          </p>
        </div>

        <p className="text-sm text-textPrimary leading-relaxed">
          Tienes{" "}
          <span className="font-semibold">
            {pending} de {total}
          </span>{" "}
          asignaturas pendientes en este semestre.
          {offered > 0 && (
            <>
              {" "}
              <span className="font-semibold">{offered}</span> aparecen en la
              programación cargada.
            </>
          )}
        </p>

        {previousPendingCount > 0 && (
          <p className="text-sm text-textSecondary">
            <span className="font-semibold text-textPrimary">
              {previousPendingCount}
            </span>{" "}
            {previousPendingCount === 1
              ? "asignatura pendiente"
              : "asignaturas pendientes"}{" "}
            de semestres anteriores.
          </p>
        )}
      </div>
    </section>
  );
}
