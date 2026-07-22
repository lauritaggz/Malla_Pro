import { useState, useMemo, useRef, useEffect } from "react";
import { AlertTriangle, Clock, MapPin, User, Calendar, Trash2, List, Info } from "lucide-react";
import {
  unabTimeSlots,
  scheduleDays,
  timeToMinutes,
  getScheduleBounds,
  getAdjustedBounds,
  getStableCourseColor,
  groupConsecutiveUnabMeetings,
  getOccupiedUnabSlots,
} from "../services/scheduleService";
import { assignOverlapColumns } from "../services/scheduleLayoutService";
import { MODALITY_LABELS } from "../services/filterCourses";

const PIXELS_PER_MINUTE = 1.15; // Altura en píxeles por minuto

function useIsDarkMode() {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : true
  );

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains("dark"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  return isDark;
}

function resolveCourseColors(courseCode, isDark) {
  const colors = getStableCourseColor(courseCode);
  if (isDark) {
    return {
      bg: colors.bgDark,
      border: colors.borderDark,
      text: colors.textDark,
    };
  }
  return {
    bg: colors.bgLight,
    border: colors.borderLight,
    text: colors.textLight,
  };
}

export default function WeeklyScheduleGrid({
  selectedSectionsList,
  onDeselectSection,
  showFullDay,
  conflicts,
  selectedMobileDay,
  setSelectedMobileDay,
  integration
}) {
  const isDark = useIsDarkMode();
  const [activePopover, setActivePopover] = useState(null);
  const popoverRefs = useRef(new Map());

  // Cerrar popover al hacer click afuera
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (activePopover) {
        let clickedInside = false;
        const ref = popoverRefs.current.get(activePopover);
        if (ref && ref.contains(e.target)) {
          clickedInside = true;
        }
        if (!clickedInside) {
          setActivePopover(null);
        }
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [activePopover]);

  // Mapa de código de curso a curso de la malla curricular para obtener créditos
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

  // Reuniones individuales agrupando bloques consecutivos
  const allMeetings = useMemo(() => {
    const list = [];
    for (const sec of selectedSectionsList) {
      const grouped = groupConsecutiveUnabMeetings(sec.meetings || []);
      for (const group of grouped) {
        list.push({
          ...group,
          section: sec,
          courseCode: sec.courseCode,
          courseTitle: sec.courseTitle,
          nrc: sec.nrc,
          professors: sec.professors,
          modality: sec.modality
        });
      }
    }
    return list;
  }, [selectedSectionsList]);

  // Límites de la grilla (Modo Ajustado o Día Completo)
  const bounds = useMemo(() => {
    const flat = selectedSectionsList.flatMap((s) => s.meetings || []);
    if (!showFullDay) {
      return getAdjustedBounds(flat);
    }
    return getScheduleBounds(flat, true);
  }, [selectedSectionsList, showFullDay]);

  const scheduleStartMinutes = bounds.start;
  const scheduleEndMinutes = bounds.end;
  const totalMinutes = scheduleEndMinutes - scheduleStartMinutes;
  const gridHeight = totalMinutes * PIXELS_PER_MINUTE;

  const gridMeetings = useMemo(() => {
    return allMeetings.filter((m) => m.dayCode && m.startTime && m.endTime);
  }, [allMeetings]);

  const unscheduledCourses = useMemo(() => {
    return selectedSectionsList.filter(
      (sec) => !sec.meetings || sec.meetings.length === 0
    );
  }, [selectedSectionsList]);



  const positionedMeetingsByDay = useMemo(() => {
    const byDay = { LU: [], MA: [], MI: [], JU: [], VI: [], SA: [] };

    for (const m of gridMeetings) {
      if (byDay[m.dayCode]) {
        const startMins = timeToMinutes(m.startTime);
        const endMins = timeToMinutes(m.endTime);
        const top = (startMins - scheduleStartMinutes) * PIXELS_PER_MINUTE;
        const height = (endMins - startMins) * PIXELS_PER_MINUTE;

        byDay[m.dayCode].push({
          ...m,
          startMinutes: startMins,
          endMinutes: endMins,
          top,
          height
        });
      }
    }

    for (const day of Object.keys(byDay)) {
      byDay[day] = assignOverlapColumns(byDay[day]);
    }

    return byDay;
  }, [gridMeetings, scheduleStartMinutes]);

  return (
    <div className="flex-1 flex flex-col h-full bg-bgSecondary overflow-hidden select-none">
      {/* Asignaturas sin horario */}
      {unscheduledCourses.length > 0 && (
        <div className="px-4 py-2 bg-amber-500/5 border-b border-borderColor/60 space-y-1 shrink-0">
          <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1 uppercase tracking-wider">
            <Clock className="h-3 w-3" /> Asignaturas sin horario
          </p>
          <div className="flex flex-wrap gap-1.5">
            {unscheduledCourses.map((sec) => (
              <div
                key={sec.id}
                className="inline-flex items-center gap-1.5 bg-bgSecondary border border-borderColor px-2 py-0.5 rounded-md text-[10px] font-bold text-textPrimary"
              >
                <span>{sec.courseCode} · Sec. {sec.sectionNumber}</span>
                <button
                  type="button"
                  onClick={() => onDeselectSection(sec)}
                  className="text-textSecondary hover:text-red-600 transition-colors btn-interactive"
                  aria-label={`Quitar ${sec.courseCode}`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grilla Semanal */}
      {selectedSectionsList.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-bgPrimary/20 relative min-h-[350px]">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none overflow-hidden">
            <div className="grid grid-cols-6 h-full w-full border divide-x border-borderColor">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="divide-y divide-borderColor">
                  {[...Array(12)].map((_, j) => (
                    <div key={j} className="h-14" />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 space-y-2 max-w-xs">
            <Clock className="h-10 w-10 text-textSecondary/50 mx-auto stroke-[1.25]" />
            <h3 className="text-sm font-bold text-textPrimary">Tu horario está vacío</h3>
            <p className="text-xs text-textSecondary leading-normal">
              Elige una sección desde la lista para comenzar.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto relative flex flex-col min-h-0 bg-bgPrimary/10">
          <div className="min-w-0 md:min-w-[650px] flex flex-col flex-1 relative">
            {/* Cabecera de días (Fijo arriba) */}
            <div className="grid grid-cols-[56px_repeat(6,minmax(0,1fr))] md:grid-cols-[64px_repeat(6,1fr)] border-b border-borderColor bg-bgSecondary sticky top-0 z-20 text-center select-none text-[10px] font-extrabold text-textSecondary">
              <div className="border-r border-borderColor" />
              {scheduleDays.map((day) => {
                const isSelected = selectedMobileDay === day.code;
                const count = positionedMeetingsByDay[day.code]?.length || 0;
                return (
                  <button
                    key={day.code}
                    type="button"
                    onClick={() => setSelectedMobileDay(day.code)}
                    className={`py-2 border-r border-borderColor flex flex-col items-center justify-center hover:bg-bgPrimary transition-colors md:pointer-events-none ${
                      isSelected ? "bg-primary/5 text-primary" : "text-textPrimary"
                    }`}
                  >
                    <span>{day.code}</span>
                    {count > 0 && (
                      <span className="text-[9px] font-normal text-textSecondary mt-0.5">
                        {count} class{count === 1 ? "" : "es"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Cuerpo del horario */}
            <div
              className="grid grid-cols-[56px_minmax(0,1fr)] md:grid-cols-[64px_repeat(6,1fr)] relative"
              style={{ height: gridHeight }}
            >
              {/* Eje de Horas */}
              <div className="border-r border-borderColor bg-bgSecondary text-right pr-2 text-[11px] font-bold text-textSecondary relative select-none z-10 font-mono">
                {unabTimeSlots.map((slot) => {
                  const slotStart = timeToMinutes(slot.start);
                  if (slotStart < scheduleStartMinutes || slotStart >= scheduleEndMinutes) return null;
                  const top = (slotStart - scheduleStartMinutes) * PIXELS_PER_MINUTE;

                  return (
                    <div
                      key={slot.id}
                      title={`${slot.start}–${slot.end}`}
                      className="absolute right-2 -translate-y-1/2 select-none"
                      style={{ top }}
                    >
                      {slot.start}
                    </div>
                  );
                })}
              </div>

              {/* Líneas horizontales de inicio de módulo */}
              <div className="absolute left-[56px] md:left-[64px] right-0 top-0 bottom-0 pointer-events-none z-0">
                {unabTimeSlots.map((slot) => {
                  const slotStart = timeToMinutes(slot.start);
                  if (slotStart < scheduleStartMinutes || slotStart >= scheduleEndMinutes) return null;
                  const top = (slotStart - scheduleStartMinutes) * PIXELS_PER_MINUTE;

                  return (
                    <div
                      key={`line-${slot.id}`}
                      className="absolute left-0 right-0 border-t border-borderColor/30"
                      style={{ top }}
                    />
                  );
                })}
              </div>

              {/* Pausas de 10 minutos (visualizadas con fondo ligeramente diferente) */}
              <div className="absolute left-[56px] md:left-[64px] right-0 top-0 bottom-0 pointer-events-none z-0">
                {unabTimeSlots.slice(0, -1).map((slot, idx) => {
                  const endVal = timeToMinutes(slot.end);
                  const nextStartVal = timeToMinutes(unabTimeSlots[idx + 1].start);
                  if (endVal < scheduleStartMinutes || nextStartVal > scheduleEndMinutes) return null;

                  const top = (endVal - scheduleStartMinutes) * PIXELS_PER_MINUTE;
                  const height = (nextStartVal - endVal) * PIXELS_PER_MINUTE;

                  return (
                    <div
                      key={`pause-${slot.id}`}
                      className="absolute left-0 right-0 bg-bgSecondary/45 dark:bg-bgSurface/40 border-b border-borderColor/10"
                      style={{ top, height }}
                    />
                  );
                })}
              </div>

              {/* Columnas de los Días */}
              {scheduleDays.map((day) => {
                const isMobileActive = selectedMobileDay === day.code;
                const dayMeetings = positionedMeetingsByDay[day.code] || [];

                return (
                  <div
                    key={day.code}
                    className={`relative border-r border-borderColor h-full transition-opacity md:opacity-100 ${
                      isMobileActive ? "opacity-100 bg-primary/2" : "max-md:hidden"
                    }`}
                  >
                    {dayMeetings.map((m) => {
                      const colors = resolveCourseColors(m.courseCode, isDark);
                      const isConflicting = conflicts.some(
                        (col) =>
                          (col.meetingA.courseCode === m.courseCode && col.meetingA.meeting.dayCode === m.dayCode && col.meetingA.meeting.startTime === m.startTime) ||
                          (col.meetingB.courseCode === m.courseCode && col.meetingB.meeting.dayCode === m.dayCode && col.meetingB.meeting.startTime === m.startTime)
                      );

                      const popKey = `${m.courseCode}-${m.dayCode}-${m.startTime}`;
                      const popoverOpen = activePopover === popKey;

                      return (
                        <div
                          key={popKey}
                          ref={(el) => {
                            if (el) popoverRefs.current.set(popKey, el);
                            else popoverRefs.current.delete(popKey);
                          }}
                          className={`absolute rounded-lg border p-2 flex flex-col justify-between select-none shadow-sm transition-all focus-within:ring-1 focus-within:ring-primary/30 cursor-pointer ${
                            isConflicting
                              ? "border-red-500 text-red-700 dark:text-red-300"
                              : ""
                          }`}
                          style={{
                            top: m.top + 2,
                            height: m.height - 4,
                            left: `${m.leftPercentage + 2}%`,
                            width: `${m.widthPercentage - 4}%`,
                            backgroundColor: !isConflicting ? colors.bg : "rgba(239, 68, 68, 0.12)",
                            borderColor: !isConflicting ? colors.border : undefined,
                            color: !isConflicting ? colors.text : undefined,
                            backgroundImage: isConflicting
                              ? "repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.04), rgba(239, 68, 68, 0.04) 8px, rgba(239, 68, 68, 0.08) 8px, rgba(239, 68, 68, 0.08) 16px)"
                              : undefined,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePopover(popoverOpen ? null : popKey);
                          }}
                        >
                          <ScheduleMeetingBlock
                            m={m}
                            height={m.height}
                            isConflicting={isConflicting}
                          />

                          {/* Popover Detallado */}
                          {popoverOpen && (
                            <div className="absolute top-full left-0 right-0 md:left-1/2 md:-translate-x-1/2 mt-1.5 z-30 bg-bgSecondary border border-borderColor rounded-xl p-4 shadow-xl space-y-3 min-w-[260px] max-w-[300px] text-textPrimary font-semibold text-xs select-none popover-animate">
                              <div>
                                <h4 className="text-[10px] font-black text-textSecondary uppercase tracking-wider">
                                  {m.courseCode} · Sec. {m.section.sectionNumber}
                                </h4>
                                <h3 className="text-sm font-black text-textPrimary mt-0.5 leading-snug">
                                  {m.courseTitle}
                                </h3>
                              </div>

                              <div className="space-y-1.5 text-textSecondary font-medium text-[11px]">
                                <p className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>{m.dayCode} {m.startTime}–{m.endTime} ({getOccupiedUnabSlots(m, unabTimeSlots).length} mód.)</span>
                                </p>
                                <p className="flex items-center gap-1.5 font-bold text-textPrimary/80">
                                  <MapPin className="h-3.5 w-3.5" />
                                  <span>Sala: {m.locations.join(" / ") || "No informada"}</span>
                                </p>
                                <p className="flex items-center gap-1.5">
                                  <User className="h-3.5 w-3.5" />
                                  <span className="truncate">Prof: {m.professors?.join(" / ") || "Por definir"}</span>
                                </p>
                                <p className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span>Modalidad: {MODALITY_LABELS[m.modality] || m.modality} · NRC {m.nrc}</span>
                                </p>
                                {courseCodeToCurriculumMap.has(m.courseCode) && (
                                  <p className="flex items-center gap-1.5">
                                    <Info className="h-3.5 w-3.5" />
                                    <span>Créditos: {courseCodeToCurriculumMap.get(m.courseCode)?.sct ?? "—"}</span>
                                  </p>
                                )}
                              </div>

                              {isConflicting && (
                                <p className="text-[10px] text-red-600 dark:text-red-400 font-bold bg-red-500/5 border border-red-500/10 p-1.5 rounded flex items-center gap-1">
                                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                  Conflicto de horario activo
                                </p>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeselectSection(m.section);
                                  setActivePopover(null);
                                }}
                                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-500/5 hover:bg-red-500 hover:text-white transition-colors text-xs font-bold text-red-600 bg-bgSecondary btn-interactive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Quitar sección
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

function ScheduleMeetingBlock({ m, height, isConflicting }) {
  let view = "COMPACT";
  if (height >= 120) view = "FULL";
  else if (height >= 65) view = "MEDIUM";

  const numSlots = getOccupiedUnabSlots(m, unabTimeSlots).length;

  // Hereda color del contenedor (paleta light/dark del ramo).
  // No usar text-textPrimary aquí: en dark mode chocaría con fondos pastel.
  if (view === "FULL") {
    return (
      <div className="h-full flex flex-col justify-between overflow-hidden text-left relative z-10 pointer-events-none">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 font-bold text-[9px] uppercase tracking-wider opacity-85">
            {isConflicting && <AlertTriangle className="h-3 w-3 shrink-0" />}
            <span className="truncate">{isConflicting ? "Tope" : m.courseCode}</span>
          </div>
          <p className="text-[11px] font-black leading-snug line-clamp-2">
            {m.courseTitle}
          </p>
        </div>

        <div className="space-y-0.5 text-[9px] opacity-90 font-bold">
          <p className="font-semibold opacity-85">Sec. {m.section.sectionNumber} {numSlots > 1 && `· ${numSlots} mód.`}</p>
          <p className="font-semibold opacity-85">Hora: {m.startTime}–{m.endTime}</p>
          <p className="truncate font-black opacity-90">Sala: {m.locations.join(" / ") || "no inf."}</p>
        </div>
      </div>
    );
  }

  if (view === "MEDIUM") {
    return (
      <div className="h-full flex flex-col justify-between overflow-hidden text-left relative z-10 pointer-events-none">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 font-bold text-[8.5px] uppercase opacity-85">
            {isConflicting && <AlertTriangle className="h-2.5 w-2.5 shrink-0" />}
            <span className="truncate">{isConflicting ? "Tope" : m.courseCode}</span>
          </div>
          <p className="text-[10px] font-black leading-tight truncate">
            {m.courseTitle}
          </p>
        </div>
        <div className="text-[8.5px] opacity-95 flex items-center justify-between gap-1 flex-wrap font-bold">
          <span>{m.startTime}–{m.endTime}</span>
          <span className="truncate font-semibold opacity-85">Sec. {m.section.sectionNumber}</span>
        </div>
      </div>
    );
  }

  // COMPACT
  return (
    <div className="h-full flex items-center justify-between overflow-hidden text-left relative z-10 pointer-events-none gap-1 py-0.5 font-bold">
      <div className="flex items-center gap-1 min-w-0">
        {isConflicting && <AlertTriangle className="h-2.5 w-2.5 shrink-0" />}
        <p className="text-[9.5px] truncate leading-none">
          {m.courseCode} <span className="opacity-75 font-normal">({m.startTime})</span>
        </p>
      </div>
      <p className="text-[8.5px] opacity-80 shrink-0">{m.locations[0] || "no inf."}</p>
    </div>
  );
}
