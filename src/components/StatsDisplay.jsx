import { useEffect, useState } from "react";
import { Clock, MapPin } from "lucide-react";
import { DAYS, getItemEndMinutes, timeToMinutes } from "../utils/scheduleUtils";

/* ─── Lógica próxima clase ─── */
const SCHEDULE_KEY = "malla-horario-v1";

function loadItems() {
  try {
    const data = JSON.parse(localStorage.getItem(SCHEDULE_KEY) || "{}");
    return Array.isArray(data.items) ? data.items : [];
  } catch { return []; }
}

function findNextClass(items, now = new Date()) {
  if (!items.length) return null;
  const todayId = now.getDay();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const dayOrder = Array.from({ length: 8 }, (_, i) => (todayId + i) % 7);

  for (const dayId of dayOrder) {
    const isToday = dayId === todayId;
    const dayItems = items
      .filter((it) => Number(it.day) === dayId)
      .map((it) => ({ ...it, _startMins: timeToMinutes(it.startTime) ?? 0, _endMins: getItemEndMinutes(it) ?? 0 }))
      .sort((a, b) => a._startMins - b._startMins);

    for (const it of dayItems) {
      if (isToday) {
        if (it._endMins > nowMins) {
          return { ...it, isNow: it._startMins <= nowMins && it._endMins > nowMins, dayLabel: "Hoy" };
        }
      } else {
        const daysAhead = (dayId - todayId + 7) % 7;
        return { ...it, isNow: false, dayLabel: daysAhead === 1 ? "Mañana" : DAYS.find((d) => d.id === dayId)?.label ?? "" };
      }
    }
  }
  return null;
}

/* ─── Widget próxima clase ─── */
function ProximaClase() {
  const [nextClass, setNextClass] = useState(null);

  const refresh = () => setNextClass(findNextClass(loadItems()));

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60_000);
    const onStorage = (e) => { if (e.key === SCHEDULE_KEY) refresh(); };
    window.addEventListener("storage", onStorage);
    return () => { clearInterval(interval); window.removeEventListener("storage", onStorage); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!nextClass) return null;

  return (
    <div className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl backdrop-blur-md shadow-lg transition-all hover:scale-105 ${
      nextClass.isNow
        ? "bg-primary border border-primary/30 shadow-primary/25"
        : "glass-card border border-borderColor/60 shadow-md"
    }`}>
      <div className="relative flex-shrink-0">
        <div className={`w-3 h-3 rounded-full ${nextClass.isNow ? "bg-white/90" : "bg-primary"}`} />
        {nextClass.isNow && <div className="absolute inset-0 w-3 h-3 rounded-full bg-white/60 animate-ping" />}
      </div>
      <div className="flex flex-col min-w-0">
        <span className={`text-xs font-semibold uppercase tracking-wider ${nextClass.isNow ? "text-white/90" : "text-textSecondary"}`}>
          {nextClass.isNow ? "En curso ahora" : `Próxima · ${nextClass.dayLabel}`}
        </span>
        <span className={`text-sm font-bold leading-tight ${nextClass.isNow ? "text-white" : "text-textPrimary"}`}>
          {nextClass.title || "Sin nombre"}
        </span>
        <div className={`flex items-center gap-2 text-xs mt-0.5 ${nextClass.isNow ? "text-white/80" : "text-textSecondary"}`}>
          <Clock className="w-3 h-3 flex-shrink-0" />
          <span>{nextClass.startTime}</span>
          {nextClass.sala && (
            <>
              <span className="opacity-50">·</span>
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span>{nextClass.sala}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── StatsDisplay ─── */
export default function StatsDisplay({
  totalCursos,
  cursosAprobados,
  cursosCursando,
  cursosEnCursoData = [],
}) {
  const [promedioEnCurso, setPromedioEnCurso] = useState(null);
  const porcentajeAprobados = totalCursos > 0 ? Math.round((cursosAprobados / totalCursos) * 100) : 0;
  const totalSctEnCurso = cursosEnCursoData.reduce((total, curso) => total + (curso.sct || 0), 0);

  useEffect(() => {
    if (!cursosEnCursoData?.length) { setPromedioEnCurso(null); return; }
    const notasGuardadas = JSON.parse(localStorage.getItem("malla-notas") || "{}");
    let sumaPonderada = 0, totalSct = 0;
    cursosEnCursoData.forEach((curso) => {
      const evaluaciones = (notasGuardadas[curso.id] || []).filter((e) => e.nota != null);
      if (!evaluaciones.length) return;
      const pesoConNota = evaluaciones.reduce((s, e) => s + (e.peso || 0), 0);
      if (pesoConNota <= 0) return;
      const promedio = evaluaciones.reduce((s, e) => s + (e.nota || 0) * (e.peso || 0), 0) / pesoConNota;
      const sct = curso.sct || 1;
      sumaPonderada += promedio * sct;
      totalSct += sct;
    });
    setPromedioEnCurso(totalSct > 0 ? sumaPonderada / totalSct : null);
  }, [cursosEnCursoData]);

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-3">
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">

        {/* Próxima clase */}
        <ProximaClase />

        {/* Aprobados */}
        <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-emerald-500/95 backdrop-blur-md border border-emerald-400/20 shadow-lg shadow-emerald-500/20 transition-all hover:scale-105">
          <div className="w-3 h-3 rounded-full bg-white/90 shadow-sm" />
          <div className="flex flex-col">
            <span className="text-white/90 text-xs font-semibold uppercase tracking-wider">Aprobados</span>
            <span className="text-white text-xl font-bold leading-tight flex items-baseline gap-1">
              {cursosAprobados}
              <span className="text-sm font-medium opacity-80">ramos ({porcentajeAprobados}%)</span>
            </span>
          </div>
        </div>

        {/* En Curso */}
        <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-primary backdrop-blur-md border border-primary/20 shadow-lg shadow-primary/25 transition-all hover:scale-105">
          <div className="w-3 h-3 rounded-full bg-white/90 shadow-sm" />
          <div className="flex flex-col">
            <span className="text-white/90 text-xs font-semibold uppercase tracking-wider">En Curso</span>
            <span className="text-white text-xl font-bold leading-tight flex items-baseline gap-1">
              {cursosCursando}
              <span className="text-sm font-medium opacity-80">ramos</span>
              {totalSctEnCurso > 0 && (
                <>
                  <span className="text-sm font-medium opacity-60 mx-1">•</span>
                  <span className="text-sm font-medium opacity-90">{totalSctEnCurso} SCT</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Promedio en curso */}
        {promedioEnCurso !== null && (
          <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl glass-card border border-borderColor/60 shadow-md transition-all hover:scale-105">
            <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-sm" />
            <div className="flex flex-col">
              <span className="text-textSecondary text-xs font-semibold uppercase tracking-wider">Promedio En Curso</span>
              <span className="text-textPrimary text-xl font-bold leading-tight">{promedioEnCurso.toFixed(1)}</span>
            </div>
          </div>
        )}

        {/* Total */}
        <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl glass-card border border-borderColor/60 shadow-md transition-all hover:scale-105">
          <div className="w-3 h-3 rounded-full bg-primary shadow-sm" />
          <div className="flex flex-col">
            <span className="text-textSecondary text-xs font-semibold uppercase tracking-wider">Total Cursos</span>
            <span className="text-textPrimary text-xl font-bold leading-tight">{totalCursos}</span>
          </div>
        </div>

      </div>
    </div>
  );
}

import React from "react";
export const MemoizedStatsDisplay = React.memo(StatsDisplay);
