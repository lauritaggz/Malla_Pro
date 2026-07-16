/**
 * Asignaturas de la malla no encontradas en el PDF.
 */
export default function MissingFromProgrammingSection({ missing = [] }) {
  if (!missing.length) return null;

  const primary = missing.filter((m) => m.scope === "PRIMARY");
  const previous = missing.filter((m) => m.scope === "PREVIOUS");

  return (
    <section className="rounded-2xl border border-dashed border-borderColor bg-bgSecondary/50 p-4 sm:p-5 space-y-3">
      <div>
        <h2 className="text-sm sm:text-base font-bold text-textPrimary">
          Asignaturas pendientes no encontradas en el documento
        </h2>
        <p className="mt-1 text-xs text-textSecondary leading-relaxed">
          Siguen pendientes en tu malla, pero no aparecen en la programación
          cargada.
        </p>
      </div>

      {primary.length > 0 && (
        <MissingGroup title="Del semestre principal" items={primary} />
      )}
      {previous.length > 0 && (
        <MissingGroup title="De semestres anteriores" items={previous} />
      )}
    </section>
  );
}

function MissingGroup({ title, items }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-textSecondary mb-1.5">
        {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li
            key={item.curriculumCourse.id}
            className="rounded-lg border border-borderColor bg-bgPrimary px-3 py-2"
          >
            <p className="text-sm font-semibold text-textPrimary">
              <span className="text-textSecondary font-medium mr-1.5">
                {item.curriculumCourse.codigo}
              </span>
              {item.curriculumCourse.nombre}
            </p>
            <p className="text-[11px] text-textSecondary mt-0.5">
              {item.semester}.º semestre · No encontrada en la programación cargada.
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
