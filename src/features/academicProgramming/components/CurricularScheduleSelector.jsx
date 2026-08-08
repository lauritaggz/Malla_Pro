import { useState, useId } from "react";
import { ChevronDown, AlertTriangle, CheckCircle, Info, Filter } from "lucide-react";
import { getConflictsForSection } from "../services/scheduleService";
import { filterAndSortCourses, MODALITY_LABELS } from "../services/filterCourses";
import { toDisplayCourse } from "../services/academicProgressIntegration";

/**
 * Panel izquierdo del selector de horarios ("Tus asignaturas").
 */
export default function CurricularScheduleSelector({
  integration,
  selectedSectionsMap,
  selectedSectionsList,
  onSelectSection,
  onDeselectSection,
  allCourses,
  filters,
  setFilters,
  expandedCourseCode,
  onToggleCourse,
  enrolledNrcs = [],
}) {
  const [openGroups, setOpenGroups] = useState({
    recommended: true,
    previous: true,
  });

  const [showFilters, setShowFilters] = useState(false);
  const enrolledNrcSet = new Set(
    (enrolledNrcs || []).map((n) => String(n).replace(/\D/g, ""))
  );

  // Sin malla: mostrar todos los cursos del PDF / horario
  if (!integration) {
    const fallbackCourses = (allCourses || []).map((c) => ({
      ...c,
      displayCategory: "Importados",
    }));
    const filtered = filterAndSortCourses(fallbackCourses, filters);
    return (
      <aside className="w-full flex flex-col h-full min-h-0 bg-bgSecondary overflow-hidden select-none">
        <div className="p-3 sm:p-4 border-b border-borderColor shrink-0">
          <h2 className="text-sm font-black text-textPrimary uppercase tracking-wider">
            Tus asignaturas
          </h2>
          <p className="text-[11px] text-textSecondary mt-1">
            {filtered.length} ramo{filtered.length === 1 ? "" : "s"} · desde tus documentos
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2">
          {filtered.map((course) => (
            <SelectableCourseAccordion
              key={course.courseCode}
              course={course}
              selectedSectionsMap={selectedSectionsMap}
              selectedSectionsList={selectedSectionsList}
              onSelectSection={onSelectSection}
              onDeselectSection={onDeselectSection}
              allCourses={allCourses}
              expanded={expandedCourseCode === course.courseCode}
              onToggle={() =>
                onToggleCourse(
                  expandedCourseCode === course.courseCode
                    ? null
                    : course.courseCode
                )
              }
              enrolledNrcSet={enrolledNrcSet}
            />
          ))}
        </div>
      </aside>
    );
  }

  // Clasificar y filtrar cursos del PDF según la integración
  const recommended = (integration.primarySemesterCourses || [])
    .map((c) => toDisplayCourse(c, "Semestre recomendado"));
  const filteredRecommended = filterAndSortCourses(recommended, filters);

  const previous = (integration.previousPendingCourses || [])
    .map((c) => toDisplayCourse(c, "Pendiente"));
  const filteredPrevious = filterAndSortCourses(previous, filters);

  // Total de asignaturas prioritarias
  const totalRamosRelevantes = recommended.length + previous.length;
  const totalRamosSeleccionados = Object.keys(selectedSectionsMap).filter(code =>
    recommended.some(r => r.courseCode === code) || previous.some(p => p.courseCode === code)
  ).length;

  return (
    <aside className="w-full flex flex-col h-full min-h-0 bg-bgSecondary overflow-hidden select-none">
      {/* Cabecera Fija */}
      <div className="p-3 sm:p-4 border-b border-borderColor space-y-2.5 sm:space-y-3 shrink-0 bg-bgSecondary relative z-20">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-black text-textPrimary uppercase tracking-wider">
              Tus asignaturas
            </h2>
            <p className="text-[11px] text-textSecondary font-medium leading-snug mt-0.5">
              Selecciona una sección por ramo.
            </p>
          </div>
          <div className="px-2 py-1 rounded bg-bgPrimary border border-borderColor text-xs font-extrabold text-primary shrink-0 select-none">
            {totalRamosSeleccionados} de {totalRamosRelevantes}
          </div>
        </div>

        {/* Buscador y Botón de Filtros */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              value={filters.query}
              onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
              placeholder="Buscar asignatura..."
              className="w-full min-w-0 pl-3 pr-3 py-1.5 rounded-lg border border-borderColor bg-bgPrimary text-xs focus:ring-1 focus:ring-primary focus:border-primary text-textPrimary font-semibold"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(prev => !prev)}
            className={`shrink-0 px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-colors select-none btn-interactive ${
              showFilters
                ? "border-primary bg-primary/5 text-primary"
                : "border-borderColor bg-bgPrimary text-textSecondary hover:text-textPrimary"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
          </button>

          {/* Popover de Filtros Avanzados */}
          {showFilters && (
            <div className="absolute top-full left-4 right-4 z-30 bg-bgSecondary border border-borderColor rounded-xl p-4 shadow-xl mt-1 text-textPrimary space-y-4 font-semibold text-xs popover-animate">
              <div className="space-y-1.5">
                <span className="font-bold text-textSecondary uppercase text-[9px] tracking-wider">Modalidad</span>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(MODALITY_LABELS).map(([key, label]) => {
                    const isActive = filters.modalities?.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          const next = isActive
                            ? filters.modalities.filter(m => m !== key)
                            : [...(filters.modalities || []), key];
                          setFilters(prev => ({ ...prev, modalities: next }));
                        }}
                        className={`px-2 py-1 rounded border text-[10px] font-bold transition-all btn-interactive ${
                          isActive
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-borderColor bg-bgPrimary text-textSecondary hover:border-borderColor/60"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="font-bold text-textSecondary uppercase text-[9px] tracking-wider">Días</span>
                <div className="flex flex-wrap gap-1.5">
                  {["LU", "MA", "MI", "JU", "VI", "SA"].map((day) => {
                    const isActive = filters.days?.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const next = isActive
                            ? filters.days.filter(d => d !== day)
                            : [...(filters.days || []), day];
                          setFilters(prev => ({ ...prev, days: next }));
                        }}
                        className={`h-7 w-7 rounded border text-[10px] font-bold flex items-center justify-center transition-all btn-interactive ${
                          isActive
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-borderColor bg-bgPrimary text-textSecondary hover:border-borderColor/60"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFilters(prev => ({
                  ...prev,
                  query: "",
                  modalities: [],
                  days: [],
                  periods: [],
                  activityTypes: [],
                  professorQuery: "",
                  onlyWithCapacity: false,
                }))}
                className="w-full text-center py-1.5 bg-bgPrimary hover:bg-bgPrimary/60 border border-borderColor rounded-lg text-[10px] font-bold text-textSecondary hover:text-textPrimary btn-interactive"
              >
                Restablecer filtros
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Listas con Scroll Independiente */}
      <div className="flex-1 min-h-0 divide-y divide-borderColor overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-3 sm:space-y-4">
        {/* 1. Ramos Recomendados */}
        {filteredRecommended.length > 0 && (
          <GroupSection
            title={`${integration.primarySemester}.º SEMESTRE · ${recommended.length} RAMOS`}
            isOpen={openGroups.recommended}
            onToggle={() =>
              setOpenGroups((g) => ({ ...g, recommended: !g.recommended }))
            }
          >
            {filteredRecommended.map((course) => (
              <SelectableCourseAccordion
                key={course.courseCode}
                course={course}
                selectedSectionsMap={selectedSectionsMap}
                selectedSectionsList={selectedSectionsList}
                onSelectSection={onSelectSection}
                onDeselectSection={onDeselectSection}
                allCourses={allCourses}
                expanded={expandedCourseCode === course.courseCode || (filters.query?.trim() ? true : false)}
                onToggle={() => onToggleCourse(expandedCourseCode === course.courseCode ? null : course.courseCode)}
                enrolledNrcSet={enrolledNrcSet}
              />
            ))}
          </GroupSection>
        )}

        {/* 2. Pendientes Anteriores */}
        {filteredPrevious.length > 0 && (
          <GroupSection
            title={`PENDIENTES ANTERIORES · ${previous.length} RAMOS`}
            description="Ramos de semestres anteriores que aún puedes cursar."
            isOpen={openGroups.previous}
            onToggle={() => setOpenGroups((g) => ({ ...g, previous: !g.previous }))}
          >
            {filteredPrevious.map((course) => (
              <SelectableCourseAccordion
                key={course.courseCode}
                course={course}
                selectedSectionsMap={selectedSectionsMap}
                selectedSectionsList={selectedSectionsList}
                onSelectSection={onSelectSection}
                onDeselectSection={onDeselectSection}
                allCourses={allCourses}
                expanded={expandedCourseCode === course.courseCode || (filters.query?.trim() ? true : false)}
                onToggle={() => onToggleCourse(expandedCourseCode === course.courseCode ? null : course.courseCode)}
                enrolledNrcSet={enrolledNrcSet}
              />
            ))}
          </GroupSection>
        )}
      </div>
    </aside>
  );
}

function GroupSection({ title, description, isOpen, onToggle, children }) {
  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left text-[10px] font-extrabold tracking-wider text-textSecondary uppercase hover:text-textPrimary select-none btn-interactive"
      >
        <span>{title}</span>
        <ChevronDown
          className="h-3.5 w-3.5 text-textSecondary accordion-chevron"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      {description && (
        <p className="text-[10px] text-textSecondary leading-tight pl-0.5 font-medium">
          {description}
        </p>
      )}
      <div className="accordion-grid" data-open={isOpen ? "true" : "false"}>
        <div className="accordion-content">
          <div className="space-y-2.5 pt-1.5">{children}</div>
        </div>
      </div>
    </div>
  );
}

function SelectableCourseAccordion({
  course,
  selectedSectionsMap,
  selectedSectionsList,
  onSelectSection,
  onDeselectSection,
  allCourses,
  expanded,
  onToggle,
  enrolledNrcSet = new Set(),
}) {
  const courseCode = course.courseCode;
  const courseTitle = course.courseTitle;
  const sections = course.sections || [];

  const selectedSectionId = selectedSectionsMap[courseCode] || null;
  const selectedSection = sections.find((s) => s.id === selectedSectionId) || null;

  let statusLabel = "Selecciona una sección";
  let hasConflict = false;

  if (selectedSection) {
    const isConflicting = selectedSectionsList.some((s) => {
      if (s.courseCode === courseCode) return false;
      return (s.meetings || []).some((m) =>
        (selectedSection.meetings || []).some((myM) => {
          if (m.dayCode !== myM.dayCode) return false;
          const startA = timeToMinutes(m.startTime);
          const endA = timeToMinutes(m.endTime);
          const startB = timeToMinutes(myM.startTime);
          const endB = timeToMinutes(myM.endTime);
          return startA < endB && endA > startB;
        })
      );
    });

    if (isConflicting) {
      statusLabel = `Sección ${selectedSection.sectionNumber} · Con conflicto`;
      hasConflict = true;
    } else {
      statusLabel = `Sección ${selectedSection.sectionNumber} seleccionada`;
    }
  } else if (sections.length === 0) {
    statusLabel = "Sin secciones en programación";
  }

  const panelId = useId();
  const headingId = useId();

  return (
    <div
      className={`rounded-xl border transition-colors overflow-hidden ${
        selectedSection
          ? hasConflict
            ? "border-red-500/30 bg-red-500/5"
            : "border-primary bg-primary/2"
          : "border-borderColor bg-bgSecondary hover:border-borderColor/80"
      }`}
    >
      <h3 className="m-0">
        <button
          type="button"
          id={headingId}
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={onToggle}
          className="w-full flex items-start justify-between gap-2 text-left p-3 sm:p-3.5 focus-visible:outline-none focus:ring-1 focus:ring-primary/30 btn-interactive"
        >
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="text-[13px] sm:text-sm font-black text-textPrimary leading-snug break-words hyphens-auto pr-1">
              {courseTitle}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
              <span className="text-[10px] font-bold text-textSecondary uppercase tracking-wider shrink-0">
                {courseCode}
              </span>
              <span className="text-textSecondary/40 text-[9px]">•</span>
              <span
                className={`text-[10px] font-bold inline-flex items-center gap-1 min-w-0 ${
                  selectedSection
                    ? hasConflict
                      ? "text-red-600 dark:text-red-400"
                      : "text-primary"
                    : "text-textSecondary"
                }`}
              >
                {hasConflict && <AlertTriangle className="h-3 w-3 shrink-0" />}
                {!hasConflict && selectedSection && (
                  <CheckCircle className="h-3 w-3 shrink-0 text-primary" />
                )}
                <span className="truncate">{statusLabel}</span>
              </span>
            </div>
          </div>
          <ChevronDown
            className="h-4 w-4 shrink-0 text-textSecondary accordion-chevron mt-0.5"
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>
      </h3>

      <div className="accordion-grid" data-open={expanded ? "true" : "false"}>
        <div className="accordion-content">
          <div id={panelId} role="region" aria-labelledby={headingId} className="border-t border-borderColor/60 p-3 space-y-3 bg-bgSecondary">
            {sections.length === 0 ? (
              <p className="text-xs text-textSecondary py-2 text-center font-semibold">
                No hay secciones disponibles en el PDF.
              </p>
            ) : (
              <div className="space-y-2">
                {sections.map((section) => {
                  const isThisSelected = section.id === selectedSectionId;
                  const conflicts = getConflictsForSection(section, selectedSectionsList);
                  const hasCol = conflicts.length > 0;

                  const allSections = allCourses.flatMap((c) => c.sections || []);
                  const resolvedLinked = (section.linkedNrcs || [])
                    .map((nrc) => allSections.find((s) => s.nrc === nrc))
                    .filter(Boolean);
                  const unresolvedNrcs = (section.linkedNrcs || []).filter(
                    (nrc) => !allSections.some((s) => s.nrc === nrc)
                  );

                  return (
                    <SelectableSectionCard
                      key={section.id}
                      section={section}
                      isSelected={isThisSelected}
                      hasConflict={hasCol}
                      conflicts={conflicts}
                      resolvedLinked={resolvedLinked}
                      unresolvedNrcs={unresolvedNrcs}
                      enrolled={
                        Boolean(section.enrolled) ||
                        enrolledNrcSet.has(String(section.nrc || "").replace(/\D/g, ""))
                      }
                      onSelect={() => {
                        if (isThisSelected) {
                          onDeselectSection(section);
                        } else {
                          onSelectSection(section);
                        }
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectableSectionCard({
  section,
  isSelected,
  hasConflict,
  conflicts,
  resolvedLinked,
  unresolvedNrcs,
  enrolled = false,
  onSelect,
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-1.5 cursor-pointer focus-visible:outline-none focus:ring-1 focus:ring-primary/40 ${
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary/40"
          : hasConflict
          ? "border-amber-500/40 bg-amber-500/5 hover:border-amber-500/60"
          : "border-borderColor bg-bgPrimary hover:border-borderColor/80"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between w-full gap-2">
        <span className="text-xs font-extrabold text-textPrimary flex items-center gap-1.5 min-w-0">
          <span
            className={`h-3 w-3 rounded-full border flex items-center justify-center shrink-0 ${
              isSelected ? "border-primary bg-primary" : "border-textSecondary"
            }`}
          >
            {isSelected && <span className="h-1 w-1 bg-white rounded-full" />}
          </span>
          <span className="truncate">
            {section.sectionNumber
              ? `Sección ${section.sectionNumber}`
              : `NRC ${section.nrc}`}
          </span>
          {enrolled && (
            <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
              <CheckCircle className="h-2.5 w-2.5" strokeWidth={2.5} />
              Inscrito
            </span>
          )}
        </span>
        <span className="text-[10px] font-semibold text-textSecondary uppercase tracking-wide bg-bgSecondary px-1.5 py-0.5 rounded border border-borderColor shrink-0">
          {MODALITY_LABELS[section.modality] || section.modality}
        </span>
      </div>

      {section.sources?.horarioAlumno &&
        section.sources?.programacionAcademica === false && (
          <p className="pl-4.5 text-[10px] text-textSecondary italic">
            Importado desde tu horario
          </p>
        )}

      <div className="space-y-1 text-xs text-textPrimary pl-4.5 font-semibold">
        {(section.meetings || []).length === 0 ? (
          <p className="text-[10px] text-textSecondary italic flex items-center gap-1">
            <Info className="h-3 w-3" /> Horario no informado
          </p>
        ) : (
          (section.meetings || []).map((m, idx) => (
            <p key={idx}>
              {m.dayCode} {m.startTime}–{m.endTime} ·{" "}
              <span className="text-textSecondary font-normal">
                {m.location ||
                  (m.isOnline ? "Virtual" : "no informada")}
              </span>
            </p>
          ))
        )}
      </div>

      <div className="pl-4.5 text-[11px] text-textSecondary">
        <p className="font-semibold text-textPrimary/80 truncate">
          {section.professors?.join(" / ") || "Por definir"}
        </p>
      </div>

      {/* Botón Ver Detalles */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowDetails(prev => !prev);
        }}
        className="text-[10px] font-extrabold text-primary hover:underline pl-4.5 self-start select-none flex items-center gap-1 btn-interactive"
      >
        <span>{showDetails ? "Ocultar detalles" : "Ver detalles"}</span>
        <ChevronDown
          className="h-3 w-3 text-primary accordion-chevron"
          style={{ transform: showDetails ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      <div className="w-full accordion-grid" data-open={showDetails ? "true" : "false"}>
        <div className="accordion-content">
          <div className="pl-4.5 text-[10px] text-textSecondary space-y-1 mt-1 border-t border-borderColor/40 pt-2 w-full font-medium">
            <p>NRC: {section.nrc}</p>
            <p>Modalidad: {MODALITY_LABELS[section.modality] || section.modality}</p>
            {section.capacity && <p>Vacantes informadas: {section.capacity}</p>}
            {section.activityType && <p>Tipo de actividad: {section.activityType}</p>}

            {/* NRCs Ligados */}
            {section.linkedNrcs && section.linkedNrcs.length > 0 && (
              <div className="mt-2 bg-bgSecondary/60 p-2 rounded border border-borderColor space-y-1">
                <p className="font-bold text-textPrimary flex items-center gap-1">
                  <Info className="h-3 w-3 text-primary shrink-0" />
                  Requiere componentes ligados
                </p>
                <p>NRC ligados: {section.linkedNrcs.join(", ")}</p>
                {resolvedLinked.length > 0 && (
                  <p className="text-primary font-bold">
                    (+{resolvedLinked.length} componentes agregados automáticamente)
                  </p>
                )}
                {unresolvedNrcs.length > 0 && (
                  <p className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    No encontramos el detalle de uno de los NRC ligados. Revisa esta sección antes de inscribirla.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alertas de conflicto en la lista */}
      {hasConflict && !isSelected && (
        <div className="pl-4.5 text-[10px] text-amber-700 dark:text-amber-400 font-bold space-y-0.5 mt-1 border-t border-amber-500/10 pt-1.5 w-full">
          <p className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-extrabold">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Tope de horario con:
          </p>
          {conflicts.slice(0, 2).map((col, idx) => (
            <p key={idx} className="font-medium text-textSecondary">
              • {col.otherSection.courseCode} · Sec. {col.otherSection.sectionNumber} ({col.otherMeeting.dayCode} {col.otherMeeting.startTime}–{col.otherMeeting.endTime})
            </p>
          ))}
        </div>
      )}

      {isSelected && hasConflict && (
        <p className="pl-4.5 text-[10px] text-red-600 dark:text-red-400 font-bold flex items-center gap-1 mt-1 border-t border-red-500/10 pt-1.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Esta sección genera conflictos en tu horario.
        </p>
      )}
    </div>
  );
}

function timeToMinutes(time) {
  if (!time) return 0;
  const parts = String(time).split(":");
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}
