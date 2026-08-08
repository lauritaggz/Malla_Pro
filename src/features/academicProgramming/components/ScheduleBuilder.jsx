import { useState, useEffect, useMemo, useRef } from "react";
import { Check, Trash2, Save, Sparkles, ChevronDown, RefreshCw, Eye, Download, AlertTriangle } from "lucide-react";
import CurricularScheduleSelector from "./CurricularScheduleSelector";
import WeeklyScheduleGrid from "./WeeklyScheduleGrid";
import LoadedProgrammingBlock from "./LoadedProgrammingBlock";
import CurricularProgressSummary from "./CurricularProgressSummary";
import ParserWarningsPanel from "./ParserWarningsPanel";
import CourseAccordionList from "./CourseAccordionList";
import TomaDeRamosStepper from "./TomaDeRamosStepper";
import MallaProgressHint from "./MallaProgressHint";
import { getSelectionConflicts } from "../services/scheduleService";
import { toDisplayCourse } from "../services/academicProgressIntegration";
import { generateSchedulePdf } from "../utils/generateSchedulePdf";
import {
  buildRegistrationState,
  clearCourseRegistration,
  saveCourseRegistration,
} from "../services/persistence";
import { getPeriodId, getPeriodLabel } from "../../../utils/storageKeys";
import { getUserSafeMessage } from "../../../utils/appErrors";

export default function ScheduleBuilder({
  integration,
  programming,
  allCourses,
  filters,
  setFilters,
  filterOptions,
  onChangePdf,
  onClearSavedPlanning,
  mallaName,
  mallaSeleccionada,
  fileMetadata,
  studentScheduleMeta = null,
  enrolledNrcs = [],
  studentScheduleRamos = [],
  careerId,
  warningsOpen,
  setWarningsOpen,
  totalCourseCount,
  totalSectionCount,
  modalityCount,
  warningCount,
  initialSelectedMap,
  onSelectedMapChange,
}) {
  const [selectedSectionsMap, setSelectedSectionsMap] = useState(() =>
    initialSelectedMap && typeof initialSelectedMap === "object"
      ? { ...initialSelectedMap }
      : {}
  );
  const enrolledNrcSet = useMemo(
    () => new Set((enrolledNrcs || []).map((n) => String(n).replace(/\D/g, ""))),
    [enrolledNrcs]
  );
  const showFullDay = false;
  const [activeMobileTab, setActiveMobileTab] = useState("SECTIONS");
  const [selectedMobileDay, setSelectedMobileDay] = useState("LU");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [proposalSaved, setProposalSaved] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const saveTimerRef = useRef(null);
  const restoredOnceRef = useRef(false);
  const periodLabel = getPeriodLabel(programming);

  // Acordeón exclusivo: solo una asignatura expandida a la vez
  const [expandedCourseCode, setExpandedCourseCode] = useState(null);

  // Estado de los acordeones secundarios del pie de página
  const [openSecInfo, setOpenSecInfo] = useState({
    progress: false,
    blocked: false,
    others: false,
    approved: false,
    unmatched: false,
    pdfInfo: false,
    warnings: false,
  });

  const [expandedSecondaryCodes, setExpandedSecondaryCodes] = useState(new Set());

  const toggleSecondaryCourse = (code) => {
    setExpandedSecondaryCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const toggleSecInfo = (key) => {
    setOpenSecInfo((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Restaurar selección inicial
  useEffect(() => {
    if (!initialSelectedMap || restoredOnceRef.current) return;
    const allPdfSections = allCourses.flatMap((c) => c.sections || []);
    if (!allPdfSections.length) return;

    const restored = {};
    let missing = 0;
    for (const [courseCode, sectionId] of Object.entries(initialSelectedMap)) {
      if (allPdfSections.some((s) => s.id === sectionId)) {
        restored[courseCode] = sectionId;
      } else {
        missing += 1;
      }
    }
    setSelectedSectionsMap(restored);
    restoredOnceRef.current = true;
    if (Object.keys(restored).length > 0) {
      setFeedbackMessage(
        missing > 0
          ? `Recuperamos tu planificación guardada. ${missing} sección(es) ya no están disponibles.`
          : "Recuperamos tu planificación guardada en este navegador."
      );
      const t = setTimeout(() => setFeedbackMessage(""), 5000);
      return () => clearTimeout(t);
    }
  }, [initialSelectedMap, allCourses]);

  // Notificar cambios de selección al contenedor (para re-merge)
  useEffect(() => {
    onSelectedMapChange?.(selectedSectionsMap);
  }, [selectedSectionsMap, onSelectedMapChange]);

  // Autoguardado con debounce
  useEffect(() => {
    if (!programming || !mallaSeleccionada) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(() => {
      const draft = buildRegistrationState({
        malla: mallaSeleccionada,
        programming,
        selectedSectionsMap,
        activeFilters: filters,
        fileMetadata,
        enrolledNrcs,
        studentScheduleMeta,
        studentScheduleRamos: Array.isArray(studentScheduleRamos)
          ? studentScheduleRamos
          : [],
      });
      if (!draft) return;
      const result = saveCourseRegistration(
        mallaSeleccionada,
        getPeriodId(programming),
        draft
      );
      if (!result.ok) {
        setFeedbackMessage(result.userMessage || getUserSafeMessage("STORAGE_QUOTA"));
        setTimeout(() => setFeedbackMessage(""), 5000);
      } else {
        setProposalSaved(true);
      }
    }, 450);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [
    programming,
    mallaSeleccionada,
    selectedSectionsMap,
    filters,
    fileMetadata,
    enrolledNrcs,
    studentScheduleMeta,
    studentScheduleRamos,
  ]);

  // Lista de objetos de sección seleccionados
  const selectedSectionsList = useMemo(() => {
    const list = [];
    const allPdfSections = allCourses.flatMap((c) => c.sections || []);

    for (const [courseCode, sectionId] of Object.entries(selectedSectionsMap)) {
      const found = allPdfSections.find((s) => s.id === sectionId);
      if (found) {
        list.push({ ...found, courseCode });
      }
    }
    return list;
  }, [selectedSectionsMap, allCourses]);

  // Conflictos activos en el horario construido
  const conflicts = useMemo(() => {
    return getSelectionConflicts(selectedSectionsList);
  }, [selectedSectionsList]);

  // Mapa de códigos a créditos desde integración
  const courseCodeToCurriculumMap = useMemo(() => {
    const map = new Map();
    if (!integration) return map;

    const categories = [
      ...(integration.primarySemesterCourses || []),
      ...(integration.previousPendingCourses || []),
      ...(integration.primaryBlockedCourses || []),
      ...(integration.previousBlockedCourses || []),
      ...(integration.futureEligibleCourses || []),
      ...(integration.futureBlockedCourses || []),
      ...(integration.completedCourses || []),
      ...(integration.inProgressCourses || []),
    ];

    for (const item of categories) {
      if (item.programmingCourse?.courseCode && item.curriculumCourse) {
        map.set(item.programmingCourse.courseCode, item.curriculumCourse);
      }
    }
    return map;
  }, [integration]);

  const totalCredits = useMemo(() => {
    return selectedSectionsList.reduce((acc, sec) => {
      const curriculum = courseCodeToCurriculumMap.get(sec.courseCode);
      return acc + (curriculum?.sct ?? 0);
    }, 0);
  }, [selectedSectionsList, courseCodeToCurriculumMap]);

  // Clasificación de asignaturas secundarias
  const blockedCourses = useMemo(() => {
    if (!integration) return [];
    return [
      ...(integration.primaryBlockedCourses || []),
      ...(integration.previousBlockedCourses || []),
      ...(integration.futureBlockedCourses || []),
    ].map((c) => toDisplayCourse(c, "Bloqueado"));
  }, [integration]);

  const otherCourses = useMemo(() => {
    if (!integration) return [];
    return (integration.futureEligibleCourses || []).map((c) =>
      toDisplayCourse(c, "Otros")
    );
  }, [integration]);

  const completedAndInProgress = useMemo(() => {
    if (!integration) return [];
    return [
      ...(integration.completedCourses || []),
      ...(integration.inProgressCourses || []),
    ].map((c) => toDisplayCourse(c, "Aprobado / Cursando"));
  }, [integration]);

  const unmatchedCourses = useMemo(() => {
    if (!integration) return [];
    return (integration.unmatchedCourses || []).map((c) => ({
      ...c,
      totalSectionCount: c.sections?.length || 0,
      filteredSectionCount: c.sections?.length || 0,
      _integration: {
        category: "UNMATCHED",
        semester: null,
        badge: "No asociado",
        isEligible: true,
        missingPrerequisites: [],
        curriculumCourse: null,
      },
    }));
  }, [integration]);

  const handleSelectSection = (section) => {
    const code = section.courseCode;

    const allPdfSections = allCourses.flatMap((c) => c.sections || []);
    const resolvedLinked = [];
    const queue = [...(section.linkedNrcs || [])];
    const visited = new Set([section.id]);

    for (let i = 0; i < queue.length; i++) {
      const nrc = queue[i];
      const found = allPdfSections.find((s) => s.nrc === nrc);
      if (found && !visited.has(found.id)) {
        visited.add(found.id);
        resolvedLinked.push(found);
        if (found.linkedNrcs) {
          queue.push(...found.linkedNrcs.filter((n) => !queue.includes(n)));
        }
      }
    }

    setSelectedSectionsMap((prev) => {
      const next = { ...prev };
      next[code] = section.id;
      for (const linked of resolvedLinked) {
        next[linked.courseCode] = linked.id;
      }
      return next;
    });

    setFeedbackMessage(`Se eligió la Sección ${section.sectionNumber} de ${code}.`);
    setProposalSaved(false);
    setTimeout(() => setFeedbackMessage(""), 3500);
  };

  const handleDeselectSection = (section) => {
    const code = section.courseCode;

    setSelectedSectionsMap((prev) => {
      const next = { ...prev };
      delete next[code];

      const allPdfSections = allCourses.flatMap((c) => c.sections || []);
      const queue = [...(section.linkedNrcs || [])];
      const visited = new Set([section.id]);

      for (let i = 0; i < queue.length; i++) {
        const nrc = queue[i];
        const found = allPdfSections.find((s) => s.nrc === nrc);
        if (found && !visited.has(found.id)) {
          visited.add(found.id);
          if (next[found.courseCode] === found.id) {
            delete next[found.courseCode];
          }
          if (found.linkedNrcs) {
            queue.push(...found.linkedNrcs.filter((n) => !queue.includes(n)));
          }
        }
      }
      return next;
    });

    setFeedbackMessage(`Se quitó la Sección ${section.sectionNumber} del horario.`);
    setProposalSaved(false);
    setTimeout(() => setFeedbackMessage(""), 3500);
  };

  const handleClearSchedule = () => {
    if (selectedSectionsList.length === 0) return;
    if (window.confirm("¿Seguro que deseas limpiar todas las selecciones de tu horario?")) {
      setSelectedSectionsMap({});
      setFeedbackMessage("Horario limpio.");
      setProposalSaved(false);
      setTimeout(() => setFeedbackMessage(""), 3000);
    }
  };

  const handleSaveProposal = () => {
    const draft = buildRegistrationState({
      malla: mallaSeleccionada,
      programming,
      selectedSectionsMap,
      activeFilters: filters,
      fileMetadata,
    });
    if (!draft) {
      setFeedbackMessage(getUserSafeMessage("UNEXPECTED"));
      setTimeout(() => setFeedbackMessage(""), 4500);
      return;
    }

    const result = saveCourseRegistration(
      mallaSeleccionada,
      getPeriodId(programming),
      draft
    );
    if (!result.ok) {
      setFeedbackMessage(result.userMessage || getUserSafeMessage("STORAGE_QUOTA"));
      setTimeout(() => setFeedbackMessage(""), 4500);
      return;
    }

    setFeedbackMessage("Propuesta de horario guardada con éxito.");
    setProposalSaved(true);
    setTimeout(() => setFeedbackMessage(""), 4500);
  };

  const handleClearSavedPlanning = () => {
    if (
      !window.confirm(
        "¿Eliminar la planificación guardada de este periodo? No se borrarán tus ramos aprobados ni el avance de la malla."
      )
    ) {
      return;
    }
    clearCourseRegistration(mallaSeleccionada, getPeriodId(programming));
    if (typeof onClearSavedPlanning === "function") {
      onClearSavedPlanning();
    } else {
      setSelectedSectionsMap({});
      setFeedbackMessage("Planificación guardada eliminada.");
      setTimeout(() => setFeedbackMessage(""), 3500);
    }
  };

  // Exportar horario a PDF vectorial
  const handleExportPdf = async () => {
    if (selectedSectionsList.length === 0) return;
    setIsExportingPdf(true);
    try {
      const careerName =
        programming?.curriculum?.careerName || mallaName || "Malla Pro";

      await generateSchedulePdf({
        selectedSectionsList,
        conflicts,
        programming,
        totalCredits,
        careerName,
        periodLabel,
      });

      setFeedbackMessage("Horario exportado correctamente.");
      setTimeout(() => setFeedbackMessage(""), 4500);
    } catch (err) {
      if (import.meta.env.DEV) console.error(err);
      setFeedbackMessage("No pudimos generar el PDF del horario. Intenta nuevamente.");
      setTimeout(() => setFeedbackMessage(""), 4500);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Metadatos para la barra resumen del encabezado
  const busyDays = new Set(
    selectedSectionsList
      .flatMap((s) => s.meetings || [])
      .filter((m) => m.dayCode && m.startTime && m.endTime)
      .map((m) => m.dayCode)
  );

  const step = proposalSaved ? 4 : selectedSectionsList.length > 0 ? 3 : 2;
  return (
    <div className="space-y-3 md:space-y-6">
      <TomaDeRamosStepper currentStep={step} />
      <MallaProgressHint />

      {/* 1. Encabezado Compacto */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between sm:gap-3 pb-2.5 md:pb-3 border-b border-borderColor select-none">
        <div className="space-y-0.5 min-w-0">
          <h1 className="text-lg sm:text-2xl font-black text-textPrimary tracking-tight">
            Arma tu horario
          </h1>
          <p className="text-[11px] sm:text-sm text-textSecondary leading-snug">
            Selecciona una sección para cada asignatura.
            {integration && (
              <span className="text-textSecondary/80">
                {" "}
                · {integration.primarySemester}.º semestre ·{" "}
                {integration.primarySemesterCourses?.length || 0} recomendados
                {integration.previousPendingCourses?.length > 0
                  ? ` · ${integration.previousPendingCourses.length} arrastre`
                  : ""}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs font-semibold text-textSecondary">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-textSecondary/80 mr-0.5">
            {periodLabel}
          </span>
          <button
            type="button"
            onClick={onChangePdf}
            className="inline-flex items-center gap-1 px-2 py-1.5 sm:px-2.5 rounded-lg border border-borderColor hover:bg-bgPrimary text-[11px] font-bold text-textSecondary transition-colors hover:text-textPrimary bg-bgSecondary btn-interactive"
          >
            <RefreshCw className="h-3 w-3 shrink-0" />
            <span className="sm:hidden">Cambiar PDF</span>
            <span className="hidden sm:inline">Cambiar programación</span>
          </button>
          <button
            type="button"
            onClick={handleClearSavedPlanning}
            className="inline-flex items-center gap-1 px-2 py-1.5 sm:px-2.5 rounded-lg border border-red-500/25 text-[11px] font-bold text-red-500 hover:bg-red-500/10 transition-colors bg-bgSecondary"
            title="Eliminar planificación guardada"
          >
            <Trash2 className="h-3 w-3 shrink-0" />
            <span className="sm:hidden">Eliminar</span>
            <span className="hidden sm:inline">Eliminar planificación guardada</span>
          </button>
        </div>
      </div>

      {/* Alerta de Feedback */}
      {feedbackMessage && (
        <div className="bg-primary/10 border border-primary/20 text-primary px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-semibold animate-fade-in relative flex items-start sm:items-center justify-between gap-2">
          <span className="min-w-0 leading-snug">{feedbackMessage}</span>
          <button
            type="button"
            onClick={() => setFeedbackMessage("")}
            className="shrink-0 text-textSecondary hover:text-textPrimary font-bold underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Tabs Móviles */}
      <div className="md:hidden flex border border-borderColor bg-bgSecondary rounded-xl select-none overflow-hidden">
        <button
          type="button"
          onClick={() => setActiveMobileTab("SECTIONS")}
          className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition-all ${
            activeMobileTab === "SECTIONS"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-textSecondary hover:text-textPrimary"
          }`}
        >
          Tus asignaturas
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab("SCHEDULE")}
          className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition-all relative ${
            activeMobileTab === "SCHEDULE"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-textSecondary hover:text-textPrimary"
          }`}
        >
          Mi horario
          {selectedSectionsList.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center bg-primary text-white text-[10px] font-extrabold h-4 min-w-4 px-1 rounded-full">
              {selectedSectionsList.length}
            </span>
          )}
        </button>
      </div>

      {/* 2. Área Principal de Trabajo */}
      <div
        className="border border-borderColor bg-bgSecondary rounded-2xl overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-[minmax(320px,410px)_minmax(0,1fr)] divide-y md:divide-y-0 md:divide-x divide-borderColor
          max-md:h-[min(62dvh,520px)] max-md:min-h-[280px]
          md:h-[72vh] md:min-h-[560px] md:max-h-[850px]"
      >
        {/* Columna Izquierda: Tus Asignaturas */}
        <div
          className={`h-full flex flex-col overflow-hidden ${
            activeMobileTab !== "SECTIONS" ? "max-md:hidden" : ""
          }`}
        >
          <CurricularScheduleSelector
            integration={integration}
            selectedSectionsMap={selectedSectionsMap}
            selectedSectionsList={selectedSectionsList}
            onSelectSection={handleSelectSection}
            onDeselectSection={handleDeselectSection}
            allCourses={allCourses}
            filters={filters}
            setFilters={setFilters}
            filterOptions={filterOptions}
            expandedCourseCode={expandedCourseCode}
            onToggleCourse={setExpandedCourseCode}
            enrolledNrcs={enrolledNrcs}
          />
        </div>

        {/* Columna Derecha: Tu Horario */}
        <div
          className={`h-full flex flex-col overflow-hidden bg-bgPrimary/10 ${
            activeMobileTab !== "SCHEDULE" ? "max-md:hidden" : ""
          }`}
        >
          {/* Header del horario sticky unificado */}
          <div className="bg-bgSecondary border-b border-borderColor px-3 py-2.5 sm:px-4 sm:py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-3 z-10 shrink-0 select-none">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-black text-textPrimary uppercase tracking-wider">
                  Tu horario
                </h2>
                {conflicts.length > 0 && (
                  <span className="inline-flex items-center gap-1 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded text-[10px] font-extrabold animate-pulse">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {conflicts.length} {conflicts.length === 1 ? "tope" : "topes"} por resolver
                  </span>
                )}
              </div>
              <p className="text-[11px] font-semibold text-textSecondary leading-snug">
                {selectedSectionsList.length} {selectedSectionsList.length === 1 ? "ramo" : "ramos"}
                <span className="text-borderColor mx-1">·</span>
                {totalCredits} créditos
                <span className="text-borderColor mx-1">·</span>
                {busyDays.size} {busyDays.size === 1 ? "día" : "días"}
                <span className="hidden sm:inline">
                  <span className="text-borderColor mx-1">·</span>
                  {conflicts.length === 0 ? "Sin conflictos" : `${conflicts.length} conflicto(s)`}
                </span>
              </p>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-3 flex-wrap">

              {/* Botones de acción */}
              <div className="flex items-center gap-1.5">
                {selectedSectionsList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearSchedule}
                    className="px-2.5 py-1.5 rounded-lg border border-borderColor hover:bg-bgPrimary text-[10px] font-bold text-textSecondary hover:text-textPrimary bg-bgSecondary btn-interactive"
                  >
                    Limpiar
                  </button>
                )}
                <button
                  type="button"
                  disabled={selectedSectionsList.length === 0 || isExportingPdf}
                  onClick={handleExportPdf}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-borderColor hover:bg-bgPrimary text-[10px] font-bold text-textSecondary disabled:opacity-50 disabled:pointer-events-none transition-all btn-interactive bg-bgSecondary"
                >
                  <Download className="h-3.5 w-3.5" />
                  {isExportingPdf ? "Exportando..." : "Exportar PDF"}
                </button>
                <button
                  type="button"
                  onClick={handleSaveProposal}
                  disabled={selectedSectionsList.length === 0}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold text-white transition-colors disabled:opacity-50 disabled:pointer-events-none btn-interactive ${
                    proposalSaved
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-primary hover:brightness-110"
                  }`}
                >
                  {proposalSaved ? <Check className="h-3.5 w-3.5 inline mr-0.5" /> : <Save className="h-3.5 w-3.5 inline mr-0.5" />}
                  {proposalSaved ? "Guardado" : "Guardar"}
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            <WeeklyScheduleGrid
              selectedSectionsList={selectedSectionsList}
              onDeselectSection={handleDeselectSection}
              showFullDay={showFullDay}
              conflicts={conflicts}
              selectedMobileDay={selectedMobileDay}
              setSelectedMobileDay={setSelectedMobileDay}
              integration={integration}
            />
          </div>
        </div>
      </div>

      {/* 3. Información Secundaria Colapsada */}
      <div className="pt-4 md:pt-8 border-t border-borderColor mt-4 md:mt-8 space-y-3 md:space-y-4">
        <h2 className="text-xs font-bold text-textSecondary uppercase tracking-widest flex items-center gap-1.5">
          <Eye className="h-4 w-4" /> Más información y otras asignaturas
        </h2>

        <div className="grid grid-cols-1 gap-3">
          {/* A1: Detalles de tu avance curricular */}
          <SecondaryAccordion
            title="Detalles de tu avance curricular"
            isOpen={openSecInfo.progress}
            onToggle={() => toggleSecInfo("progress")}
          >
            <CurricularProgressSummary
              primarySemester={integration?.primarySemester || 1}
              primarySummary={integration?.primarySummary || null}
              previousPendingCount={integration?.previousPendingCount || 0}
              hasCurriculum={integration?.hasCurriculum || false}
              mallaName={mallaName}
            />
          </SecondaryAccordion>

          {/* A2: Ramos bloqueados */}
          {blockedCourses.length > 0 && (
            <SecondaryAccordion
              title={`Ramos bloqueados (${blockedCourses.length})`}
              isOpen={openSecInfo.blocked}
              onToggle={() => toggleSecInfo("blocked")}
            >
              <p className="text-xs text-textSecondary mb-3">
                Asignaturas que no puedes cursar todavía porque no cumples con sus prerrequisitos.
              </p>
              <CourseAccordionList
                courses={blockedCourses}
                expandedCodes={expandedSecondaryCodes}
                onToggle={toggleSecondaryCourse}
              />
            </SecondaryAccordion>
          )}

          {/* A3: Otros ramos disponibles */}
          {otherCourses.length > 0 && (
            <SecondaryAccordion
              title={`Otros ramos disponibles (${otherCourses.length})`}
              isOpen={openSecInfo.others}
              onToggle={() => toggleSecInfo("others")}
            >
              <p className="text-xs text-textSecondary mb-3">
                Asignaturas de semestres superiores que se encuentran habilitadas para tomar.
              </p>
              <CourseAccordionList
                courses={otherCourses}
                expandedCodes={expandedSecondaryCodes}
                onToggle={toggleSecondaryCourse}
              />
            </SecondaryAccordion>
          )}

          {/* A4: Ramos ya aprobados y cursando */}
          {completedAndInProgress.length > 0 && (
            <SecondaryAccordion
              title={`Ramos ya aprobados o en curso (${completedAndInProgress.length})`}
              isOpen={openSecInfo.approved}
              onToggle={() => toggleSecInfo("approved")}
            >
              <CourseAccordionList
                courses={completedAndInProgress}
                expandedCodes={expandedSecondaryCodes}
                onToggle={toggleSecondaryCourse}
              />
            </SecondaryAccordion>
          )}

          {/* A5: Asignaturas no asociadas a tu malla */}
          {unmatchedCourses.length > 0 && (
            <SecondaryAccordion
              title={`Asignaturas fuera de malla (${unmatchedCourses.length})`}
              isOpen={openSecInfo.unmatched}
              onToggle={() => toggleSecInfo("unmatched")}
            >
              <p className="text-xs text-textSecondary mb-3">
                Cursos de la programación cargada que no se encontraron dentro de la malla activa.
              </p>
              <CourseAccordionList
                courses={unmatchedCourses}
                expandedCodes={expandedSecondaryCodes}
                onToggle={toggleSecondaryCourse}
              />
            </SecondaryAccordion>
          )}

          {/* A6: Información de la programación cargada */}
          <SecondaryAccordion
            title="Información del documento importado"
            isOpen={openSecInfo.pdfInfo}
            onToggle={() => toggleSecInfo("pdfInfo")}
          >
            <LoadedProgrammingBlock
              programming={programming}
              courseCount={totalCourseCount}
              sectionCount={totalSectionCount}
              modalityCount={modalityCount}
              warningCount={warningCount}
              warningsOpen={warningsOpen}
              onWarningsOpenChange={setWarningsOpen}
            />
          </SecondaryAccordion>

          {/* A7: Advertencias de importación */}
          {warningCount > 0 && (
            <SecondaryAccordion
              title={`Advertencias del parser (${warningCount})`}
              isOpen={openSecInfo.warnings}
              onToggle={() => toggleSecInfo("warnings")}
            >
              <ParserWarningsPanel warnings={programming.warnings} />
            </SecondaryAccordion>
          )}
        </div>
      </div>
    </div>
  );
}

function SecondaryAccordion({ title, isOpen, onToggle, children }) {
  return (
    <div className="border border-borderColor rounded-xl overflow-hidden bg-bgSecondary">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left px-4 py-3 hover:bg-bgPrimary transition-colors focus-visible:outline-none focus:ring-1 focus:ring-primary/30 select-none btn-interactive"
      >
        <span className="text-xs font-bold text-textPrimary uppercase tracking-wider">{title}</span>
        <ChevronDown
          className="h-4 w-4 text-textSecondary accordion-chevron"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      <div className="accordion-grid" data-open={isOpen ? "true" : "false"}>
        <div className="accordion-content">
          <div className="p-4 border-t border-borderColor/60 bg-bgPrimary/20">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
