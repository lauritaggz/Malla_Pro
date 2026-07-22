import React, { useState, useEffect, useMemo, useCallback } from "react";
import { BookOpen, ClipboardCheck, Clock, User, Copy, HelpCircle, CheckCircle2, NotebookPen } from "lucide-react";
import CourseDrawer from "./CourseDrawer";
import { safeStorage } from "../utils/safeStorage";
import { LEGACY_KEYS } from "../utils/storageKeys";

const NOTES_KEY = LEGACY_KEYS.notas;
const PROPOSAL_KEY = LEGACY_KEYS.propuesta;

function formatSectionLabel(section) {
  if (!section) return null;
  if (section.sectionNumber != null && String(section.sectionNumber).trim() !== "") {
    return `Sección ${section.sectionNumber}`;
  }
  const id = String(section.sectionId || "");
  const pipeParts = id.split("|");
  if (pipeParts.length >= 4 && pipeParts[3]) {
    return `Sección ${pipeParts[3]}`;
  }
  const legacy = id.match(/_Secci[oó]n_(.+)$/i);
  if (legacy?.[1]) return `Sección ${legacy[1]}`;
  return "Sección";
}

function formatTeacher(teacher) {
  if (!teacher) return null;
  if (Array.isArray(teacher)) {
    const names = teacher.map((t) => (typeof t === "string" ? t : t?.name)).filter(Boolean);
    return names.length ? names.join(" · ") : null;
  }
  return String(teacher);
}

function formatScheduleLine(section) {
  if (!section) return null;
  if (section.scheduleSummary) return section.scheduleSummary;
  const meetings = section.meetings;
  if (Array.isArray(meetings) && meetings.length > 0) {
    return meetings
      .map((m) => {
        const day = m.dayCode || m.day || "";
        const start = m.startTime || "";
        const end = m.endTime || "";
        if (day && start && end) return `${day} ${start}–${end}`;
        if (day && start) return `${day} ${start}`;
        return day || start || null;
      })
      .filter(Boolean)
      .join(" · ");
  }
  return "Horario no definido";
}

export default function PeriodoActualView({
  cursando = [],
  aprobados = [],
  excepciones = [],
  setCursando,
  setAprobados,
  setExcepciones,
  getCursoById,
  onAbrirNotas,
  modoExcepcional,
  mallaData,
}) {
  const [activeTab, setActiveTab] = useState("cursos");
  const [notas, setNotas] = useState({});
  const [proposal, setProposal] = useState(null);
  const [copiedNrc, setCopiedNrc] = useState(null);
  const [selectedCurso, setSelectedCurso] = useState(null);

  const loadData = useCallback(() => {
    const notes = safeStorage.get(NOTES_KEY, {});
    setNotas(notes && typeof notes === "object" ? notes : {});
    setProposal(safeStorage.get(PROPOSAL_KEY, null));
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener("notasModificadas", loadData);
    return () => {
      window.removeEventListener("notasModificadas", loadData);
    };
  }, [loadData]);

  const copyToClipboard = (text, courseId) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedNrc(courseId);
    setTimeout(() => setCopiedNrc(null), 2500);
  };

  const getAllCursos = useCallback(() => {
    if (!mallaData) return [];
    if (!mallaData.isMencion) {
      return mallaData.semestres?.flatMap((s) => s.cursos) || [];
    }
    const fromMenciones = Object.values(mallaData.menciones || {}).flatMap((m) =>
      m.semestres?.flatMap((s) => s.cursos) || []
    );
    return [...(mallaData.semestresComunes?.flatMap((s) => s.cursos) || []), ...fromMenciones];
  }, [mallaData]);

  const getDescendientes = (id, todasLasMallas) => {
    const hijos = todasLasMallas.filter(c => c.prerrequisitos?.includes(id));
    let descendientes = [...hijos.map(h => h.id)];
    hijos.forEach(h => {
      descendientes = [...descendientes, ...getDescendientes(h.id, todasLasMallas)];
    });
    return Array.from(new Set(descendientes));
  };

  // State mutations
  const handleAprobar = (id) => {
    const nextAprobados = aprobados.includes(id)
      ? aprobados.filter((a) => a !== id && !getDescendientes(id, getAllCursos()).includes(a))
      : [...aprobados, id];
    
    setAprobados?.(nextAprobados);
    safeStorage.set(LEGACY_KEYS.aprobados, nextAprobados);
    
    const nextCursando = cursando.filter((c) => c !== id);
    setCursando?.(nextCursando);
    safeStorage.set(LEGACY_KEYS.cursando, nextCursando);
    
    window.dispatchEvent(new CustomEvent("malla-progress-changed"));
  };

  const handleMarcarExcepcional = (id) => {
    const isRemoving = excepciones.includes(id);
    const nextExcepciones = isRemoving
      ? excepciones.filter((e) => e !== id)
      : [...excepciones, id];
    
    setExcepciones?.(nextExcepciones);
    safeStorage.set(LEGACY_KEYS.excepciones, nextExcepciones);

    const nextAprobados = isRemoving
      ? aprobados.filter((a) => a !== id)
      : [...aprobados, id];
    setAprobados?.(nextAprobados);
    safeStorage.set(LEGACY_KEYS.aprobados, nextAprobados);

    if (!isRemoving) {
      const nextCursando = cursando.filter((c) => c !== id);
      setCursando?.(nextCursando);
      safeStorage.set(LEGACY_KEYS.cursando, nextCursando);
    }
    
    window.dispatchEvent(new CustomEvent("malla-progress-changed"));
  };

  const handleToggleCursando = (id) => {
    const nextCursando = cursando.includes(id)
      ? cursando.filter((c) => c !== id)
      : [...cursando, id];
    
    setCursando?.(nextCursando);
    safeStorage.set(LEGACY_KEYS.cursando, nextCursando);
    
    window.dispatchEvent(new CustomEvent("malla-progress-changed"));
  };

  const cumplePrereqs = useCallback((curso) => {
    if (!curso?.prerrequisitos?.length) return true;
    return curso.prerrequisitos.every(
      (pre) => aprobados.includes(pre) || excepciones.includes(pre)
    );
  }, [aprobados, excepciones]);

  // Cursando courses details calculation
  const cursandoDetails = useMemo(() => {
    return cursando.map((courseId) => {
      const course = getCursoById?.(courseId) || { id: courseId, nombre: "Asignatura", codigo: courseId };
      const evals = notas[courseId] || [];
      const conNota = evals.filter((e) => e.nota != null && !isNaN(e.nota));
      const pesoTotal = conNota.reduce((sum, e) => sum + (e.peso || 0), 0);
      
      let average = null;
      if (pesoTotal > 0) {
        average = conNota.reduce((sum, e) => sum + e.nota * e.peso, 0) / pesoTotal;
      }

      const matchedSection = proposal?.selectedSections?.find((s) => s.courseCode === course.codigo);

      return {
        course,
        average,
        evalsCount: evals.length,
        gradedCount: conNota.length,
        section: matchedSection,
      };
    });
  }, [cursando, getCursoById, notas, proposal]);

  // Group evaluations of cursando courses
  const evaluationsList = useMemo(() => {
    const list = [];
    cursandoDetails.forEach(({ course }) => {
      const evals = notas[course.id] || [];
      evals.forEach((ev) => {
        list.push({
          ...ev,
          courseName: course.nombre,
          courseCode: course.codigo,
        });
      });
    });
    return list;
  }, [cursandoDetails, notas]);

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full">
      <div
        className="flex flex-col flex-1 min-h-0 w-full mx-auto pb-8"
        style={{ maxWidth: 960, paddingInline: 24 }}
      >
        {/* Title Header */}
        <div className="flex flex-col gap-1 py-5 mb-1 select-none shrink-0">
          <h1 className="text-xl sm:text-2xl font-extrabold text-textPrimary leading-none m-0">
            Periodo actual
          </h1>
          <p className="text-xs text-textSecondary font-medium m-0 mt-1.5">
            {cursando.length} {cursando.length === 1 ? "asignatura activa" : "asignaturas activas"}
            {proposal?.academicPeriod ? ` · ${proposal.academicPeriod}` : ""}
          </p>
        </div>

        {/* Tabs */}
        <div
          className="flex bg-bgSecondary/60 p-0.5 rounded-xl border border-borderColor/40 mb-6 select-none shrink-0"
          style={{ maxWidth: 280 }}
          role="tablist"
          aria-label="Secciones del periodo"
        >
          {[
            { id: "cursos", label: "Asignaturas", icon: <BookOpen className="w-3.5 h-3.5" /> },
            { id: "evals", label: "Evaluaciones", icon: <ClipboardCheck className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 border-0 cursor-pointer
                ${activeTab === tab.id
                  ? "bg-primary text-white shadow-sm"
                  : "bg-transparent text-textSecondary hover:text-textPrimary"}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Panels */}
        <div className="flex-1 min-h-0 flex flex-col">
          {cursando.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none py-16 bg-bgSecondary/25 border border-dashed border-borderColor/80 rounded-2xl">
              <BookOpen className="w-10 h-10 text-textSecondary/50 mb-3" />
              <h3 className="text-sm font-bold text-textPrimary m-0">No estás cursando asignaturas</h3>
              <p className="text-xs text-textSecondary max-w-xs mt-1.5 m-0">
                Marca ramos como &quot;Cursando&quot; en tu malla curricular para gestionarlos y simular sus calificaciones.
              </p>
            </div>
          ) : (
            <>
              {/* ── Tab: Asignaturas ── */}
              {activeTab === "cursos" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {cursandoDetails.map(({ course, average, evalsCount, gradedCount, section }) => {
                    const sectionLabel = formatSectionLabel(section);
                    const teacherLabel = formatTeacher(section?.teacher);
                    const scheduleLabel = formatScheduleLine(section);
                    const credits =
                      course.sct != null
                        ? `${course.sct} SCT`
                        : course.creditos != null
                          ? `${course.creditos} créditos`
                          : null;

                    return (
                      <article
                        key={course.id}
                        onClick={() => setSelectedCurso(course)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedCurso(course);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`${course.nombre}. Abrir detalle.`}
                        className="curso-card-base cursor-pointer p-4 sm:p-5 flex flex-col gap-3.5 text-left border border-borderColor hover:border-primary/40 transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex flex-col gap-0.5">
                            <h2 className="font-bold text-textPrimary text-sm leading-snug m-0 line-clamp-2">
                              {course.nombre}
                            </h2>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-textSecondary font-medium">
                              <span className="uppercase tracking-wide">{course.codigo}</span>
                              {credits && (
                                <>
                                  <span className="opacity-40" aria-hidden="true">·</span>
                                  <span>{credits}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 flex flex-col items-end leading-none" aria-label="Promedio">
                            <span className="text-[9px] font-bold text-textSecondary uppercase tracking-wider">
                              Promedio
                            </span>
                            <span
                              className={`text-lg font-extrabold mt-1 tabular-nums ${
                                average !== null ? "text-primary" : "text-textSecondary/45"
                              }`}
                            >
                              {average !== null ? average.toFixed(1) : "—"}
                            </span>
                          </div>
                        </div>

                        {/* Section meta */}
                        <div className="py-2.5 border-y border-borderColor/50 flex flex-col gap-1.5 text-xs">
                          {section ? (
                            <>
                              <div className="flex items-center gap-2 min-w-0">
                                <BookOpen className="w-3.5 h-3.5 text-textSecondary shrink-0" aria-hidden="true" />
                                <span className="text-textPrimary font-semibold truncate">{sectionLabel}</span>
                                {section.nrc && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyToClipboard(section.nrc, course.id);
                                    }}
                                    aria-label={`Copiar NRC ${section.nrc}`}
                                    className={`ml-auto shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono border transition-all flex items-center gap-1 cursor-pointer
                                      ${copiedNrc === course.id
                                        ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-600 dark:text-emerald-400"
                                        : "bg-bgPrimary/60 border-borderColor text-textSecondary hover:text-textPrimary"}`}
                                  >
                                    <span>NRC {section.nrc}</span>
                                    {copiedNrc === course.id ? (
                                      <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden="true" />
                                    ) : (
                                      <Copy className="w-3 h-3 shrink-0" aria-hidden="true" />
                                    )}
                                  </button>
                                )}
                              </div>
                              {teacherLabel && (
                                <div className="flex items-center gap-2 text-textSecondary min-w-0">
                                  <User className="w-3.5 h-3.5 text-textSecondary/70 shrink-0" aria-hidden="true" />
                                  <span className="truncate">{teacherLabel}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-textSecondary min-w-0">
                                <Clock className="w-3.5 h-3.5 text-textSecondary/70 shrink-0" aria-hidden="true" />
                                <span className="truncate">
                                  {scheduleLabel || "Horario no definido"}
                                  {section.modality ? ` · ${section.modality}` : ""}
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="text-[11.5px] text-textSecondary/80 py-0.5 flex items-center gap-2">
                              <HelpCircle className="w-3.5 h-3.5 text-textSecondary/50 shrink-0" aria-hidden="true" />
                              <span>Sin sección asignada. Defínela en Toma de Ramos.</span>
                            </div>
                          )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between gap-3 mt-auto">
                          <span className="text-[10px] font-semibold text-textSecondary">
                            {gradedCount > 0
                              ? `${gradedCount} de ${evalsCount} notas`
                              : evalsCount > 0
                                ? `${evalsCount} evaluaciones`
                                : "Sin evaluaciones"}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAbrirNotas?.(course);
                            }}
                            className="px-3.5 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-[11px] font-bold transition-all flex items-center gap-1.5 shadow-sm border-0 cursor-pointer"
                          >
                            <NotebookPen className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Notas</span>
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {/* ── Tab: Evaluaciones ── */}
              {activeTab === "evals" && (
                <div className="flex flex-col flex-1 min-h-0 bg-bgSecondary/30 border border-borderColor/60 rounded-2xl overflow-hidden p-3.5 sm:p-5 select-none">
                  {evaluationsList.length === 0 ? (
                    <div className="text-center py-12 text-textSecondary text-xs">
                      No tienes evaluaciones ni notas registradas en las asignaturas activas.
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {cursandoDetails.filter(cd => (notas[cd.course.id] || []).length > 0).map(({ course }) => {
                          const evals = notas[course.id] || [];
                          return (
                            <div key={course.id} className="p-4 bg-bgSecondary border border-borderColor/60 rounded-xl flex flex-col gap-3">
                              <div className="flex flex-col leading-tight border-b border-borderColor/55 pb-2">
                                <span className="font-bold text-xs text-textPrimary">{course.nombre}</span>
                                <span className="text-[9px] font-bold text-textSecondary uppercase mt-1 tracking-wider">{course.codigo}</span>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                {evals.map((ev) => (
                                  <div key={ev.id} className="flex items-center justify-between text-xs py-1 px-1 rounded-lg hover:bg-bgPrimary/30 transition-colors">
                                    <span className="text-textPrimary font-semibold">{ev.nombre || "Evaluación"} ({ev.peso || 0}%)</span>
                                    <div className={`font-mono font-extrabold ${ev.nota != null ? "text-primary" : "text-textSecondary/50 font-normal italic"}`}>
                                      {ev.nota != null ? ev.nota.toFixed(1) : "Pendiente"}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={() => onAbrirNotas?.(course)}
                                className="mt-1 self-start text-[11px] font-bold text-primary hover:underline bg-transparent border-0 cursor-pointer px-0"
                              >
                                Abrir notas
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Local Course Drawer inside Periodo Actual */}
      <CourseDrawer
        isOpen={!!selectedCurso}
        onClose={() => setSelectedCurso(null)}
        curso={selectedCurso}
        aprobado={selectedCurso ? aprobados.includes(selectedCurso.id) : false}
        excepcional={selectedCurso ? excepciones.includes(selectedCurso.id) : false}
        disponible={selectedCurso ? cumplePrereqs(selectedCurso) : false}
        modoExcepcional={modoExcepcional}
        enCurso={selectedCurso ? cursando.includes(selectedCurso.id) : false}
        aprobar={() => selectedCurso && handleAprobar(selectedCurso.id)}
        marcarExcepcional={() => selectedCurso && handleMarcarExcepcional(selectedCurso.id)}
        toggleCursando={() => selectedCurso && handleToggleCursando(selectedCurso.id)}
        onAbrirNotas={(c) => {
          setSelectedCurso(null);
          onAbrirNotas?.(c);
        }}
        getCursoById={getCursoById}
        aprobados={aprobados}
        excepciones={excepciones}
        allCursos={getAllCursos()}
      />
    </div>
  );
}
