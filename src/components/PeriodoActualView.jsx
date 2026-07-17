import React, { useState, useEffect, useMemo, useCallback } from "react";
import { BookOpen, CalendarDays, ClipboardCheck, Clock, MapPin, User, Copy, HelpCircle, CheckCircle2, ChevronRight, NotebookPen } from "lucide-react";
import { DAYS, buildSlots, getScheduleBounds } from "../utils/scheduleUtils";
import CourseDrawer from "./CourseDrawer";

const SCHEDULE_KEY = "malla-horario-v1";
const NOTES_KEY = "malla-notas";
const PROPOSAL_KEY = "malla-programacion-propuesta";

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
  const [scheduleItems, setScheduleItems] = useState([]);
  const [notas, setNotas] = useState({});
  const [proposal, setProposal] = useState(null);
  const [selectedMobileDay, setSelectedMobileDay] = useState(1);
  const [copiedNrc, setCopiedNrc] = useState(null);
  const [selectedCurso, setSelectedCurso] = useState(null);

  // Load schedule data
  const loadData = useCallback(() => {
    try {
      const sch = JSON.parse(localStorage.getItem(SCHEDULE_KEY) || "{}");
      setScheduleItems(Array.isArray(sch.items) ? sch.items : []);
    } catch {
      setScheduleItems([]);
    }

    try {
      setNotas(JSON.parse(localStorage.getItem(NOTES_KEY) || "{}"));
    } catch {
      setNotas({});
    }

    try {
      setProposal(JSON.parse(localStorage.getItem(PROPOSAL_KEY) || "null"));
    } catch {
      setProposal(null);
    }
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener("notasModificadas", loadData);
    window.addEventListener("horario-updated", loadData);
    return () => {
      window.removeEventListener("notasModificadas", loadData);
      window.removeEventListener("horario-updated", loadData);
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
    localStorage.setItem("malla-aprobados", JSON.stringify(nextAprobados));
    
    const nextCursando = cursando.filter((c) => c !== id);
    setCursando?.(nextCursando);
    localStorage.setItem("malla-cursando", JSON.stringify(nextCursando));
    
    window.dispatchEvent(new CustomEvent("malla-progress-changed"));
  };

  const handleMarcarExcepcional = (id) => {
    const isRemoving = excepciones.includes(id);
    const nextExcepciones = isRemoving
      ? excepciones.filter((e) => e !== id)
      : [...excepciones, id];
    
    setExcepciones?.(nextExcepciones);
    localStorage.setItem("malla-excepciones", JSON.stringify(nextExcepciones));

    const nextAprobados = isRemoving
      ? aprobados.filter((a) => a !== id)
      : [...aprobados, id];
    setAprobados?.(nextAprobados);
    localStorage.setItem("malla-aprobados", JSON.stringify(nextAprobados));

    if (!isRemoving) {
      const nextCursando = cursando.filter((c) => c !== id);
      setCursando?.(nextCursando);
      localStorage.setItem("malla-cursando", JSON.stringify(nextCursando));
    }
    
    window.dispatchEvent(new CustomEvent("malla-progress-changed"));
  };

  const handleToggleCursando = (id) => {
    const nextCursando = cursando.includes(id)
      ? cursando.filter((c) => c !== id)
      : [...cursando, id];
    
    setCursando?.(nextCursando);
    localStorage.setItem("malla-cursando", JSON.stringify(nextCursando));
    
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

  // Horario slots calculations
  const slots = useMemo(() => buildSlots(), []);
  const slotsByStart = useMemo(() => {
    const map = new Map();
    slots.forEach((s) => map.set(s.startTime, s));
    return map;
  }, [slots]);

  const scheduleMap = useMemo(() => {
    const map = new Map();
    scheduleItems.forEach((it) => {
      const dayId = Number(it.day);
      if (!map.has(dayId)) map.set(dayId, []);
      map.get(dayId).push(it);
    });
    return map;
  }, [scheduleItems]);

  const getDayScheduleItems = (dayId) => {
    return (scheduleMap.get(dayId) || []).sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const getGridPosition = (item) => {
    const slot = slotsByStart.get(item.startTime);
    if (!slot) return null;
    const blocksCount = Math.max(1, Number(item.blocks || 1));
    return {
      gridRowStart: slot.index + 2,
      gridRowEnd: slot.index + 2 + blocksCount,
      gridColumnStart: Number(item.day) + 1,
    };
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 px-4 sm:px-6 md:px-8 pb-8">
      
      {/* Title Header */}
      <div className="flex flex-col gap-1.5 py-4 mb-4 select-none shrink-0">
        <h1 className="text-xl sm:text-2xl font-extrabold text-textPrimary leading-none">Periodo actual</h1>
        <p className="text-xs text-textSecondary font-semibold">
          {cursando.length} asignaturas activas · Semestre 2026-2
        </p>
      </div>

      {/* Tabs List */}
      <div className="flex bg-bgSecondary/60 p-0.5 rounded-xl border border-borderColor/40 max-w-sm mb-6 select-none shrink-0">
        {[
          { id: "cursos", label: "Asignaturas", icon: <BookOpen className="w-3.5 h-3.5" /> },
          { id: "horario", label: "Horario", icon: <CalendarDays className="w-3.5 h-3.5" /> },
          { id: "evals", label: "Evaluaciones", icon: <ClipboardCheck className="w-3.5 h-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200
              ${activeTab === tab.id
                ? "bg-primary text-white shadow-sm"
                : "text-textSecondary hover:text-textPrimary"}`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Panels */}
      <div className="flex-1 min-h-0 flex flex-col">
        {cursando.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none py-20 bg-bgSecondary/25 border border-dashed border-borderColor/80 rounded-3xl">
            <CalendarDays className="w-12 h-12 text-textSecondary/50 mb-3" />
            <h3 className="text-sm font-bold text-textPrimary">No estás cursando asignaturas</h3>
            <p className="text-xs text-textSecondary max-w-xs mt-1">
              Marca ramos como "Cursando" en tu malla curricular para gestionarlos y simular sus calificaciones.
            </p>
          </div>
        ) : (
          <>
            {/* ── Tab: Asignaturas ── */}
            {activeTab === "cursos" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cursandoDetails.map(({ course, average, evalsCount, gradedCount, section }) => (
                  <div
                    key={course.id}
                    onClick={() => setSelectedCurso(course)}
                    className="curso-card-base cursor-pointer p-5 flex flex-col gap-4 text-left border border-borderColor hover:border-primary/45 transition-all hover:-translate-y-0.5"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-0.5 leading-snug">
                        <span className="font-bold text-textPrimary text-sm line-clamp-2">{course.nombre}</span>
                        <span className="text-[10px] text-textSecondary font-semibold uppercase">{course.codigo}</span>
                      </div>
                      
                      {/* Average */}
                      <div className="shrink-0 flex flex-col items-end">
                        <span className="text-[9px] font-bold text-textSecondary uppercase tracking-wider">Promedio</span>
                        <div className={`text-base font-extrabold mt-0.5 ${average !== null ? "text-primary" : "text-textSecondary/50 font-normal text-xs"}`}>
                          {average !== null ? average.toFixed(1) : "—"}
                        </div>
                      </div>
                    </div>

                    {/* Section Details */}
                    <div className="py-2.5 border-y border-borderColor/50 flex flex-col gap-2 text-xs">
                      {section ? (
                        <>
                          <div className="flex items-center gap-2 text-textPrimary font-semibold">
                            <BookOpen className="w-3.5 h-3.5 text-textSecondary shrink-0" />
                            <span className="truncate">{section.sectionId?.replace(/.*_Sección_/, "Sección ") || "Sección única"}</span>
                            
                            {/* NRC Badge Copy */}
                            {section.nrc && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(section.nrc, course.id);
                                }}
                                className={`ml-auto px-1.5 py-0.5 rounded text-[9.5px] font-mono border transition-all flex items-center gap-1
                                  ${copiedNrc === course.id
                                    ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-600 dark:text-emerald-400"
                                    : "bg-bgPrimary/60 border-borderColor text-textSecondary hover:text-textPrimary"}`}
                              >
                                <span>NRC {section.nrc}</span>
                                <Copy className="w-3 h-3 shrink-0" />
                              </button>
                            )}
                          </div>
                          {section.teacher && (
                            <div className="flex items-center gap-2 text-textSecondary">
                              <User className="w-3.5 h-3.5 text-textSecondary/70 shrink-0" />
                              <span className="truncate">{section.teacher}</span>
                            </div>
                          )}
                          {(section.scheduleSummary || section.modality) && (
                            <div className="flex items-center gap-2 text-textSecondary">
                              <Clock className="w-3.5 h-3.5 text-textSecondary/70 shrink-0" />
                              <span className="truncate">
                                {section.scheduleSummary || "Horario no definido"}
                                {section.modality && ` (${section.modality})`}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-[11.5px] text-textSecondary/80 py-1 italic flex items-center gap-2">
                          <HelpCircle className="w-3.5 h-3.5 text-textSecondary/50 shrink-0" />
                          <span>Sin sección asignada. Defínela en Toma de Ramos.</span>
                        </div>
                      )}
                    </div>

                    {/* Footer actions */}
                    <div className="flex items-center justify-between gap-3 select-none mt-auto">
                      <span className="text-[10px] font-semibold text-textSecondary">
                        {gradedCount > 0 ? `${gradedCount} de ${evalsCount} notas ingresadas` : "Sin evaluaciones"}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAbrirNotas?.(course);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/10 text-[11px] font-bold transition-all flex items-center gap-1"
                      >
                        <NotebookPen className="w-3.5 h-3.5" />
                        <span>Notas</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Tab: Horario ── */}
            {activeTab === "horario" && (
              <div className="flex flex-col flex-1 min-h-0 bg-bgSecondary/30 border border-borderColor/60 rounded-3xl overflow-hidden p-3.5 sm:p-5">
                
                {/* Mobile Selector */}
                <div className="flex sm:hidden gap-1.5 overflow-x-auto pb-3 select-none shrink-0">
                  {DAYS.filter(d => d.id >= 1 && d.id <= 6).map((day) => (
                    <button
                      key={day.id}
                      onClick={() => setSelectedMobileDay(day.id)}
                      className={`flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all
                        ${selectedMobileDay === day.id
                          ? "bg-primary text-white"
                          : "bg-bgSecondary text-textSecondary border border-borderColor/40"}`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>

                {/* Mobile chronological list */}
                <div className="sm:hidden flex-1 overflow-y-auto">
                  {getDayScheduleItems(selectedMobileDay).length === 0 ? (
                    <div className="text-center py-12 select-none text-textSecondary italic text-xs">
                      No hay clases registradas para este día.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {getDayScheduleItems(selectedMobileDay).map((item, idx) => (
                        <div key={idx} className="p-3.5 bg-bgSecondary border border-borderColor/60 rounded-xl flex gap-3.5 items-center">
                          <div className="w-1.5 h-10 rounded-full bg-primary" />
                          <div className="flex flex-col leading-tight min-w-0">
                            <span className="font-bold text-xs text-textPrimary truncate">{item.title || "Asignatura"}</span>
                            <span className="text-[10px] text-textSecondary/80 mt-1 uppercase font-semibold">{item.courseId}</span>
                          </div>
                          <div className="ml-auto flex flex-col items-end gap-1 shrink-0 text-[10.5px] text-textSecondary leading-none">
                            <div className="flex items-center gap-1 font-semibold text-textPrimary">
                              <Clock className="w-3 h-3" />
                              <span>{item.startTime}</span>
                            </div>
                            {item.sala && (
                              <div className="flex items-center gap-1 text-[9.5px]">
                                <MapPin className="w-3 h-3" />
                                <span>{item.sala}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Desktop layout */}
                <div className="hidden sm:flex flex-col flex-1 min-h-0 overflow-y-auto">
                  <div className="grid grid-cols-[80px_repeat(6,1fr)] grid-rows-[40px_repeat(14,48px)] gap-1 relative min-h-max">
                    
                    <div className="row-start-1 col-start-1" />
                    {DAYS.filter(d => d.id >= 1 && d.id <= 6).map((day) => (
                      <div
                        key={day.id}
                        className="row-start-1 font-bold text-[11px] text-textSecondary uppercase tracking-wider text-center flex items-center justify-center border-b border-borderColor/40 select-none"
                        style={{ gridColumnStart: day.id + 1 }}
                      >
                        {day.label}
                      </div>
                    ))}

                    {slots.map((slot) => (
                      <div
                        key={slot.startTime}
                        className="col-start-1 font-bold text-[10.5px] text-textSecondary/80 text-right pr-3 flex items-center justify-end select-none"
                        style={{ gridRowStart: slot.index + 2 }}
                      >
                        {slot.startTime}
                      </div>
                    ))}

                    {DAYS.filter(d => d.id >= 1 && d.id <= 6).map((day) => (
                      <div
                        key={`line-col-${day.id}`}
                        className="row-start-2 row-end-[17] border-l border-borderColor/30 pointer-events-none"
                        style={{ gridColumnStart: day.id + 1 }}
                      />
                    ))}

                    {slots.map((slot) => (
                      <div
                        key={`line-row-${slot.startTime}`}
                        className="col-start-2 col-end-8 border-t border-borderColor/30 pointer-events-none"
                        style={{ gridRowStart: slot.index + 2 }}
                      />
                    ))}

                    {/* Schedule blocks */}
                    {scheduleItems.map((item, idx) => {
                      const pos = getGridPosition(item);
                      if (!pos) return null;
                      return (
                        <div
                          key={idx}
                          className="rounded-xl border border-primary/20 bg-primary/10 text-primary p-2 flex flex-col justify-between overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.02)]"
                          style={{
                            gridRowStart: pos.gridRowStart,
                            gridRowEnd: pos.gridRowEnd,
                            gridColumnStart: pos.gridColumnStart,
                          }}
                        >
                          <div className="flex flex-col leading-tight min-w-0">
                            <span className="font-extrabold text-[10px] md:text-[11px] truncate leading-tight text-textPrimary">
                              {item.title || "Asignatura"}
                            </span>
                            <span className="text-[8.5px] font-semibold text-textSecondary uppercase mt-0.5 leading-none">
                              {item.courseId}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-1.5 mt-1 select-none text-[8.5px] leading-none opacity-85">
                            <div className="flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5 text-primary" />
                              <span>{item.startTime}</span>
                            </div>
                            {item.sala && (
                              <div className="flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5 text-primary" />
                                <span className="truncate max-w-[50px]">{item.sala}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                  </div>
                </div>

                <div className="hidden sm:block mt-3 text-[10px] text-textSecondary font-semibold select-none text-right">
                  Edita tus bloques y salas desde el modal "Ver mi horario" en el menú de usuario.
                </div>
              </div>
            )}

            {/* ── Tab: Evaluaciones ── */}
            {activeTab === "evals" && (
              <div className="flex flex-col flex-1 min-h-0 bg-bgSecondary/30 border border-borderColor/60 rounded-3xl overflow-hidden p-3.5 sm:p-5 select-none">
                {evaluationsList.length === 0 ? (
                  <div className="text-center py-20 text-textSecondary italic text-xs">
                    No tienes evaluaciones ni notas registradas en las asignaturas activas.
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {cursandoDetails.filter(cd => (notas[cd.course.id] || []).length > 0).map(({ course }) => {
                        const evals = notas[course.id] || [];
                        return (
                          <div key={course.id} className="p-4 bg-bgSecondary border border-borderColor/60 rounded-2xl flex flex-col gap-3">
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
