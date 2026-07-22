import { useState } from "react";
import { ChevronDown, Filter } from "lucide-react";
import SectionBlockHeading from "./SectionBlockHeading";
import ProgrammingSearch from "./ProgrammingSearch";
import ActiveFilterChips from "./ActiveFilterChips";
import {
  MODALITY_LABELS,
  PERIOD_OPTIONS,
  hasActiveFilters,
  buildActiveFilterChips,
  DEFAULT_FILTERS,
} from "../services/filterCourses";
import { DAY_LABELS } from "../utils/parseMeetings";

/**
 * Bloque 2: buscar y filtrar (sticky compacto).
 */
export default function ProgrammingToolbar({ filters, options, onChange }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const active = hasActiveFilters(filters);
  const chips = buildActiveFilterChips(filters);
  const extraCount =
    (filters.activityTypes?.length || 0) +
    (filters.professorQuery ? 1 : 0) +
    (filters.schedulePresence ? 1 : 0) +
    (filters.onlyWithCapacity ? 1 : 0);

  const clearFiltersKeepQuery = () => {
    onChange({
      ...filters,
      modalities: [],
      days: [],
      periods: [],
      activityTypes: [],
      professorQuery: "",
      schedulePresence: "",
      onlyWithCapacity: false,
    });
  };

  const clearAll = () => {
    onChange({ ...DEFAULT_FILTERS, sortBy: filters.sortBy || "COURSE_CODE" });
  };

  const removeChip = (chip) => {
    const next = { ...filters };
    if (chip.group === "modalities") {
      next.modalities = (filters.modalities || []).filter((v) => v !== chip.value);
    } else if (chip.group === "days") {
      next.days = (filters.days || []).filter((v) => v !== chip.value);
    } else if (chip.group === "periods") {
      next.periods = (filters.periods || []).filter((v) => v !== chip.value);
    } else if (chip.group === "activityTypes") {
      next.activityTypes = (filters.activityTypes || []).filter((v) => v !== chip.value);
    } else if (chip.group === "professorQuery") {
      next.professorQuery = "";
    } else if (chip.group === "schedulePresence") {
      next.schedulePresence = "";
    } else if (chip.group === "onlyWithCapacity") {
      next.onlyWithCapacity = false;
    }
    onChange(next);
  };

  return (
    <section aria-labelledby="block-filters-heading" className="space-y-0">
      <SectionBlockHeading
        id="block-filters-heading"
        number={2}
        title="Buscar y filtrar opciones"
        description="Encuentra una asignatura o reduce las alternativas según tus preferencias."
      />

      <div
        className="
          sticky top-0 z-30
          rounded-2xl border border-borderColor bg-bgSecondary/95 backdrop-blur-xl
          shadow-[0_4px_16px_rgba(0,0,0,0.04)]
          p-4 sm:p-5
          space-y-3
        "
      >
        {/* Fila 1: buscador */}
        <div className="flex gap-2">
          <ProgrammingSearch
            value={filters.query}
            onChange={(query) => onChange({ ...filters, query })}
          />
          <button
            type="button"
            className="
              sm:hidden shrink-0 h-11 px-3 rounded-xl border border-borderColor
              bg-bgPrimary text-textPrimary text-sm font-semibold
              inline-flex items-center gap-1.5
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
            "
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-controls="filters-panel"
          >
            <Filter className="h-4 w-4" aria-hidden />
            Filtros
          </button>
        </div>

        {/* Fila 2: filtros principales */}
        <div
          id="filters-panel"
          className={`${mobileOpen ? "block" : "hidden"} sm:block space-y-3`}
        >
          <div className="flex flex-col lg:flex-row lg:items-end gap-2">
            <div className="grid grid-cols-1 xs:grid-cols-3 sm:grid-cols-3 gap-2 flex-1">
              <CompactSelect
                id="f-modality"
                label="Modalidad"
                value={filters.modalities?.[0] || ""}
                onChange={(v) => onChange({ ...filters, modalities: v ? [v] : [] })}
                options={[
                  { value: "", label: "Todas" },
                  ...options.modalities.map((m) => ({
                    value: m,
                    label: MODALITY_LABELS[m] || m,
                  })),
                ]}
              />
              <CompactSelect
                id="f-day"
                label="Día"
                value={filters.days?.[0] || ""}
                onChange={(v) => onChange({ ...filters, days: v ? [v] : [] })}
                options={[
                  { value: "", label: "Todos" },
                  ...options.days.map((d) => ({
                    value: d,
                    label: DAY_LABELS[d] || d,
                  })),
                ]}
              />
              <CompactSelect
                id="f-period"
                label="Jornada"
                value={filters.periods?.[0] || ""}
                onChange={(v) => onChange({ ...filters, periods: v ? [v] : [] })}
                options={[
                  { value: "", label: "Todas" },
                  ...PERIOD_OPTIONS.map((p) => ({ value: p.value, label: p.label })),
                ]}
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                aria-expanded={moreOpen}
                className="
                  h-10 px-3 rounded-xl border border-borderColor bg-bgPrimary
                  text-xs font-semibold text-textSecondary
                  inline-flex items-center gap-1.5
                  hover:text-textPrimary
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
                "
              >
                Más filtros
                {extraCount > 0 && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-white text-[10px] px-1">
                    {extraCount}
                  </span>
                )}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`}
                />
              </button>
              {active && (
                <button
                  type="button"
                  onClick={clearFiltersKeepQuery}
                  className="h-10 px-3 text-xs font-semibold text-primary hover:underline"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>

          {moreOpen && (
            <div className="rounded-xl border border-borderColor bg-bgPrimary/60 p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <CompactSelect
                id="f-activity"
                label="Tipo de actividad"
                value={filters.activityTypes?.[0] || ""}
                onChange={(v) =>
                  onChange({ ...filters, activityTypes: v ? [v] : [] })
                }
                options={[
                  { value: "", label: "Todos" },
                  ...options.activities.map((a) => ({ value: a, label: a })),
                ]}
              />
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-medium text-textSecondary">
                  Profesor
                </span>
                <input
                  type="text"
                  value={filters.professorQuery || ""}
                  onChange={(e) =>
                    onChange({ ...filters, professorQuery: e.target.value })
                  }
                  placeholder="Nombre del profesor"
                  className="w-full h-10 rounded-xl border border-borderColor bg-bgSecondary px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                />
              </label>
              <CompactSelect
                id="f-schedule"
                label="Horario"
                value={filters.schedulePresence || ""}
                onChange={(v) => onChange({ ...filters, schedulePresence: v })}
                options={[
                  { value: "", label: "Todas" },
                  { value: "WITH_SCHEDULE", label: "Con horario" },
                  { value: "WITHOUT_SCHEDULE", label: "Sin horario" },
                ]}
              />
              <label className="flex items-end gap-2 h-full pb-1.5">
                <input
                  type="checkbox"
                  checked={Boolean(filters.onlyWithCapacity)}
                  onChange={(e) =>
                    onChange({ ...filters, onlyWithCapacity: e.target.checked })
                  }
                  className="rounded border-borderColor"
                />
                <span className="text-xs text-textSecondary leading-snug">
                  Solo con vacantes informadas
                </span>
              </label>
            </div>
          )}

          {chips.length > 0 && (
            <div className="pt-1 border-t border-borderColor/60">
              <p className="text-[11px] font-medium text-textSecondary mb-2">
                Filtros activos
              </p>
              <ActiveFilterChips
                chips={chips}
                onRemove={removeChip}
                onClearAll={clearAll}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function CompactSelect({ id, label, value, onChange, options }) {
  return (
    <label htmlFor={id} className="block min-w-0">
      <span className="mb-1.5 block text-[11px] font-medium text-textSecondary">
        {label}
      </span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          w-full h-10 appearance-none rounded-xl border px-3 text-sm outline-none
          focus-visible:ring-2 focus-visible:ring-primary/20
          ${value
            ? "border-primary/35 bg-primary/5 font-medium text-textPrimary"
            : "border-borderColor bg-bgPrimary text-textPrimary"}
        `}
      >
        {options.map((opt) => (
          <option key={opt.value || "all"} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
