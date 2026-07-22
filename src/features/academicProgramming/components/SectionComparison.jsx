import { useId, useMemo, useState } from "react";
import { AlertCircle, ChevronDown, Link2 } from "lucide-react";
import ModalityBadge from "./ModalityBadge";
import NrcCopyButton from "./NrcCopyButton";
import MeetingSchedule from "./MeetingSchedule";
import {
  sortSectionsInCourse,
  SECTION_SORT_OPTIONS,
  getSectionPrimaryPeriod,
  PERIOD_GROUP_LABELS,
} from "../services/filterCourses";

function ProfessorsCell({ professors }) {
  const list = professors?.length ? professors : [];
  const isPending = list.length === 1 && /por\s*definir/i.test(list[0]);

  if (list.length === 0) {
    return <span className="text-sm italic text-textSecondary">Por definir</span>;
  }
  if (isPending) {
    return <span className="text-sm italic text-textSecondary">{list[0]}</span>;
  }
  if (list.length === 1) {
    return <span className="text-sm text-textPrimary leading-snug">{list[0]}</span>;
  }

  return (
    <details className="group text-sm">
      <summary className="cursor-pointer list-none text-textPrimary leading-snug">
        <span className="font-medium">{list[0]}</span>
        <span className="ml-1 text-xs text-primary font-semibold">
          +{list.length - 1} profesor{list.length - 1 === 1 ? "" : "es"}
        </span>
      </summary>
      <ul className="mt-1.5 space-y-0.5 text-xs text-textSecondary">
        {list.slice(1).map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </details>
  );
}

/**
 * Comparación de secciones — columnas: Sección | Horario | Profesor | Modalidad | Vacantes | NRC
 */
export default function SectionComparison({
  sections,
  totalSectionCount,
  highlightedDays = [],
}) {
  const [sectionSort, setSectionSort] = useState("EARLIEST");
  const [groupByPeriod, setGroupByPeriod] = useState(false);

  const filtered = sections?.length || 0;
  const total = totalSectionCount ?? filtered;
  const showPartial = total > filtered;

  const sorted = useMemo(
    () => sortSectionsInCourse(sections || [], sectionSort),
    [sections, sectionSort]
  );

  const groups = useMemo(() => {
    if (!groupByPeriod) return [{ key: "ALL", label: null, sections: sorted }];
    const order = ["MORNING", "AFTERNOON", "EVENING", "SATURDAY", "NONE"];
    const map = new Map(order.map((k) => [k, []]));
    for (const s of sorted) {
      const key = getSectionPrimaryPeriod(s);
      map.get(key)?.push(s);
    }
    return order
      .filter((k) => map.get(k)?.length)
      .map((k) => ({
        key: k,
        label: PERIOD_GROUP_LABELS[k],
        sections: map.get(k),
      }));
  }, [sorted, groupByPeriod]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-0.5">
        <div>
          {showPartial && (
            <p className="text-xs text-textSecondary">
              Mostrando{" "}
              <span className="font-semibold text-textPrimary">
                {filtered} de {total} secciones
              </span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-1.5 text-[11px] text-textSecondary">
            <span className="font-medium whitespace-nowrap">Ordenar secciones</span>
            <select
              value={sectionSort}
              onChange={(e) => setSectionSort(e.target.value)}
              className="h-8 rounded-lg border border-borderColor bg-bgPrimary px-2 text-[11px] font-medium text-textPrimary outline-none"
            >
              {SECTION_SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-flex items-center gap-1.5 text-[11px] text-textSecondary">
            <input
              type="checkbox"
              checked={groupByPeriod}
              onChange={(e) => setGroupByPeriod(e.target.checked)}
              className="rounded border-borderColor"
            />
            Agrupar por jornada
          </label>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden lg:block overflow-hidden rounded-xl border border-borderColor">
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="bg-bgPrimary border-b border-borderColor text-[10px] uppercase tracking-wider text-textSecondary">
              <th className="px-3 py-2 font-semibold w-[12%]">Sección</th>
              <th className="px-3 py-2 font-semibold w-[30%]">Horario</th>
              <th className="px-3 py-2 font-semibold w-[23%]">Profesor</th>
              <th className="px-3 py-2 font-semibold w-[13%]">Modalidad</th>
              <th className="px-3 py-2 font-semibold w-[10%]">Vacantes</th>
              <th className="px-3 py-2 font-semibold w-[12%]">NRC</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <GroupRows
                key={group.key}
                group={group}
                highlightedDays={highlightedDays}
                colSpan={6}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="lg:hidden space-y-2">
        {groups.map((group) => (
          <div key={group.key} className="space-y-2">
            {group.label && (
              <p className="text-xs font-bold uppercase tracking-wide text-textSecondary pt-1">
                {group.label}
              </p>
            )}
            {group.sections.map((section) => (
              <SectionMobileCard
                key={section.id}
                section={section}
                highlightedDays={highlightedDays}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function GroupRows({ group, highlightedDays, colSpan }) {
  return (
    <>
      {group.label && (
        <tr className="bg-bgPrimary/70">
          <td
            colSpan={colSpan}
            className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-textSecondary"
          >
            {group.label}
          </td>
        </tr>
      )}
      {group.sections.map((section, idx) => (
        <SectionTableRow
          key={section.id}
          section={section}
          striped={idx % 2 === 1}
          highlightedDays={highlightedDays}
        />
      ))}
    </>
  );
}

function SectionTableRow({ section, striped, highlightedDays }) {
  const [linkedOpen, setLinkedOpen] = useState(false);
  const hasLinked = section.linkedNrcs?.length > 0;
  const hasWarnings = section.warnings?.length > 0;

  return (
    <>
      <tr
        className={`border-b border-borderColor/60 align-top hover:bg-primary/[0.03] ${
          striped ? "bg-bgPrimary/30" : "bg-bgSecondary"
        }`}
      >
        <td className="px-3 py-3">
          <div className="flex items-start gap-1">
            <span className="text-sm font-bold text-textPrimary tabular-nums">
              {section.sectionNumber}
            </span>
            {hasWarnings && (
              <span title={section.warnings.join(" · ")} className="text-amber-500">
                <AlertCircle className="h-3.5 w-3.5" aria-label="Advertencia" />
              </span>
            )}
          </div>
          {section.activityType && (
            <p className="text-[11px] text-textSecondary mt-0.5">{section.activityType}</p>
          )}
          {hasLinked && (
            <button
              type="button"
              onClick={() => setLinkedOpen((v) => !v)}
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary"
            >
              <Link2 className="h-3 w-3" aria-hidden />
              Requiere sección ligada
            </button>
          )}
        </td>
        <td className="px-3 py-3">
          <MeetingSchedule
            meetings={section.meetings}
            highlightedDays={highlightedDays}
            compact
          />
        </td>
        <td className="px-3 py-3">
          <ProfessorsCell professors={section.professors} />
        </td>
        <td className="px-3 py-3">
          <ModalityBadge modality={section.modality} />
        </td>
        <td className="px-3 py-3">
          <span
            className="text-xs text-textSecondary tabular-nums"
            title="Cantidad indicada en la programación académica. Puede no estar actualizada."
          >
            {section.capacity != null ? section.capacity : "—"}
          </span>
        </td>
        <td className="px-3 py-3">
          <NrcCopyButton nrc={section.nrc} compact />
        </td>
      </tr>
      {linkedOpen && hasLinked && (
        <tr className={striped ? "bg-bgPrimary/30" : "bg-bgSecondary"}>
          <td colSpan={6} className="px-3 pb-3 pt-0">
            <p className="text-xs text-textSecondary">
              NRC ligados:{" "}
              <span className="font-semibold text-textPrimary tabular-nums">
                {section.linkedNrcs.join(", ")}
              </span>
            </p>
          </td>
        </tr>
      )}
    </>
  );
}

function SectionMobileCard({ section, highlightedDays }) {
  const panelId = useId();
  const [linkedOpen, setLinkedOpen] = useState(false);
  const hasLinked = section.linkedNrcs?.length > 0;

  return (
    <article className="rounded-xl border border-borderColor bg-bgSecondary p-3.5 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-textPrimary tabular-nums">
            Sección {section.sectionNumber}
          </h4>
          {section.activityType && (
            <p className="text-[11px] text-textSecondary">{section.activityType}</p>
          )}
        </div>
        <ModalityBadge modality={section.modality} />
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-textSecondary mb-1">
          Horarios
        </p>
        <MeetingSchedule
          meetings={section.meetings}
          highlightedDays={highlightedDays}
        />
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-textSecondary mb-0.5">
          Profesor
        </p>
        <ProfessorsCell professors={section.professors} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-borderColor/50 text-xs text-textSecondary">
        <span title="Puede no estar actualizada.">
          {section.capacity != null
            ? `${section.capacity} vacantes informadas`
            : "Sin información"}
        </span>
        <NrcCopyButton nrc={section.nrc} />
      </div>

      {hasLinked && (
        <div>
          <button
            type="button"
            aria-expanded={linkedOpen}
            aria-controls={panelId}
            onClick={() => setLinkedOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary"
          >
            <Link2 className="h-3.5 w-3.5" aria-hidden />
            Requiere sección ligada
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${linkedOpen ? "rotate-180" : ""}`}
            />
          </button>
          {linkedOpen && (
            <p id={panelId} className="mt-1 text-xs text-textSecondary">
              NRC ligados:{" "}
              <span className="font-semibold text-textPrimary">
                {section.linkedNrcs.join(", ")}
              </span>
            </p>
          )}
        </div>
      )}
    </article>
  );
}
